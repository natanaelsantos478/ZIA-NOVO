# RELATÓRIO DE AUDITORIA DE SEGURANÇA
**Sistema:** ZIA Omnisystem (zia-novo)
**Data:** 28 de março de 2026
**Auditor:** Agente de Segurança Autônomo
**Ambiente:** Análise estática de código-fonte + revisão de configuração
**Branch auditado:** `master` (commit `1839648`)

---

## 1. RESUMO EXECUTIVO

O sistema ZIA Omnisystem apresenta **riscos graves que impedem o go-live seguro em produção**. Foram identificadas **10 vulnerabilidades**, sendo **2 de severidade Crítica** e **4 de severidade Alta**.

Os problemas mais urgentes são: (1) credenciais de administrador hardcoded no código-fonte JavaScript que é enviado ao navegador de qualquer visitante; (2) chave de API do Gemini exposta diretamente nas requisições do browser, permitindo uso não autorizado às custas da empresa; e (3) senhas de operadores armazenadas em texto puro no banco de dados, sem hash.

Nenhuma vulnerabilidade de injeção (SQL Injection, XSS) foi identificada na camada de apresentação — o uso de React com JSX padrão e a ausência de `dangerouslySetInnerHTML` são pontos positivos relevantes.

**Veredito: o sistema NÃO deve ir para produção com usuários reais sem corrigir, no mínimo, as vulnerabilidades Críticas e Altas listadas abaixo.**

---

## 2. VULNERABILIDADES ENCONTRADAS

---

### VULN #1 — Credenciais de Administrador Hardcoded no Frontend

- **Categoria:** Exposição de Dados / Autenticação
- **Severidade:** 🔴 Crítico
- **Onde:**
  - `src/components/ProfileSelector.tsx` — linhas 23–24
  - `src/features/admin/AdminPanel.tsx` — linhas 18–19
  - Histórico git completo (`git log -p`)

**O que foi possível fazer:**
Qualquer pessoa que abrir o DevTools do navegador na aba "Sources" (ou baixar o bundle JS compilado) vê imediatamente:
```
const ADMIN_USER = '00000';
const ADMIN_PASS = 'ZITA084620';
```
O histórico git também registra uma variante anterior: `ZITA086420`. Ambas estão permanentemente na linha do tempo do repositório.

**Impacto:**
Um atacante sem qualquer conhecimento técnico pode acessar o painel `/admin`, visualizar todas as empresas cadastradas, seus contratos de software, dados de acesso e efetuar ações administrativas (criar/suspender empresas, redefinir acessos). É acesso total ao backoffice do produto.

**Como corrigir:**
1. Remover imediatamente qualquer `const ADMIN_PASS` do código frontend.
2. O login de `/admin` deve ser 100% validado pela Edge Function `zia-auth` — nunca com fallback local.
3. Limpar o histórico git com `git filter-repo --path src/components/ProfileSelector.tsx --invert-paths` (ou equivalente) após rotacionar a senha.
4. Rotacionar a senha de administrador imediatamente.

---

### VULN #2 — Chave da API Gemini Exposta nas Requisições do Browser

- **Categoria:** Exposição de Dados
- **Severidade:** 🔴 Crítico
- **Onde:**
  - `src/features/crm/sections/EscutaInteligente.tsx` — linhas 190–192
  - `src/features/crm/sections/IACrm.tsx`
  - `src/features/crm/compromissos/CompromissoDetalhe.tsx`
  - `src/pages/ia/hooks/useChat.ts` — linhas 8–10

**O que foi possível fazer:**
Esses arquivos fazem chamadas diretas à API Google Gemini com a chave embutida na URL:
```
https://generativelanguage.googleapis.com/v1beta/models/...?key=AIza...
```
A chave fica visível na aba "Network" do DevTools de qualquer usuário logado. Basta copiar e usar.

> **Agravante:** O arquivo `supabase/functions/ai-proxy/index.ts` já existe como proxy seguro correto (chave no servidor), mas os arquivos acima ignoram esse proxy e chamam a API diretamente.

**Impacto:**
Qualquer usuário ou visitante pode roubar a chave e realizar chamadas ilimitadas ao Gemini às custas da organização. O custo financeiro pode ser significativo. A chave não pode ser revogada seletivamente para o sistema legítimo sem rotacionar e atualizar todos os ambientes.

**Como corrigir:**
1. Substituir as chamadas diretas ao Gemini nos arquivos acima pelo proxy `supabase.functions.invoke('ai-proxy', {...})` (já implementado e correto).
2. Revogar a chave atual no Google Cloud Console e gerar uma nova.
3. A nova chave deve ser configurada **apenas** como secret do servidor (`supabase secrets set GEMINI_API_KEY=...`), nunca em variável `VITE_*`.

---

### VULN #3 — Senhas de Operadores Armazenadas em Texto Puro

- **Categoria:** Exposição de Dados / Autenticação
- **Severidade:** 🟠 Alto
- **Onde:** `supabase/functions/zia-auth/index.ts` — linha 135

**O que foi possível fazer:**
```typescript
if (profile.password && password !== profile.password)
```
A comparação é feita diretamente, sem hash. Isso implica que a tabela `zia_operator_profiles` no Supabase armazena senhas em texto puro.

**Impacto:**
Um vazamento do banco de dados (backup exposto, falha de RLS, acesso indevido por funcionário com service role) expõe as senhas de todos os operadores em texto puro. Como usuários reutilizam senhas, isso compromete outros sistemas além do ZIA.

**Como corrigir:**
1. Implementar hash de senha com bcrypt ou Argon2 no momento do cadastro do operador.
2. Atualizar `zia-auth` para usar `await bcrypt.compare(password, profile.password_hash)`.
3. Migrar senhas existentes: forçar reset de senha no primeiro login.

---

### VULN #4 — Token ZIA IA Sem Assinatura Criptográfica (Forjável)

- **Categoria:** Autenticação / Controle de Acesso
- **Severidade:** 🟠 Alto
- **Onde:**
  - `src/hooks/useZitaIA.ts` — linha 35: `localStorage.setItem('zita_ia_token', btoa(payload))`
  - `supabase/functions/zita-ia-agent/index.ts` — linha 48: `JSON.parse(atob(token))`

**O que foi possível fazer:**
O token salvo no `localStorage` é apenas `btoa(JSON.stringify({pid, eid, etype, ts, exp}))` — codificação Base64, não criptografia. No console do browser:
```javascript
// Ler token atual
JSON.parse(atob(localStorage.getItem('zita_ia_token')))
// Forjar token de outro usuário
localStorage.setItem('zita_ia_token', btoa(JSON.stringify({
  pid: 'id-de-outro-usuario',
  eid: 'id-de-outra-empresa',
  etype: 'holding',
  ts: Date.now(),
  exp: Date.now() + 86400000
})))
```
O servidor `zita-ia-agent` aceita esse token forjado sem verificar assinatura.

**Impacto:**
Um operador pode impersonar qualquer outro perfil, acessar dados de outras empresas via o agente IA, e executar ações (criar registros, consultar dados) em nome de qualquer tenant.

**Como corrigir:**
1. Substituir o token Base64 pelo JWT assinado que já é emitido pela Edge Function `zia-auth` (armazenado em `sessionStorage` via `src/lib/auth.ts`).
2. O `zita-ia-agent` deve validar o JWT com a assinatura HMAC-SHA256 (como `zia-auth` já faz) em vez de decodificar Base64.

---

### VULN #5 — Enumeração de Usuários no Login (User Enumeration)

- **Categoria:** Autenticação
- **Severidade:** 🟠 Alto
- **Onde:** `supabase/functions/zia-auth/index.ts` — linhas 134 e 136

**O que foi possível fazer:**
As mensagens de erro são distintas:
- Código inexistente → `"Código de acesso não encontrado."` (HTTP 404)
- Código válido, senha errada → `"Senha incorreta."` (HTTP 401)

**Impacto:**
Um atacante pode descobrir quais códigos de operador existem no sistema fazendo requisições automatizadas. Com os códigos válidos em mãos, parte para ataque de força bruta direcionado.

**Como corrigir:**
1. Retornar sempre a mesma mensagem genérica: `"Código ou senha inválidos."` com HTTP 401, independentemente do motivo.

---

### VULN #6 — Ausência de Rate Limiting no Endpoint de Autenticação

- **Categoria:** Autenticação
- **Severidade:** 🟠 Alto
- **Onde:** `supabase/functions/zia-auth/index.ts` (ausência de controle)

**O que foi possível fazer:**
Não há nenhum mecanismo de limitação de requisições. É possível enviar milhares de tentativas de login por segundo contra qualquer código de operador conhecido (ver VULN #5).

**Impacto:**
Ataque de força bruta viável contra qualquer conta. Senhas numéricas simples (padrão de sistemas ERP como "123456") seriam descobertas em segundos.

**Como corrigir:**
1. Implementar rate limiting na Edge Function: máximo de 5 tentativas por IP/código em 15 minutos.
2. Usar Supabase Rate Limiting ou um KV store (ex: Upstash Redis) para rastrear tentativas.
3. Considerar bloqueio temporário de conta após N falhas consecutivas.

---

### VULN #7 — CORS Totalmente Aberto em Todas as Edge Functions

- **Categoria:** Controle de Acesso
- **Severidade:** 🟡 Médio
- **Onde:** Todos os 11 arquivos em `supabase/functions/*/index.ts`

**O que foi possível fazer:**
Todas as funções definem:
```typescript
'Access-Control-Allow-Origin': '*'
```
Isso permite que qualquer site externo faça requisições cross-origin para as Edge Functions, incluindo `zia-auth` (autenticação) e `ai-proxy` (IA).

**Impacto:**
Um site malicioso pode usar as APIs do ZIA a partir do browser de um usuário autenticado (ataque CSRF em cenários onde cookies são usados). Para `zia-auth`, permite que sites externos tentem autenticação programaticamente de forma menos restrita.

**Como corrigir:**
1. Substituir `'*'` pelo domínio de produção: `'https://app.zia.com.br'`.
2. Adicionar suporte a ambiente de desenvolvimento: verificar o header `Origin` e retornar o domínio correto condicionalmente.

---

### VULN #8 — Content Security Policy Permissiva (`unsafe-inline`, `unsafe-eval`)

- **Categoria:** Configuração de Segurança
- **Severidade:** 🟡 Médio
- **Onde:** `vercel.json` — linha 16

**O que foi possível fazer:**
```
script-src 'self' 'unsafe-inline' 'unsafe-eval'
```
`unsafe-inline` permite execução de qualquer `<script>` inline.
`unsafe-eval` permite `eval()`, `new Function()` e similares.

**Impacto:**
Se uma vulnerabilidade XSS for introduzida futuramente (ex: via renderização de dados do servidor), a CSP não oferece nenhuma proteção adicional — o atacante pode executar código JavaScript arbitrário.

**Como corrigir:**
1. Remover `'unsafe-eval'` — o Vite/React em produção não requer eval.
2. Substituir `'unsafe-inline'` por nonces ou hashes de scripts específicos (requer configuração no Vite).
3. Implementar gradualmente, testando o build de produção.

---

### VULN #9 — Scope IDs do Tenant Armazenados em `localStorage` (Manipulável pelo Usuário)

- **Categoria:** Controle de Acesso
- **Severidade:** 🟡 Médio
- **Onde:** `src/App.tsx` — linha 76 (`localStorage.setItem(SCOPE_IDS_KEY, ...)`)

**O que foi possível fazer:**
```javascript
// No console do browser, um operador pode alterar seus próprios scope IDs:
localStorage.setItem('zia_scope_ids_v1', JSON.stringify(['id-de-outra-empresa']))
```

**Impacto:**
O frontend usará esses IDs para filtragem de dados nas queries. Se o backend (Supabase RLS) estiver corretamente configurado, as queries retornarão vazio — a proteção real está no RLS. O risco é que o RLS possa ter lacunas (policies ausentes ou mal configuradas em tabelas específicas), tornando o localStorage a única barreira.

**Como corrigir:**
1. O `scope_ids` deve ser lido **sempre** do JWT (via `getTokenScopeIds()` de `src/lib/auth.ts`) e nunca do `localStorage`.
2. Remover `SCOPE_IDS_KEY` do `localStorage` — a fonte de verdade já existe no token JWT.

---

### VULN #10 — Senha Padrão Vazia Aceita pelo Servidor se Env Var Não Configurada

- **Categoria:** Autenticação
- **Severidade:** 🟢 Baixo
- **Onde:** `supabase/functions/zia-auth/index.ts` — linha 110

**O que foi possível fazer:**
```typescript
const adminPass = Deno.env.get('ZIA_ADMIN_PASS') ?? '';
// ...
if (!adminPass || password !== adminPass) return json({ error: 'Senha incorreta.' }, 401);
```
Se `ZIA_ADMIN_PASS` não estiver configurada no ambiente (deploy incompleto), `adminPass` será `''`. A condição `!adminPass` bloqueia o acesso — mas apenas por coincidência lógica. A intenção não é documentada claramente.

**Impacto:**
Risco baixo em cenário normal, mas em um deploy de ambiente de staging mal configurado, o comportamento pode ser inesperado. Se a lógica fosse `adminPass || password !== adminPass`, o acesso seria aberto.

**Como corrigir:**
1. Fazer o servidor retornar 500 (Internal Server Error) se `ZIA_ADMIN_PASS` não estiver configurada, em vez de depender de lógica implícita:
```typescript
if (!adminPass) return json({ error: 'Servidor mal configurado.' }, 500);
```

---

## 3. TESTES REALIZADOS SEM VULNERABILIDADE

| Teste | Resultado |
|---|---|
| XSS via React JSX (ausência de dangerouslySetInnerHTML) | ✅ Protegido |
| SQL Injection — React/Supabase usa queries parametrizadas | ✅ Protegido |
| Uso de `eval()` ou `new Function()` no código-fonte | ✅ Não encontrado |
| Arquivo `.env` commitado no repositório | ✅ Não commitado (apenas `.env.example`) |
| `.gitignore` cobre arquivos `.env` | ✅ Correto |
| JWT ZIA Auth com assinatura HMAC-SHA256 server-side | ✅ Implementado corretamente em `zia-auth` |
| Token ZIA Auth em `sessionStorage` (não `localStorage`) | ✅ Correto em `src/lib/auth.ts` |
| HSTS (Strict-Transport-Security) configurado | ✅ `max-age=63072000; includeSubDomains; preload` |
| X-Frame-Options | ✅ `SAMEORIGIN` |
| X-Content-Type-Options | ✅ `nosniff` |
| Referrer-Policy restritivo | ✅ `strict-origin-when-cross-origin` |
| Proxy seguro para Gemini (`ai-proxy`) existe no servidor | ✅ Implementado (mas subutilizado) |
| Isolamento multi-tenant via RLS no Supabase | ✅ Arquitetura correta (`scope_ids` no JWT) |
| Dependências críticas desatualizadas (React, Supabase, Vite) | ✅ Versões recentes |

---

## 4. PONTOS DE ATENÇÃO (não são bugs, mas precisam de revisão)

- **Senhas numéricas simples**: O sistema aceita códigos como `0001`, `00000`. Sem uma política de complexidade de senha, ataques de dicionário são triviais.
- **Token ZIA Auth com expiração de 8 horas sem refresh**: Um token roubado (ex: via XSS futuro) permanece válido por até 8 horas sem possibilidade de revogação individual.
- **Ausência de log de auditoria de autenticação**: Não há registro de tentativas de login falhas, acessos suspeitos ou mudanças de permissão — dificulta investigação forense pós-incidente.
- **Dados mock hardcoded nos componentes**: Embora não seja risco imediato, dados fictícios realistas (CPFs, CNPJs, nomes) devem ser substituídos por generators antes do go-live para evitar confusão com dados reais.
- **Rota `/admin` indexável por bots**: A rota não tem `<meta name="robots" content="noindex">` nem restrição de IP. Bots de descoberta de painéis admin a encontrarão.

---

## 5. RECOMENDAÇÕES PRIORITÁRIAS

### Correção Imediata — bloqueia o go-live

| # | Ação | Vulnerabilidade |
|---|------|-----------------|
| 1 | Remover `ADMIN_PASS` hardcoded do código frontend e garantir que o login `/admin` chame exclusivamente a Edge Function | VULN #1 |
| 2 | Revogar a chave Gemini atual e migrar todos os arquivos que fazem chamadas diretas para usar o `ai-proxy` existente | VULN #2 |
| 3 | Implementar hash de senha (bcrypt/Argon2) para operadores — nunca armazenar texto puro | VULN #3 |
| 4 | Substituir o token Base64 do `zita-ia-agent` pelo JWT assinado de `zia-auth` | VULN #4 |
| 5 | Limpar histórico git para remover credenciais (após rotacionar senhas/chaves) | VULN #1 |

### Correção no Curto Prazo — antes de escalar usuários

| # | Ação | Vulnerabilidade |
|---|------|-----------------|
| 6 | Unificar mensagens de erro do login em resposta genérica | VULN #5 |
| 7 | Implementar rate limiting na Edge Function `zia-auth` | VULN #6 |
| 8 | Restringir CORS das Edge Functions ao domínio de produção | VULN #7 |
| 9 | Ler `scope_ids` do JWT em vez do `localStorage` no frontend | VULN #9 |

### Boas Práticas para Implementar — maturidade de segurança

| # | Ação |
|---|------|
| 10 | Remover `unsafe-inline` e `unsafe-eval` da CSP (`vercel.json`) |
| 11 | Implementar log de auditoria de autenticação (tentativas falhas, IP, timestamp) |
| 12 | Adicionar política de complexidade mínima de senha para operadores |
| 13 | Implementar mecanismo de revogação de sessão (blacklist de JWT ou token de curta duração com refresh) |
| 14 | Fazer `npm audit` regularmente e integrar ao CI/CD |

---

## 6. CONCLUSÃO

O sistema ZIA Omnisystem demonstra uma arquitetura de segurança bem intencionada — JWT assinado no servidor, RLS no Supabase, proxy de IA, sessionStorage para tokens — mas sua execução atual apresenta contradições graves: credenciais expostas no bundle enviado ao browser, chaves de API contornando o proxy seguro já criado, e senhas armazenadas em texto puro.

**O sistema NÃO pode ir para produção com usuários reais no estado atual.**

As vulnerabilidades Críticas (#1 e #2) são de exploração trivial — qualquer usuário com DevTools pode roubar as credenciais de admin e a chave Gemini em menos de 60 segundos. As vulnerabilidades Altas (#3, #4, #5, #6) transformam o sistema em alvo fácil de ataques automatizados.

Após corrigir os itens de **Correção Imediata** (5 ações), o sistema atingirá um nível de segurança aceitável para um lançamento controlado (beta fechado). As correções de curto prazo e boas práticas devem ser implementadas antes da escala para clientes pagantes.

---

*Relatório gerado por análise estática de código-fonte. Não foram realizados testes de penetração ativos em infraestrutura de produção.*

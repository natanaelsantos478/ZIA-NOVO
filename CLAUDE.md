# ZIA Omnisystem — Guia de Referências

> **Leia primeiro, implemente depois.**
> Este arquivo é um índice de navegação, não documentação.
> Antes de alterar qualquer coisa, consulte a referência do módulo.
> **Mantenha este arquivo atualizado**: ao descobrir novo padrão, decisão ou criar novo MD, adicione aqui.

Vault completo: [[INDICE]] · Ponto de entrada: [[CLAUDE-Referencia]]
Documentação técnica: [[docs/index]] · Cérebro do projeto: [[cerebro/MAPA]]

---

## O Cérebro — LEIA ISSO ANTES DE QUALQUER COISA

O **cérebro real do Natanael** é o vault do Obsidian em:

```
C:\Users\Natanael\.cerebro\CEREBRO ZEUS
```

**Este vault é a mente do projeto. Não tem git. É local.**

| O que é | Caminho | Propósito |
|---------|---------|-----------|
| **Vault Obsidian (cérebro)** | `C:\Users\Natanael\.cerebro\CEREBRO ZEUS` | Decisões, contexto, conhecimento — a mente real |
| **ZITA-BRAIN** | `C:\Users\Natanael\ZITA-BRAIN` | Fork de trabalho do código — NÃO é o vault |
| **ZIA-NOVO** | `C:\Users\Natanael\ZIA-NOVO` | Código do app em produção |
| **ZITA-EMPRESA** | `C:\Users\Natanael\ZITA-EMPRESA` | App de agentes IA |

### Regras obrigatórias para agentes:

1. **Novas notas/decisões** → criar em `C:\Users\Natanael\.cerebro\CEREBRO ZEUS\05-Codigo\ZIA-NOVO-docs\decisoes\`
2. **Linkar** → adicionar em `05-Codigo\ZIA-NOVO-docs\_indice-projeto.md`
3. **NUNCA** escrever no ZITA-BRAIN esperando aparecer no Obsidian — são coisas distintas
4. **Índice mestre** → `00-INDICE-MESTRE.md`

---

## Repositórios locais — caminhos oficiais

| Repositório | Caminho local | GitHub | Finalidade |
|-------------|--------------|--------|-----------|
| `ZIA-NOVO` | `C:\Users\Natanael\ZIA-NOVO` | `natanaelsantos478/ZIA-NOVO` | Código do app |
| `ZITA-BRAIN` | `C:\Users\Natanael\ZITA-BRAIN` | `natanaelsantos478/ZITA-BRAIN` | Fork de trabalho/experimentação |
| `ZITA-EMPRESA` | `C:\Users\Natanael\ZITA-EMPRESA` | `natanaelsantos478/ZITA-EMPRESA` | Agentes IA |
| **Vault Obsidian** | `C:\Users\Natanael\.cerebro\CEREBRO ZEUS` | *(sem git — local)* | **Cérebro real** |

---

## Protocolo de início de sessão — OBRIGATÓRIO

**Passo 1 — Ler a última sessão (SEMPRE, ANTES DE QUALQUER COISA):**

```bash
ls "C:\Users\Natanael\.cerebro\CEREBRO ZEUS\05-Codigo\ZIA-NOVO\cerebro\historico\" | sort -r | head -5
```

Leia o arquivo mais recente. Ele contém o estado real do projeto: o que foi feito, decisões tomadas e pendências abertas. **Sem isso, você vai repetir trabalho ou quebrar algo já resolvido.**

**Passo 2 — Sincronizar repositórios de código:**

```bash
git -C "C:\Users\Natanael\.cerebro\CEREBRO ZEUS\05-Codigo\ZIA-NOVO" pull
```

**Passo 3 — Apresentar briefing ao Natanael** com:
- O que foi feito na última sessão
- Pendências abertas em ordem de prioridade
- Pergunta: "O que fazemos hoje?"

---

## Time de agentes

| Agente | Papel | Repositório |
|--------|-------|------------|
| Juliano | Gerente geral / CPO — estratégia, orquestração | ambos |
| Cezar | Programador sênior — revisão técnica | ZIA-NOVO |
| Marcelo | Programador — implementações | ZIA-NOVO |
| Marcos | Programador de agentes | ZITA-EMPRESA |

Fluxo: Natanael → Juliano → Cezar → Marcelo/Marcos → commit direto em `main`

---

## Projeto

**ZIA / ZITA** — ERP+CRM+RH+EAM+SCM+IA modular para PMEs brasileiras.
Stack: React 19 · TypeScript 5.9 · Tailwind v4 · React Router v7 · Vite 7 · Supabase · Lucide icons.
Deploy: Cloudflare Pages (principal) · Vercel (legado). Worker Zeus: `wrangler.toml`.

---

## Onde procurar — por tema

| Preciso de… | Referência |
|-------------|-----------|
| Padrão de estrutura de módulo | `src/features/hr/` (modelo — 30+ seções) · [[HR-Module]] |
| Supabase + RLS multi-tenant | [[Supabase-Auth]] · [[ZITA-Supabase-RLS-Correcao-e-Lancamento]] |
| Isolamento por empresa | [[ERP-Multi-Tenant-Isolamento-Dados-Documentos]] |
| Árvore de custos / costEngine | [[ERP-Financeiro-Secoes]] · [[ERP-Arvore-de-Custos-Complexa-Escalavel]] |
| Comissões e grupos de produto | [[ERP-Vendas-Comissoes]] · [[ERP-Comissoes-Vendedores-Grupos-RH-Integracao]] |
| Editor de orçamento (canvas) | [[ERP-Orcamentos-Canvas]] · [[ERP-Orcamento-Visual-Editor-Canva-Produtos]] |
| Motor de campos dinâmicos | [[ERP-Orcamentos-Canvas]] |
| Agentes IA no ZITA | [[IA-Module]] · [[Agentes-IA-Arquitetura-Multi-Agente]] |
| Zeus — prompt e orquestração | [[Agente-Zeus-Prompt-Motor-Raciocinio]] |
| Worker Cloudflare (Zeus webhook) | [[Cloudflare-Worker-Zeus]] · [[Worker-Zeus-Cloudflare-Flowise-Webhook]] |
| WhatsApp + Evolution API | [[ZITA-WhatsApp-Evolution-API-Integracao]] |
| API keys para agentes externos | [[Settings-API]] · [[ZITA-API-Modulo-IA-Para-Agentes-Externos]] |
| Google OAuth | [[Google-OAuth]] · [[Google-OAuth-Configuracao-Client-ID]] |
| Deploy Cloudflare multi-página | [[Public-Landing]] · [[Cloudflare-Deploy-ZITA-Paginas-Multiplas]] |
| Flowise / Railway | [[Railway-Flowise-Volume-Persistencia]] · [[Railway-vs-Supabase-Arquitetura-Agentes]] |
| Faturamento / NF-e | [[ERP-Operacoes-Secoes]] · [[ERP-Financeiro-Detalhamento-NF-Integracoes-Fiscais]] |
| Visão completa do ERP | [[ERP-Core]] · [[ERP-Visao-Geral-Modulos-Operacoes-Financeiro]] |
| App mobile (Capacitor/PWA) | [[ZITA-App-Mobile-Capacitor-PWA]] |

---

## Mapa de módulos → notas de código

[[ERP-Core]] · [[ERP-Financeiro-Secoes]] · [[ERP-Operacoes-Secoes]] · [[ERP-Financeiro-Contas]] · [[ERP-Vendas-Comissoes]] · [[ERP-Orcamentos-Canvas]] · [[ERP-Assinaturas]] · [[ERP-Projetos]]

[[HR-Module]] · [[CRM-Module]] · [[EAM-Module]] · [[IA-Module]] · [[SCM-Module]] · [[Settings-API]] · [[Supabase-Auth]] · [[Google-OAuth]] · [[Cloudflare-Worker-Zeus]] · [[Public-Landing]] · [[Infra-Build]] · [[Componentes-Globais]]

---

## CHECKLIST OBRIGATÓRIO — ANTES DE CADA COMMIT NO MAIN

> Qualquer commit no `main` que pule esses passos quebra o rastreamento do projeto.

```
[ ] 1. Bump de versão em package.json  (MAJOR.MINOR.PATCH-beta)
[ ] 2. Bump de versão em src/lib/version.ts  (mesma versão)
[ ] 3. git add + git commit -c user.name="Ares-ZIA" -c user.email="ares@zia.app"
[ ] 4. git push origin main
[ ] 5. Criar log em cerebro/historico/YYYY-MM-DD_ares_[tema].md
```

**Regra de versão:**
- Nova funcionalidade ou redesign → MINOR (`1.0.x` → `1.1.0`)
- Bug fix ou ajuste → PATCH (`1.1.0` → `1.1.1`)
- Breaking change → MAJOR (`1.x.x` → `2.0.0`)

**Nunca usar branches de agente** (`agent-ares`, `agent-zeus`, etc.) — commits vão direto em `main`. Branches causam dessincronia com o Cloudflare e confusão desnecessária.

---

## LEI DO LOG DE SESSÃO — OBRIGATÓRIO AO FINAL DE CADA SESSÃO

> Todo trabalho que não é registrado no Cérebro Zeus é trabalho perdido.
> Esta lei garante contexto contínuo entre sessões e agentes.

**Ao final de TODA sessão de trabalho**, o agente ativo DEVE:

1. **Criar log em** `cerebro/historico/YYYY-MM-DD_[agente]_[tema-curto].md`
   - Usar o template em `cerebro/historico/_TEMPLATE.md`
   - Incluir: o que foi feito, arquivos modificados, decisões, pendências abertas

2. **Se houver decisão arquitetural nova** → criar nota em `ZIA-NOVO-docs/decisoes/`

3. **Formato obrigatório do frontmatter:**
   ```yaml
   ---
   agente: [nome do agente]
   data: YYYY-MM-DD
   tema: [resumo em 3-5 palavras]
   branch: main
   ---
   ```

**Esta lei se aplica a:** Juliano, Cezar, Marcelo, Marcos, Lucas, e qualquer agente futuro.
**Não é opcional.** Sessão sem log = trabalho não documentado = próxima sessão começa às cegas.

---

## ZIA_JWT_SECRET — Por que existe e o que quebra se sumir

> **Contexto (16/05/2026):** O Supabase migrou silenciosamente este projeto de JWT HS256 (shared secret) para ECC P-256 (assimétrico). Com isso, `SUPABASE_JWT_SECRET` deixou de ser injetada nas Edge Functions. A `zia-auth` chamava `Deno.env.get('SUPABASE_JWT_SECRET')` e recebia string vazia → `crypto.subtle.importKey` falhava com `Key length is zero` → todas as chamadas retornavam 500 → app inteiro sem JWT → RLS bloqueava tudo.

**Fix aplicado:** a função agora lê `ZIA_JWT_SECRET` (secret customizada, sem o prefixo reservado `SUPABASE_`). O valor é o **Legacy JWT Secret** de `Settings → JWT Keys` no Supabase Dashboard.

**Regras para não quebrar de novo:**
- `ZIA_JWT_SECRET` deve ser configurada em `Supabase Dashboard → Settings → Edge Functions → Secrets`
- O valor vem de `Settings → JWT Keys → Legacy JWT Secret` (HS256, começa com uma string longa)
- **NÃO usar bcrypt** na `zia-auth` — o runtime Deno das Edge Functions não suporta Web Workers (bcrypt usa); causa crash na importação
- **Sempre usar** `role: 'authenticated'` e `aud: 'authenticated'` no payload JWT — `role: 'anon'` faz o PostgREST tratar o usuário como anônimo e todas as policies `authenticated_rw` negam acesso
- **Manter `_debug` no catch** — é o único diagnóstico disponível em produção

**Dívida técnica:** este fix usa o Legacy HS256 Secret, que o Supabase marca como descontinuado. Se o legacy secret for revogado (manualmente ou por rotação forçada), a autenticação para. Solução definitiva: migrar para Supabase Auth nativo (`auth.users` + `signInWithPassword`), eliminando a Edge Function customizada. Não fazer agora — é refatoração grande.

---

## LEI DA RLS — Isolamento Multi-Tenant (LEIA ANTES DE QUALQUER POLICY)

> Nossa RLS **não é o padrão Supabase**. Errar aqui deixa o app **em branco** para clientes reais
> (RLS sem dado) ou **vaza dados entre tenants**. Siga este contrato à risca.

### 1. Auth é CUSTOM — não é Supabase Auth nativo
- Usuários ficam em `public.zia_operator_profiles` (**não** em `auth.users`).
- Login: Edge Function `zia-auth` valida `code` + senha e emite um **JWT HS256** assinado com `ZIA_JWT_SECRET` (Legacy JWT Secret — ver seção acima).
- O JWT fica no `sessionStorage` na chave `zia_auth_token_v1`; `jwtFetch` em `src/lib/supabase.ts` injeta `Authorization: Bearer <jwt>` em cada request ao PostgREST.
- **NUNCA usar `auth.uid()` nem `auth.email()`** → sempre retornam NULL neste projeto.

### 2. Claims do JWT — é daqui que a RLS lê
```json
{ "role":"authenticated", "aud":"authenticated", "sub":"profile-XXXXX",
  "app_metadata": {
    "is_admin": false,
    "scope_ids": ["holding-zita-vendas","matrix-zita-vendas","branch-zita-vendas-f1"],
    "profile_id":"...", "holding_id":"...", "entity_id":"...", "entity_type":"holding|matrix|branch" } }
```
- `scope_ids` = IDs de `zia_companies` no escopo do usuário (holding → matrizes + filiais; matrix → filiais; branch → ela mesma). Computado em `zia-auth` (`computeScopeIds`).
- **IDs de empresa são strings/slugs** (`holding-zita-vendas`, `matrix-002`, `branch-1773149292370`) + 1 UUID legado (`00000000-0000-0000-0000-000000000001`). A coluna de tenant nas tabelas guarda esse mesmo valor.

### 3. Funções helper (JÁ EXISTEM no banco — use sempre, não recrie)
- `zia_is_admin()` → bool (lê `app_metadata.is_admin`).
- `tenant_in_scope(tid text)` e `tenant_in_scope(tid uuid)` → bool (`tid` ∈ `scope_ids`).

### 4. Template OBRIGATÓRIO de policy
```sql
-- A) Tabela COM coluna de tenant (tenant_id | company_id | zia_company_id):
CREATE POLICY tenant_isolation ON public.<tbl>
  FOR ALL TO authenticated
  USING      (zia_is_admin() OR tenant_in_scope(<coluna_tenant>))
  WITH CHECK (zia_is_admin() OR tenant_in_scope(<coluna_tenant>));

-- B) Tabela SEM coluna de tenant → isola via FK ao pai que tem (padrão salary_history):
CREATE POLICY tenant_isolation ON public.<tbl>
  FOR ALL TO authenticated
  USING (zia_is_admin() OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = <tbl>.employee_id AND tenant_in_scope(e.zia_company_id)))
  WITH CHECK (zia_is_admin() OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = <tbl>.employee_id AND tenant_in_scope(e.zia_company_id)));
```
Sempre incluir o `zia_is_admin() OR` (admin global tem `scope_ids:[]` e sem isso não veria nada).

### 5. GRANT é obrigatório — **RLS sem GRANT retorna 403**
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<tbl> TO authenticated;
-- anon SOMENTE se existir fluxo público de leitura (raro). Por padrão, não conceder a anon.
```

### 6. A coluna de tenant varia — confirme por tabela ANTES
`tenant_id` (text, maioria) · `company_id` / `zia_company_id` · `holding_id`. Rodar:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='<tbl>' AND column_name IN ('tenant_id','company_id','zia_company_id','holding_id','entity_id');
```

### 7. ⚠️ O NOME DA POLICY MENTE
Tabela com policy chamada `*_tenant` pode ter `USING (true)` (sem isolamento, role `public`). **Sempre cheque o `qual` real**, nunca o nome:
```sql
SELECT tablename, policyname, roles::text, cmd, qual FROM pg_policies
WHERE schemaname='public' AND (qual IS NULL OR btrim(qual)='true') ORDER BY 1;
```

### 8. NÃO fazer
- Habilitar RLS **sem criar policy** (bloqueia tudo, inclusive `authenticated`).
- Usar `auth.uid()` / `auth.email()`.
- Mexer na config do JWT secret ou migrar para auth nativo sem decisão explícita.
- Para travar **coluna** específica de `anon`: `REVOKE SELECT(col)` não funciona se há GRANT de tabela. Use `REVOKE SELECT ON tbl FROM anon; GRANT SELECT(<colunas_seguras>) ON tbl TO anon;` (caso `zia_operator_profiles` — password/password_hash).

### 9. Testar SEMPRE antes de confiar (sem tocar em produção)
Transação que dá rollback via `RAISE` e mostra o resultado no erro:
```sql
DO $$ DECLARE c int; BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"role":"authenticated","app_metadata":{"is_admin":false,"scope_ids":["holding-zita-vendas"]}}', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO c FROM public.<tbl>;
  EXECUTE 'RESET ROLE';
  RAISE EXCEPTION 'visivel pelo tenant = %', c;   -- aborta e some com qualquer DDL de teste
END $$;
```
Validar: tenant A vê só os dele · admin (`is_admin:true`) vê tudo · sem claims vê 0.

### 10. Estado da Fase 2 (atualize aqui a cada lote)
- Diagnóstico: ~130 policies estavam `qual=true` (cross-tenant), muito além das 28 mapeadas.
- **Feito:** `zia_operator_profiles` (password/hash travados p/ anon) · `jessica_*` (RLS leitura-anon/sem-escrita) · **piloto CRM** (8 tabelas internas: negociacoes, funis, funil_etapas, atividades, atendimentos, anotacoes, compromisso_arquivos/participantes). Segurados: `crm_orcamentos`/`crm_orcamento_itens` (possível view pública).
- **RH:** `employees`, `salary_history`, `position_history`, `schedules` já isoladas; **~28 tabelas RH abertas SEM coluna de tenant** (precisam do padrão B via `employees`).
- **Pendente:** ERP, FIN (árvore de custo), IA (`ia_api_keys` é crítico), SCM, EAM/`asset_*` (faltam GRANTs p/ authenticated), Assinaturas.

---

## LEI DO CI/CD — NUNCA QUEBRAR PRODUÇÃO

> Qualquer alteração em `.github/workflows/` ou `wrangler.toml` pode derrubar o site de clientes reais.
> Esta lei existe porque o deploy foi quebrado por uma "correção de segurança" mal executada em 30/04/2026.

**Antes de tocar em qualquer workflow de deploy:**

1. **Verificar secrets existentes primeiro** — rodar `gh secret list`. Nunca assumir que o secret com o nome certo tem o valor certo.
2. **Nunca trocar credencial que funciona por secret sem validar o secret** — confirmar o secret → testar em branch → só então remover o hardcoded do main.
3. **Alterações em deploy.yml vão direto para produção** — sem rollback fácil. Se quebrar, reverter primeiro, melhorar depois.

**Sequência obrigatória para mexer em CI/CD:**
```
1. gh secret list                     # confirmar quais secrets existem e com qual nome
2. Alterar em branch separada         # nunca direto no main
3. gh workflow run --ref <branch>     # testar na branch
4. Só merge após ✓ confirmado
```

**Secrets do deploy Cloudflare (confirmados 30/04/2026):**

| Secret GitHub | Uso |
|---------------|-----|
| `CLOUDFLARE_API_TOKEN` | Token Wrangler (Edit Workers) |
| `CLOUDFLARE_ACCOUNT_ID` | ID da conta Cloudflare |
| `VITE_GEMINI_API_KEY` | Gemini no build |
| `VITE_GOOGLE_CLIENT_ID` | OAuth Google no build |

---

## Decisões críticas — leia antes de alterar

[[ZITA-Supabase-RLS-Correcao-e-Lancamento]] — RLS obrigatório em todas as tabelas
[[ERP-Multi-Tenant-Isolamento-Dados-Documentos]] — sempre filtrar por `tenant_id` (não `company_id` — coluna renomeada)
[[ERP-Arvore-de-Custos-Complexa-Escalavel]] — lógica e estrutura do costEngine
[[Agente-Zeus-Prompt-Motor-Raciocinio]] — prompt oficial do Zeus
[[Railway-vs-Supabase-Arquitetura-Agentes]] — decisão de plataforma de agentes
[[Render-vs-Railway-vs-Rawai-Comparativo-Custo]] — custo de infra Flowise
[[ZITA-API-Modulo-IA-Para-Agentes-Externos]] — API externa para agentes
[[Worker-Zeus-Cloudflare-Flowise-Webhook]] — arquitetura do worker
[[05-Codigo/ZIA-NOVO-docs/decisoes/2026-04-29_sessoes-27-28-abril]] — routing hatsuit.com (landing/app), GRANT obrigatório em tabelas novas, Gemini 2.0, novidades pós-login

---

## Padrões obrigatórios

**Estrutura de módulo:**
```
features/[modulo]/[Modulo]Layout.tsx   # Header + ModuleSidebar + NAV_GROUPS
features/[modulo]/[Modulo]Module.tsx   # switch(activeSection)
features/[modulo]/sections/[Secao].tsx # uma seção = um arquivo
```

**Sidebar:**
```tsx
<ModuleSidebar moduleTitle="X" moduleCode="X" color="pink"
  navGroups={NAV_GROUPS} activeId={activeSection} onNavigate={setActiveSection} />
```
Cores: `purple`(CRM) · `pink`(RH) · `blue`(EAM) · `emerald`(SCM) · `green`(Quality) · `amber`(Docs) · `slate`(ERP/Settings)

**Código:**
- Componentes PascalCase · Props como `interface` acima do componente
- IDs de seção: kebab-case (`'payroll-groups'`)
- Tailwind inline — zero CSS externo · zero shadcn/MUI · ícones só de `lucide-react`
- Conteúdo visível: português · variáveis/funções: inglês
- `custom-scrollbar` em listas scrolláveis

**Dados:**
- Supabase já conectado — **não criar mock em seções novas**
- Sempre filtrar por `company_id` (RLS + multi-tenant)
- Migrations SQL → `supabase/migrations/`

**Dependências disponíveis:** lodash · mathjs · recharts · @xyflow/react · konva · jspdf · html2canvas · framer-motion · dnd-kit · date-fns. Não instalar novas sem perguntar.

**Versionamento:**
- Toda alteração mergeada na branch `main` deve atualizar:
  1. `"version"` em `package.json`
  2. Constante `APP_VERSION` em `src/lib/version.ts`
- Seguir semver: `MAJOR.MINOR.PATCH[-sufixo]` (ex: `1.0.1-beta`)
- Versão atual: `1.0.0-beta` · Lançamento: `26/05/2026`

---

## Integrações previstas

| API | Para | Status |
|-----|------|--------|
| Focus NFe / NFe.io | NF-e, NFS-e, CT-e | Planejado |
| Asaas / Iugu / Efí | PIX, Boleto, Cartão | Planejado |
| Z-API (instância 3F1969DB5C2181E61967D6E8332D8490) | WhatsApp Business | Ativo |
| Flowise (Railway) | Agentes IA | Ativo |
| ViaCEP · ReceitaWS | CEP · CNPJ | Gratuito |
| D4Sign / BRy | Assinatura digital | Planejado |
| Google Custom Search | Prospecção de leads | Ativo |

---

## Comandos

```bash
npm run dev      # dev server
npm run build    # tsc + vite build
npm run lint     # ESLint
```

---

## Protocolo de atualização

Sempre que ocorrer qualquer um dos eventos abaixo, atualize este arquivo:

- Novo padrão de código → adicionar em "Padrões obrigatórios"
- Decisão arquitetural → criar MD em `conversas/` + linkar em "Decisões críticas"
- Novo módulo ou seção relevante → linkar em "Mapa de módulos"
- Nova integração → atualizar tabela
- Nova nota de referência no vault → adicionar link `[[nota]]` na seção correspondente

**Regra:** menor caminho entre pergunta e resposta. Se precisar de mais de 2 saltos, adicione o atalho aqui.

# ZIA Omnisystem

Plataforma empresarial modular e multiempresa da ZITA Software Solutions. O projeto reúne gestão comercial, operacional e administrativa em uma única aplicação, com isolamento de dados por holding, matriz e filial.

## Módulos

- **CRM e Vendas:** clientes, funis, negociações, prospecção e escuta inteligente.
- **ERP / Backoffice:** cadastros, estoque, pedidos, caixa, faturamento, financeiro, custos e projetos.
- **Pessoas (RH):** colaboradores, cargos, departamentos, férias, comissões e recrutamento.
- **Ativos (EAM):** cadastro, manutenção, depreciação, alertas e RFID.
- **Logística (SCM):** fornecedores, embarques, entregas e fretes.
- **Documentos (GED):** arquivos, imagens e organização documental.
- **Assinaturas:** planos, clientes, cobranças e acompanhamento de contratos.
- **IA:** agentes, conversas, WhatsApp, agenda, memórias e automações.
- **Qualidade, configurações e administração da plataforma.**
- **Portal público de vagas.**

## Tecnologias principais

- React 19 e TypeScript 5.9
- Vite 7 e Tailwind CSS 4
- React Router 7
- Supabase (PostgreSQL, RLS, Storage e Edge Functions)
- Cloudflare Workers/Assets para publicação
- Recharts, React Flow, Konva, jsPDF e dnd-kit

## Estrutura do projeto

```text
src/
├── components/            # Componentes globais e compartilhados
├── context/               # Estado global, perfis, empresas, alertas e tema
├── features/              # Módulos funcionais da plataforma
│   ├── crm/
│   ├── erp/
│   ├── hr/
│   ├── eam/
│   ├── scm/
│   ├── docs/
│   ├── assinaturas/
│   ├── ia/
│   └── settings/
├── hooks/                 # Hooks reutilizáveis
├── lib/                   # Acesso a dados, integrações e regras compartilhadas
└── pages/                 # Páginas públicas auxiliares

supabase/
├── functions/             # Edge Functions
└── migrations/            # Schema, funções, grants e policies RLS

public/
├── home.html              # Site institucional/vendas
├── site.css
├── site.js
└── assets/

worker.js                  # Roteamento do site e da SPA no Cloudflare
wrangler.toml              # Configuração do Cloudflare Worker
```

## Pré-requisitos

- Node.js 20 ou superior
- npm
- Um projeto Supabase configurado
- Wrangler, caso seja necessário publicar no Cloudflare

## Instalação

```bash
git clone <URL_DO_REPOSITORIO>
cd ZIA-NOVO
npm install
cp .env.example .env.local # se o arquivo de exemplo estiver disponível
npm run dev
```

O Vite informará no terminal o endereço local, normalmente `http://localhost:5173`.

> Não coloque service role keys ou outros segredos administrativos em variáveis iniciadas por `VITE_`. Toda variável `VITE_*` é incorporada ao frontend e pode ser vista pelo navegador.

## Variáveis de ambiente

### Frontend

Crie um arquivo `.env.local` na raiz para desenvolvimento:

```dotenv
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
VITE_GOOGLE_CLIENT_ID=SEU_CLIENT_ID.apps.googleusercontent.com
```

Dependendo das integrações habilitadas, outros módulos podem exigir variáveis adicionais. Pesquise por `import.meta.env` antes de configurar um novo ambiente:

```bash
rg "import\.meta\.env" src
```

### Supabase Edge Functions

As funções usam segredos configurados no próprio Supabase. Entre os principais estão:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ZIA_JWT_SECRET
ZIA_ADMIN_CODE
ZIA_ADMIN_PASS
ALLOWED_ORIGINS
```

Funções específicas de IA, WhatsApp, mapas e serviços externos podem exigir credenciais adicionais. Consulte o cabeçalho da função em `supabase/functions/<nome>/index.ts` antes de publicá-la.

## Comandos disponíveis

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento com HMR. |
| `npm run build` | Executa o TypeScript e gera a aplicação de produção em `dist/`. |
| `npm run lint` | Analisa o projeto com ESLint. |
| `npm run preview` | Serve localmente o conteúdo já compilado. |

Antes de enviar uma mudança, execute:

```bash
npm run lint
npm run build
```

## Site público e plataforma

O mesmo deploy atende dois produtos:

- `/` entrega `public/home.html`, o site institucional e de vendas;
- `/app` e `/app/*` entregam a SPA React, incluindo login e módulos;
- `/admin` entrega o painel administrativo;
- outras rotas da SPA, como `/vagas`, também são resolvidas pelo React Router.

Os links entre o site e a plataforma devem usar caminhos relativos ao domínio, por exemplo:

```html
<a href="/app">Login</a>
```

Não fixe o domínio de produção no HTML. Assim, o login continua no domínio que serviu o site e funciona igualmente em produção, homologação e desenvolvimento.

## Autenticação e multi-tenancy

A plataforma usa autenticação customizada:

1. O operador informa código e senha.
2. A Edge Function `zia-auth` valida as credenciais.
3. A função emite um JWT com `role: authenticated` e os metadados do perfil.
4. O token contém `scope_ids`, que representam as empresas acessíveis.
5. O cliente Supabase adiciona o JWT às requisições ao PostgREST.
6. As policies RLS validam o tenant no servidor.

Hierarquia de acesso:

```text
Holding → holding, matrizes e filiais
Matriz  → matriz e suas filiais
Filial  → somente a própria filial
```

O JWT é armazenado no `sessionStorage`. Atualmente, a sessão não é restaurada após um recarregamento completo da página; o usuário deve autenticar novamente.

> Alterações em autenticação, JWT, `tenant_id`, `scope_ids`, grants ou RLS são de alto risco. Nunca confie somente em filtros do frontend para isolamento de dados.

## Banco de dados e migrations

As alterações de banco ficam em `supabase/migrations/` e devem ser aplicadas na ordem cronológica. Não altere uma migration que já foi executada em produção; crie uma nova migration corretiva.

Ao criar tabelas ou operações novas:

1. defina a coluna de tenant adequada;
2. habilite RLS;
3. crie policies para os papéis corretos;
4. revise grants para `anon`, `authenticated` e `service_role`;
5. teste usuários de holdings, matrizes e filiais distintas.

## Deploy no Cloudflare

O build é publicado como Cloudflare Worker com assets estáticos:

```bash
npm run build
npx wrangler deploy
```

O `worker.js` é responsável por servir a landing page na raiz e encaminhar as rotas internas para `index.html`. O diretório publicado é `dist`, conforme `wrangler.toml`.

Configure as variáveis e os segredos no ambiente de deploy antes da publicação. Nunca versione arquivos `.env.local` ou credenciais privadas.

## Convenções para desenvolvimento

- Mantenha cada domínio dentro de `src/features/<modulo>`.
- Prefira componentes e hooks menores ao ampliar arquivos muito extensos.
- Centralize acesso a dados e integrações em `src/lib` quando forem compartilhados.
- Use lazy loading para novas seções grandes.
- Preserve os Error Boundaries dos módulos.
- Não use `auth.uid()` nas policies enquanto a autenticação customizada estiver ativa.
- Faça alterações de RLS somente após revisar o contrato de autenticação e tenant.
- Atualize a versão de `package.json` e `src/lib/version.ts` em conjunto.

## Solução de problemas

### O login abre um domínio antigo

Verifique se o site possui URLs absolutas antigas:

```bash
rg -n "https?://.*(/app|login)" public src
```

O link correto no site deve ser `/app`. Depois da correção, gere um novo build e publique novamente. Caso o link antigo continue aparecendo, limpe o cache do Cloudflare e confirme se o Worker ativo corresponde ao deploy mais recente.

### A página interna retorna 404

Confirme que o Worker está publicado e que as rotas da SPA retornam `index.html`. Acessos diretos como `/app/crm` dependem desse fallback.

### O usuário entra, mas não vê dados

Confira, nesta ordem:

1. validade e claims do JWT;
2. `entity_id` e `scope_ids` do perfil;
3. tenant gravado na tabela;
4. grants do papel `authenticated`;
5. policy RLS da tabela consultada.

### O build falha

Execute separadamente:

```bash
npx tsc -b
npx vite build
```

Isso ajuda a distinguir erros de tipos de erros no empacotamento.

## Licença e uso

Projeto privado da ZITA Software Solutions. O código, a identidade visual e os dados do sistema não devem ser distribuídos sem autorização.

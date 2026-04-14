# ZIA Omnisystem — Guia de Referências

> **Leia primeiro, implemente depois.**
> Este arquivo é um índice de navegação, não documentação.
> Antes de alterar qualquer coisa, consulte a referência do módulo.
> **Mantenha este arquivo atualizado**: ao descobrir novo padrão, decisão ou criar novo MD de referência, adicione aqui.

---

## Projeto

**ZIA / ZITA** — ERP+CRM+RH+EAM+SCM+IA modular para PMEs brasileiras.
Stack: React 19 · TypeScript 5.9 · Tailwind v4 · React Router v7 · Vite 7 · Supabase · Lucide icons.
Deploy: Cloudflare Pages (principal) · Vercel (legado). Worker Zeus: `wrangler.toml`.

---

## Onde procurar — por tema

| Preciso de… | Leia primeiro |
|-------------|--------------|
| Padrão de estrutura de módulo | `src/features/hr/` (módulo mais completo — 30+ seções) |
| Como conectar seção ao Supabase | `src/lib/supabase.ts` + `src/context/CompaniesContext.tsx` |
| RLS e isolamento multi-tenant | `conversas/ZIA-Core/ZITA-Supabase-RLS-Correcao-e-Lancamento.md` |
| Padrão de Layout + Sidebar | `src/features/hr/HRLayout.tsx` como modelo |
| Árvore de custos / costEngine | `src/features/erp/sections/financeiro/costEngine.ts` + `ArvoreCustos.tsx` |
| Comissões e grupos de produto | `conversas/ERP/ERP-Comissoes-Vendedores-Grupos-RH-Integracao.md` |
| Editor de orçamento (canvas) | `src/features/crm/sections/orcamentos/canvas/CanvasEditor.tsx` |
| Motor de campos dinâmicos | `src/lib/proposalFieldEngine.ts` |
| Agentes IA no ZITA | `src/features/ia/` + `src/pages/ia/` + `src/lib/apiKeys.ts` |
| Zeus (agente orquestrador) | `conversas/IA/Agente-Zeus-Prompt-Motor-Raciocinio.md` |
| Worker Cloudflare (Zeus webhook) | `wrangler.toml` + `conversas/Infra/Worker-Zeus-Cloudflare-Flowise-Webhook.md` |
| WhatsApp + Evolution API | `conversas/ZIA-Core/ZITA-WhatsApp-Evolution-API-Integracao.md` |
| API keys para agentes externos | `src/features/settings/sections/APIIntegracoes.tsx` + `src/lib/apiKeys.ts` |
| Google OAuth | `src/hooks/useGoogleAuth.ts` + `src/lib/googleAuth.ts` |
| Deploy Cloudflare multi-página | `conversas/Infra/Cloudflare-Deploy-ZITA-Paginas-Multiplas.md` |
| Integração Flowise / Railway | `conversas/Infra/Railway-Flowise-Volume-Persistencia.md` |
| Faturamento / NF-e | `conversas/ERP/ERP-Financeiro-Detalhamento-NF-Integracoes-Fiscais.md` |
| Visão completa do ERP | `conversas/ERP/ERP-Visao-Geral-Modulos-Operacoes-Financeiro.md` |
| Arquitetura multi-agente | `conversas/IA/Agentes-IA-Arquitetura-Multi-Agente.md` |
| App mobile (Capacitor/PWA) | `conversas/ZIA-Core/ZITA-App-Mobile-Capacitor-PWA.md` |

---

## Mapa de módulos → arquivos-chave

```
features/erp/   ERPLayout.tsx · ERPModule.tsx · Finance.tsx · Taxes.tsx
  sections/financeiro/  ArvoreCustos · costEngine · Comissoes · Impostos · GruposCusto
  sections/             Caixa · Faturamento · PedidoVenda · CadProdutos · Propostas
lib/            erp.ts · faturamento.ts · financeiro.ts · payment.ts · assinaturas.ts

features/hr/    HRLayout.tsx · HRModule.tsx  (MODELO de padrão — ler antes de criar módulo)
features/crm/   CRMLayout · Negociacoes · Orcamentos · canvas/CanvasEditor
features/eam/   EAMLayout · sections/AssetMaintenance · AssetInventory
features/ia/    IALayout · sections/IAAgentes · AgentBuilder · IAConfiguracoes
features/scm/   SCMLayout (em desenvolvimento)
features/assinaturas/  AssinaturasLayout · Planos · ClientesAssinatura

context/        AppContext · CompaniesContext · ProfileContext · AIConfigContext
components/     Layout/Header · Layout/ModuleSidebar · ChatFlutuante · UI/TenantSelector
pages/ia/       IAPage · views/AgentesView · views/ProspeccaoView · hooks/useChat
public/         landing.html · home.html · _redirects
```

---

## Referências do vault (ZITA-BRAIN)

Índice completo: `conversas/INDICE.md`
Notas de código (arquivo ↔ conversas): `conversas/Codigo/[modulo].md`

**Decisões críticas já tomadas — leia antes de alterar:**
- `conversas/ZIA-Core/ZITA-Supabase-RLS-Correcao-e-Lancamento.md` — RLS obrigatório
- `conversas/ERP/ERP-Multi-Tenant-Isolamento-Dados-Documentos.md` — isolamento por empresa
- `conversas/ERP/ERP-Arvore-de-Custos-Complexa-Escalavel.md` — lógica de custos
- `conversas/IA/Agente-Zeus-Prompt-Motor-Raciocinio.md` — prompt do Zeus
- `conversas/Infra/Railway-vs-Supabase-Arquitetura-Agentes.md` — decisão de plataforma
- `conversas/Infra/Render-vs-Railway-vs-Rawai-Comparativo-Custo.md` — custo de infra
- `conversas/ZIA-Core/ZITA-API-Modulo-IA-Para-Agentes-Externos.md` — API externa

---

## Padrões obrigatórios

**Estrutura de módulo:**
```
features/[modulo]/[Modulo]Layout.tsx   # Header + ModuleSidebar + <main> + NAV_GROUPS
features/[modulo]/[Modulo]Module.tsx   # switch(activeSection) → renderiza seção
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
- Tailwind inline — zero CSS externo · zero shadcn/MUI
- Ícones: apenas `lucide-react`
- Conteúdo visível: português · variáveis/funções: inglês
- `custom-scrollbar` em listas scrolláveis

**Dados:**
- Supabase já conectado — **não criar dados mock em seções novas**
- Sempre filtrar por `company_id` (RLS + multi-tenant)
- Migrations SQL vão em `supabase/migrations/`

**Dependências:** Não instalar sem perguntar. Já disponíveis: lodash · mathjs · recharts · @xyflow/react · konva · jspdf · html2canvas · framer-motion · dnd-kit · date-fns.

---

## Integrações previstas

| API | Para | Status |
|-----|------|--------|
| Focus NFe / NFe.io | NF-e, NFS-e, CT-e | Planejado |
| Asaas / Iugu / Efí | PIX, Boleto, Cartão | Planejado |
| Evolution API | WhatsApp Business | Planejado |
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

## Protocolo de atualização deste arquivo

**Sempre que:**
- Descobrir novo padrão de código → adicionar em "Padrões obrigatórios"
- Tomar decisão arquitetural → criar MD em `conversas/` e linkar em "Decisões críticas"
- Criar novo módulo ou seção relevante → adicionar em "Mapa de módulos"
- Adicionar nova integração → atualizar tabela "Integrações previstas"
- Criar nota de referência no vault → adicionar em "Referências do vault"

**Regra:** este arquivo deve ser o menor caminho entre uma pergunta e a resposta certa.
Se precisar de mais de 2 saltos para chegar à informação, adicione o atalho aqui.

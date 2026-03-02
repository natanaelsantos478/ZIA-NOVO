# ZIA Omnisystem — Contexto para Claude

Cole este arquivo no início de cada nova sessão para restaurar contexto completo.

---

## Projeto

**Nome:** ZIA Omnisystem (também chamado "ZIA mind" no header)
**Tipo:** Plataforma modular de gestão empresarial (ERP + CRM + RH + Qualidade + Logística + Ativos + Docs)
**Objetivo:** Substituir ERPs tradicionais (TOTVS, SAP) com UX moderna, implantação rápida e preço acessível para PMEs brasileiras
**Deploy:** Vercel (`vercel.json` presente)

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | React 19 |
| Linguagem | TypeScript 5.9 |
| Estilo | Tailwind CSS v4 (plugin Vite) |
| Roteamento | React Router v7 |
| Bundler | Vite 7 |
| Ícones | Lucide React |
| Estado global | React Context (`AppContext`) |
| Utilitários | Lodash, Math.js |
| Testes E2E | Playwright |
| Backend | **Nenhum ainda — tudo é mock/hardcoded** |

---

## Arquitetura

```
src/
├── App.tsx                    # Roteador raiz com lazy loading por módulo
├── main.tsx
├── context/
│   └── AppContext.tsx          # Estado global: config, BI, view atual
├── components/
│   ├── Layout/
│   │   ├── Header.tsx          # Header global (usado dentro de módulos)
│   │   ├── ModuleSidebar.tsx   # Sidebar reutilizável — aceita navGroups
│   │   └── Sidebar.tsx
│   ├── Modals/
│   │   ├── AuditModal.tsx
│   │   └── TransactionModal.tsx
│   └── UI/
│       ├── Loader.tsx
│       └── Toast.tsx
├── features/
│   ├── hub/
│   │   ├── ModuleHub.tsx       # Dashboard central /app — mostra KPIs de todos os módulos
│   │   └── ModuleLayout.tsx
│   ├── crm/                   # /app/crm/*     — cor: purple
│   ├── hr/                    # /app/hr/*      — cor: pink    ← MAIS COMPLETO
│   ├── eam/                   # /app/assets/*  — cor: blue
│   ├── scm/                   # /app/logistics/*— cor: emerald
│   ├── erp/                   # /app/backoffice/*— cor: slate  ← EM DESENVOLVIMENTO
│   ├── quality/               # /app/quality/* — cor: green
│   ├── docs/                  # /app/docs/*    — cor: amber
│   └── settings/              # /app/settings/*— cor: slate
└── lib/
    └── proposalFieldEngine.ts  # Motor de campos dinâmicos para propostas
```

### Padrão de cada módulo

```
features/[modulo]/
├── [Modulo]Layout.tsx    # Layout: Header + ModuleSidebar + <main>
│                         # Define NAV_GROUPS e controla activeSection via useState
├── [Modulo]Module.tsx    # Switch/if que renderiza a section ativa
└── sections/
    ├── SectionA.tsx
    ├── SectionB.tsx
    └── ...
```

### ModuleSidebar

```tsx
<ModuleSidebar
  moduleTitle="Nome do Módulo"
  moduleCode="COD"          // ex: "RH", "ERP", "CRM"
  color="pink"              // chave do mapa COLORS
  navGroups={NAV_GROUPS}    // array de { label, items: [{icon, label, id}] }
  activeId={activeSection}
  onNavigate={setActiveSection}
/>
```

**Cores disponíveis:** `purple` | `pink` | `blue` | `emerald` | `green` | `amber` | `slate`

---

## Status dos Módulos

| Módulo | Rota | Cor | Status |
|--------|------|-----|--------|
| **Hub (Dashboard)** | `/app` | — | Completo — KPIs, gráficos, drill-down, painel BI |
| **CRM** | `/app/crm/*` | purple | Funcional — CustomerList, CustomerDetail, Pipeline |
| **RH** | `/app/hr/*` | pink | **Mais completo** — ~30 seções implementadas |
| **EAM** | `/app/assets/*` | blue | Parcial — Dashboard, Register, Rfid |
| **SCM (Logística)** | `/app/logistics/*` | emerald | Apenas layout |
| **ERP (Backoffice)** | `/app/backoffice/*` | slate | **Apenas layout — próximo a ser construído** |
| **Qualidade** | `/app/quality/*` | green | Funcional |
| **Docs** | `/app/docs/*` | amber | Funcional |
| **Settings** | `/app/settings/*` | slate | Funcional |

---

## Módulo ERP — Seções planejadas

Todas as seções estão no `ERPLayout.tsx` mas exibem "em desenvolvimento".
A ordem de implementação sugerida:

```
Prioridade 1 — Core Financeiro
  finance      → Dashboard financeiro + visão geral
  ar           → Contas a Receber (títulos, boleto/PIX via Asaas)
  ap           → Contas a Pagar (lançamentos, aprovação, baixa)
  treasury     → Tesouraria (fluxo de caixa, saldos)

Prioridade 2 — Fiscal
  taxes        → Motor Fiscal: tabelas ICMS/ISS/PIS/COFINS configuráveis
  invoicing    → Faturamento + NF-e (via Focus NFe API)

Prioridade 3 — Suprimentos
  inventory    → Gestão de Estoque (multi-depósito, lote, série)
  procurement  → Compras (requisição → PO → recebimento)

Prioridade 4 — Controle
  controller   → Controladoria + DRE gerencial
  accounting   → Contabilidade + SPED
  costs        → Custos de produção

Prioridade 5 — Especializado
  mrp          → MRP (Materiais)
  pcp          → PCP (Produção)
  contracts    → Gestão de Contratos
  projects     → Obras e Projetos
  audit        → Auditoria e Log Trail
  bids         → Licitações
  csc          → CSC (Serviços Internos)
  crypto       → Ledger Blockchain
```

---

## Módulo RH — Seções implementadas

```
Estrutura Organizacional:  employees, org-chart, positions, groups
Recrutamento:              vacancies, onboarding, admission, contractors
Jornada e Ponto:           timesheet, schedules, overtime, hour-bank,
                           punch-corrections, absences, point-alerts
Remuneração:               payroll, payroll-groups, employee-payslip,
                           vacations, benefits
Atividades:                activities, productivity, notes
Desenvolvimento:           performance, employee-portal, travel-expenses,
                           occupational-health
Desligamento e IA:         offboarding, hr-alerts, people-analytics
```

---

## Convenções de código

- Componentes: PascalCase, um por arquivo
- Props: interface explícita acima do componente
- IDs de seção: kebab-case (`'payroll-groups'`, `'org-chart'`)
- Tailwind: classes inline, sem CSS modules
- Ícones: sempre de `lucide-react`
- Sem bibliotecas de UI (sem shadcn, sem MUI) — tudo customizado com Tailwind
- Dados mock: hardcoded no próprio arquivo do componente (sem API ainda)
- `custom-scrollbar`: classe CSS global aplicada em listas scrolláveis

---

## Integrações fiscais e financeiras previstas

| Serviço | Finalidade |
|---------|-----------|
| **Focus NFe / NFe.io** | NF-e, NFS-e, NFC-e, CT-e (evita homologação direta SEFAZ) |
| **Asaas / Iugu / Efí** | PIX, Boleto, Cartão — PSPs com API REST simples |
| **ViaCEP** | Consulta de CEP (gratuito) |
| **ReceitaWS** | Consulta de CNPJ (gratuito) |
| **D4Sign / BRy** | Assinatura digital de contratos |

---

## Comandos úteis

```bash
npm run dev      # Inicia dev server (Vite)
npm run build    # Build de produção (tsc + vite build)
npm run preview  # Preview do build local
npm run lint     # ESLint
```

---

## Regras para Claude nesta sessão

1. **Foco no módulo informado** — não tocar em outros módulos
2. **Seguir o padrão existente** — Layout + Module + sections/
3. **Dados mock no componente** — sem backend ainda
4. **Sem instalar dependências novas** sem perguntar
5. **Tailwind inline** — sem CSS externo
6. **Português** no conteúdo visível ao usuário, inglês nos nomes de variáveis/funções

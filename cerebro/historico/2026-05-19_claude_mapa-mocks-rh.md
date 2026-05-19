---
agente: claude
data: 2026-05-19
tema: mapa exaustivo de mocks do modulo rh
branch: claude/investigate-hr-module-Pmn4t
---

# Mapa exaustivo de MOCKS — Módulo RH (`src/features/hr/`)

> Investigação de 31 seções + 6 dept tabs + HRModule/HRLayout.
> "Mock" = array/objeto literal hardcoded exibido como dado real, OU texto que
> afirma integração/IA inexistente, OU KPI com número fixo no código.

## Resumo

| Classificação | Qtd |
|---|---|
| **REAL** (Supabase, sem mock) | 4 |
| **HÍBRIDO** (real + mock misturado) | 9 |
| **MOCK TOTAL** (100% fabricado, ignora lib/hr.ts) | 12 |
| **MOCK VAZIO** (arrays vazios, finge KPIs/dados) | 6 |

Funções de `lib/hr.ts` que existem mas nenhuma seção usa: `getOvertimeRequests`,
`createOvertimeRequest`, `getHourBank`, `getPunchCorrections`, `getOffboardings`,
`getTravelExpenses`, `getOccupationalHealth`, `getPerformanceReviews`,
`getHrAlerts`, `resolveHrAlert`, `getHrActivities`, `createHrActivity`,
`getEmployeeNotes`/`createEmployeeNote` (usadas só em `Employees.tsx`).

## Cluster 1.1 — Estrutura Organizacional

- **Employees.tsx** (1561) → **REAL**. CRUD completo via Supabase. Botões sem
  onClick: "Exportar" (l.1472), paginação (l.1553) — decorativos.
- **OrgChart.tsx** (446) → **HÍBRIDO**. Real: `getDepartments`/`createDepartment`.
  Mock: `COMPANIES` 5 empresas fixas (l.37), `mapDept` força `companyId:'matriz'`
  (filtro de empresa é teatro), `ROOT_NODE` fixo (l.47), KPI "Cargos" = `'—'`.
- **Positions.tsx** (1476) → **HÍBRIDO**. Real: aba "Descrição de Cargos".
  Mock total: `GRADES` (l.73, salvar só faz onClose), `BUDGET` 9 depts fictícios
  (l.84). "(vínculo em breve)" = feature falsa.
- **EmployeeGroups.tsx** (466) → **REAL**. CRUD funcional, sem mock.

### dept/
- **TabColaboradores** (359) → **REAL** (`getEmployees` por dept).
- **TabFinanceiro** (300) → **MOCK TOTAL**. `PERSONNEL`/`INDIRECT_ERP` fixos;
  banner verde **"ERP conectado — dados sincronizados automaticamente"**,
  "Última sincronização: 27/01/2025" (l.257-265). Mentira sobre integração.
- **TabSaude** (133) → **MOCK TOTAL**. `EXAMS`/`LEAVES`/`INDICATORS` fixos;
  KPIs "Absenteísmo 3,8%", "Saúde 82/100" hardcoded.
- **TabSatisfacao** (683) → **MOCK TOTAL**. `INIT_SURVEYS` link
  `pesquisa.zia.com.br` (domínio fictício); KPI "NPS +42"; `ResultsModal`
  resultados **simulados** (`pcts=[5,8,12,...]`, "Média 3,8" fixo).
- **TabAutomacoes** (286) → **MOCK TOTAL**. `INIT` 5 automações fixas
  (comentário literal `/* Mock data */`).

## Cluster 1.2 — Recrutamento

- **Vacancies.tsx** (897) → **HÍBRIDO**. Real via `useVacancies`. KPIs
  hardcoded: **"TMA 31"** e **"Conversão 4,1%"** (l.61-66). Botão "Filtros" sem onClick.
- **Onboarding.tsx** (277) → **REAL** (`getOnboardingProcesses`).
- **Admission.tsx** (334) → **HÍBRIDO**. Real: `getAdmissions`/`createAdmission`.
  Mock: KPI "Este Mês 3"; `NewAdmissionForm` inteiro NÃO salva (botão sem onClick).
- **Contractors.tsx** (393) → **HÍBRIDO**. Real: get/create. Mock: `NF_HISTORY=[]`
  sempre vazio; KPI "R$ 48.300"; "Competência: Fevereiro/2025" fixo; upload de NF inerte.

## Cluster 1.3 — Jornada e Ponto

- **Timesheet.tsx** (251) → **HÍBRIDO**. Real: `getTimesheetEntries`. Footer
  "160h 47min"/"+01:02" fixo; "/2025" fixo; "Exportar PDF" e filtro de data inertes.
- **Schedules.tsx** (376) → **MOCK TOTAL**. `SHIFTS`/`ZIA_ALERTS` 4 alertas IA
  falsos; calendário fixo "Fevereiro 2025"; vários botões sem onClick.
- **Overtime.tsx** (279) → **MOCK VAZIO**. `RECORDS=[]`; **não chama
  `getOvertimeRequests`**. KPIs "24h 00min"/"3" fixos sobre vazio.
- **HourBank.tsx** (204) → **MOCK VAZIO**. `EMPLOYEES=[]`; não chama `getHourBank`;
  "vencimento em fevereiro" hardcoded.
- **PunchCorrections.tsx** (298) → **MOCK VAZIO**. `CORRECTIONS=[]`; não chama
  `getPunchCorrections`; dropdown de colaboradores fixo; botões sem onClick.
- **Absences.tsx** (434) → **HÍBRIDO**. Real: get/create. `PlannedTab` mock
  (array vazio literal). "Lançar Atestado" grava `evidence_file:'atestado_simulado.pdf'`.
- **PointAlerts.tsx** (391) → **MOCK TOTAL**. `RULES`/`HISTORY` fixos com
  datas fev/2025; toggle só local.

## Cluster 1.4 — Remuneração e Folha

- **Payroll.tsx** (291) → **HÍBRIDO**. Real: `getPayrollRuns`/`getPayrollItems`.
  Mock: "/2025" fixo; INSS emp. = `totalGross*0.28` (fórmula fake); 4 abas
  placeholder; "integrado ao ERP" enganoso; botões sem onClick.
- **PayrollGroups.tsx** (248) → **MOCK TOTAL**. `GROUPS` 4 grupos fixos,
  CNPJs fictícios, "186 func.", `lastProcessed:'05/01/2025'`.
- **EmployeePayslip.tsx** (423) → **MOCK VAZIO**. TODOS arrays vazios;
  `COMPETENCE='Fevereiro/2025'`; cards "Saldo +18h 20min", "Dias Úteis 19" fixos;
  "Comissões integradas em tempo real via CRM" falso.
- **Vacations.tsx** (337) → **HÍBRIDO**. Real: `getVacations`. Aba "ZIA
  Sugestões" mock (`ZIA_SUGGESTIONS` 3 nomes fictícios). "Programar Férias" sem onClick.
- **Benefits.tsx** (453) → **HÍBRIDO**. Real: `getBenefitsOperators`/
  `getEmployeeBenefits`. KPI "186"; aba "Elegibilidade" 100% mock; **narrativa
  OAuth 2.0 / sync 30min inteiramente fabricada**; botões sem onClick.

## Cluster 1.5 — Atividades e Produtividade

- **Activities.tsx** (1101) → **MOCK TOTAL**. `INITIAL_ACTIVITIES`/`GROUPS`/
  `COSTS` fixos; não usa `getHrActivities`; comentário literal `/* Mock data */`.
- **Productivity.tsx** (309) → **MOCK TOTAL**. `EMPLOYEES=[]`; `METRICS`
  "Eficiência 87.3%" fixo; "Insights ZIA" 3 strings fixas.
- **Notes.tsx** (373) → **MOCK TOTAL**. `NOTE_TYPES` fixos; `WARNINGS=[]`;
  não usa `getEmployeeNotes`; "Integração Jurídica ativa" falso.

## Cluster 1.6 — Desenvolvimento e Saúde

- **Performance.tsx** (473) → **MOCK TOTAL**. `EVAL_CYCLES`/`COURSES`/
  `SUCCESSION_ROLES` fixos ("186 participants"); não usa `getPerformanceReviews`;
  "ZIA cruzou avaliação com turnover" falso.
- **EmployeePortal.tsx** (251) → **MOCK TOTAL**. `REQUESTS` 7 fictícios;
  "OCR automático"/"SSO corporativo" inexistentes.
- **TravelExpenses.tsx** (314) → **MOCK VAZIO**. `TRAVELS/EXPENSES/CARD=[]`;
  não usa `getTravelExpenses`; "conciliação automática cartão — sync há 15 min" falso.
- **OccupationalHealth.tsx** (411) → **HÍBRIDO/MOCK**. Não usa
  `getOccupationalHealth`; `ASOS/ACCIDENTS=[]` mas `EPIS`/`REGULATORY_DOCS`
  hardcoded (datas 2026, "Dr. Cláudio Ávila" fictício).

## Cluster 1.7 — Desligamento e IA

- **Offboarding.tsx** (247) → **MOCK VAZIO**. `TERMINATIONS=[]`; não usa
  `getOffboardings`; "TRCT digital + EAM + bloqueio de acessos" inexistente.
- **HRAlerts.tsx** (245) → **MOCK TOTAL**. `RULES_INITIAL` 8 fixas;
  `ACTIVE_ALERTS=[]`; não usa `getHrAlerts`/`resolveHrAlert`.
- **PeopleAnalytics.tsx** (420) → **MOCK TOTAL**. `TURNOVER_RISKS=[]`;
  `STRATEGIC_RECS` 6 colaboradores com salário/ROI **inventados**; "Score de
  Turnover / ZIA cruzou compa-ratio + burnout" — **nenhuma IA real**.

## Padrões transversais de engano

1. **Falsa integração ERP/CRM/API** — TabFinanceiro, Benefits, EmployeePayslip,
   Notes, TravelExpenses, Payroll.
2. **Falsa IA "ZIA"** — Schedules, Vacations, Productivity, Performance,
   PeopleAnalytics, Absences.
3. **Datas hardcoded** — "Fevereiro/2025", "/2025", "fev/2026" (hoje é 2026-05-19).
4. **KPIs literais sobre vazio** — "186 colaboradores", "87.3%", "NPS +42",
   "TMA 31", "R$ 48.300".
5. **13+ funções lib/hr.ts órfãs** — backend pronto, faltou fiar.
6. **Botões fantasma** — "Novo X"/"Exportar"/"Processar" sem onClick em massa.

### Prioridade de conexão (lib/hr.ts já pronta — só fiar)
Alta: Overtime, HourBank, PunchCorrections, Offboarding, TravelExpenses,
OccupationalHealth, HRAlerts, Activities, Notes, Performance.
Média (completar abas mock): Positions (Grades/Budget), Absences (Planned),
Vacations (ZIA), Payroll (não-mensais), Benefits (Elegibilidade + remover OAuth),
Vacancies (KPIs).
Sem backend (decidir criar tabela/remover): TabFinanceiro, TabSaude,
TabSatisfacao, TabAutomacoes, PayrollGroups, EmployeePortal, PeopleAnalytics,
Schedules, PointAlerts, EmployeePayslip.

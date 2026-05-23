---
agente: claude
data: 2026-05-19
tema: auditoria completa modulo rh
branch: claude/investigate-hr-module-Pmn4t
---

# Auditoria Técnica Completa — Módulo RH (ZIA-NOVO)

> Investigação profunda de 38 arquivos, ~16.000 linhas, schema vivo do Supabase e camada de dados `src/lib/hr.ts`.
> Metodologia: 6 agentes paralelos + leitura direta de arquivos críticos + inspeção via Supabase MCP.

---

## 1. VISÃO GERAL DA ARQUITETURA

### Estrutura de navegação
- **7 grupos** de navegação, **30 seções** lazy-loaded via `HRModule.tsx`
- `HRLayout.tsx` → `ModuleSidebar` (cor `pink`) → `HRModule.tsx` → `Suspense` + `switch(activeSection)`

### Camada de dados central
- `src/lib/hr.ts` (1.153 linhas): ~32 interfaces TypeScript + ~50 funções CRUD async no Supabase
- Tenant isolation: `getTenantIds()` (SELECT) e `getTenantId()` (INSERT/UPDATE/DELETE) via `zia_company_id`
- **Inconsistência crítica**: funções de leitura como `getVacancies`, `getAbsences`, `getOnboardingProcesses`, `getPayrollRuns`, `getVacations`, `getBenefitsOperators` **NÃO filtram por `zia_company_id`** — dependem exclusivamente do RLS (que é `USING(true)` = aberto) para 70% das tabelas HR

### Portal público de vagas
- Rotas `/vagas` e `/vagas/:slug` (sem autenticação) em `src/features/careers/`
- `VacanciesContext.tsx`: bridge real entre ATS interno e portal público — carrega vagas do Supabase, persiste candidatos
- Fluxo funcional de ponta-a-ponta: vaga criada → slug público → candidato aplica (salvo no Supabase)

---

## 2. SCHEMA DO BANCO (VIVO — Supabase ZITA, projeto tgeomsnxfcqwrxijjvek)

### Tabelas HR com dados reais em produção

| Tabela | Rows | RLS | UI usa? | Dado real na UI? |
|--------|------|-----|---------|-----------------|
| `employees` | 7 | ✅ | ✅ Employees.tsx | ✅ REAL |
| `departments` | 0 | ✅ | ✅ OrgChart.tsx | ✅ REAL (vazio) |
| `positions` | 20 | ✅ | ✅ Positions.tsx | ✅ REAL (DescriptionTab) |
| `vacancies` | 4 | ✅ | ✅ via VacanciesContext | ✅ REAL |
| `candidates` | 0 | ✅ | Só escrita (portal) | n/a |
| `admissions` | 6 | ✅ | ✅ Admission.tsx | ✅ REAL (leitura) |
| `contractors` | 4 | ✅ | ✅ Contractors.tsx | ✅ REAL |
| `absences` | 7 | ✅ | ✅ Absences.tsx | ✅ REAL |
| `vacations` | 8 | ✅ | ✅ Vacations.tsx | ✅ REAL |
| `payroll_groups` | 1 | ✅ | ❌ PayrollGroups mock | ❌ NUNCA LIDO |
| `payroll_runs` | 1 | ✅ | ✅ Payroll.tsx | ✅ REAL |
| `payroll_items` | 8 | ✅ | ✅ Payroll.tsx | ✅ REAL (sem cálculo) |
| `onboarding_processes` | 2 | ✅ | ✅ Onboarding.tsx | ✅ REAL (read-only) |
| `onboarding_steps` | 20 | ✅ | ✅ Onboarding.tsx | ✅ REAL (read-only) |
| `benefits_operators` | 6 | ✅ | ✅ Benefits.tsx | ✅ REAL |
| `employee_benefits` | 5 | ✅ | ✅ Benefits.tsx (lazy) | ✅ REAL |
| `performance_reviews` | 0 | ✅ | ❌ Performance mock | ❌ NUNCA LIDO |
| `travel_expenses` | **3** | ✅ | ❌ TravelExpenses mock | **❌ 3 rows ignoradas** |
| `occupational_health` | **6** | ✅ | ❌ OccupationalHealth mock | **❌ 6 rows ignoradas** |
| `offboarding` | 0 | ✅ | ❌ Offboarding mock | ❌ NUNCA LIDO |
| `timesheet_entries` | 0 | ✅ | ✅ Timesheet.tsx | ✅ REAL (vazio) |
| `hr_activities` | **8** | ✅ | ❌ Activities mock | **❌ 8 rows ignoradas** |
| `hour_bank` | **5** | ✅ | ❌ HourBank mock | **❌ 5 rows ignoradas** |
| `overtime_requests` | **4** | ✅ | ❌ Overtime mock | **❌ 4 rows ignoradas** |
| `punch_corrections` | **4** | ✅ | ❌ PunchCorrections mock | **❌ 4 rows ignoradas** |
| `employee_notes` | 0 | ✅ | ❌ Notes mock | ❌ NUNCA LIDO |
| `employee_groups` | 0 | ✅ | ✅ EmployeeGroups.tsx | ✅ REAL (vazio) |
| `hr_alerts` | **5** | ✅ | ❌ HRAlerts mock | **❌ 5 rows ignoradas** |
| `schedules` | 6 | ✅ | ❌ Schedules mock | **❌ 6 rows ignoradas** |
| `hr_schedules` | 0 | ✅ | ❌ | ❌ tabela extra sem uso |
| `salary_history` | 0 | ✅ | ✅ Employees.tsx | ✅ REAL |
| `position_history` | 0 | ✅ | ✅ Employees.tsx | ✅ REAL |
| `activity_automations` | 1 | ✅ | ❌ | ❌ sem frontend |
| `activity_groups` | 0 | ✅ | ❌ | ❌ sem frontend |
| `employee_group_members` | 0 | ✅ | ✅ EmployeeGroups.tsx | ✅ REAL |
| `hr_commissions` | ? | ✅ | ✅ Employees.tsx (leitura) + CRM (escrita) | ✅ REAL |

**Resumo: 20 tabelas HR têm dados reais ignorados pela UI ou são consultadas apenas parcialmente.**

### Tabelas HR ausentes no schema
Conceitos presentes na UI mas **sem tabela correspondente** no banco:
- Grades/faixas salariais (`GRADES` mock em Positions.tsx)
- Budget de headcount por departamento (`BUDGET` mock)
- Pesquisas de satisfação/clima (`INIT_SURVEYS` mock em TabSatisfacao)
- Automações por departamento (`INIT` mock em TabAutomacoes)
- EPIs / Programas regulatórios SST (PPRA/PCMSO/LTCAT/PGR)
- Acidentes de trabalho (CAT)
- Conciliação de cartão corporativo
- Solicitações do portal do colaborador

### Tabelas duplicadas (inconsistência)
- `schedules` (6 rows) **e** `hr_schedules` (0 rows) — duas tabelas para o mesmo conceito. `Schedules.tsx` não usa nenhuma das duas.

---

## 3. ANÁLISE DETALHADA POR CLUSTER

### 3.1 Estrutura Organizacional (4 seções + 5 dept/)

**Employees.tsx** (1.561 linhas) — **MAIS COMPLETA DO MÓDULO**
- Cadastro CRUD completo: create/read/update/delete funcionando
- Upload de foto no Supabase Storage (bucket `employee-photos`, com cache-busting)
- Ficha detalhada: 5 abas (dados, acesso, atividades, férias/anotações, grupos)
- Histórico de cargos, salários e **comissões CRM reais** (`getEmployeeCommissions`)
- Vinculação de `OperatorProfile` ao funcionário via `ProfileContext`
- **Bugs**: `admission_date` não persiste na edição; campo `manager` coletado mas descartado no create; paginação fake (todos os registros renderizados de uma vez); botão "Exportar" sem handler; delete sem confirmação na lista

**Positions.tsx** (1.476 linhas) — **MISTO (real + muito mock)**
- `DescriptionTab`: CRUD parcial (Create + Read + Delete, sem Update) — REAL
- `GradesTab`: 8 grades hardcoded (`GRADES[]`); `NewGradeModal` (400+ linhas de wizard) **não persiste nada** (`onClose` direto, sem save)
- `BudgetTab`: 9 departamentos hardcoded — 100% MOCK
- Calculadora de encargos CLT funcionalmente correta (INSS 20%, FGTS 8%, RAT, Terceiros, 13º, férias+1/3) mas **resultado descartado** no save
- `createPosition` perde: tipo, atividades, custos, RAT, provisões, família; força `headcount_planned: 1`

**OrgChart.tsx** (446 linhas) — **REAL com fachada multi-empresa**
- Árvore hierárquica real de departamentos (via `parent_id`) — REAL
- `COMPANIES[]`: 5 empresas hardcoded; filtro de empresa e coluna "Empresa" **completamente decorativos** (`companyId: 'matriz'` fixo em todos)
- **Bug concreto**: `INIT_FORM.parentId = 'ceo'` mas `handleSave` compara `'root'` → novo departamento sem pai salva `parent_id='ceo'` (string inválida, FK órfã)
- Botões "Importar"/"Exportar" sem handler

**EmployeeGroups.tsx** (466 linhas) — **MAIS COMPLETA EM CRUD (referência)**
- CRUD completo e funcional: criar, excluir grupo; adicionar/remover membros (lazy load)
- `updateEmployeeGroup` existe mas não usada (sem tela de edição)
- Melhor padrão de UX: confirmação de delete, busca, estados vazios com CTA

**dept/ (5 arquivos)** — **4 de 5 são mock**
- `TabColaboradores`: REAL (filtra employees por department_id) — melhor tratamento de erro do cluster (flag `alive` + UI de erro)
- `TabFinanceiro`: **100% MOCK + banner verde "ERP conectado — sincronizado automaticamente" = MENTIRA** sobre dados financeiros
- `TabSaude`: 100% MOCK (ignora `getOccupationalHealth`/`getAbsences` que existem)
- `TabAutomacoes`: 100% MOCK volátil (perde ao trocar de aba)
- `TabSatisfacao` (683 linhas): 100% MOCK; resultados de pesquisa com médias/NPS **fabricados**; link externo aponta domínio fictício; "copiar link" não copia nada

---

### 3.2 Recrutamento e Entrada (4 seções + portal público)

**Vacancies.tsx** (897 linhas) — **HÍBRIDA (wizard real, 3/5 abas mock)**
- `BoardTab` + `NewVacancyTab` (wizard 3 steps): REAL — cria vaga no Supabase, gera slug, copia link público
- `ClosedTab`: `CLOSED_VACANCIES` hardcoded com 4 registros fictícios
- `AnalysisTab`: métricas de funil 100% hardcoded ("316 candidaturas → 13 admitidos")
- `ZIAChatTab`: 3 mensagens mock, input decorativo, botões sem onClick — sem IA real
- Stats "TMA 31 dias" e "Taxa 4,1%" hardcoded misturados com stats reais
- `handlePublish` sem try/catch — falha silenciosa se Supabase rejeitar

**Portal público** (`CareersPage.tsx` + `VacancyDetailPage.tsx`) — **REAL**
- Lista vagas reais via `VacanciesContext` → `getVacancies()`
- Formulário de candidatura funcional (salva no Supabase via `addCandidateSupa`)
- Teste de perfil comportamental client-side (4 perguntas, heurística de moda)
- **Race condition**: sem loading no provider → "Vaga não encontrada" pisca enquanto `getVacancies()` está em voo
- **Falso positivo**: `setSubmitted(true)` executado antes da confirmação do Supabase (candidatura pode falhar com tela de "enviado")
- `getVacancyBySlug` de `lib/hr.ts` é dead code — portal usa memória do provider

**VacanciesContext.tsx** — **REAL (com lacuna crítica)**
- `candidates[]` inicia vazio e **nunca é carregado do Supabase** → `getCandidatesByVacancy()` retorna sempre `[]` após refresh
- Sem tela interna para gerenciar candidatos; `getCandidatesByVacancy` em `lib/hr.ts` = dead code
- `addCandidate` chama RPC `increment_candidate_count` que **pode não existir** (não está em nenhuma migration)

**Onboarding.tsx** (277 linhas) — **REAL, somente leitura**
- Lê `onboarding_processes` + `onboarding_steps` reais
- `updateOnboardingStep` existe mas não está conectado → impossível marcar etapa concluída pela UI
- Sem criação de processo (depende de inserção manual no banco)

**Admission.tsx** (334 linhas) — **REAL na leitura, FAKE na escrita**
- Lê `admissions` reais
- "Nova Admissão" cria registro stub ("Nova Admissão / 0%") que não pode ser editado
- Formulário completo (4 seções, 26+ campos) **sem `value`/`onChange`** — dados nunca capturados
- Botão "Salvar" sem onClick; `updateAdmission` = dead code

**Contractors.tsx** (393 linhas) — **REAL (Create + Read), FAKE (NF)**
- Create e Read funcionais; `updateContractor` = dead code
- Gerenciamento de NF: `NF_HISTORY = []` fixo, upload de evidência decorativo (sem `<input type=file>`)
- Competência/valor de NF hardcoded "Fevereiro/2025"

**Pipeline candidato→funcionário: NÃO EXISTE**
- Candidato → Admissão → Onboarding → Employee: zero código conectando essas etapas
- O `stage` na vaga é imutável pela UI; não há kanban de candidatos por estágio

---

### 3.3 Jornada e Ponto (7 seções)

**Veredito-resumo: 2 reais, 5 mock vazios com funções backend prontas**

| Seção | Lê Supabase | Escreve | Funções backend | Status |
|-------|-------------|---------|-----------------|--------|
| Timesheet | ✅ | ❌ | usada (args ignorados) | Leitura real; rodapé 160h/+01:02 **fake** |
| Schedules | ❌ | ❌ | **nenhuma existe** | Mock total; "ZIA" = texto fixo |
| Overtime | ❌ | ❌ | `get/create/update` **ociosas** | Mock vazio; aprovação falsa |
| HourBank | ❌ | ❌ | `getHourBank` **ociosa** | Mock vazio; `hour_bank` tem 5 rows reais |
| PunchCorrections | ❌ | ❌ | `get/create/update` **ociosas** | Mock vazio; `punch_corrections` tem 4 rows |
| Absences | ✅ (×3 calls) | ⚠️ stub | `updateAbsence` ociosa | Parcial; create insere dados falsos |
| PointAlerts | ❌ | ❌ | **nenhuma existe** | Mock total; sem motor de avaliação |

- **`Absences.tsx` cria registros com dados hardcoded**: `employee_name: 'Colaborador'`, `evidence_file: 'atestado_simulado.pdf'` — polui o banco
- **3 chamadas redundantes a `getAbsences()`** no mesmo componente (sem cache)
- DSR/desconto não calculados — apenas lidos de colunas pré-preenchidas
- Anos **hardcoded em 2025** em 4 telas enquanto o projeto opera em 2026
- `hour_bank` vs `hour_bank_entries`: service usa `hour_bank`, migration de RLS referenciava `hour_bank_entries` (tabela que não existe no banco vivo)

---

### 3.4 Remuneração e Folha (5 seções + hr_commissions)

**Payroll.tsx** (291 linhas) — **LEITURA REAL, zero motor de cálculo**
- Lê `payroll_runs` e `payroll_items` reais (1 run, 8 items em produção)
- INSS, IRRF, FGTS **não são calculados** — apenas lidos de colunas (precisam de processo externo inexistente)
- Encargo INSS patronal hardcoded como 28% (linha 252)
- Navegação de mês decorativa (não filtra dados; label "/2025" fixo)
- 4 das 5 abas são placeholder vazio
- Todos os botões sem onClick: "Processar Folha", "Fechar Folha", "Exportar"
- `updatePayrollItemStatus` em lib/hr.ts = dead code

**PayrollGroups.tsx** (248 linhas) — **100% MOCK**
- 4 grupos CLT/PJ/Estágio/Temporário hardcoded com CNPJs fictícios
- `getPayrollGroups()` (que filtra tenant corretamente!) = dead code; tabela tem 1 row real ignorada
- Schema real `PayrollGroup` muito mais pobre que o mock (falta cnpj, regras, inssRate)

**EmployeePayslip.tsx** (423 linhas) — **100% MOCK E VAZIO**
- `EMPLOYEES_LIST = []`, todos os arrays de proventos/descontos vazios → sempre R$ 0,00
- Cards de Banco de Horas e Folgas com **números hardcoded** (+18h 20min, 19 dias úteis) colados na casca vazia
- Texto "Comissões integradas em tempo real via módulo CRM" sem nenhuma chamada
- **Sem PDF de holerite** — zero `jspdf` em todo o módulo RH

**Vacations.tsx** (337 linhas) — **REAL (leitura) + mock (ZIA)**
- Lê `vacations` reais; status de vencimento calculado (única lógica de cálculo real do cluster)
- Terço constitucional apenas lido de coluna, sem cálculo
- `createVacation`/`updateVacation` = dead code; sem botão funcional de programar férias
- "Sugestões ZIA": 3 colaboradores com análise hardcoded — sem IA real
- `createVacation` não injeta `zia_company_id` — registro ficaria órfão de tenant se usado

**Benefits.tsx** (453 linhas) — **REAL (leitura) + API fake**
- Lê `benefits_operators` e `employee_benefits` reais (6+5 rows)
- "Integração 100% via API — OAuth 2.0 — a cada 30 minutos" repetido 4× — **puramente decorativo**, zero chamada HTTP a operadora alguma
- Aba Elegibilidade: 6 regras hardcoded; sem `createBenefitsOperator`/`updateEmployeeBenefit` em lib/hr.ts
- KPI "Colaboradores: 186" hardcoded

**hr_commissions (migração 20260313)** — **ÚNICA INTEGRAÇÃO CROSS-MODULE REAL**
- CRM (`FinalizacaoVenda.tsx`): grava `hr_commissions` ao finalizar venda ✅
- `Employees.tsx`: lê comissões por colaborador (pendente/pago) ✅
- **Lacuna**: comissão CRM → `payroll_items.commissions` → `folha_id` / `pago=true` **NÃO implementado**
- Os campos `pago` e `folha_id` existem na tabela e nunca são atualizados

---

### 3.5 Atividades e Produtividade (3 seções)

**Activities.tsx** (1.101 linhas) — **MOCK RICO (protótipo sofisticado)**
- Motor de automação cross-módulo com wizard de 4 passos, 7 módulos-fonte de gatilhos, 5 tipos de gatilho, fluxos em cadeia, custeio ABC com ROI
- `hr_activities` tem 8 rows reais; `INITIAL_ACTIVITIES = []` (vazio, usa estado local inicializado com 6 registros mock)
- **Incompatibilidade de modelo**: `Activity` (regra de automação) ≠ `HrActivity` (tarefa de colaborador) — modelos de domínio divergentes; conectar exige decisão arquitetural
- Funções `getHrActivities`/`createHrActivity`/`updateHrActivity` = dead code

**Productivity.tsx** (309 linhas) — **MISTO: lista vazia + métricas mock**
- `EMPLOYEES = []` — aba Individual honestamente vazia
- 4 métricas hardcoded ("Eficiência Operacional 87.3%") apresentadas como reais
- "Insights ZIA": 3 strings fixas, sem IA

**Notes.tsx** (373 linhas) — **MISTO: tipos mock + advertências vazias**
- 5 tipos de anotação hardcoded (NT001-NT005) vs `EmployeeNote` real (modelo diferente)
- `WARNINGS = []` — aba advertências honestamente vazia
- Todos os botões sem onClick

---

### 3.6 Desenvolvimento e Saúde (4 seções)

**Performance.tsx** (473 linhas) — **MOCK RICO**
- 4 ciclos de avaliação hardcoded; `BOX_EMPLOYEES = []` → matriz 9-Box vazia (parece funcional, é casca)
- 6 cursos LMS hardcoded; 3 cargos de sucessão com "notas ZIA" string fixas
- `getPerformanceReviews` = dead code; `performance_reviews` tem 0 rows

**EmployeePortal.tsx** (251 linhas) — **MOCK sem usuário real**
- 7 solicitações hardcoded (Carlos Eduardo Lima etc.); sem fetch nem sessão de colaborador
- Toggle de funcionalidades funciona apenas em estado local
- OCR de atestados: declarado, inexistente

**TravelExpenses.tsx** (314 linhas) — **3 ARRAYS VAZIOS**
- `TRAVELS = []`, `EXPENSES = []`, `CARD_ENTRIES = []`
- `travel_expenses` tem **3 rows reais ignoradas**
- Funções `getTravelExpenses`/`createTravelExpense`/`updateTravelExpense` = dead code
- **Caminho mais fácil de conectar ao Supabase** (modelo mais compatível)

**OccupationalHealth.tsx** (411 linhas) — **PARCIAL mock + real ignorado**
- `ASOS = []`, `ACCIDENTS = []` — tabs principais vazias
- `EPIS`: 6 EPIs hardcoded; `REGULATORY_DOCS`: 4 docs PPRA/PCMSO hardcoded
- `occupational_health` tem **6 rows reais ignoradas**
- "Geração automática de CAT + OS no EAM + afastamento + jurídico" = visual sem backend

---

### 3.7 Desligamento e IA (3 seções)

**Offboarding.tsx** (247 linhas) — **MOCK VAZIO**
- `TERMINATIONS = []` — tela completamente vazia
- `getOffboardings` = dead code; `offboarding` tem 0 rows
- Checklist rico (TRCT, EAM, bloqueio de acessos) puramente declarativo

**HRAlerts.tsx** (245 linhas) — **PARCIAL: regras mock + alertas vazios**
- 8 regras hardcoded (R001-R008) com toggle funcional apenas em memória local
- `ACTIVE_ALERTS = []` — tela de alertas disparados sempre vazia
- `hr_alerts` tem **5 rows reais ignoradas**
- `getHrAlerts`/`resolveHrAlert` = dead code

**PeopleAnalytics.tsx** (420 linhas) — **MOCK SOFISTICADO SEM IA**
- `TURNOVER_RISKS = []` — aba de risco de turnover vazia
- eNPS=42, promotores=58%, sentimento=62%/22%/16% — **constantes literais** (linhas 174-182)
- "148 respondentes · última pesquisa: 15/02/2026" — hardcoded
- 6 respostas de clima fabricadas (SR001-SR006)
- "Recomendação Estratégica ZIA": 6 colaboradores com ROI calculado — **dados inventados**
- "ZIA Sentiment Analysis com NLP" — **zero chamada a IA**; não importa lib/hr.ts, Gemini, Flowise

---

## 4. MAPA GLOBAL: REAL vs MOCK por seção

| Seção | Dados Reais | Mock Disfarçado | CRUD | Maturidade |
|-------|-------------|-----------------|------|-----------|
| Employees | ✅ REAL | Nenhum | Create/Read/Update/Delete | ⭐⭐⭐⭐ Alta |
| EmployeeGroups | ✅ REAL | Nenhum | Create/Read/Delete (falta Update) | ⭐⭐⭐⭐ Alta |
| Vacancies (board+wizard) | ✅ REAL | 3/5 abas mock | Create (falta Update/Delete) | ⭐⭐⭐ Média-alta |
| Portal público vagas | ✅ REAL | — | Create candidato | ⭐⭐⭐ Média-alta |
| OrgChart | ✅ REAL + empresa fake | 5 empresas mock | Só Create | ⭐⭐ Média |
| Contractors | ✅ REAL | NF inteira + 1 stat | Create (falta Update) | ⭐⭐ Média |
| Onboarding | ✅ REAL | Nenhum | Read-only | ⭐⭐ Média |
| Absences | ✅ REAL + stub | Folgas mock | Create (stub) | ⭐⭐ Média |
| Vacations | ✅ REAL | ZIA sugestões | Read-only | ⭐⭐ Média |
| Benefits | ✅ REAL | API operadora fake | Read-only | ⭐⭐ Média |
| Payroll | ✅ REAL | Mês decorativo + 4 abas | Read-only | ⭐⭐ Média |
| Timesheet | ✅ REAL | Rodapé fake | Read-only | ⭐⭐ Média |
| Positions (desc) | ✅ REAL | Grades + Budget mock | Create/Read/Delete | ⭐⭐ Média |
| Admission | ✅ REAL (leitura) | Form inteiro fake | Create stub | ⭐ Baixa |
| PayrollGroups | ❌ MOCK | Tudo | Nenhum | ⭐ Baixa |
| EmployeePayslip | ❌ MOCK/VAZIO | Tudo + valores fake | Nenhum | ⭐ Baixa |
| TabColaboradores (dept) | ✅ REAL | Ponto mock | Read-only | ⭐⭐ Média |
| TabFinanceiro (dept) | ❌ MOCK | Tudo + banner "ERP conectado" | Volátil | ⭐ Baixa |
| TabSaude (dept) | ❌ MOCK | Tudo | Estático | ⭐ Baixa |
| TabAutomacoes (dept) | ❌ MOCK | Tudo | Volátil | ⭐ Baixa |
| TabSatisfacao (dept) | ❌ MOCK | Resultados NPS/% fabricados | Volátil | ⭐ Baixa |
| Activities | ❌ MOCK (8 rows ignoradas) | Motor de automação fake | Volátil | ⭐ Baixa |
| Productivity | ❌ MOCK | Métricas 87.3% etc. | Nenhum | ⭐ Baixa |
| Notes | ❌ MOCK | Tipos hardcoded | Nenhum | ⭐ Baixa |
| Performance | ❌ MOCK | Ciclos/LMS/9-Box | Nenhum | ⭐ Baixa |
| EmployeePortal | ❌ MOCK | Solicitações fake | Toggle local | ⭐ Baixa |
| TravelExpenses | ❌ VAZIO (3 rows ignoradas) | — | Nenhum | ⭐ Baixa |
| OccupationalHealth | ❌ MISTO (6 rows ignoradas) | EPIs/Docs mock | Nenhum | ⭐ Baixa |
| Overtime | ❌ VAZIO (4 rows ignoradas) | Aprovação falsa | Nenhum | ⭐ Baixa |
| HourBank | ❌ VAZIO (5 rows ignoradas) | — | Nenhum | ⭐ Baixa |
| Schedules | ❌ MOCK (6 rows ignoradas) | "ZIA otimização" | Nenhum | ⭐ Baixa |
| PunchCorrections | ❌ VAZIO (4 rows ignoradas) | Workflow aprovação fake | Nenhum | ⭐ Baixa |
| Offboarding | ❌ VAZIO | Cálculo TRCT fake | Nenhum | ⭐ Baixa |
| HRAlerts | ❌ PARCIAL (5 rows ignoradas) | Regras hardcoded | Toggle local | ⭐ Baixa |
| PeopleAnalytics | ❌ MOCK SEM IA | eNPS/NLP/ROI fabricados | Nenhum | ⭐ Baixa |
| PointAlerts | ❌ MOCK (sem backend) | Motor de regras fake | Toggle local | ⭐ Baixa |

---

## 5. DÍVIDAS TÉCNICAS CRÍTICAS (PRIORIZADAS)

### 🔴 CRÍTICO — Segurança / Integridade de dados

**C1. Tabelas sem RLS (exposição total via anon key)**
12 tabelas sem RLS no banco de produção: `assinaturas_acessos`, `assinaturas_integracoes`, `assinaturas_integracoes_mapeamentos`, `assinaturas_plano_faixas`, `assinaturas_plano_metricas`, `assinaturas_plano_regras`, `assinaturas_config`, `erp_assinaturas_historico`, `erp_assinaturas_cobrancas`, `jessica_knowledge`, `jessica_conversations`, `whatsapp_conversations`.
Qualquer pessoa com a `anon key` pode ler/alterar todos esses dados.
> **SQL para correção**: `ALTER TABLE public.[tabela] ENABLE ROW LEVEL SECURITY;` — mas adicionar policies antes de habilitar para não bloquear acesso legítimo.

**C2. RLS das tabelas HR é `USING(true)` = open policy**
As tabelas `payroll_items`, `vacations`, `benefits_operators`, `employee_benefits`, `absences`, `onboarding_processes`, `contractors`, `admissions` etc. têm RLS habilitado mas com policy `USING(true)` — qualquer usuário autenticado vê dados de qualquer empresa. O filtro deveria estar no app (que não filtra) E no banco (que permite tudo).

**C3. Multi-tenant inconsistente em lib/hr.ts**
- `getVacancies`, `getAbsences`, `getOnboardingProcesses`, `getPayrollRuns`, `getPayrollItems`, `getVacations`, `getBenefitsOperators`, `getEmployeeBenefits`, `getTravelExpenses`, `getOccupationalHealth`, `getOffboardings`, `getTimesheetEntries`, `getHrActivities`, `getHourBank`, `getOvertimeRequests`, `getPunchCorrections`, `getEmployeeNotes`, `getEmployeeGroups`, `getHrAlerts` — **nenhuma filtra `zia_company_id` no app**
- `getEmployeesByPosition` (lib/hr.ts:1106) não filtra tenant — vaza employees de outros tenants

**C4. Banner "ERP conectado — dados sincronizados automaticamente" (TabFinanceiro)**
Exibido em contexto financeiro sobre dados 100% fabricados. Falsa afirmação de integração.

**C5. Resultados de pesquisa fabricados (TabSatisfacao)**
NPS, percentuais, médias apresentados como respostas reais de colaboradores — integridade de dados crítica.

**C6. Falso positivo de candidatura (VacancyDetailPage)**
`setSubmitted(true)` executado imediatamente, antes da confirmação do Supabase. Candidatura pode falhar com usuário vendo "Candidatura enviada!" incorretamente.

**C7. `createAbsence` insere dados hardcoded**
`employee_name: 'Colaborador'` e `evidence_file: 'atestado_simulado.pdf'` poluem a tabela `absences` em produção a cada clique em "Lançar Atestado".

### 🟠 ALTO — Funcionalidade core ausente

**A1. Sem motor de cálculo de folha**
INSS/IRRF/FGTS/13º/férias/rescisão não são calculados em nenhum lugar do código. `payroll_items` precisa ser pré-preenchido por processo externo inexistente.

**A2. Sem geração de holerite PDF**
`jspdf` está listado como dependência disponível mas **zero `import jsPDF`** em todo o módulo RH. EmployeePayslip é casca vazia.

**A3. Pipeline candidato→admissão→funcionário inexistente**
Candidatura no Supabase → sem promoção para admissão → sem criação de employee → sem onboarding automático. O fluxo core do RH está fragmentado.

**A4. Formulário de admissão sem binding**
`NewAdmissionForm` tem 26+ campos sem `value`/`onChange`. Cada clique em "Nova Admissão" cria um registro stub inútil no banco.

**A5. 21 funções CRUD em lib/hr.ts são dead code**
`updatePayrollItemStatus`, `createVacation`, `updateVacation`, `updateOnboardingStep`, `updateAdmission`, `updateContractor`, `updateAbsence`, `getPayrollGroups`, `getVacancyBySlug`, `getCandidatesByVacancy`, `getOvertimeRequests`, `createOvertimeRequest`, `updateOvertimeRequest`, `getHourBank`, `getPunchCorrections`, `createPunchCorrection`, `updatePunchCorrection`, `getEmployeeNotes`, `createEmployeeNote`, `resolveHrAlert`, `getOffboardings` — implementadas, testadas, **nunca chamadas**.

**A6. 20+ tabelas com dados reais ignorados pela UI**
`hr_alerts` (5 rows), `hr_activities` (8 rows), `overtime_requests` (4 rows), `punch_corrections` (4 rows), `hour_bank` (5 rows), `travel_expenses` (3 rows), `occupational_health` (6 rows), `schedules` (6 rows) — todas com dados reais que nunca aparecem na interface.

**A7. hr_commissions → folha não implementada**
CRM grava comissão, colaborador vê no histórico — mas `payroll_items.commissions` nunca é preenchido a partir de `hr_commissions`; campos `pago`/`folha_id` nunca atualizados.

### 🟡 MÉDIO — UX / qualidade

**M1. Botões sem handler em massa**
Exportar (Employees, Positions, Timesheet), Fechar/Processar Folha (Payroll), Nova Rescisão (Offboarding), Gerar TRCT PDF, Programar Férias (Vacations), Reconectar/Sincronizar (Benefits), Aprovar/Reprovar (Overtime, PunchCorrections, HRAlerts), Registrar Assinatura (Notes), Nova Regra (HRAlerts), Registrar Acidente/EPI/ASO (OccupationalHealth) — dezenas de botões de ação sem onClick.

**M2. Anos hardcoded em 2025**
Timesheet (label `/2025`), Schedules ("Fevereiro 2025"), HourBank (comparação `new Date('2025-03-01')`), PointAlerts (disparos 02/2025), Payroll (label "/2025"), PayrollGroups (lastProcessed "05/01/2025"), EmployeePayslip ("Fevereiro / 2025") — sistema visualmente desatualizado em 2026.

**M3. PeopleAnalytics sem IA real**
"ZIA Sentiment Analysis com NLP", "monitoramento contínuo por ZIA", ROI estratégico — zero chamada a Gemini, Flowise ou qualquer LLM. Promessa de produto sem implementação.

**M4. Stats fake misturadas com reais**
Padrão recorrente: toda tela mistura 1-2 strings hardcoded entre stats reais (TMA "31", Taxa "4,1%", "Este Mês: 3", "R$ 48.300", "186 colaboradores") — enganoso e dificulta auditoria.

**M5. Erros silenciosos generalizados**
Exceto `TabColaboradores` (padrão robusto com flag `alive` + UI de erro), nenhuma seção exibe erro ao usuário em falha de carga. A maioria usa apenas `console.error` ou não trata erro.

**M6. Inconsistência INIT_FORM/handleSave em OrgChart**
`parentId: 'ceo'` no estado inicial mas condição `!== 'root'` no save — bug concreto que grava FK `parent_id='ceo'` (string inválida) para departamentos sem pai.

**M7. Paginação fake em Employees**
Botões "Anterior"/"1"/"Próxima" hardcoded sem lógica de paginação — todos os registros renderizados de uma vez.

---

## 6. SEGURANÇA — ALERTAS RLS

### Tabelas sem RLS (exposição total) — NÃO são HR
```sql
-- Habilitar RLS nas tabelas expostas (adicionar policies antes de ativar):
ALTER TABLE public.assinaturas_acessos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas_integracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas_integracoes_mapeamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas_plano_faixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas_plano_metricas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas_plano_regras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_assinaturas_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_assinaturas_cobrancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jessica_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jessica_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
```
⚠️ **ATENÇÃO**: Não execute esse SQL sem definir policies primeiro — habilitará RLS e bloqueará todo acesso existente.

### Tabelas HR com RLS aberto (USING true)
Adicionar filtro de tenant nas policies e nas funções de leitura em lib/hr.ts. Priorizar: `vacancies`, `candidates`, `admissions`, `payroll_items`, `payroll_runs`, `absences`, `vacations`.

---

## 7. DESCOBERTAS POSITIVAS (referências de qualidade)

1. **`Employees.tsx`**: CRUD mais completo do módulo, integração CRM real (comissões), upload com cache-busting, isolamento de tenant explícito no create
2. **`EmployeeGroups.tsx`**: único CRUD completo, lazy loading de membros, estados vazios com CTA — modelo a replicar
3. **`TabColaboradores.tsx`**: melhor tratamento de erro (flag `alive` + UI de erro) — modelo a replicar
4. **Calculadora de encargos CLT em `Positions.tsx`**: correta (INSS 20%, FGTS 8%, RAT, Terceiros 5,8%, 13º 8,33%, férias+1/3 11,11%)
5. **`hr_commissions`**: única integração cross-module real e funcional (CRM → RH)
6. **`VacanciesContext.tsx`**: bridge bem desenhada, normalização snake→camelCase robusta, optimistic update correto
7. **`VacancyDetailPage.tsx`**: teste de perfil comportamental client-side funcional, LGPD aviso presente

---

## 8. ROADMAP DE CORREÇÃO (sugestão de prioridade)

### Imediato (segurança/integridade)
1. Corrigir banner "ERP conectado" (TabFinanceiro) → remover ou marcar claramente como "em desenvolvimento"
2. Corrigir resultados fabricados de NPS/pesquisa (TabSatisfacao)
3. Corrigir `createAbsence` stub → formulário real ou remover o botão
4. Adicionar tenant filter nas queries de leitura em lib/hr.ts (vacancies, absences, etc.)
5. Corrigir race condition de loading no VacanciesContext

### Curto prazo (funcionalidade core)
6. Plugar `TravelExpenses` → `getTravelExpenses` (modelo mais compatível; 3 rows esperando)
7. Plugar `OccupationalHealth` ASOs → `getOccupationalHealth` (6 rows esperando)
8. Plugar `HRAlerts` → `getHrAlerts` / `resolveHrAlert` (5 rows esperando)
9. Plugar `Overtime` → `getOvertimeRequests` + aprovação real (4 rows esperando)
10. Plugar `PunchCorrections` → `getPunchCorrections` + workflow real (4 rows esperando)
11. Plugar `HourBank` → `getHourBank` (5 rows esperando)
12. Corrigir binding do formulário `NewAdmissionForm` + `updateAdmission`

### Médio prazo (features completas)
13. Implementar pipeline candidato→admissão→employee→onboarding
14. Implementar motor de cálculo INSS/IRRF (gerar `payroll_items`) ou integrar motor externo
15. Implementar geração de holerite PDF (jspdf já disponível)
16. Plugar `Schedules` → tabela `schedules` (6 rows existem)
17. Conectar Activities ao modelo correto (decisão: reescrever UI ou expandir schema)
18. Implementar `hr_commissions` → `payroll_items` (fechar a integração CRM→folha)

---

## 9. ARQUIVOS CHAVE

| Arquivo | Linhas | Importância |
|---------|--------|-------------|
| `src/lib/hr.ts` | 1.153 | Camada de dados central — 32 tipos, ~50 funções |
| `src/features/hr/sections/Employees.tsx` | 1.561 | Seção mais completa |
| `src/features/hr/sections/Positions.tsx` | 1.476 | Mix real+mock |
| `src/features/hr/sections/Activities.tsx` | 1.101 | Maior protótipo não-conectado |
| `src/features/hr/sections/dept/TabSatisfacao.tsx` | 683 | Maior gap visual/funcional |
| `src/context/VacanciesContext.tsx` | 189 | Bridge ATS↔portal público |
| `src/features/careers/VacancyDetailPage.tsx` | 454 | Formulário público de candidatura |
| `src/features/hr/HRLayout.tsx` | 105 | Navegação dos 30 módulos |
| `supabase/migrations/20260313_hr_commissions.sql` | 30 | Única integração cross-module real |

---

*Gerado em 2026-05-19 por investigação automatizada com 6 agentes paralelos.*
*Branch: claude/investigate-hr-module-Pmn4t*

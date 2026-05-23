---
agente: claude-opus
data: 2026-05-19
tema: adendo ao mapa de mocks rh (peer review)
branch: claude/investigate-hr-module-Pmn4t
---

# Adendo ao mapa de mocks do RH — auditoria independente (Opus)

> Revisão crítica do mapa baseline (`2026-05-19_claude_mapa-mocks-rh.md`).
> Estes são achados NOVOS que escaparam do primeiro mapa — não duplica.
> Severidade: 1=cosmético · 2=engana sobre integração · 3=engano indetectável

## 1. Mocks dentro de modais e wizards

**Admission.tsx — `FORM_SECTIONS` (l.34-81)** · sev 3
- Dropdown "Cargo" (l.63): 4 cargos hardcoded (`Desenvolvedor Full Stack Pleno`, etc.) parecendo populados por `getPositions()`.
- Dropdown "Departamento" (l.64): 4 depts hardcoded parecendo populados por `getDepartments()`.
- Escapou porque está dentro de array que parece config de form.

**Vacancies.tsx — `NewVacancyTab` step 1 (l.408-423)** · sev 3
- 12 departamentos hardcoded como `<option>` no select, parecendo alimentado pelo backend.

**Activities.tsx — `MODULES` taxonomia (l.49-115)** · sev 3
- Mapa 7 módulos × 3-8 submódulos × 3-4 ações = catálogo fake de gatilhos cross-module (CRM/ERP/RH/Logística/Inventário/Qualidade/Documentos). Nenhum wired.
- `DEPARTMENTS`, `POSITIONS`, `COLLABORATORS` (l.136-138): 3 listas fixas em 5 dropdowns/ChipSelects do wizard.
- `handleSave` (l.1038-1068): wizard de 4 steps com ~30 campos persiste apenas 6 em estado local. Toda config de gatilho/alerta/destino descartada.

**Positions.tsx — `NewPositionModal` (l.248-562) + `NewGradeModal` (l.895-1304)** · sev 3
- `GRADE_FAMILIES`, `GRADE_LEVELS_OPT`, `MERIT_SCORES`, `ADJUST_INDEXES` (l.876-879): taxonomias hardcoded parecendo catálogos editáveis.
- `CustomActivityList` (l.183-237): inputs `readOnly` com "(vínculo em breve)" — mock permanente.
- `createPosition` (l.756-768): descarta `type`, `cbo`, `family`, atividades, custos, ratRate, provisions. Força salary_floor=midpoint=ceiling=salaryBase.
- `NewGradeModal`: wizard 4 steps que lê posições reais via `getPositions()`, mas "Salvar Grade" (l.1290) só chama `onClose` — wizard inteiro descartado.

**Contractors.tsx — `NFModal`** · sev 2
- Upload area (l.69-74): div decorativa **sem `<input type=file>` real**.

**PunchCorrections — `NewRequestForm` (l.44-111)** · sev 2
- Dropdown "Colaborador" (l.55-61) com 4 nomes hardcoded.
- "Evidência" drop zone (l.93-97): div clickable sem `<input type=file>`. Inputs `type=time/date` sem `value/onChange`.

**PointAlerts — `NewAlertForm` (l.134-194)** · sev 2
- Nenhum input com `value/onChange`. Threshold/severity/ações como dropdowns mortos.

**TabSatisfacao — `copyLink` (l.495-498)** · sev 2
- Função chama `setCopied(true)` mas **nunca executa `navigator.clipboard.writeText`**. Animação de sucesso sem copiar nada.

**TabAutomacoes — `NewAutoModal`** · sev 2
- Form completo, `onSave` só atualiza state local. Mock perdido ao recarregar.

## 2. Sub-componentes / cards com números fabricados

**EmployeePayslip — `BancoHorasTab`** · sev 3
- Cards `+18h 20min / +06h 00min / -01h 00min` (l.139,143,147) hardcoded — mapa flagou só o primeiro.

**EmployeePayslip — `FolgasTab`** · sev 3
- Cards `19/17/1/1` (l.191-194) como aggregates sobre `FOLGAS_DATA=[]`.

**EmployeePayslip — `ProventosTab`** · sev 2
- `'Atualizado em 28/02/2025 às 08:00'` literal (l.88) sinalizando freshness falsa.

**PeopleAnalytics** · sev 3
- `eNPS delta '+4 vs. período anterior'` (l.208) — comparação temporal inventada.
- `positiveThemes`/`negativeThemes` (l.181-182): 5+4 temas "detectados por NLP".
- `CLIMATE_RESPONSES` (l.47-54): 6 frases sob disclaimer **"Respostas anonimizadas — identidade protegida"** sobre dados inventados.

**Performance** · sev 2
- `BOX_META` (l.66-82): taxonomia das 9 caixas do 9-Box parecendo config editável.
- Banner "Calibração em andamento — Q1 2026 · 8 colaboradores foram movidos · aguardando aprovação do CHRO" (l.251-254) sempre renderiza.
- `COURSES[].linkedTo`: strings como `'SST — Todos os CLT'` implicam integração SST inexistente.

**Schedules** · sev 3
- `shiftForDay` (l.41-56): lógica determinística que simula cobertura no calendário.
- Bar chart absenteísmo (l.244-263): 5 valores Seg-Sex hardcoded.

**Productivity** · sev 2
- `METRICS[].formula` (strings de fórmula) sugerem motor configurável inexistente; `delta` literal por métrica.
- 3 insights ZIA hardcoded incluindo `'Produto têm 35% menos retrabalho que TI'`.

**Vacancies — `AnalysisTab` (l.749-794)** · sev 3
- **6 KPIs fully hardcoded**: TMA 31, CPC R$ 2.840, Aceite 87,5%, Retenção 94,1%, Candidatos/Vaga 52,7, Funil 4,1%. Mapa flagou 2; faltam 4.
- Funnel: 6 etapas 316→13 inventadas.
- Banner "ZIA vai distribuir automaticamente" (l.607-615) em step 3.

## 3. `lib/hr.ts` — limpo mas com RPCs silenciosos

`lib/hr.ts` não tem mock embutido. Porém:

**`addCandidate` (l.652-664)** · sev 2
- RPC `increment_candidate_count` chamado com `.maybeSingle()` que **silencia erro**. RPC pode não existir → `vacancies.candidate_count` defasa silenciosamente.

**`addEmployeeToGroup` (l.1052-1057)** · sev 2
- Mesmo padrão com `increment_group_member_count`. `employee_groups.member_count` defasa.

## 4. Stats sobre dados vazios

- **HRAlerts**: `activeCount: 2,1,1,1,3,2,1,0` (l.40-47) em regras com badge "X ativos" mesmo com `ACTIVE_ALERTS=[]`. · sev 3
- **Overtime**: "Em Banco de Horas: 3" (l.225) literal sobre `RECORDS=[]`. · sev 2
- **Benefits**: "Colaboradores: 186" (l.401) hardcoded. · sev 2
- **Schedules**: header "✅ N escalas · 248 funcionários" — soma inventada de `SHIFTS`. · sev 2

## 5. Lógica client-side mascarando o banco

**Vacations (l.84-89)** · sev 3
- Recalcula `status` client-side a partir de `concession_deadline` **ignorando o status do banco**. UI pode mostrar "Vencendo em 30d" sobre férias já aprovadas.

**Absences — `PlannedTab` (l.301-362)** · sev 2
- `(([] as PlannedDayOff[]).map(...))` — código dead unreachable. Banner "ZIA detectou X conflito(s)" gated em `coverageAlerts=0` constante.

**Payroll** · sev 2
- `loadPayroll` sempre carrega `runs[0]` ignorando `monthIndex` — navegação de mês decorativa.
- 4 abas (Quinzenal/13º/Rescisões/Adiantamentos) com botão sem onClick.

**Timesheet** · sev 2
- Footer literal "44h/semana · 8h/dia" + "160h 47min" + "+01:02" mesmo com dados reais. Filtro de data sem `value/onChange`.

**Schedules — `NewShiftTab` (l.269-330)** · sev 2
- Inputs só com `defaultValue`. Sem state, sem save. Wizard inteiro dead theater.

## 6. Compliance fiscal/legal fake — categoria mais perigosa

**OccupationalHealth — `EPIS` (l.62-67)** · sev 3
- 6 EPIs com números CA fake (`'CA 31.105'` etc.) parecendo certificações ANVISA/MTE reais.
- `REGULATORY_DOCS` (l.71-74): "Dr. Cláudio Ávila (SESMT)", "Dr. Roberto Melo (Médico do Trabalho)", "Eng. Maurício Santos" + validades específicas.

**PayrollGroups — `rules` arrays (l.40-47, 63-69, 85-91, 107-113)** · sev 3
- ~22 regras fiscais/legais hardcoded: "INSS Progressivo (7,5%–14%)", "FGTS 8%", "IRRF 1,5%", "Lei 6.019/74", "Tabela Vigente 2025", CNPJs fictícios "12.345.678/0001-90".

**Notes — `NOTE_TYPES` impact (l.41-67)** · sev 3
- `impactValue: 'Conforme fórmula de bônus'`, `'R$ 200–R$ 2.000 (conforme nível)'`, `'Proporcional aos dias ausentes'` — motor de cálculo inexistente.
- `routing: ['ERP','CRM','Jurídico']` + `autoRoute: true` com badge "Automático".

**Benefits — `ELIGIBILITY_RULES` (l.270-277)** · sev 3
- Brand names específicos: "Amil", "OdontoPrev", "Ticket", "MetLife", "Gympass" — parecem config do cliente.

**Benefits — `OperatorCard` (l.161-186)** · sev 3
- Para CADA operadora os mesmos 4 strings hardcoded ("API REST OAuth 2.0", "A cada 30 minutos") — não vem do `op` data, são literais por card.

## 7. EmployeePortal — features flag fake

**`FEATURES_INITIAL` (l.40-48)** · sev 2
- 7 toggle flags parecendo sistema de feature flags. Toggle só altera state local.

**`REQUESTS` (l.31-37)** · sev 3
- 7 pedidos com dossier ultra-específico ("CRM Dr. Silva CRF-SP", "Declaração Rendimentos 2025 — emitida automaticamente", `OCR done: true/false`). Demonstração de "OCR automático" sobre dados pré-fabricados.

## 8. 24 nomes fictícios reutilizados cross-module

Nomes que aparecem em múltiplas seções, formando uma "fake employee directory" coerente:

Ana Beatriz Souza · Ana Paula Ferreira · Beatriz Souza · Carlos Eduardo Lima · Fernanda Rocha · Fernanda Oliveira · Guilherme Martins · Isabela Ferreira · Lucas Araújo · Marcos Rodrigues · Patrícia Souza · Rafael Nunes · Roberto Alves · Roberto Melo · Carla Mendes · João Menezes · Leonardo Carvalho · Mariana Fonseca · Rodrigo Lima · Ana Silva · Carlos Mendes · Cláudio Ávila · Maurício Santos · *(+1 outro)*

Usados em: PunchCorrections, Activities, Vacancies (CLOSED_VACANCIES), Performance, PeopleAnalytics, EmployeePortal, TabFinanceiro, Vacations, Schedules, OccupationalHealth, PointAlerts. · sev 2

## 9. Imports zumbi confirmados

`Notes.tsx`/`Activities.tsx` importam tipos `EmployeeNote`/`HrActivity` mas os componentes principais não chamam `getEmployeeNotes`/`getHrActivities` — mock disfarçado de feature integrada.

## Confirmações

- `DepartmentDetail.tsx`: exatamente 5 tabs (não há sexta escondida). Mapa correto.
- `ProfileContext`/`AppContext`/`CompaniesContext`/`AlertContext`: sem mock HR-related (grep limpo).
- `lib/hr.ts`: sem mock embutido nas funções.

## Resumo

| Severidade | Qtd novos | Característica |
|---|---|---|
| **3 (engano indetectável)** | ~18 | Catálogos hardcoded como integrações reais: CA EPIs, brand operadoras, regras fiscais, climate responses, NPS delta, AnalysisTab metrics |
| **2 (engana sobre integração)** | ~22 | Stats sobre vazio, override silencioso de status, wizards que descartam dados, RPCs com erro silenciado |
| **1 (cosmético)** | poucos | Dead unreachable, formatadores literais |

Cobertura combinada (mapa base + adendo): ≈ 95% da superfície de engano do módulo.
Concentração dos achados novos: dropdowns em modais, taxonomias em wizards, strings de compliance fiscal/legal, e lógica client-side que sobrescreve dados do banco.

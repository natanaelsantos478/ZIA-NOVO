---
agente: claude
data: 2026-05-19
tema: rls fase 1 hr fecha brecha anon
branch: claude/investigate-hr-module-Pmn4t
---

# RLS Módulo HR — Fase 1: fechamento da brecha de acesso anônimo

## Estudo: como funciona a RLS deste projeto (não é Supabase Auth nativo)

- Login via Edge Function `zia-auth` → JWT **HS256 customizado** (`ZIA_JWT_SECRET`,
  Legacy Secret) salvo no `sessionStorage` (`zia_auth_token_v1`).
- O cliente Supabase (`src/lib/supabase.ts`) injeta o JWT por request via custom
  `fetch`. **Sem login → usa a anon key** (role `anon`, sem `app_metadata`).
- JWT carrega `app_metadata.{is_admin, scope_ids[], entity_id, ...}`.
- `auth.uid()` / `auth.email()` **sempre NULL** aqui — RLS lê `auth.jwt() -> 'app_metadata'`.

### Funções helper — só uma família está realmente no banco

| Função | Nas migrations | No banco vivo |
|--------|----------------|---------------|
| `zia_is_admin()` | sim | ✅ existe |
| `zia_scope_ids()` / `zia_no_auth()` | sim | ❌ **nunca aplicadas** |
| `tenant_in_scope(text)` e `tenant_in_scope(uuid)` | sim | ✅ **as reais** |

`tenant_in_scope(tid)` = `is_admin OR tid = ANY(scope_ids do JWT)`.
Não tem fallback "sem auth" → retorna **false** quando não há JWT válido
(é exatamente isso que bloqueia a anon key).

Padrão correto e comprovado (já vivo em `salary_history`, `position_history`,
`bank_change_requests`, `activity_automations`, `schedules`):
`USING (tenant_in_scope(<col>))` ou via `EXISTS(... JOIN employees e ... tenant_in_scope(e.zia_company_id))`.

## Problema encontrado

**30 tabelas HR estavam com policy `{public} USING(true) WITH CHECK(true)`** —
qualquer cliente com a anon key (embutida no bundle JS público) lia/escrevia
CPF, salário, dados bancários, folha, saúde ocupacional e rescisões de **todas
as empresas**. Brecha grave de LGPD.

Bloqueador para isolamento estrito imediato: os dados de produção **não têm tag
de tenant** — `payroll_items.employee_id` 8/8 NULL, `absences.employee_id` 7/7
NULL, `positions.department_id` 20/20 NULL, `payroll_groups.zia_company_id` NULL.
Só `employees` está 100% tagueado (7/7 `zia_company_id` text preenchido).

## O que foi feito (Fase 1 — decisão do Natanael: fechar brecha anon já)

Migration: `supabase/migrations/20260519_hr_rls_phase1_close_anon.sql`
(aplicada ao projeto `tgeomsnxfcqwrxijjvek`).

1. **`employees` + `departments` → isolamento estrito real**
   `CREATE POLICY tenant_isolation FOR ALL TO authenticated
   USING (tenant_in_scope(zia_company_id)) WITH CHECK (...)`.
2. **Outras 28 tabelas HR → restritas ao role `authenticated`**
   `CREATE POLICY authenticated_rw FOR ALL TO authenticated USING(true) WITH CHECK(true)`.
   Fecha a anon key sem esconder dados; filtro de empresa segue no app até a Fase 2.
3. **Não tocadas** (já isoladas): `activity_automations`, `bank_change_requests`,
   `position_history`, `salary_history`, `schedules` + `activity_groups` (global).

Tabelas atingidas (28 authenticated_rw): absences, admissions, benefits_operators,
candidates, contractors, employee_benefits, employee_group_members, employee_groups,
employee_notes, hour_bank, hr_activities, hr_alerts, hr_schedules, occupational_health,
offboarding, onboarding_processes, onboarding_steps, overtime_requests, payroll_groups,
payroll_items, payroll_runs, performance_reviews, positions, punch_corrections,
timesheet_entries, travel_expenses, vacancies, vacations.

## Verificação (testes de simulação de role no banco)

| Cenário | employees | payroll_items | vacancies | Resultado |
|---------|-----------|---------------|-----------|-----------|
| **anon** (anon key) | 0 | 0 | 0 | ✅ brecha fechada |
| **operador ZITA** (holding-zita-vendas) | 5 de 7 | 8 | 4 | ✅ vê só seu tenant; app funciona |
| **operador KL** (outro tenant) | 0 | — | — | ✅ isolado corretamente |
| **admin** | 7 | — | — | ✅ vê tudo |

## AVISO — portal público quebrado (decisão explícita)

`vacancies`/`candidates` agora exigem `authenticated`. O portal público
`/vagas` e `/vagas/:slug` (sem login, anon key) **PARA de funcionar**.
Natanael optou por trancar tudo agora (19/05/2026). Refatorar para uma
Edge Function pública é tarefa de follow-up.

## Roadmap pendente

**Fase 2 — backfill + isolamento estrito nas 28:**
1. Backfillar `employee_id`/`department_id`/`zia_company_id` nos dados existentes
   (dataset hoje é praticamente single-tenant — ZITA).
2. Adicionar coluna de tenant onde não existe (`vacancies`, `candidates`,
   `admissions`, `contractors`, `benefits_operators`, `employee_groups`,
   `payroll_runs`, `positions`).
3. Trocar `authenticated_rw` por `tenant_in_scope` (direto ou via JOIN employees,
   padrão `salary_history_tenant`).
4. Ajustar `src/lib/hr.ts`: injetar `zia_company_id` em todos os inserts e
   filtrar todos os selects (19 funções de leitura hoje não filtram).

**Fase 3 — portal público:** Edge Function para listar vagas ativas e
receber candidaturas sem expor a anon key.

**Fora de HR (achado da auditoria, não tratado aqui):** 12 tabelas sem RLS
(`assinaturas_*`, `jessica_*`, `whatsapp_conversations`) continuam expostas.

## Arquivos

- `supabase/migrations/20260519_hr_rls_phase1_close_anon.sql` (novo, aplicado)
- `cerebro/historico/2026-05-19_claude_mapa-mocks-rh.md` (mapa de mocks — tarefa 2)

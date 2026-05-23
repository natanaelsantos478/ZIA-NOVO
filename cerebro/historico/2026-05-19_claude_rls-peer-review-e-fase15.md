---
agente: claude-opus
data: 2026-05-19
tema: peer review rls + fase 1.5 + prep bcrypt
branch: claude/investigate-hr-module-Pmn4t
---

# Peer review da RLS + Fase 1.5 + preparação bcrypt

Dois Opus independentes revisaram (1) a RLS da Fase 1 e (2) o mapa de mocks.
Verifiquei os achados graves no banco vivo antes de agir.

## Achados de RLS verificados por mim (SQL no banco vivo)

| # | Sev | Achado | Verificado |
|---|-----|--------|-----------|
| 1 | 🔴 CRÍTICO | `zia_operator_profiles`: anon lê **senha texto-claro** de 5 operadores (6 visíveis, 6 c/ password, 1 c/ hash, len 8–12). `profiles_all {public} ALL true` deixa anon escrever | ✅ |
| 9 | 🟠 ALTO | `erp_comissoes_funcionario_produto`, `erp_comissoes_lancamentos`, `erp_financeiro_funcionarios`, `erp_grupo_rh_config`, `crm_compromissos` abertas `{public} true` — salário variável/agenda de funcionário | ✅ |
| 2 | 🟠 ALTO | `whatsapp_conversations`: RLS **desligado** | ✅ |
| 7 | 🟠 ALTO | `activity_groups`: tinha `tenant_id` mas policy `{public} true` (rotulei errado como global na Fase 1) | ✅ |
| 8 | 🟡 | `shifts`, `financial_transactions`: `{public} true` | ✅ |
| 3 | 🟡 | 30 tabelas HR ainda têm `GRANT ALL TO anon` — comentário da migration Fase 1 ("não há GRANT") estava **errado** (RLS bloqueia, mas o GRANT existe) | ✅ |
| 14 | 🟠 | `hr_commissions` referenciada no código (CRM `FinalizacaoVenda.tsx:203`, `lib/hr.ts:478`) mas **não existe** no banco → comissão de venda falha silenciosa | ✅ (confirmado antes) |

Não verificados (claims a testar depois): #5 `executar_query_ia` explorável, #6 demais SECURITY DEFINER expostos a anon.

## Aplicado nesta sessão

### Fase 1.5 — `20260519_hr_rls_phase15_adjacent_tables.sql` (aplicada + verificada)
- `crm_compromissos`, `erp_comissoes_funcionario_produto`, `erp_comissoes_lancamentos`, `erp_financeiro_funcionarios`, `erp_grupo_rh_config`, `activity_groups`, `whatsapp_conversations` → `tenant_isolation TO authenticated USING(tenant_in_scope(tenant_id))`. (whatsapp também teve RLS ativado.)
- `shifts`, `financial_transactions` → `authenticated_rw TO authenticated USING(true)`.
- Testes: anon=0 em todas; operador ZITA vê crm_compromissos 2/3 (1 é de outro tenant, ocultado correto) e whatsapp 4/4; admin vê tudo.

### Prep bcrypt — `20260519_operator_password_bcrypt_prep.sql` (aplicada + verificada)
- Backfill `password_hash = extensions.crypt(password, gen_salt('bf'))` para os 6 perfis. (pgcrypto vive no schema `extensions` no Supabase.)
- `verify_operator_password(stored,input)` SECURITY DEFINER, `search_path` fixo, EXECUTE só `service_role` (fecha vetor SECURITY-DEFINER-anon).
- Teste: 6/6 perfis com hash; hash valida senha correta em 6/6; 0 falsos positivos.
- **Coluna `password` segue intacta → login inalterado.** (bcrypt no Postgres, não no Deno — respeita a regra do CLAUDE.md.)

### Código na branch (NÃO deployado)
- `supabase/functions/zia-auth/index.ts`: validação agora texto-claro→hash (RPC), removido o default perigoso `: true`. Ordem texto-claro primeiro = zero mudança de comportamento até a coluna ser zerada.

## Sequência restante para fechar o vazamento #1 (precisa de deploy + teste de login)

1. **Deploy** da nova `zia-auth` (comportamento idêntico hoje — texto-claro primeiro).
2. Natanael confirma login com 00007 OK.
3. `UPDATE zia_operator_profiles SET password = NULL WHERE password_hash IS NOT NULL;` → ativa caminho bcrypt; fecha "texto-claro em repouso".
4. Natanael confirma login OK de novo (agora via hash).
5. Refatorar `ProfileContext` `select('*')` → colunas explícitas (sem password/hash/email) + deploy frontend.
6. `REVOKE SELECT (password, password_hash, email) ON zia_operator_profiles FROM anon;` (defense-in-depth — só após passo 5 em produção, senão o `select('*')` atual dá 403).

⚠️ Ordem importa: NULL (passo 3) só depois do deploy (passo 1); REVOKE (passo 6) só depois do ProfileContext novo em produção (passo 5).

## Outras pendências do peer review (não tratadas)
- `executar_query_ia` SECURITY DEFINER chamável por anon (#5) — revisar/revogar.
- `search_path` mutável em ~34 funções (#4) — `zia_is_admin`, triggers `fn_*`.
- REVOKE anon nas 30 tabelas HR da Fase 1 (#3) — defense-in-depth (usuário optou por não fazer agora).
- `hr_commissions` inexistente (#14) — aplicar migration `20260313_hr_commissions.sql` com RLS, OU corrigir o código CRM.
- Bucket `employee-photos` público (#15) — fotos de funcionário acessíveis por URL.
- 9 tabelas não-HR ainda `rls_disabled_in_public` (`assinaturas_*`).

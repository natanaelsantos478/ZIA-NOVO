---
agente: claude
data: 2026-05-23
tema: fecha vazamento credenciais + religa portal vagas
branch: main
---

# Execução: fechamento do vazamento de credenciais + portal /vagas

Sequência completa aprovada pelo Natanael, executada com checkpoints. Tudo
aplicado ao banco vivo (tgeomsnxfcqwrxijjvek) E espelhado em migration no `main`.

## Passos executados

1. **Fecha escrita anon em `zia_operator_profiles`** (`20260523_zia_operator_profiles_lock_anon_write.sql`)
   - DROP `profiles_all {public} ALL USING(true)` — anon escrevia/lia credenciais.
   - `authenticated_all {authenticated} ALL` (app/admin), `anon_read_profiles {anon} SELECT (active=true)` (lista de login), REVOKE escrita do anon.
   - Verificado: anon lê 6 perfis (login OK), `UPDATE` → 42501 permission denied.

2. **zia-auth bcrypt no `main`** (commit `9ae5e1e`, v2.0.1-beta)
   - main tinha a zia-auth antiga; o `deploy-edge-functions.yml` redeploya todas as funções a partir do main a cada push em `supabase/functions/**` → reverteria a v44 manual. Levei a função nova ao main → CI passa a deployar a versão correta. Elimina o risco de "zia-auth antiga + senha NULL = bypass".
   - Validação: texto-claro→hash (RPC `verify_operator_password`), sem default inseguro.

3. **Zera texto-claro** (`20260523_operator_password_null_plaintext.sql`)
   - Backup RLS-protegido criado antes; `UPDATE ... SET password = NULL`; Natanael confirmou login (caminho hash) OK; backup removido.
   - Verificado: anon lê 0 senhas em texto-claro.

4. **Religa portal /vagas** (`20260523_careers_portal_public_access.sql`)
   - `vacancies`: `vacancies_public_read {anon} SELECT` só de vagas abertas (status active/Aberta/...).
   - `candidates`: `candidates_public_insert {anon} INSERT` (vaga aberta existente); REVOKE SELECT/UPDATE/DELETE do anon (não lê candidaturas — LGPD).
   - Verificado: anon lê 4 vagas; `SELECT candidates` → 42501.

## Foto final (como anon / anon key pública)
perfis_login=6, senhas_plaintext=0, vagas_publicas=4, employees=0, folha=0,
saude_ocup=0, comissoes=0, whatsapp=0.

main: `2a277ab` (v2.0.2-beta) — migrations espelham o banco vivo.

## Pendências (não bloqueiam; ficam para próxima)
1. **Hardening**: anon ainda lê `password_hash` (bcrypt) via `select('*')` do ProfileContext. Fechar exige trocar `select('*')` por colunas explícitas (sem password/hash) + `REVOKE SELECT (password,password_hash) FROM anon` → é deploy de frontend (Cloudflare/main).
2. **Bug do JWT expirado no bootstrap** ("código não encontrado"): `jwtFetch` anexa token morto antes do ProfileContext limpar → 401 em massa. Workaround: Clear site data. Fix: validar expiry no `jwtFetch` (`src/lib/supabase.ts`). Pré-existente, não tocado.
3. **Itens do peer review fora de HR**: `executar_query_ia` SECURITY DEFINER chamável por anon; `search_path` mutável em ~34 funções; bucket `employee-photos` público; 9 tabelas `assinaturas_*`/`whatsapp_conversations` (esta já tratada) sem RLS.
4. **RLS Fase 2**: backfill de tenant nas 28 tabelas `authenticated_rw` + trocar por `tenant_in_scope` + filtrar tenant nas 19 funções de leitura em `lib/hr.ts`.

// ─────────────────────────────────────────────────────────────────────────────
// tenant.ts — Identidade da filial ativa (lida do localStorage)
//
// ARQUITETURA DE ISOLAMENTO:
//   1. App-level:  tenant_id = getFilialId() em todos os inserts
//   2. DB-level:   RLS usa o header x-filial-id enviado pelo getFilialDb()
//   3. Filial A jamais vê dados da Filial B, mesmo que use a mesma anon key
//
// Para isolamento completo em produção: adicionar Supabase Auth com JWT
// custom claim "filial_id" — então auth.uid() será o filialId.
// ─────────────────────────────────────────────────────────────────────────────
import { ORG_STORAGE_KEY } from './orgStructure';

/** UUID da filial ativa (do localStorage). Retorna o fallback neutro se não houver seleção. */
export function getFilialId(): string {
  try {
    const raw = localStorage.getItem(ORG_STORAGE_KEY);
    if (!raw) return '00000000-0000-0000-0000-000000000000'; // UUID nulo — nega acesso via RLS
    const ctx = JSON.parse(raw) as { filial?: { id: string } };
    return ctx.filial?.id ?? '00000000-0000-0000-0000-000000000000';
  } catch {
    return '00000000-0000-0000-0000-000000000000';
  }
}

/** IDs de todas as filiais acessíveis no contexto atual.
 *  - Filial selecionada: [filialId]
 *  - Outros níveis: implementar na próxima fase com Supabase Auth */
export function getAccessibleFilialIds(): string[] {
  return [getFilialId()];
}

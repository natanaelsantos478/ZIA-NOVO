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

/** UUID da filial ativa (do localStorage).
 *  Quando o usuário entrou como Matriz (sem filial), retorna o UUID nulo para
 *  que o RLS use x-matriz-id em vez de x-filial-id. */
export function getFilialId(): string {
  try {
    const raw = localStorage.getItem(ORG_STORAGE_KEY);
    if (!raw) return '00000000-0000-0000-0000-000000000000';
    const ctx = JSON.parse(raw) as { filial?: { id: string } | null };
    return ctx.filial?.id ?? '00000000-0000-0000-0000-000000000000';
  } catch {
    return '00000000-0000-0000-0000-000000000000';
  }
}

/** UUID da matriz ativa (do localStorage). Retorna null se não houver. */
export function getMatrizId(): string | null {
  try {
    const raw = localStorage.getItem(ORG_STORAGE_KEY);
    if (!raw) return null;
    const ctx = JSON.parse(raw) as { filial?: { id: string } | null; matriz?: { id: string } | null };
    if (ctx.filial?.id) return null; // filial tem prioridade — não usar matriz-level
    return ctx.matriz?.id ?? null;
  } catch {
    return null;
  }
}

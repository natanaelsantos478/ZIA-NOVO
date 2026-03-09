import { createClient } from '@supabase/supabase-js';
import { ORG_STORAGE_KEY } from './orgStructure';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

// Cliente sem contexto — usado apenas pelo CompanySelector (antes da filial ser escolhida)
export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// ── Headers de contexto organizacional ───────────────────────────────────────
// Filial selecionada → x-filial-id (RLS filtra por filial específica)
// Matriz selecionada (sem filial) → x-matriz-id (RLS inclui todas as filiais da matriz)
function getOrgHeaders(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ORG_STORAGE_KEY);
    if (!raw) return { 'x-filial-id': '00000000-0000-0000-0000-000000000000' };
    const ctx = JSON.parse(raw) as {
      filial?: { id: string } | null;
      matriz?: { id: string } | null;
    };
    if (ctx.filial?.id) {
      return { 'x-filial-id': ctx.filial.id };
    }
    if (ctx.matriz?.id) {
      return {
        'x-filial-id': '00000000-0000-0000-0000-000000000000',
        'x-matriz-id': ctx.matriz.id,
      };
    }
  } catch {
    // fall through
  }
  return { 'x-filial-id': '00000000-0000-0000-0000-000000000000' };
}

// ── Cliente com isolamento de filial/matriz ───────────────────────────────────
// Recriado sempre que o contexto muda (filial ou matriz).
let _filialDb: ReturnType<typeof createClient> | null = null;
let _lastCacheKey: string | null = null;

export function getFilialDb(): typeof supabase {
  const headers = getOrgHeaders();
  const cacheKey = JSON.stringify(headers);
  if (!_filialDb || _lastCacheKey !== cacheKey) {
    _filialDb = createClient(supabaseUrl || '', supabaseKey || '', {
      global: { headers },
    });
    _lastCacheKey = cacheKey;
  }
  return _filialDb as typeof supabase;
}


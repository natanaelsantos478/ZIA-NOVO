import { createClient } from '@supabase/supabase-js';
import { getFilialId } from './tenant';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

// Cliente sem contexto — usado apenas pelo CompanySelector (antes da filial ser escolhida)
export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// ── Cliente com isolamento de filial ─────────────────────────────────────────
// Envia x-filial-id em TODAS as requests.
// O RLS do Supabase lê esse header via current_setting('request.headers')
// e filtra os dados: filial A jamais vê dados da filial B.
let _filialDb: ReturnType<typeof createClient> | null = null;
let _lastFilialId: string | null = null;

export function getFilialDb(): typeof supabase {
  const filialId = getFilialId();
  if (!_filialDb || _lastFilialId !== filialId) {
    _filialDb = createClient(supabaseUrl || '', supabaseKey || '', {
      global: { headers: { 'x-filial-id': filialId } },
    });
    _lastFilialId = filialId;
  }
  return _filialDb as typeof supabase;
}

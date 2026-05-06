// ─────────────────────────────────────────────────────────────────────────────
// GestorAPIs — Visão de códigos de API vinculados aos agentes
// Visível apenas para perfil Gestor Holding (level 1)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { ShieldOff, ExternalLink, Bot, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useProfiles } from '../../../context/ProfileContext';
import { getTenantIds } from '../../../lib/auth';

interface AgenteResumo {
  id: string;
  nome: string;
  avatar_emoji: string;
  tipo: string;
  status: string;
  api_code: string | null;
}

function PainelGestor() {
  const [agentes, setAgentes] = useState<AgenteResumo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const ids = getTenantIds();
    const tid = ids[0] ?? '';
    const { data } = await supabase
      .from('ia_agentes')
      .select('id, nome, avatar_emoji, tipo, status, api_code')
      .eq('tenant_id', tid)
      .order('nome');
    setAgentes(data ?? []);
    setLoading(false);
  }

  const comCodigo    = agentes.filter(a => a.api_code);
  const semCodigo    = agentes.filter(a => !a.api_code);
  const codigosUsados = [...new Set(comCodigo.map(a => a.api_code))];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Gestor & APIs</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Visão dos agentes e seus códigos de API atribuídos.
          </p>
        </div>
        <button onClick={carregar}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800">
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      {/* Instrução de setup */}
      <div className="bg-amber-950/30 border border-amber-700/40 rounded-xl p-4 flex gap-3">
        <ExternalLink className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-200/80 space-y-1">
          <p className="font-medium">Como configurar uma chave de API</p>
          <ol className="list-decimal list-inside space-y-1 text-xs text-amber-200/60">
            <li>Supabase Dashboard → Settings → Edge Functions → Secrets</li>
            <li>Adicione o secret com o nome exato do código: <code className="bg-amber-900/40 px-1 rounded">API0001</code></li>
            <li>No Organograma, clique no agente → aba Identidade → campo Código de API</li>
            <li>Digite o código (ex: <code className="bg-amber-900/40 px-1 rounded">API0001</code>) e salve</li>
          </ol>
        </div>
      </div>

      {/* Resumo de códigos em uso */}
      {codigosUsados.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Códigos em uso</h3>
          <div className="flex flex-wrap gap-2">
            {codigosUsados.map(c => (
              <span key={c}
                className="px-3 py-1 bg-violet-900/40 border border-violet-700/50 rounded-full text-violet-300 font-mono text-sm">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lista de agentes */}
      {loading ? (
        <div className="text-slate-400 text-sm text-center py-8">Carregando...</div>
      ) : (
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-3">
            Agentes ({agentes.length})
          </h3>
          <div className="space-y-2">
            {agentes.map(a => (
              <div key={a.id}
                className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3 border border-slate-700">
                <span className="text-xl">{a.avatar_emoji || '🤖'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200 font-medium truncate">{a.nome}</div>
                  <div className="text-xs text-slate-400">{a.tipo} · {a.status}</div>
                </div>
                {a.api_code ? (
                  <code className="text-violet-300 font-mono text-sm bg-violet-900/30 px-2 py-0.5 rounded">
                    {a.api_code}
                  </code>
                ) : (
                  <span className="text-xs text-slate-500 italic">sem código</span>
                )}
              </div>
            ))}
          </div>
          {semCodigo.length > 0 && (
            <p className="text-xs text-amber-400/70 mt-3">
              {semCodigo.length} agente(s) sem código de API — não conseguirão executar raciocínio.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function GestorAPIs() {
  const { activeProfile } = useProfiles();
  const isGestor = activeProfile?.level === 1;

  if (!isGestor) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
        <ShieldOff className="w-10 h-10 text-slate-600" />
        <p className="text-slate-400 font-semibold">Acesso restrito</p>
        <p className="text-sm text-slate-500 text-center max-w-xs">
          Esta seção é exclusiva para o perfil Gestor Holding.
        </p>
      </div>
    );
  }

  return <PainelGestor />;
}

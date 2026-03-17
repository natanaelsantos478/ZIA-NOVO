// ─────────────────────────────────────────────────────────────────────────────
// IAAgentes — Lista e gestão de agentes IA (Supabase-integrado)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { Plus, Search, Play, Pause, Trash2, MessageSquare, Settings2, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import AgenteCriarModal from './AgenteCriarModal';

interface Agente {
  id: string;
  nome: string;
  avatar_emoji: string;
  cor: string;
  descricao: string;
  tipo: string;
  status: string;
  funcao: string;
  modelo_versao: string;
  pode_agir_background: boolean;
  created_at: string;
}

const STATUS_MAP: Record<string, { dot: string; text: string; label: string; bg: string }> = {
  ativo:    { dot: 'bg-emerald-400 animate-pulse', text: 'text-emerald-400', label: 'Ativo',    bg: 'bg-emerald-500/10' },
  pausado:  { dot: 'bg-amber-400',                 text: 'text-amber-400',   label: 'Pausado',  bg: 'bg-amber-500/10'   },
  rascunho: { dot: 'bg-slate-500',                 text: 'text-slate-400',   label: 'Rascunho', bg: 'bg-slate-700/40'   },
};

const TIPO_MAP: Record<string, string> = {
  ESPECIALISTA:  'bg-blue-500/20 text-blue-400',
  MONITOR:       'bg-emerald-500/20 text-emerald-400',
  ORQUESTRADOR:  'bg-violet-500/20 text-violet-400',
  EXTERNO:       'bg-orange-500/20 text-orange-400',
};

export default function IAAgentes({ onNavigate }: { onNavigate?: (id: string, params?: Record<string, string>) => void }) {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'todos' | 'ativo' | 'pausado' | 'rascunho'>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('ia_agentes').select('*').order('created_at');
    setAgentes((data ?? []) as Agente[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = agentes.filter(a => {
    const matchSearch = !search || a.nome.toLowerCase().includes(search.toLowerCase()) || a.funcao?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'todos' || a.status === filter;
    return matchSearch && matchFilter;
  });

  async function toggleStatus(ag: Agente) {
    const next = ag.status === 'ativo' ? 'pausado' : 'ativo';
    await supabase.from('ia_agentes').update({ status: next }).eq('id', ag.id);
    load();
  }

  async function deleteAgente(id: string) {
    setDeletingId(id);
    await supabase.from('ia_permissoes').delete().eq('agente_id', id);
    await supabase.from('ia_agentes').delete().eq('id', id);
    setDeletingId(null);
    load();
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Meus Agentes</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {agentes.length} agentes • {agentes.filter(a => a.status === 'ativo').length} ativos agora
          </p>
        </div>
        <button onClick={() => { setEditId(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors shadow-lg shadow-violet-900/30">
          <Plus className="w-4 h-4" /> Criar Agente
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar agente…"
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500" />
        </div>
        <div className="flex gap-1.5">
          {(['todos','ativo','pausado','rascunho'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-2 rounded-xl font-semibold capitalize transition-colors ${
                filter === f ? 'bg-violet-600 text-white' : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
              }`}>
              {f === 'todos' ? `Todos (${agentes.length})` : f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="text-6xl">🤖</div>
          <p className="text-slate-400 font-semibold">
            {agentes.length === 0 ? 'Nenhum agente criado ainda' : 'Nenhum agente encontrado'}
          </p>
          {agentes.length === 0 && (
            <button onClick={() => { setEditId(null); setModalOpen(true); }}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors">
              Criar primeiro agente
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(ag => {
            const st = STATUS_MAP[ag.status] ?? STATUS_MAP.rascunho;
            return (
              <div key={ag.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col gap-4 transition-all group">

                {/* Top */}
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: (ag.cor ?? '#7c3aed') + '22', borderColor: (ag.cor ?? '#7c3aed') + '44', borderWidth: 1 }}>
                    {ag.avatar_emoji || '🤖'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-100 text-sm">{ag.nome}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TIPO_MAP[ag.tipo] ?? 'bg-slate-700 text-slate-400'}`}>{ag.tipo}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      <span className={`text-xs font-semibold ${st.text}`}>{st.label}</span>
                      {ag.pode_agir_background && <span className="text-xs text-slate-500 ml-1">• background</span>}
                    </div>
                  </div>
                </div>

                {/* Função */}
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 flex-1">{ag.funcao || ag.descricao || '—'}</p>

                {/* Model */}
                {ag.modelo_versao && (
                  <span className="text-xs font-mono text-slate-600 bg-slate-800 px-2 py-1 rounded-lg self-start">{ag.modelo_versao}</span>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-slate-800/60">
                  <button
                    onClick={() => onNavigate?.('agente-detalhe', { id: ag.id })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/40 text-violet-400 text-xs font-bold transition-colors">
                    <MessageSquare className="w-3.5 h-3.5" /> Conversar
                  </button>
                  <button onClick={() => { setEditId(ag.id); setModalOpen(true); }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors">
                    <Settings2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => toggleStatus(ag)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors">
                    {ag.status === 'ativo' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button onClick={() => deleteAgente(ag.id)} disabled={deletingId === ag.id}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-40">
                    {deletingId === ag.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <AgenteCriarModal
          agenteId={editId}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
        />
      )}
    </div>
  );
}

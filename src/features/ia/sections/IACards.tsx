// ─────────────────────────────────────────────────────────────────────────────
// IACards — Gerenciamento de cards de integração
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { Globe, Plus, Trash2, Loader2, X, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getTenantId } from '../../../lib/auth';

interface ICard {
  id: string;
  tenant_id: string;
  tipo: string;
  nome: string;
  config: Record<string, unknown>;
  ativo: boolean;
  created_at: string;
}

const TIPO_INFO: Record<string, { label: string; icon: React.ElementType; cor: string; descricao: string }> = {
  web_search: {
    label: 'Pesquisa Web Google',
    icon: Globe,
    cor: 'blue',
    descricao: 'Permite que agentes pesquisem na internet via Gemini Google Search grounding.',
  },
};

export default function IACards() {
  const [cards, setCards] = useState<ICard[]>([]);
  const [loading, setLoading] = useState(true);
  const [criandoModal, setCriandoModal] = useState(false);
  const [nomeCriando, setNomeCriando] = useState('Pesquisa Web Google');
  const [salvando, setSalvando] = useState(false);
  const tenantId = getTenantId();

  async function carregar() {
    setLoading(true);
    const { data } = await supabase
      .from('ia_cards')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    setCards((data ?? []) as ICard[]);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function criar() {
    if (!nomeCriando.trim()) return;
    setSalvando(true);
    await supabase.from('ia_cards').insert({
      tenant_id: tenantId,
      tipo: 'web_search',
      nome: nomeCriando.trim(),
      config: { provider: 'gemini_grounding' },
    });
    setSalvando(false);
    setCriandoModal(false);
    setNomeCriando('Pesquisa Web Google');
    carregar();
  }

  async function deletar(id: string) {
    await supabase.from('ia_cards').delete().eq('id', id);
    setCards(c => c.filter(x => x.id !== id));
  }

  async function toggleAtivo(card: ICard) {
    await supabase.from('ia_cards').update({ ativo: !card.ativo }).eq('id', card.id);
    setCards(c => c.map(x => x.id === card.id ? { ...x, ativo: !x.ativo } : x));
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Cards</h1>
          <p className="text-sm text-slate-400 mt-1">
            Cards são integrações que podem ser conectadas a agentes para ampliar suas capacidades.
          </p>
        </div>
        <button
          onClick={() => setCriandoModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors"
        >
          <Plus className="w-4 h-4" /> Criar card
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
        </div>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
          <Globe className="w-12 h-12 text-slate-700" />
          <p className="text-slate-500 font-semibold">Nenhum card criado ainda</p>
          <p className="text-slate-600 text-sm max-w-xs">
            Crie um card para que seus agentes possam pesquisar na internet e usar outras integrações.
          </p>
          <button
            onClick={() => setCriandoModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors mt-2"
          >
            <Plus className="w-4 h-4" /> Criar primeiro card
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(card => {
            const info = TIPO_INFO[card.tipo];
            const Icon = info?.icon ?? Globe;
            return (
              <div
                key={card.id}
                className={`bg-slate-900 border rounded-2xl p-5 flex flex-col gap-4 transition-all ${
                  card.ativo ? 'border-slate-700' : 'border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-100 truncate">{card.nome}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{info?.label ?? card.tipo}</p>
                  </div>
                  {card.ativo && (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {info?.descricao ?? '—'}
                </p>
                <div className="flex items-center gap-2 mt-auto pt-2 border-t border-slate-800">
                  <button
                    onClick={() => toggleAtivo(card)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      card.ativo
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400'
                    }`}
                  >
                    {card.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    onClick={() => deletar(card.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/30 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal criar */}
      {criandoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100">Criar card</h2>
              <button onClick={() => setCriandoModal(false)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tipo — por enquanto só web_search */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-100 text-sm">Pesquisa Web Google</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Permite que agentes pesquisem na internet via Google Search.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Nome do card</label>
              <input
                value={nomeCriando}
                onChange={e => setNomeCriando(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && criar()}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                placeholder="Ex: Pesquisa Web Google"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setCriandoModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={criar}
                disabled={salvando || !nomeCriando.trim()}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

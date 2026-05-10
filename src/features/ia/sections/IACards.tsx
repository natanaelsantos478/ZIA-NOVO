// ─────────────────────────────────────────────────────────────────────────────
// IACards — Gerenciamento de cards de integração
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { Globe, Brain, Plus, Trash2, Loader2, X, CheckCircle, BarChart2, ChevronRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getTenantId } from '../../../lib/auth';
import IAMemoria from './IAMemoria';

interface ICard {
  id: string;
  tenant_id: string;
  tipo: string;
  nome: string;
  config: Record<string, unknown>;
  ativo: boolean;
  created_at: string;
}

const LIMITE_OPTIONS = [
  { value: null,  label: 'Sem limite' },
  { value: 5,     label: '5 / dia' },
  { value: 10,    label: '10 / dia' },
  { value: 20,    label: '20 / dia' },
  { value: 80,    label: '80 / dia' },
  { value: 150,   label: '150 / dia' },
];

const TIPO_INFO: Record<string, { label: string; icon: React.ElementType; cor: string; corIcon: string; descricao: string }> = {
  web_search: {
    label: 'Pesquisa Web Google',
    icon: Globe,
    cor: 'blue',
    corIcon: 'text-blue-400',
    descricao: 'Permite que agentes pesquisem na internet via Google Search (Serper).',
  },
  memoria: {
    label: 'Memória do Agente',
    icon: Brain,
    cor: 'violet',
    corIcon: 'text-violet-400',
    descricao: 'Sistema de memória persistente com pastas organizadas: leis, personalidade, índice, conversas, pesquisas, arquivos, dados, pedidos, logs e mais.',
  },
};

export default function IACards() {
  const [cards, setCards]               = useState<ICard[]>([]);
  const [loading, setLoading]           = useState(true);
  const [criandoModal, setCriandoModal] = useState(false);
  const [tipoCriando, setTipoCriando]   = useState<'web_search' | 'memoria'>('web_search');
  const [nomeCriando, setNomeCriando]   = useState('Pesquisa Web Google');
  const [limiteCriando, setLimiteCriando] = useState<number | null>(20);
  const [salvando, setSalvando]         = useState(false);
  const [salvandoLimite, setSalvandoLimite] = useState<string | null>(null);
  const [memoriaCard, setMemoriaCard]   = useState<ICard | null>(null);
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
    const config = tipoCriando === 'web_search'
      ? { provider: 'serper', limite_diario: limiteCriando }
      : { api_provider: 'deepseek', modelo_versao: 'deepseek-chat', api_key: '' };
    await supabase.from('ia_cards').insert({
      tenant_id: tenantId,
      tipo: tipoCriando,
      nome: nomeCriando.trim(),
      config,
    });
    setSalvando(false);
    setCriandoModal(false);
    setNomeCriando('Pesquisa Web Google');
    setTipoCriando('web_search');
    setLimiteCriando(20);
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

  async function salvarLimite(card: ICard, novoLimite: number | null) {
    setSalvandoLimite(card.id);
    const novoConfig = { ...card.config, limite_diario: novoLimite };
    await supabase.from('ia_cards').update({ config: novoConfig }).eq('id', card.id);
    setCards(c => c.map(x => x.id === card.id ? { ...x, config: novoConfig } : x));
    setSalvandoLimite(null);
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Cards</h1>
          <p className="text-sm text-slate-400 mt-1">
            Cards são integrações conectadas a agentes via fiozinho para ampliar suas capacidades.
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
            const corIcon = info?.corIcon ?? 'text-blue-400';
            const corBg   = card.tipo === 'memoria' ? 'bg-violet-500/10 border-violet-500/20' : 'bg-blue-500/10 border-blue-500/20';
            const limiteDiario = card.config?.limite_diario as number | null | undefined;
            const isMemoria = card.tipo === 'memoria';
            return (
              <div
                key={card.id}
                className={`bg-slate-900 border rounded-2xl p-5 flex flex-col gap-4 transition-all ${
                  card.ativo ? 'border-slate-700' : 'border-slate-800 opacity-60'
                }`}
              >
                {/* Cabeçalho */}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${corBg}`}>
                    <Icon className={`w-5 h-5 ${corIcon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-100 truncate">{card.nome}</p>
                    <p className={`text-xs mt-0.5 ${corIcon}`}>{info?.label ?? card.tipo}</p>
                  </div>
                  {card.ativo && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{info?.descricao ?? '—'}</p>

                {/* Limite diário — só web_search */}
                {!isMemoria && (
                  <div className="flex items-center gap-2 bg-slate-800/60 rounded-xl px-3 py-2.5">
                    <BarChart2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-400 shrink-0">Limite/dia</span>
                    <div className="flex-1 flex justify-end">
                      {salvandoLimite === card.id ? (
                        <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                      ) : (
                        <select
                          value={limiteDiario ?? ''}
                          onChange={e => {
                            const v = e.target.value === '' ? null : Number(e.target.value);
                            salvarLimite(card, v);
                          }}
                          className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer"
                        >
                          {LIMITE_OPTIONS.map(o => (
                            <option key={String(o.value)} value={o.value ?? ''} className="bg-slate-800">
                              {o.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                )}

                {/* Botão abrir memórias */}
                {isMemoria && (
                  <button
                    onClick={() => setMemoriaCard(card)}
                    className="flex items-center justify-between px-3 py-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl hover:bg-violet-500/20 transition-colors group"
                  >
                    <span className="text-xs font-semibold text-violet-400">Abrir pastas de memória</span>
                    <ChevronRight className="w-3.5 h-3.5 text-violet-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}

                {/* Ações */}
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

            {/* Seleção de tipo */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">Tipo de card</label>
              <div className="grid grid-cols-2 gap-2">
                {(['web_search', 'memoria'] as const).map(t => {
                  const info = TIPO_INFO[t];
                  const TIcon = info.icon;
                  const sel = tipoCriando === t;
                  return (
                    <button key={t} onClick={() => {
                      setTipoCriando(t);
                      setNomeCriando(t === 'web_search' ? 'Pesquisa Web Google' : 'Memória do Agente');
                    }}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                        sel ? 'border-violet-500 bg-violet-500/10' : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
                      }`}>
                      <TIcon className={`w-4 h-4 shrink-0 ${sel ? 'text-violet-400' : 'text-slate-500'}`} />
                      <span className={`text-xs font-semibold ${sel ? 'text-slate-100' : 'text-slate-400'}`}>{info.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Nome do card</label>
              <input
                value={nomeCriando}
                onChange={e => setNomeCriando(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && criar()}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                placeholder="Ex: Memória do Agente Zeus"
              />
            </div>

            {tipoCriando === 'web_search' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Limite diário de pesquisas</label>
                <select
                  value={limiteCriando ?? ''}
                  onChange={e => setLimiteCriando(e.target.value === '' ? null : Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                >
                  {LIMITE_OPTIONS.map(o => (
                    <option key={String(o.value)} value={o.value ?? ''}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  Quando atingido, o agente responde: "seu limite de pesquisas diárias foi atingido".
                </p>
              </div>
            )}

            {tipoCriando === 'memoria' && (
              <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
                <p className="text-xs text-violet-300 leading-relaxed">
                  Após criar, abra o card para configurar o modelo de IA e adicionar memórias nas pastas: leis, personalidade, índice, conversas, pesquisas e mais.
                </p>
              </div>
            )}

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

      {/* Modal de memória */}
      {memoriaCard && (
        <IAMemoria
          card={memoriaCard}
          onClose={() => setMemoriaCard(null)}
          onSaved={() => { setMemoriaCard(null); carregar(); }}
        />
      )}
    </div>
  );
}

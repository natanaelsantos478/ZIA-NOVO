// IAMemoria — Card de memória do agente: pastas, entradas, config de IA
import { useState, useEffect } from 'react';
import {
  Brain, Scale, Sparkles, BookOpen, Star, Trophy, MessageCircle,
  Search, FileText, Database, ShoppingCart, Activity,
  Plus, Edit2, Trash2, X, Save, Loader2, Lock,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getTenantId } from '../../../lib/auth';

interface Memoria {
  id: string;
  agent_id: string;
  tipo: string;
  titulo: string;
  conteudo: string;
  importancia: number;
  created_at: string;
  updated_at: string;
}

interface ICard {
  id: string;
  nome: string;
  config: Record<string, unknown>;
}

interface Agente {
  id: string;
  nome: string;
  avatar_emoji: string;
}

const TIPOS_MEMORIA = [
  { id: 'leis',          label: 'Leis',          icon: Scale,          cor: 'red',    desc: 'Regras que nunca podem ser quebradas' },
  { id: 'personalidade', label: 'Personalidade',  icon: Sparkles,       cor: 'violet', desc: 'Como o agente se comporta e comunica' },
  { id: 'indice',        label: 'Índice',         icon: BookOpen,       cor: 'blue',   desc: 'Mapa de informações disponíveis' },
  { id: 'essenciais',    label: 'Essenciais',     icon: Star,           cor: 'amber',  desc: 'Informações críticas sempre carregadas' },
  { id: 'principais',    label: 'Principais',     icon: Trophy,         cor: 'yellow', desc: 'Informações de alta prioridade' },
  { id: 'conversas',     label: 'Conversas',      icon: MessageCircle,  cor: 'green',  desc: 'Resumos de conversas passadas' },
  { id: 'pesquisas',     label: 'Pesquisas',      icon: Search,         cor: 'cyan',   desc: 'Resultados de pesquisas relevantes' },
  { id: 'arquivos',      label: 'Arquivos',       icon: FileText,       cor: 'indigo', desc: 'Resumos de arquivos processados' },
  { id: 'dados',         label: 'Dados',          icon: Database,       cor: 'teal',   desc: 'Dados estruturados e métricas' },
  { id: 'pedidos',       label: 'Pedidos',        icon: ShoppingCart,   cor: 'orange', desc: 'Histórico de pedidos e solicitações' },
  { id: 'logs',          label: 'Logs',           icon: Activity,       cor: 'slate',  desc: 'Registro de ações do agente' },
] as const;

type TipoId = typeof TIPOS_MEMORIA[number]['id'];

const COR: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  red:    { bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400',    dot: 'bg-red-400' },
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', dot: 'bg-violet-400' },
  blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   text: 'text-blue-400',   dot: 'bg-blue-400' },
  amber:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  text: 'text-amber-400',  dot: 'bg-amber-400' },
  yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  green:  { bg: 'bg-green-500/10',  border: 'border-green-500/30',  text: 'text-green-400',  dot: 'bg-green-400' },
  cyan:   { bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30',   text: 'text-cyan-400',   dot: 'bg-cyan-400' },
  indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', dot: 'bg-indigo-400' },
  teal:   { bg: 'bg-teal-500/10',   border: 'border-teal-500/30',   text: 'text-teal-400',   dot: 'bg-teal-400' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-400' },
  slate:  { bg: 'bg-slate-500/10',  border: 'border-slate-600/40',  text: 'text-slate-400',  dot: 'bg-slate-500' },
};

const PROVIDERS = [
  { value: 'gemini',           label: 'Gemini (Google)' },
  { value: 'openai',           label: 'OpenAI (GPT-4)' },
  { value: 'deepseek',         label: 'DeepSeek' },
  { value: 'claude',           label: 'Claude (Anthropic)' },
  { value: 'openai_compatible',label: 'OpenAI Compatible' },
];

interface Props {
  card: ICard;
  onClose: () => void;
  onSaved: () => void;
}

export default function IAMemoria({ card, onClose, onSaved }: Props) {
  const tenantId = getTenantId();
  const [agentes, setAgentes]             = useState<Agente[]>([]);
  const [agenteSel, setAgenteSel]         = useState<string>('');
  const [tipoSel, setTipoSel]             = useState<TipoId>('leis');
  const [memorias, setMemorias]           = useState<Memoria[]>([]);
  const [contagens, setContagens]         = useState<Record<string, number>>({});
  const [loading, setLoading]             = useState(false);
  const [tab, setTab]                     = useState<'memorias' | 'config'>('memorias');
  const [editando, setEditando]           = useState<Partial<Memoria> | null>(null);
  const [salvandoEdit, setSalvandoEdit]   = useState(false);
  const [config, setConfig]               = useState({
    api_provider: (card.config?.api_provider as string) ?? 'deepseek',
    api_code:     (card.config?.api_code     as string) ?? '',
  });
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [apiCodeUnlocked, setApiCodeUnlocked] = useState(false);

  useEffect(() => { carregarAgentes(); }, []);
  useEffect(() => { if (agenteSel) { carregarMemorias(); carregarContagens(); } }, [agenteSel, tipoSel]);

  async function carregarAgentes() {
    const { data } = await supabase.from('ia_agentes')
      .select('id, nome, avatar_emoji')
      .eq('tenant_id', tenantId)
      .order('nome');
    const lista = (data ?? []) as Agente[];
    setAgentes(lista);
    if (lista.length > 0) setAgenteSel(lista[0].id);
  }

  async function carregarMemorias() {
    if (!agenteSel) return;
    setLoading(true);
    const { data } = await supabase.from('ia_memorias')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('agent_id', agenteSel)
      .eq('tipo', tipoSel)
      .order('importancia', { ascending: false })
      .order('updated_at', { ascending: false });
    setMemorias((data ?? []) as Memoria[]);
    setLoading(false);
  }

  async function carregarContagens() {
    if (!agenteSel) return;
    const { data } = await supabase.from('ia_memorias')
      .select('tipo')
      .eq('tenant_id', tenantId)
      .eq('agent_id', agenteSel);
    const cnt: Record<string, number> = {};
    for (const row of data ?? []) cnt[row.tipo] = (cnt[row.tipo] ?? 0) + 1;
    setContagens(cnt);
  }

  async function salvarMemoria() {
    if (!editando || !agenteSel) return;
    setSalvandoEdit(true);
    let erro: string | null = null;
    if (editando.id) {
      const { error } = await supabase.from('ia_memorias').update({
        titulo:      editando.titulo,
        conteudo:    editando.conteudo,
        importancia: editando.importancia ?? 5,
        updated_at:  new Date().toISOString(),
      }).eq('id', editando.id);
      if (error) erro = error.message;
    } else {
      const { data: inserted, error } = await supabase.from('ia_memorias').insert({
        tenant_id:   tenantId,
        agent_id:    agenteSel,
        tipo:        tipoSel,
        titulo:      editando.titulo ?? '',
        conteudo:    editando.conteudo ?? '',
        importancia: editando.importancia ?? 5,
      }).select();
      console.log('[IAMemoria] insert result:', { inserted, error, tenantId, agenteSel, tipoSel });
      if (error) erro = error.message;
      else if (!inserted || inserted.length === 0) erro = 'Insert retornou 0 linhas — possível bloqueio de RLS';
    }
    setSalvandoEdit(false);
    if (erro) {
      console.error('[IAMemoria] salvarMemoria erro:', erro, { tenantId, agenteSel, tipoSel });
      alert(`Erro ao salvar memória: ${erro}`);
      return;
    }
    setEditando(null);
    carregarMemorias();
    carregarContagens();
  }

  async function deletar(id: string) {
    if (!confirm('Excluir esta memória?')) return;
    await supabase.from('ia_memorias').delete().eq('id', id);
    setMemorias(m => m.filter(x => x.id !== id));
    carregarContagens();
  }

  async function salvarConfig() {
    setSalvandoConfig(true);
    const novoConfig = { ...card.config, ...config };
    await supabase.from('ia_cards').update({ config: novoConfig }).eq('id', card.id);
    setSalvandoConfig(false);
    onSaved();
  }

  const tipoInfo = TIPOS_MEMORIA.find(t => t.id === tipoSel)!;
  const cores    = COR[tipoInfo.cor];
  const Icon     = tipoInfo.icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-stretch justify-center">
      <div className="flex flex-col bg-slate-950 w-full max-w-6xl shadow-2xl border-x border-slate-700/50 overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-3.5 border-b border-slate-800 bg-slate-900 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
            <Brain className="w-4 h-4 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-100 text-sm">{card.nome}</p>
            <p className="text-xs text-violet-400/80">Card de Memória</p>
          </div>

          {/* Selector de agente */}
          {agentes.length > 0 && (
            <select
              value={agenteSel}
              onChange={e => setAgenteSel(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
            >
              {agentes.map(a => (
                <option key={a.id} value={a.id} className="bg-slate-900">
                  {a.avatar_emoji} {a.nome}
                </option>
              ))}
            </select>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
            {(['memorias', 'config'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors capitalize ${
                  tab === t ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}>
                {t === 'memorias' ? 'Memórias' : 'Config IA'}
              </button>
            ))}
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        {tab === 'memorias' ? (
          <div className="flex flex-1 overflow-hidden">

            {/* Sidebar — pastas */}
            <div className="w-52 bg-slate-900/50 border-r border-slate-800 overflow-y-auto custom-scrollbar py-2 shrink-0">
              <p className="text-xs text-slate-600 font-semibold px-4 py-2 uppercase tracking-wider">Pastas</p>
              {TIPOS_MEMORIA.map(t => {
                const TIcon = t.icon;
                const c = COR[t.cor];
                const sel = tipoSel === t.id;
                const cnt = contagens[t.id] ?? 0;
                return (
                  <button key={t.id} onClick={() => setTipoSel(t.id)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${
                      sel
                        ? `${c.bg} border-r-2 border-r-current ${c.text}`
                        : 'hover:bg-slate-800/50 text-slate-400'
                    }`}>
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                    <TIcon className={`w-3.5 h-3.5 shrink-0 ${sel ? c.text : 'text-slate-500'}`} />
                    <span className={`text-xs font-semibold flex-1 truncate ${sel ? c.text : ''}`}>{t.label}</span>
                    {cnt > 0 && (
                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded-md ${sel ? c.bg : 'bg-slate-800'} ${sel ? c.text : 'text-slate-500'}`}>
                        {cnt}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Área principal */}
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Header da pasta */}
              <div className={`flex items-center gap-3 px-5 py-3 border-b border-slate-800 ${cores.bg} shrink-0`}>
                <Icon className={`w-4 h-4 ${cores.text}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${cores.text}`}>{tipoInfo.label}</p>
                  <p className="text-xs text-slate-500">{tipoInfo.desc}</p>
                </div>
                <button
                  onClick={() => setEditando({ tipo: tipoSel, titulo: '', conteudo: '', importancia: 5 })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors"
                >
                  <Plus className="w-3 h-3" /> Adicionar memória
                </button>
              </div>

              {/* Entradas */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                {loading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                  </div>
                ) : memorias.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                    <Icon className={`w-10 h-10 opacity-20 ${cores.text}`} />
                    <p className="text-slate-500 text-sm font-semibold">Nenhuma memória em {tipoInfo.label}</p>
                    <button
                      onClick={() => setEditando({ tipo: tipoSel, titulo: '', conteudo: '', importancia: 5 })}
                      className={`px-4 py-2 rounded-xl ${cores.bg} ${cores.border} border text-xs font-semibold ${cores.text} hover:opacity-80 transition-opacity`}
                    >
                      <Plus className="w-3 h-3 inline mr-1" /> Criar primeira memória
                    </button>
                  </div>
                ) : (
                  memorias.map(m => (
                    <div key={m.id} className={`bg-slate-900 border ${cores.border} rounded-xl p-4 group hover:border-opacity-60 transition-all`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <p className="text-sm font-bold text-slate-200 truncate">{m.titulo || '(sem título)'}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded-md font-mono shrink-0 ${cores.bg} ${cores.text}`}>
                              {m.importancia}/10
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{m.conteudo}</p>
                          <p className="text-xs text-slate-600 mt-2">
                            Atualizado {new Date(m.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
                          <button onClick={() => setEditando(m)}
                            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deletar(m.id)}
                            className="p-1.5 rounded-lg hover:bg-red-900/30 text-slate-500 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        ) : (
          /* Tab Config IA */
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 max-w-2xl">
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-200">Agente de Memória — Configuração de IA</p>
              <p className="text-xs text-slate-500">
                Mesmo sistema de seleção dos agentes. Configure o provedor e o código de API gerenciado no GestorAPIs.
              </p>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Provedor de IA</label>
                <select
                  value={config.api_provider}
                  onChange={e => setConfig(c => ({ ...c, api_provider: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm"
                >
                  {PROVIDERS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Código de API</label>
                {apiCodeUnlocked ? (
                  <div className="flex gap-2 items-center">
                    <input
                      value={config.api_code}
                      onChange={e => setConfig(c => ({ ...c, api_code: e.target.value.toUpperCase() }))}
                      placeholder="ex: DEEPSEEK_KEY"
                      autoFocus
                      className="flex-1 bg-slate-800 border border-violet-500 rounded-lg px-3 py-2 text-slate-100 text-sm font-mono"
                    />
                    <button onClick={() => setApiCodeUnlocked(false)}
                      className="text-slate-500 hover:text-slate-300" title="Bloquear">
                      <Lock className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-slate-400 text-sm font-mono">
                      {config.api_code || '— não definido —'}
                    </div>
                    <button onClick={() => setApiCodeUnlocked(true)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300 font-medium whitespace-nowrap">
                      <Lock className="w-3.5 h-3.5" /> Alterar
                    </button>
                  </div>
                )}
                <p className="text-xs text-slate-600 mt-1">Código configurado em Configurações → GestorAPIs</p>
              </div>
            </div>

            <button onClick={salvarConfig} disabled={salvandoConfig}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-bold transition-colors">
              {salvandoConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar configuração
            </button>
          </div>
        )}
      </div>

      {/* Modal criar/editar memória */}
      {editando && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 p-4" style={{ zIndex: 60 }}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-100">{editando.id ? 'Editar memória' : 'Nova memória'}</p>
              <button onClick={() => setEditando(null)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Título</label>
              <input
                value={editando.titulo ?? ''}
                onChange={e => setEditando(d => ({ ...d!, titulo: e.target.value }))}
                autoFocus
                placeholder="Ex: Tom de voz do agente, Regra de privacidade..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Conteúdo</label>
              <textarea
                value={editando.conteudo ?? ''}
                onChange={e => setEditando(d => ({ ...d!, conteudo: e.target.value }))}
                rows={6}
                placeholder="Descreva a memória com detalhes..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-2">
                Importância: <span className="text-violet-400 font-bold">{editando.importancia ?? 5}/10</span>
              </label>
              <input
                type="range" min={1} max={10}
                value={editando.importancia ?? 5}
                onChange={e => setEditando(d => ({ ...d!, importancia: parseInt(e.target.value) }))}
                className="w-full accent-violet-500"
              />
              <div className="flex justify-between text-xs text-slate-600 mt-0.5">
                <span>Baixa</span><span>Média</span><span>Alta</span>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditando(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors">
                Cancelar
              </button>
              <button
                onClick={salvarMemoria}
                disabled={salvandoEdit || !editando.titulo?.trim()}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                {salvandoEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

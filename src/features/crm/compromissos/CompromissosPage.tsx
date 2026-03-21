// ─────────────────────────────────────────────────────────────────────────────
// CompromissosPage — Lista / Card com toggle
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  Plus, RefreshCw, List, LayoutGrid,
  Video, Phone, Navigation, ListTodo, MoreHorizontal, Calendar,
  CheckCircle2, Clock, Filter, Search, MapPin,
} from 'lucide-react';
import { useCompromissos, type CompromissoFiltros } from './hooks/useCompromissos';
import type { CompromissoFull, CompromissoTipoFull, CompromissoStatus } from '../types/compromisso';
import CompromissoModal   from './CompromissoModal';
import CompromissoDetalhe from './CompromissoDetalhe';

// ── Config visual ──────────────────────────────────────────────────────────────
const TIPO_ICON: Record<CompromissoTipoFull, typeof Calendar> = {
  reuniao: Video, ligacao: Phone, visita: Navigation, apresentacao: ListTodo, outro: MoreHorizontal,
};
const TIPO_LABEL: Record<CompromissoTipoFull, string> = {
  reuniao: 'Reunião', ligacao: 'Ligação', visita: 'Visita', apresentacao: 'Apresentação', outro: 'Outro',
};
const STATUS_COLOR: Record<CompromissoStatus, string> = {
  agendado:     'bg-blue-100 text-blue-700',
  confirmado:   'bg-purple-100 text-purple-700',
  em_andamento: 'bg-amber-100 text-amber-700',
  concluido:    'bg-green-100 text-green-700',
  cancelado:    'bg-red-100 text-red-700',
};
const STATUS_DOT: Record<CompromissoStatus, string> = {
  agendado: 'bg-blue-500', confirmado: 'bg-purple-500', em_andamento: 'bg-amber-500',
  concluido: 'bg-green-500', cancelado: 'bg-red-400',
};
const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ── Componente principal ───────────────────────────────────────────────────────
interface Props {
  preClienteId?:    string;
  preNegociacaoId?: string;
  preOrcamentoId?:  string;
  preProdutoId?:    string;
  filtroFixo?:      CompromissoFiltros;
}

export default function CompromissosPage({
  preClienteId, preNegociacaoId, preOrcamentoId, preProdutoId, filtroFixo,
}: Props = {}) {
  const { loading, fetchCompromissos } = useCompromissos();

  const [compromissos, setCompromissos] = useState<CompromissoFull[]>([]);
  const [view, setView]                 = useState<'lista' | 'card'>('lista');
  const [showModal, setShowModal]       = useState(false);
  const [editComp, setEditComp]         = useState<CompromissoFull | undefined>();
  const [detalhe, setDetalhe]           = useState<CompromissoFull | null>(null);
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTipo, setFilterTipo]     = useState('');

  const load = useCallback(async () => {
    const data = await fetchCompromissos(filtroFixo);
    setCompromissos(data);
  }, [fetchCompromissos, filtroFixo]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditComp(undefined);
    setShowModal(true);
  }

  function openEdit(c: CompromissoFull) {
    setEditComp(c);
    setDetalhe(null);
    setShowModal(true);
  }

  function afterSave() {
    setShowModal(false);
    setEditComp(undefined);
    load();
  }

  // ── Filtros ───────────────────────────────────────────────────────────────
  const filtered = compromissos.filter(c => {
    if (search && !c.titulo.toLowerCase().includes(search.toLowerCase()) &&
        !c.cliente_nome?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterTipo   && c.tipo   !== filterTipo)   return false;
    return true;
  });

  // ── Subcomponentes de item ────────────────────────────────────────────────
  function ItemLista({ c }: { c: CompromissoFull }) {
    const Icon = TIPO_ICON[c.tipo] ?? Calendar;
    const sc   = STATUS_COLOR[c.status as CompromissoStatus] ?? 'bg-slate-100 text-slate-600';
    return (
      <div
        onClick={() => setDetalhe(c)}
        className={`bg-white rounded-xl border border-slate-200 p-4 hover:border-purple-300 transition-colors cursor-pointer flex items-start gap-3 ${c.status === 'concluido' ? 'opacity-60' : ''}`}
      >
        <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-semibold text-slate-800 text-sm ${c.status === 'concluido' ? 'line-through' : ''}`}>
              {c.titulo}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc}`}>{c.status.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{c.data}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.hora} · {c.duracao}min</span>
            {c.cliente_nome && <span className="font-medium text-slate-600">{c.cliente_nome}</span>}
            {c.local && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.local}</span>}
          </div>
          {c.valor_em_disputa != null && c.valor_em_disputa > 0 && (
            <p className="text-xs text-emerald-600 font-semibold mt-1">{BRL(c.valor_em_disputa)} em disputa</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {c.participantes && c.participantes.length > 0 && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Filter className="w-3 h-3" />{c.participantes.length}
            </span>
          )}
          {c.status === 'concluido' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
        </div>
      </div>
    );
  }

  function ItemCard({ c }: { c: CompromissoFull }) {
    const Icon = TIPO_ICON[c.tipo] ?? Calendar;
    const sc   = STATUS_COLOR[c.status as CompromissoStatus] ?? 'bg-slate-100 text-slate-600';
    const dot  = STATUS_DOT[c.status as CompromissoStatus] ?? 'bg-slate-400';
    return (
      <div
        onClick={() => setDetalhe(c)}
        className={`bg-white rounded-2xl border border-slate-200 p-5 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer flex flex-col gap-3 ${c.status === 'concluido' ? 'opacity-60' : ''}`}
      >
        {/* Topo: ícone tipo + status */}
        <div className="flex items-start justify-between gap-2">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-purple-600" />
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${sc}`}>
            {c.status.replace('_', ' ')}
          </span>
        </div>

        {/* Título */}
        <div>
          <p className={`font-bold text-slate-800 text-sm leading-snug ${c.status === 'concluido' ? 'line-through' : ''}`}>
            {c.titulo}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{TIPO_LABEL[c.tipo]}</p>
        </div>

        {/* Detalhes */}
        <div className="space-y-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
            <Calendar className="w-3 h-3 shrink-0" />
            <span>{c.data} às {c.hora} · {c.duracao}min</span>
          </div>
          {c.cliente_nome && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 shrink-0" />
              <span className="font-medium text-slate-600">{c.cliente_nome}</span>
            </div>
          )}
          {c.local && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 shrink-0" />
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{c.local}</span>
            </div>
          )}
        </div>

        {/* Rodapé */}
        {(c.valor_em_disputa != null && c.valor_em_disputa > 0) && (
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-emerald-600">{BRL(c.valor_em_disputa)} em disputa</p>
          </div>
        )}
        {c.participantes && c.participantes.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Filter className="w-3 h-3" />{c.participantes.length} participante(s)
          </div>
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Compromissos</h1>
          <p className="text-xs text-slate-500 mt-0.5">{filtered.length} compromisso(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />Novo Compromisso
          </button>
        </div>
      </div>

      {/* Barra de filtros + toggle de vista */}
      <div className="flex flex-wrap items-center gap-2 px-6 py-3 bg-white border-b border-slate-100 shrink-0">
        <div className="relative flex-1 min-w-40">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar compromisso ou cliente..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none"
        >
          <option value="">Status: Todos</option>
          <option value="agendado">Agendado</option>
          <option value="confirmado">Confirmado</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <select
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none"
        >
          <option value="">Tipo: Todos</option>
          {(Object.keys(TIPO_LABEL) as CompromissoTipoFull[]).map(t => (
            <option key={t} value={t}>{TIPO_LABEL[t]}</option>
          ))}
        </select>

        {/* Toggle Lista / Card */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden ml-auto shrink-0">
          <button
            onClick={() => setView('lista')}
            title="Vista em lista"
            className={`px-3 py-2 flex items-center gap-1.5 text-xs font-semibold transition-colors ${view === 'lista' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <List className="w-3.5 h-3.5" />Lista
          </button>
          <button
            onClick={() => setView('card')}
            title="Vista em cards"
            className={`px-3 py-2 flex items-center gap-1.5 text-xs font-semibold transition-colors ${view === 'card' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />Cards
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Nenhum compromisso encontrado</p>
            <button onClick={openNew} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700">
              Criar primeiro compromisso
            </button>
          </div>
        ) : view === 'lista' ? (
          <div className="space-y-3">
            {filtered.map(c => <ItemLista key={c.id} c={c} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(c => <ItemCard key={c.id} c={c} />)}
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      {showModal && (
        <CompromissoModal
          initial={editComp ? {
            ...editComp,
            cliente_id:    editComp.cliente_id    || preClienteId,
            negociacao_id: editComp.negociacao_id || preNegociacaoId,
            orcamento_id:  editComp.orcamento_id  || preOrcamentoId,
            produto_id:    editComp.produto_id    || preProdutoId,
          } : {
            cliente_id:    preClienteId,
            negociacao_id: preNegociacaoId,
            orcamento_id:  preOrcamentoId,
            produto_id:    preProdutoId,
          }}
          onClose={() => { setShowModal(false); setEditComp(undefined); }}
          onSaved={afterSave}
        />
      )}

      {/* Drawer detalhe */}
      {detalhe && (
        <CompromissoDetalhe
          compromisso={detalhe}
          onClose={() => setDetalhe(null)}
          onEdit={() => openEdit(detalhe)}
          onUpdated={() => { setDetalhe(null); load(); }}
        />
      )}
    </div>
  );
}

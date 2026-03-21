// ─────────────────────────────────────────────────────────────────────────────
// CompromissosPage — Módulo principal de compromissos
// Abas: Agenda (calendário) | Lista | IA Voz
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  Plus, RefreshCw, Calendar, List, ChevronLeft, ChevronRight,
  Video, Phone, Navigation, ListTodo, MoreHorizontal,
  CheckCircle2, Clock, Filter, Search, MapPin,
} from 'lucide-react';
import { useCompromissos, type CompromissoFiltros } from './hooks/useCompromissos';
import type { CompromissoFull, CompromissoTipoFull, CompromissoStatus } from '../types/compromisso';
import CompromissoModal  from './CompromissoModal';
import CompromissoDetalhe from './CompromissoDetalhe';

// ── Config visual ──────────────────────────────────────────────────────────────
const TIPO_ICON: Record<CompromissoTipoFull, typeof Calendar> = {
  reuniao: Video, ligacao: Phone, visita: Navigation, apresentacao: ListTodo, outro: MoreHorizontal,
};
const TIPO_LABEL: Record<CompromissoTipoFull, string> = {
  reuniao: 'Reunião', ligacao: 'Ligação', visita: 'Visita', apresentacao: 'Apresentação', outro: 'Outro',
};
const STATUS_COLOR: Record<CompromissoStatus, string> = {
  agendado:    'bg-blue-100 text-blue-700',
  confirmado:  'bg-purple-100 text-purple-700',
  em_andamento:'bg-amber-100 text-amber-700',
  concluido:   'bg-green-100 text-green-700',
  cancelado:   'bg-red-100 text-red-700',
};
const STATUS_DOT: Record<CompromissoStatus, string> = {
  agendado: 'bg-blue-500', confirmado: 'bg-purple-500', em_andamento: 'bg-amber-500',
  concluido: 'bg-green-500', cancelado: 'bg-red-400',
};
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function buildGrid(year: number, month: number): (number | null)[] {
  const first  = new Date(year, month, 1).getDay();
  const daysIn = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(first).fill(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toYMD(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayYMD() {
  return new Date().toISOString().split('T')[0];
}

// ── Componente principal ───────────────────────────────────────────────────────
interface Props {
  // Opcional: pré-vincular ao abrir modal
  preClienteId?: string;
  preNegociacaoId?: string;
  preOrcamentoId?: string;
  preProdutoId?: string;
  filtroFixo?: CompromissoFiltros;
}

export default function CompromissosPage({
  preClienteId, preNegociacaoId, preOrcamentoId, preProdutoId, filtroFixo,
}: Props = {}) {
  const { loading, fetchCompromissos } = useCompromissos();

  const [compromissos, setCompromissos] = useState<CompromissoFull[]>([]);
  const [view, setView]                 = useState<'agenda' | 'lista'>('agenda');
  const [year, setYear]                 = useState(new Date().getFullYear());
  const [month, setMonth]               = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay]   = useState<string | null>(todayYMD());
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
    if (search && !c.titulo.toLowerCase().includes(search.toLowerCase()) && !c.cliente_nome?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterTipo   && c.tipo   !== filterTipo)   return false;
    return true;
  });

  // ── Calendário ────────────────────────────────────────────────────────────
  const grid  = buildGrid(year, month);
  const today = todayYMD();

  const byDay = (d: string) => filtered.filter(c => c.data === d);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const dayCompromissos = selectedDay ? byDay(selectedDay) : [];

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

      {/* Barra de filtros + vista */}
      <div className="flex flex-wrap items-center gap-2 px-6 py-3 bg-white border-b border-slate-100 shrink-0">
        <div className="relative flex-1 min-w-40">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar compromisso..."
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
        <div className="flex rounded-lg border border-slate-200 overflow-hidden ml-auto shrink-0">
          <button
            onClick={() => setView('agenda')}
            className={`px-3 py-2 text-xs font-semibold flex items-center gap-1.5 ${view === 'agenda' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Calendar className="w-3.5 h-3.5" />Agenda
          </button>
          <button
            onClick={() => setView('lista')}
            className={`px-3 py-2 text-xs font-semibold flex items-center gap-1.5 ${view === 'lista' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <List className="w-3.5 h-3.5" />Lista
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">

        {/* ── Vista Agenda (calendário) ── */}
        {view === 'agenda' && (
          <div className="flex h-full overflow-hidden">
            {/* Calendário */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {/* Navegação mês */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-200 text-slate-600">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-base font-bold text-slate-800">{MONTHS[month]} {year}</h2>
                <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-200 text-slate-600">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Grid de dias */}
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
                ))}
                {grid.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const ymd     = toYMD(year, month, day);
                  const events  = byDay(ymd);
                  const isToday = ymd === today;
                  const isSel   = ymd === selectedDay;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(ymd)}
                      className={`min-h-[72px] p-1.5 rounded-xl text-left border-2 transition-all ${
                        isSel ? 'border-purple-500 bg-purple-50' :
                        isToday ? 'border-purple-200 bg-white' :
                        'border-transparent bg-white hover:border-slate-200'
                      }`}
                    >
                      <span className={`text-xs font-semibold block mb-1 ${
                        isToday ? 'text-purple-600' : 'text-slate-700'
                      }`}>{day}</span>
                      <div className="space-y-0.5">
                        {events.slice(0, 3).map(ev => {
                          const dot = STATUS_DOT[ev.status as CompromissoStatus] ?? 'bg-slate-400';
                          return (
                            <div key={ev.id} className={`flex items-center gap-1 text-[10px] text-slate-700 rounded px-1 py-0.5 ${
                              ev.status === 'concluido' ? 'opacity-50' : ''
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                              <span className="truncate">{ev.titulo}</span>
                            </div>
                          );
                        })}
                        {events.length > 3 && (
                          <p className="text-[10px] text-slate-400 px-1">+{events.length - 3} mais</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Painel do dia selecionado */}
            <div className="w-72 border-l border-slate-200 bg-white overflow-y-auto p-4 custom-scrollbar shrink-0">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-slate-800">
                  {selectedDay ? new Date(selectedDay + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Selecione um dia'}
                </p>
                {selectedDay && (
                  <button
                    onClick={openNew}
                    className="p-1.5 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200"
                    title="Novo compromisso neste dia"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {dayCompromissos.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Nenhum compromisso neste dia</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dayCompromissos.map(c => {
                    const Icon = TIPO_ICON[c.tipo] ?? Calendar;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setDetalhe(c)}
                        className={`w-full text-left bg-slate-50 rounded-xl p-3 hover:bg-purple-50 transition-colors ${c.status === 'concluido' ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                            <Icon className="w-3.5 h-3.5 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold text-slate-800 truncate ${c.status === 'concluido' ? 'line-through' : ''}`}>{c.titulo}</p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-2.5 h-2.5" />{c.hora} · {c.duracao}min
                            </p>
                            {c.local && <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate"><MapPin className="w-2.5 h-2.5" />{c.local}</p>}
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLOR[c.status as CompromissoStatus] ?? 'bg-slate-100 text-slate-600'}`}>
                            {c.status}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Vista Lista ── */}
        {view === 'lista' && (
          <div className="overflow-y-auto h-full p-6 custom-scrollbar">
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
            ) : (
              <div className="space-y-3">
                {filtered.map(c => {
                  const Icon = TIPO_ICON[c.tipo] ?? Calendar;
                  const sc   = STATUS_COLOR[c.status as CompromissoStatus] ?? 'bg-slate-100 text-slate-600';
                  return (
                    <div
                      key={c.id}
                      className={`bg-white rounded-xl border border-slate-200 p-4 hover:border-purple-300 transition-colors cursor-pointer ${c.status === 'concluido' ? 'opacity-60' : ''}`}
                      onClick={() => setDetalhe(c)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                          <Icon className="w-4.5 h-4.5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-semibold text-slate-800 text-sm ${c.status === 'concluido' ? 'line-through' : ''}`}>
                              {c.titulo}
                            </p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc}`}>{c.status}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{c.data}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.hora} ({c.duracao}min)</span>
                            {c.cliente_nome && <span>{c.cliente_nome}</span>}
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      {showModal && (
        <CompromissoModal
          initial={editComp ? {
            ...editComp,
            cliente_id: editComp.cliente_id || preClienteId,
            negociacao_id: editComp.negociacao_id || preNegociacaoId,
            orcamento_id: editComp.orcamento_id || preOrcamentoId,
            produto_id: editComp.produto_id || preProdutoId,
          } : {
            cliente_id: preClienteId,
            negociacao_id: preNegociacaoId,
            orcamento_id: preOrcamentoId,
            produto_id: preProdutoId,
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

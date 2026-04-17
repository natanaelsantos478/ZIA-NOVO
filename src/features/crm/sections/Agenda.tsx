// ─────────────────────────────────────────────────────────────────────────────
// CRM Agenda — calendário mensal estilo Google Calendar
// Eventos vêm de crmData.getAllCompromissos() (compromissos de negociações +
// eventos pessoais livres criados diretamente na agenda)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Calendar,
  Video, PhoneCall, Navigation, ListTodo, MoreHorizontal,
  CheckCircle2, Circle, Clock, Building2,
} from 'lucide-react';
import {
  getAllCompromissos, toggleCompromissoConcluido,
  type Compromisso, type CompromissoTipo,
} from '../data/crmData';
import CompromissoModal from '../compromissos/CompromissoModal';

// ── Config ─────────────────────────────────────────────────────────────────────

const TIPO_CFG: Record<CompromissoTipo, { label: string; Icon: typeof Calendar; color: string; bg: string; ring: string }> = {
  reuniao:  { label: 'Reunião',   Icon: Video,          color: 'text-purple-700',  bg: 'bg-purple-100',  ring: 'ring-purple-300'  },
  ligacao:  { label: 'Ligação',   Icon: PhoneCall,      color: 'text-blue-700',    bg: 'bg-blue-100',    ring: 'ring-blue-300'    },
  visita:   { label: 'Visita',    Icon: Navigation,     color: 'text-emerald-700', bg: 'bg-emerald-100', ring: 'ring-emerald-300' },
  followup: { label: 'Follow-up', Icon: ListTodo,       color: 'text-amber-700',   bg: 'bg-amber-100',   ring: 'ring-amber-300'   },
  outro:    { label: 'Outro',     Icon: MoreHorizontal, color: 'text-slate-600',   bg: 'bg-slate-100',   ring: 'ring-slate-300'   },
};

const TIPO_DOT: Record<CompromissoTipo, string> = {
  reuniao: 'bg-purple-500', ligacao: 'bg-blue-500',
  visita: 'bg-emerald-500', followup: 'bg-amber-500', outro: 'bg-slate-400',
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ── Helpers ────────────────────────────────────────────────────────────────────

function toYMD(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function buildGrid(year: number, month: number): (number | null)[] {
  const first   = new Date(year, month, 1).getDay();
  const daysIn  = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(first).fill(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function todayYMD() {
  const d = new Date();
  return toYMD(d.getFullYear(), d.getMonth(), d.getDate());
}

// ── Cartão de evento ───────────────────────────────────────────────────────────

function EventCard({ comp, onToggle }: { comp: Compromisso; onToggle: () => void }) {
  const cfg = TIPO_CFG[comp.tipo];
  const fmtDate = (d: string) => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${comp.concluido ? 'opacity-50 bg-slate-50 border-slate-100' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
      <button onClick={onToggle} className="shrink-0 mt-0.5">
        {comp.concluido
          ? <CheckCircle2 className="w-5 h-5 text-green-500" />
          : <Circle className="w-5 h-5 text-slate-300 hover:text-purple-500 transition-colors" />}
      </button>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
        <cfg.Icon className={`w-4 h-4 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${comp.concluido ? 'line-through text-slate-400' : 'text-slate-800'}`}>{comp.titulo}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-slate-500">{fmtDate(comp.data)} · {comp.hora}</span>
          <span className="text-xs text-slate-400">{comp.duracao}min</span>
          {comp.criado_por === 'ia' && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold">✦ IA</span>}
        </div>
        {comp.clienteNome && (
          <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
            <Building2 className="w-3 h-3" />{comp.clienteNome}
          </div>
        )}
        {comp.negociacaoId && (
          <p className="text-[10px] font-mono text-slate-400 mt-0.5">{comp.negociacaoId}</p>
        )}
        {comp.notas && <p className="text-xs text-slate-500 mt-1 truncate">{comp.notas}</p>}
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function Agenda() {
  const today   = new Date();
  const [year,  setYear]        = useState(today.getFullYear());
  const [month, setMonth]       = useState(today.getMonth());
  const [selectedDay, setDay]   = useState<string>(todayYMD());
  const [events, setEvents]     = useState<Compromisso[]>([]);
  const [showNew, setShowNew]   = useState(false);

  const refresh = useCallback(async () => {
    const data = await getAllCompromissos();
    setEvents(data);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleToggle = useCallback(async (id: string) => {
    await toggleCompromissoConcluido(id);
    refresh();
  }, [refresh]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setDay(todayYMD());
  };

  const grid   = buildGrid(year, month);
  const todayS = todayYMD();

  // Agrupar eventos por data
  const byDate = events.reduce<Record<string, Compromisso[]>>((acc, c) => {
    if (!acc[c.data]) acc[c.data] = [];
    acc[c.data].push(c);
    return acc;
  }, {});

  const selectedEvents = (byDate[selectedDay] ?? []).sort((a, b) => a.hora.localeCompare(b.hora));

  // Próximos eventos (os que não estão no mês visível)
  const upcoming = events
    .filter(e => !e.concluido && e.data >= todayS)
    .sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora))
    .slice(0, 5);

  const fmtSelectedDay = () => {
    if (!selectedDay) return '';
    const [y, m, d] = selectedDay.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <div className="flex h-full overflow-hidden bg-slate-50">
      {/* ── Grade do calendário ── */}
      <div className="flex-1 flex flex-col overflow-hidden p-5">
        {/* Header do mês */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <button onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-white border border-slate-200 flex items-center justify-center transition-colors">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <h2 className="text-base font-bold text-slate-800 w-44 text-center">
            {MONTHS[month]} {year}
          </h2>
          <button onClick={nextMonth} className="w-8 h-8 rounded-lg hover:bg-white border border-slate-200 flex items-center justify-center transition-colors">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
          <button onClick={goToday} className="text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors">
            Hoje
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="ml-auto flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo Evento
          </button>
        </div>

        {/* Grade */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm">
          {/* Dias da semana */}
          <div className="grid grid-cols-7 border-b border-slate-100 shrink-0">
            {WEEKDAYS.map(d => (
              <div key={d} className="py-2 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Células */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-7">
              {grid.map((day, idx) => {
                if (day === null) {
                  return <div key={idx} className="min-h-[80px] border-b border-r border-slate-50 bg-slate-50/50" />;
                }
                const ymd      = toYMD(year, month, day);
                const isToday  = ymd === todayS;
                const isSel    = ymd === selectedDay;
                const dayEvts  = byDate[ymd] ?? [];
                void dayEvts.some(e => !e.concluido); // reservado para highlight futuro
                return (
                  <div
                    key={idx}
                    onClick={() => setDay(ymd)}
                    className={`min-h-[80px] border-b border-r border-slate-100 p-1.5 cursor-pointer transition-colors ${isSel ? 'bg-purple-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold mb-1 ${
                      isToday ? 'bg-purple-600 text-white' : isSel ? 'bg-purple-100 text-purple-700' : 'text-slate-700'
                    }`}>
                      {day}
                    </div>
                    {/* Pontos de eventos */}
                    <div className="space-y-0.5">
                      {dayEvts.slice(0, 3).map((e, i) => (
                        <div key={i} className={`flex items-center gap-1 rounded px-1 py-0.5 ${TIPO_CFG[e.tipo].bg} ${e.concluido ? 'opacity-40' : ''}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TIPO_DOT[e.tipo]}`} />
                          <span className={`text-[10px] font-medium truncate ${TIPO_CFG[e.tipo].color}`}>{e.hora} {e.titulo}</span>
                        </div>
                      ))}
                      {dayEvts.length > 3 && (
                        <p className="text-[10px] text-slate-400 pl-1">+{dayEvts.length - 3} mais</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Painel lateral ── */}
      <div className="w-80 flex flex-col border-l border-slate-200 bg-white shrink-0 overflow-hidden">
        {/* Dia selecionado */}
        <div className="px-4 py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 capitalize">{fmtSelectedDay()}</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedEvents.length} evento{selectedEvents.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => setShowNew(true)}
              className="w-8 h-8 rounded-lg bg-purple-50 hover:bg-purple-100 flex items-center justify-center transition-colors"
            >
              <Plus className="w-4 h-4 text-purple-600" />
            </button>
          </div>
        </div>

        {/* Eventos do dia selecionado */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {selectedEvents.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Nenhum evento neste dia</p>
              <button onClick={() => setShowNew(true)} className="mt-3 text-xs text-purple-600 font-semibold hover:underline">+ Criar evento</button>
            </div>
          ) : selectedEvents.map(e => (
            <EventCard key={e.id} comp={e} onToggle={() => handleToggle(e.id)} />
          ))}
        </div>

        {/* Próximos eventos */}
        {upcoming.length > 0 && (
          <div className="border-t border-slate-100 p-3 shrink-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Próximos
            </p>
            <div className="space-y-1.5">
              {upcoming.map(e => {
                const [, m, d] = e.data.split('-');
                return (
                  <button
                    key={e.id}
                    onClick={() => setDay(e.data)}
                    className="w-full flex items-center gap-2 text-left hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${TIPO_DOT[e.tipo]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{e.titulo}</p>
                      {e.clienteNome && <p className="text-[10px] text-slate-400 truncate">{e.clienteNome}</p>}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{d}/{m}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Legenda */}
        <div className="border-t border-slate-100 px-4 py-3 shrink-0">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Legenda</p>
          <div className="grid grid-cols-2 gap-1">
            {(Object.keys(TIPO_CFG) as CompromissoTipo[]).map(t => (
              <div key={t} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${TIPO_DOT[t]}`} />
                <span className="text-xs text-slate-500">{TIPO_CFG[t].label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showNew && (
        <CompromissoModal
          initial={{ data: selectedDay }}
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); refresh(); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CRM Agenda — calendário mensal estilo Google Calendar
// Eventos vêm de crmData.getAllCompromissos() (compromissos de negociações +
// eventos pessoais livres criados diretamente na agenda)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, X, Check, Calendar,
  Video, PhoneCall, Navigation, ListTodo, MoreHorizontal,
  CheckCircle2, Circle, Clock, Building2, DollarSign, ChevronDown,
} from 'lucide-react';
import {
  getAllCompromissos, addCompromisso, toggleCompromissoConcluido,
  getCrmAtividades, updateCrmAtividade, createCrmCusto,
  CRM_CUSTO_CATEGORIAS,
  type Compromisso, type CompromissoTipo, type CrmAtividade,
  type CrmCustoCategoria,
} from '../data/crmData';

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

// ── Modal novo evento ──────────────────────────────────────────────────────────

interface NewEventModalProps {
  defaultDate: string;
  onClose: () => void;
  onCreated: () => void;
}

function NewEventModal({ defaultDate, onClose, onCreated }: NewEventModalProps) {
  const [form, setForm] = useState({
    titulo: '', tipo: 'reuniao' as CompromissoTipo,
    data: defaultDate, hora: '09:00', duracao: 60,
    clienteNome: '', notas: '',
  });
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleCreate = async () => {
    if (!form.titulo || !form.data) return;
    await addCompromisso(undefined, {
      titulo: form.titulo, tipo: form.tipo,
      data: form.data, hora: form.hora,
      duracao: Number(form.duracao),
      clienteNome: form.clienteNome,
      notas: form.notas,
      criado_por: 'usuario', concluido: false,
    });
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 p-5 border-b border-slate-100">
          <Calendar className="w-5 h-5 text-purple-600" />
          <h2 className="font-bold text-slate-800">Novo Evento</h2>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-slate-400" placeholder="Título *" value={form.titulo} onChange={f('titulo')} />
          <div className="grid grid-cols-2 gap-2">
            <select className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" value={form.tipo} onChange={f('tipo')}>
              {(Object.keys(TIPO_CFG) as CompromissoTipo[]).map(t => <option key={t} value={t}>{TIPO_CFG[t].label}</option>)}
            </select>
            <input type="number" min={5} max={480} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="Duração (min)" value={form.duracao} onChange={f('duracao')} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" value={form.data} onChange={f('data')} />
            <input type="time" className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" value={form.hora} onChange={f('hora')} />
          </div>
          <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-slate-400" placeholder="Cliente / empresa (opcional)" value={form.clienteNome} onChange={f('clienteNome')} />
          <textarea rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none placeholder-slate-400" placeholder="Notas (opcional)" value={form.notas} onChange={f('notas')} />
        </div>
        <div className="flex gap-2 p-5 border-t border-slate-100">
          <button onClick={handleCreate} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Criar Evento
          </button>
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de custo ────────────────────────────────────────────────────────────

interface CostModalProps {
  label: string;
  defaultDate: string;
  atividadeId?: string;
  compromissoId?: string;
  negociacaoId?: string;
  onClose: () => void;
  onSaved: () => void;
}

function CostModal({ label, defaultDate, atividadeId, compromissoId, negociacaoId, onClose, onSaved }: CostModalProps) {
  const [descricao, setDescricao]     = useState('');
  const [valor, setValor]             = useState('');
  const [data, setData]               = useState(defaultDate);
  const [categoria, setCategoria]     = useState<CrmCustoCategoria>('outros');
  const [saving, setSaving]           = useState(false);
  const [err, setErr]                 = useState('');

  const handleSave = async () => {
    if (!descricao.trim()) { setErr('Informe a descrição.'); return; }
    const v = parseFloat(valor.replace(',', '.'));
    if (!v || v <= 0) { setErr('Informe um valor válido.'); return; }
    setSaving(true);
    try {
      await createCrmCusto({
        descricao: descricao.trim(),
        valor: v,
        data,
        categoria,
        negociacao_id:  negociacaoId,
        atividade_id:   atividadeId,
        compromisso_id: compromissoId,
      });
      onSaved();
      onClose();
    } catch (e) {
      setErr(String(e));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 p-5 border-b border-slate-100">
          <DollarSign className="w-5 h-5 text-red-500" />
          <div>
            <h2 className="font-bold text-slate-800 text-sm">Registrar Custo</h2>
            <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{label}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 placeholder-slate-400"
            placeholder="Descrição *"
            value={descricao}
            onChange={e => { setDescricao(e.target.value); setErr(''); }}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number" min="0" step="0.01"
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 placeholder-slate-400"
              placeholder="Valor (R$) *"
              value={valor}
              onChange={e => { setValor(e.target.value); setErr(''); }}
            />
            <input
              type="date"
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              value={data}
              onChange={e => setData(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value as CrmCustoCategoria)}
              className="w-full appearance-none border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              {CRM_CUSTO_CATEGORIAS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        <div className="flex gap-2 p-5 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            <DollarSign className="w-4 h-4" /> {saving ? 'Salvando...' : 'Registrar Custo'}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ── Config de atividades no calendário ────────────────────────────────────────

const ATIV_STATUS_CFG = {
  pendente:     { label: 'Pendente',     dot: 'bg-amber-400',  bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  em_andamento: { label: 'Em andamento', dot: 'bg-blue-400',   bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'  },
  concluida:    { label: 'Concluída',    dot: 'bg-green-400',  bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  cancelada:    { label: 'Cancelada',    dot: 'bg-slate-300',  bg: 'bg-slate-50',  text: 'text-slate-500',  border: 'border-slate-200' },
};

// ── Cartão de atividade ───────────────────────────────────────────────────────

function AtivCard({ ativ, onConcluir, onRefresh }: { ativ: CrmAtividade; onConcluir: () => void; onRefresh: () => void }) {
  const cfg = ATIV_STATUS_CFG[ativ.status];
  const done = ativ.status === 'concluida' || ativ.status === 'cancelada';
  const [showCost, setShowCost] = useState(false);
  return (
    <>
      <div className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${done ? 'opacity-50 bg-slate-50 border-slate-100' : `bg-white ${cfg.border} hover:border-slate-300`}`}>
        <button onClick={onConcluir} className="shrink-0 mt-0.5" title={done ? 'Reabrir' : 'Marcar como concluída'}>
          {done
            ? <CheckCircle2 className="w-5 h-5 text-green-500" />
            : <Circle className="w-5 h-5 text-slate-300 hover:text-amber-500 transition-colors" />}
        </button>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
          <ListTodo className={`w-4 h-4 ${cfg.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className={`text-sm font-semibold ${done ? 'line-through text-slate-400' : 'text-slate-800'}`}>{ativ.titulo}</p>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>ATIVIDADE</span>
            {ativ.criado_por === 'ia' && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold">✦ IA</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-slate-500">Prazo: {ativ.data_prazo ?? '—'}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
          </div>
          {ativ.descricao && <p className="text-xs text-slate-500 mt-1 truncate">{ativ.descricao}</p>}
          <button
            onClick={() => setShowCost(true)}
            className="mt-1.5 flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors"
          >
            <DollarSign className="w-3 h-3" /> Registrar custo
          </button>
        </div>
      </div>
      {showCost && (
        <CostModal
          label={ativ.titulo}
          defaultDate={ativ.data_prazo ?? new Date().toISOString().split('T')[0]}
          atividadeId={ativ.id}
          negociacaoId={ativ.negociacao_id ?? undefined}
          onClose={() => setShowCost(false)}
          onSaved={onRefresh}
        />
      )}
    </>
  );
}

// ── Cartão de evento ───────────────────────────────────────────────────────────

function EventCard({ comp, onToggle, onRefresh }: { comp: Compromisso; onToggle: () => void; onRefresh: () => void }) {
  const cfg = TIPO_CFG[comp.tipo];
  const fmtDate = (d: string) => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };
  const [showCost, setShowCost] = useState(false);

  return (
    <>
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
          <button
            onClick={() => setShowCost(true)}
            className="mt-1.5 flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors"
          >
            <DollarSign className="w-3 h-3" /> Registrar custo
          </button>
        </div>
      </div>
      {showCost && (
        <CostModal
          label={comp.titulo}
          defaultDate={comp.data}
          compromissoId={comp.id}
          negociacaoId={comp.negociacaoId}
          onClose={() => setShowCost(false)}
          onSaved={onRefresh}
        />
      )}
    </>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function Agenda() {
  const today   = new Date();
  const [year,  setYear]        = useState(today.getFullYear());
  const [month, setMonth]       = useState(today.getMonth());
  const [selectedDay, setDay]   = useState<string>(todayYMD());
  const [events, setEvents]     = useState<Compromisso[]>([]);
  const [atividades, setAtividades] = useState<CrmAtividade[]>([]);
  const [showNew, setShowNew]   = useState(false);

  const refresh = useCallback(async () => {
    const [comps, ativs] = await Promise.all([getAllCompromissos(), getCrmAtividades()]);
    setEvents(comps);
    setAtividades(ativs.filter(a => a.data_prazo)); // só atividades com prazo definido
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleToggle = useCallback(async (id: string) => {
    await toggleCompromissoConcluido(id);
    refresh();
  }, [refresh]);

  const handleAtivConcluir = useCallback(async (ativ: CrmAtividade) => {
    const novoStatus = ativ.status === 'concluida' ? 'pendente' : 'concluida';
    await updateCrmAtividade(ativ.id, { status: novoStatus });
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

  // Agrupar compromissos por data
  const byDate = events.reduce<Record<string, Compromisso[]>>((acc, c) => {
    if (!acc[c.data]) acc[c.data] = [];
    acc[c.data].push(c);
    return acc;
  }, {});

  // Agrupar atividades por data_prazo
  const ativByDate = atividades.reduce<Record<string, CrmAtividade[]>>((acc, a) => {
    if (!a.data_prazo) return acc;
    if (!acc[a.data_prazo]) acc[a.data_prazo] = [];
    acc[a.data_prazo].push(a);
    return acc;
  }, {});

  const selectedEvents   = (byDate[selectedDay] ?? []).sort((a, b) => a.hora.localeCompare(b.hora));
  const selectedAtivs    = (ativByDate[selectedDay] ?? []).filter(a => a.status !== 'cancelada');
  const totalSelected    = selectedEvents.length + selectedAtivs.length;

  // Próximos eventos + atividades pendentes
  const upcoming = events
    .filter(e => !e.concluido && e.data >= todayS)
    .sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora))
    .slice(0, 5);

  const upcomingAtivs = atividades
    .filter(a => a.data_prazo && a.data_prazo >= todayS && a.status !== 'concluida' && a.status !== 'cancelada')
    .sort((a, b) => (a.data_prazo ?? '').localeCompare(b.data_prazo ?? ''))
    .slice(0, 3);

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
                const dayAtivs = (ativByDate[ymd] ?? []).filter(a => a.status !== 'cancelada');
                const totalDay = dayEvts.length + dayAtivs.length;
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
                      {dayEvts.slice(0, 2).map((e, i) => (
                        <div key={i} className={`flex items-center gap-1 rounded px-1 py-0.5 ${TIPO_CFG[e.tipo].bg} ${e.concluido ? 'opacity-40' : ''}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TIPO_DOT[e.tipo]}`} />
                          <span className={`text-[10px] font-medium truncate ${TIPO_CFG[e.tipo].color}`}>{e.hora} {e.titulo}</span>
                        </div>
                      ))}
                      {dayAtivs.slice(0, 2).map((a, i) => {
                        const sc = ATIV_STATUS_CFG[a.status];
                        return (
                          <div key={`a${i}`} className={`flex items-center gap-1 rounded px-1 py-0.5 ${sc.bg} ${a.status === 'concluida' ? 'opacity-40' : ''}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />
                            <span className={`text-[10px] font-medium truncate ${sc.text}`}>{a.titulo}</span>
                          </div>
                        );
                      })}
                      {totalDay > 4 && (
                        <p className="text-[10px] text-slate-400 pl-1">+{totalDay - 4} mais</p>
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
              <p className="text-sm font-bold text-slate-800 mt-0.5">{totalSelected} evento{totalSelected !== 1 ? 's' : ''}</p>
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
          {totalSelected === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Nenhum evento neste dia</p>
              <button onClick={() => setShowNew(true)} className="mt-3 text-xs text-purple-600 font-semibold hover:underline">+ Criar evento</button>
            </div>
          ) : (
            <>
              {selectedEvents.map(e => (
                <EventCard key={e.id} comp={e} onToggle={() => handleToggle(e.id)} onRefresh={refresh} />
              ))}
              {selectedAtivs.map(a => (
                <AtivCard key={a.id} ativ={a} onConcluir={() => handleAtivConcluir(a)} onRefresh={refresh} />
              ))}
            </>
          )}
        </div>

        {/* Próximos eventos + atividades */}
        {(upcoming.length > 0 || upcomingAtivs.length > 0) && (
          <div className="border-t border-slate-100 p-3 shrink-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Próximos
            </p>
            <div className="space-y-1.5">
              {upcoming.map(e => {
                const [, m, d] = e.data.split('-');
                return (
                  <button key={e.id} onClick={() => setDay(e.data)}
                    className="w-full flex items-center gap-2 text-left hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${TIPO_DOT[e.tipo]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{e.titulo}</p>
                      {e.clienteNome && <p className="text-[10px] text-slate-400 truncate">{e.clienteNome}</p>}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{d}/{m}</span>
                  </button>
                );
              })}
              {upcomingAtivs.map(a => {
                const [, m, d] = (a.data_prazo ?? '').split('-');
                const sc = ATIV_STATUS_CFG[a.status];
                return (
                  <button key={a.id} onClick={() => setDay(a.data_prazo!)}
                    className="w-full flex items-center gap-2 text-left hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{a.titulo}</p>
                      <p className="text-[10px] text-amber-600">Atividade · {sc.label}</p>
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
        <NewEventModal
          defaultDate={selectedDay}
          onClose={() => setShowNew(false)}
          onCreated={refresh}
        />
      )}
    </div>
  );
}

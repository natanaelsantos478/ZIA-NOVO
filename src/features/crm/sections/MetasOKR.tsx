// ─────────────────────────────────────────────────────────────────────────────
// Metas e OKRs — Sistema completo de Objectives & Key Results integrado ao CRM
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import {
  Target, Plus, Trash2, Edit3, ChevronDown, ChevronRight,
  TrendingUp, CheckCircle2, Circle, AlertCircle, Trophy,
  Calendar, RefreshCw, Zap, BarChart2, Users, DollarSign,
  X, Save, Check, Flame,
} from 'lucide-react';
import { getClientes } from '../../../lib/erp';
import { getAllNegociacoes } from '../data/crmData';
import { useScope } from '../../../context/ProfileContext';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type KRType = 'percent' | 'numeric' | 'currency' | 'boolean';
type OKRStatus = 'on_track' | 'at_risk' | 'behind' | 'completed';
type Period = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual';

interface KeyResult {
  id: string;
  description: string;
  type: KRType;
  target: number;
  current: number;
  unit?: string;
  autoLink?: 'deals_value' | 'deals_count' | 'clients_count' | 'won_deals' | 'none';
  updatedAt: string;
}

interface Objective {
  id: string;
  title: string;
  description: string;
  period: Period;
  year: number;
  owner: string;
  keyResults: KeyResult[];
  expanded: boolean;
  createdAt: string;
}

// ── Storage (isolado por tenant) ──────────────────────────────────────────────

function storageKey(entityId: string) { return `zia_crm_okr_v1_${entityId}`; }

function loadOKRs(entityId: string): Objective[] {
  try { return JSON.parse(localStorage.getItem(storageKey(entityId)) ?? '[]'); } catch { return []; }
}
function saveOKRs(entityId: string, objs: Objective[]) {
  localStorage.setItem(storageKey(entityId), JSON.stringify(objs));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10); }

function fmtBRL(v: number) {
  return v >= 1_000_000 ? `R$ ${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000 ? `R$ ${(v / 1_000).toFixed(0)}k`
    : `R$ ${v.toFixed(0)}`;
}

function krProgress(kr: KeyResult): number {
  if (kr.type === 'boolean') return kr.current >= 1 ? 100 : 0;
  if (kr.target === 0) return 0;
  return Math.min(Math.round((kr.current / kr.target) * 100), 100);
}

function objectiveProgress(obj: Objective): number {
  if (obj.keyResults.length === 0) return 0;
  const sum = obj.keyResults.reduce((s, kr) => s + krProgress(kr), 0);
  return Math.round(sum / obj.keyResults.length);
}

function okrStatus(pct: number): OKRStatus {
  if (pct >= 100) return 'completed';
  if (pct >= 70)  return 'on_track';
  if (pct >= 40)  return 'at_risk';
  return 'behind';
}

const STATUS_CONFIG: Record<OKRStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  completed: { label: 'Concluído',    color: 'text-emerald-700', bg: 'bg-emerald-100', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  on_track:  { label: 'No Caminho',   color: 'text-blue-700',    bg: 'bg-blue-100',    icon: <TrendingUp   className="w-3.5 h-3.5" /> },
  at_risk:   { label: 'Em Risco',     color: 'text-amber-700',   bg: 'bg-amber-100',   icon: <AlertCircle  className="w-3.5 h-3.5" /> },
  behind:    { label: 'Atrasado',     color: 'text-red-700',     bg: 'bg-red-100',     icon: <Circle       className="w-3.5 h-3.5" /> },
};

const PERIOD_LABELS: Record<Period, string> = {
  Q1: 'Q1 (Jan–Mar)', Q2: 'Q2 (Abr–Jun)',
  Q3: 'Q3 (Jul–Set)', Q4: 'Q4 (Out–Dez)',
  annual: 'Anual',
};

const KR_TYPE_LABELS: Record<KRType, string> = {
  percent: 'Percentual (%)', numeric: 'Numérico', currency: 'Monetário (R$)', boolean: 'Sim/Não',
};

const AUTO_LINK_OPTIONS = [
  { value: 'none',         label: 'Manual (sem vínculo)' },
  { value: 'deals_value',  label: 'Valor de negociações abertas' },
  { value: 'deals_count',  label: 'Qtd. negociações abertas' },
  { value: 'won_deals',    label: 'Negociações ganhas' },
  { value: 'clients_count',label: 'Total de clientes' },
];

// ── CRM Data auto-link ────────────────────────────────────────────────────────

interface CrmSnapshot {
  dealsValue: number;
  dealsCount: number;
  wonDeals: number;
  clientsCount: number;
}

async function fetchCrmSnapshot(): Promise<CrmSnapshot> {
  const [negs, clientes] = await Promise.all([getAllNegociacoes(), getClientes()]);
  const opened = negs.filter(n => n.negociacao.status === 'aberta');
  const won    = negs.filter(n => n.negociacao.status === 'ganha');
  return {
    dealsValue:   opened.reduce((s, n) => s + (n.negociacao.valor_estimado ?? 0), 0),
    dealsCount:   opened.length,
    wonDeals:     won.length,
    clientsCount: clientes.length,
  };
}

function autoValue(link: KeyResult['autoLink'], snap: CrmSnapshot): number {
  switch (link) {
    case 'deals_value':   return snap.dealsValue;
    case 'deals_count':   return snap.dealsCount;
    case 'won_deals':     return snap.wonDeals;
    case 'clients_count': return snap.clientsCount;
    default:              return -1;
  }
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({ pct, color = 'bg-purple-500' }: { pct: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-600 w-8 text-right">{pct}%</span>
    </div>
  );
}

// ── KR Row ────────────────────────────────────────────────────────────────────

function KRRow({
  kr,
  snap,
  onEdit,
  onDelete,
  onUpdateCurrent,
}: {
  kr: KeyResult;
  snap: CrmSnapshot | null;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateCurrent: (val: number) => void;
}) {
  const pct = krProgress(kr);
  const autoVal = snap && kr.autoLink && kr.autoLink !== 'none' ? autoValue(kr.autoLink, snap) : -1;
  const isAutoLinked = autoVal >= 0;
  const displayCurrent = isAutoLinked ? autoVal : kr.current;

  function fmtVal(v: number) {
    if (kr.type === 'currency') return fmtBRL(v);
    if (kr.type === 'boolean')  return v >= 1 ? 'Sim' : 'Não';
    if (kr.type === 'percent')  return `${v}%`;
    return String(v) + (kr.unit ? ` ${kr.unit}` : '');
  }

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 group">
      <div className="w-2 h-2 rounded-full bg-purple-300 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-700 font-medium truncate">{kr.description}</div>
        <div className="flex items-center gap-3 mt-1">
          <ProgressBar pct={pct} color={
            pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-blue-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400'
          } />
          <span className="text-xs text-slate-400 shrink-0">
            {fmtVal(displayCurrent)} / {fmtVal(kr.target)}
          </span>
          {isAutoLinked && (
            <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full shrink-0">Auto</span>
          )}
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!isAutoLinked && kr.type !== 'boolean' && (
          <input
            type="number"
            defaultValue={kr.current}
            onBlur={e => onUpdateCurrent(Number(e.target.value))}
            className="w-20 text-xs px-2 py-1 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-purple-300"
            title="Atualizar valor atual"
          />
        )}
        {!isAutoLinked && kr.type === 'boolean' && (
          <button
            onClick={() => onUpdateCurrent(kr.current >= 1 ? 0 : 1)}
            className={`px-2 py-1 rounded-lg text-xs font-medium ${kr.current >= 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
          >
            {kr.current >= 1 ? 'Sim' : 'Não'}
          </button>
        )}
        <button onClick={onEdit}   className="p-1 rounded hover:bg-purple-50 text-slate-300 hover:text-purple-600"><Edit3  className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

// ── KR Modal (create/edit) ────────────────────────────────────────────────────

interface KRForm { description: string; type: KRType; target: string; current: string; unit: string; autoLink: KeyResult['autoLink'] }
const KR_EMPTY: KRForm = { description: '', type: 'numeric', target: '', current: '0', unit: '', autoLink: 'none' };

function KRModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: KeyResult;
  onSave: (kr: KeyResult) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<KRForm>(initial
    ? { description: initial.description, type: initial.type, target: String(initial.target), current: String(initial.current), unit: initial.unit ?? '', autoLink: initial.autoLink ?? 'none' }
    : KR_EMPTY
  );

  function handleSave() {
    if (!form.description.trim() || !form.target) return;
    onSave({
      id: initial?.id ?? uid(),
      description: form.description.trim(),
      type: form.type,
      target: Number(form.target),
      current: Number(form.current),
      unit: form.unit || undefined,
      autoLink: form.autoLink,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">{initial ? 'Editar KR' : 'Novo Key Result'}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Descrição *</label>
            <input
              autoFocus
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Ex: Atingir R$ 500k em vendas"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Tipo</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as KRType }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-200"
              >
                {Object.entries(KR_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Meta *</label>
              <input
                type="number"
                value={form.target}
                onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                placeholder="100"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Valor Atual</label>
              <input
                type="number"
                value={form.current}
                onChange={e => setForm(f => ({ ...f, current: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Unidade</label>
              <input
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                placeholder="ex: leads, horas..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Vínculo automático com CRM</label>
            <select
              value={form.autoLink}
              onChange={e => setForm(f => ({ ...f, autoLink: e.target.value as KeyResult['autoLink'] }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-200"
            >
              {AUTO_LINK_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {form.autoLink !== 'none' && (
              <p className="text-xs text-purple-600 mt-1">O valor atual será atualizado automaticamente com dados do CRM.</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={!form.description.trim() || !form.target}
            className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-40"
          >
            <Check className="w-4 h-4 inline mr-1" /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Objective Modal ───────────────────────────────────────────────────────────

interface ObjForm { title: string; description: string; period: Period; year: string; owner: string }
const OBJ_EMPTY: ObjForm = { title: '', description: '', period: 'Q2', year: String(new Date().getFullYear()), owner: '' };

function ObjectiveModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Objective;
  onSave: (o: Omit<Objective, 'keyResults' | 'expanded' | 'createdAt'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ObjForm>(initial
    ? { title: initial.title, description: initial.description, period: initial.period, year: String(initial.year), owner: initial.owner }
    : OBJ_EMPTY
  );

  function handleSave() {
    if (!form.title.trim()) return;
    onSave({ id: initial?.id ?? uid(), title: form.title.trim(), description: form.description, period: form.period, year: Number(form.year), owner: form.owner });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">{initial ? 'Editar Objetivo' : 'Novo Objetivo'}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Título do Objetivo *</label>
            <input
              autoFocus
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ex: Dobrar a receita recorrente"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-200"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Descrição</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Descreva o objetivo..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-200 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Período</label>
              <select
                value={form.period}
                onChange={e => setForm(f => ({ ...f, period: e.target.value as Period }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-200"
              >
                {Object.entries(PERIOD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Ano</label>
              <input
                type="number"
                value={form.year}
                onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Responsável</label>
            <input
              value={form.owner}
              onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
              placeholder="Nome do responsável"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-200"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={!form.title.trim()}
            className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-40"
          >
            <Save className="w-4 h-4 inline mr-1" /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type FilterPeriod = Period | 'all';

export default function MetasOKR() {
  const scope = useScope();
  const entityId = scope.entityId ?? 'default';

  const [objectives, setObjectives] = useState<Objective[]>(() => loadOKRs(entityId));
  const [snap, setSnap]             = useState<CrmSnapshot | null>(null);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<FilterPeriod>('all');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  // Modals
  const [objModal,  setObjModal]  = useState<{ open: boolean; edit?: Objective }>({ open: false });
  const [krModal,   setKrModal]   = useState<{ open: boolean; objId?: string; edit?: KeyResult }>({ open: false });
  const [delConfirm, setDelConfirm] = useState<{ open: boolean; objId: string } | null>(null);

  // Recarrega OKRs ao trocar de empresa
  useEffect(() => {
    setObjectives(loadOKRs(entityId));
  }, [entityId]);

  useEffect(() => {
    fetchCrmSnapshot().then(s => setSnap(s)).finally(() => setLoading(false));
  }, [entityId]);

  function persist(objs: Objective[]) { setObjectives(objs); saveOKRs(entityId, objs); }

  // ─ Objective CRUD ─

  function saveObjective(data: Omit<Objective, 'keyResults' | 'expanded' | 'createdAt'>) {
    if (objectives.some(o => o.id === data.id)) {
      persist(objectives.map(o => o.id === data.id ? { ...o, ...data } : o));
    } else {
      persist([...objectives, { ...data, keyResults: [], expanded: true, createdAt: new Date().toISOString() }]);
    }
    setObjModal({ open: false });
  }

  function deleteObjective(id: string) {
    persist(objectives.filter(o => o.id !== id));
    setDelConfirm(null);
  }

  function toggleExpand(id: string) {
    persist(objectives.map(o => o.id === id ? { ...o, expanded: !o.expanded } : o));
  }

  // ─ KR CRUD ─

  function saveKR(objId: string, kr: KeyResult) {
    persist(objectives.map(o => {
      if (o.id !== objId) return o;
      const krs = o.keyResults.some(k => k.id === kr.id)
        ? o.keyResults.map(k => k.id === kr.id ? kr : k)
        : [...o.keyResults, kr];
      return { ...o, keyResults: krs };
    }));
    setKrModal({ open: false });
  }

  function deleteKR(objId: string, krId: string) {
    persist(objectives.map(o => o.id !== objId ? o : { ...o, keyResults: o.keyResults.filter(k => k.id !== krId) }));
  }

  function updateKRCurrent(objId: string, krId: string, val: number) {
    persist(objectives.map(o => o.id !== objId ? o : {
      ...o,
      keyResults: o.keyResults.map(k => k.id !== krId ? k : { ...k, current: val, updatedAt: new Date().toISOString() }),
    }));
  }

  // ─ Filtered ─

  const filtered = objectives.filter(o => {
    if (filterYear && o.year !== filterYear) return false;
    if (filter !== 'all' && o.period !== filter) return false;
    return true;
  });

  // ─ Summary stats ─

  const allPcts = objectives.map(o => objectiveProgress(o));
  const avgPct  = allPcts.length ? Math.round(allPcts.reduce((s, v) => s + v, 0) / allPcts.length) : 0;
  const completed = objectives.filter(o => objectiveProgress(o) >= 100).length;
  const onTrack   = objectives.filter(o => { const p = objectiveProgress(o); return p >= 70 && p < 100; }).length;
  const atRisk    = objectives.filter(o => { const p = objectiveProgress(o); return p >= 40 && p < 70; }).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Metas e OKRs</h1>
          <p className="text-sm text-slate-400 mt-0.5">Objectives & Key Results integrados ao CRM</p>
        </div>
        <button
          onClick={() => setObjModal({ open: true })}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700"
        >
          <Plus className="w-4 h-4" /> Novo Objetivo
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Progresso Geral', value: `${avgPct}%`,      icon: <BarChart2 className="w-5 h-5" />, color: 'bg-purple-50 text-purple-600' },
          { label: 'Concluídos',      value: String(completed), icon: <Trophy    className="w-5 h-5" />, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'No Caminho',      value: String(onTrack),   icon: <TrendingUp className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600' },
          { label: 'Em Risco',        value: String(atRisk),    icon: <AlertCircle className="w-5 h-5" />, color: 'bg-amber-50 text-amber-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>{s.icon}</div>
            <div>
              <div className="text-xs text-slate-400">{s.label}</div>
              <div className="text-xl font-bold text-slate-800">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CRM Snapshot */}
      {snap && !loading && (
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-semibold text-purple-700">Dados CRM em Tempo Real</span>
            <button
              onClick={() => { setLoading(true); fetchCrmSnapshot().then(s => setSnap(s)).finally(() => setLoading(false)); }}
              className="ml-auto text-purple-400 hover:text-purple-600"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Valor em Pipeline', value: fmtBRL(snap.dealsValue), icon: <DollarSign className="w-3.5 h-3.5" /> },
              { label: 'Negoc. Abertas',    value: String(snap.dealsCount), icon: <Target     className="w-3.5 h-3.5" /> },
              { label: 'Vendas Ganhas',     value: String(snap.wonDeals),   icon: <Flame      className="w-3.5 h-3.5" /> },
              { label: 'Total Clientes',    value: String(snap.clientsCount), icon: <Users    className="w-3.5 h-3.5" /> },
            ].map((d, i) => (
              <div key={i} className="bg-white rounded-lg px-3 py-2 flex items-center gap-2">
                <span className="text-purple-400">{d.icon}</span>
                <div>
                  <div className="text-xs text-slate-400">{d.label}</div>
                  <div className="text-sm font-bold text-slate-700">{d.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Calendar className="w-4 h-4 text-slate-400" />
        <input
          type="number"
          value={filterYear}
          onChange={e => setFilterYear(Number(e.target.value))}
          className="w-20 text-sm px-2 py-1 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-purple-300"
        />
        <div className="flex gap-1 flex-wrap">
          {(['all', 'Q1', 'Q2', 'Q3', 'Q4', 'annual'] as FilterPeriod[]).map(p => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === p ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-purple-50'}`}
            >
              {p === 'all' ? 'Todos' : PERIOD_LABELS[p as Period]}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} objetivo(s)</span>
      </div>

      {/* Objectives list */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Target className="w-7 h-7 text-purple-300" />
            </div>
            <p className="text-slate-400 text-sm">Nenhum objetivo cadastrado para este período.</p>
            <button
              onClick={() => setObjModal({ open: true })}
              className="mt-3 text-purple-600 text-sm font-medium hover:underline"
            >
              + Criar primeiro objetivo
            </button>
          </div>
        )}

        {filtered.map(obj => {
          const pct    = objectiveProgress(obj);
          const status = okrStatus(pct);
          const sc     = STATUS_CONFIG[status];
          return (
            <div key={obj.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Objective header */}
              <div className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleExpand(obj.id)}
                    className="mt-0.5 text-slate-400 hover:text-slate-600 shrink-0"
                  >
                    {obj.expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800">{obj.title}</span>
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.color}`}>
                        {sc.icon} {sc.label}
                      </span>
                      <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                        {PERIOD_LABELS[obj.period]} {obj.year}
                      </span>
                      {obj.owner && (
                        <span className="text-xs text-slate-400">{obj.owner}</span>
                      )}
                    </div>
                    {obj.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{obj.description}</p>
                    )}
                    <div className="mt-2">
                      <ProgressBar pct={pct} color={
                        pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-blue-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400'
                      } />
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setObjModal({ open: true, edit: obj })} className="p-1.5 rounded-lg hover:bg-purple-50 text-slate-300 hover:text-purple-600"><Edit3  className="w-4 h-4" /></button>
                    <button onClick={() => setDelConfirm({ open: true, objId: obj.id })} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>

              {/* Key Results */}
              {obj.expanded && (
                <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Key Results ({obj.keyResults.length})
                    </span>
                    <button
                      onClick={() => setKrModal({ open: true, objId: obj.id })}
                      className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar KR
                    </button>
                  </div>
                  {obj.keyResults.length === 0 && (
                    <p className="text-xs text-slate-300 py-2 text-center">Nenhum Key Result ainda. Adicione para rastrear o progresso.</p>
                  )}
                  {obj.keyResults.map(kr => (
                    <KRRow
                      key={kr.id}
                      kr={kr}
                      snap={snap}
                      onEdit={() => setKrModal({ open: true, objId: obj.id, edit: kr })}
                      onDelete={() => deleteKR(obj.id, kr.id)}
                      onUpdateCurrent={val => updateKRCurrent(obj.id, kr.id, val)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {objModal.open && (
        <ObjectiveModal
          initial={objModal.edit}
          onSave={saveObjective}
          onClose={() => setObjModal({ open: false })}
        />
      )}

      {krModal.open && krModal.objId && (
        <KRModal
          initial={krModal.edit}
          onSave={kr => saveKR(krModal.objId!, kr)}
          onClose={() => setKrModal({ open: false })}
        />
      )}

      {delConfirm?.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-slate-800 mb-1">Excluir Objetivo?</h3>
            <p className="text-sm text-slate-400 mb-5">Todos os Key Results serão excluídos. Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2">
              <button onClick={() => setDelConfirm(null)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={() => deleteObjective(delConfirm.objId)} className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

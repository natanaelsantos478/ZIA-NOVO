import { useState } from 'react';
import { Plus, Zap, Clock, Calendar, RefreshCw, AlertCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { DeptRow } from '../OrgChart';

/* ── Types ──────────────────────────────────────────────────────────────── */

type Trigger = 'diario' | 'semanal' | 'mensal' | 'evento';
type AutoStatus = 'ativo' | 'pausado' | 'rascunho';

interface Automation {
  id: string;
  name: string;
  description: string;
  trigger: Trigger;
  triggerDetail: string;
  assigneeRole: string;
  slaDays: number;
  status: AutoStatus;
  runCount: number;
  lastRun: string;
  tags: string[];
}

/* ── Mock data ────────────────────────────────────────────────────────────── */

const INIT: Automation[] = [
  { id: '1', name: 'Relatório Diário de Presença',    description: 'Gera e envia relatório de presença do departamento para o gestor às 18h.',  trigger: 'diario',  triggerDetail: 'Todo dia às 18:00', assigneeRole: 'Analista de RH',   slaDays: 1, status: 'ativo',   runCount: 124, lastRun: '27/01/2025', tags: ['RH','Automático'] },
  { id: '2', name: 'Revisão Semanal de Ponto',        description: 'Consolida divergências de ponto e notifica colaboradores com pendências.',    trigger: 'semanal', triggerDetail: 'Toda sexta às 16:00', assigneeRole: 'Gestor',          slaDays: 2, status: 'ativo',   runCount: 18,  lastRun: '24/01/2025', tags: ['Ponto','Gestor']  },
  { id: '3', name: 'Alerta de Férias Vencendo',       description: 'Notifica RH e gestor sobre colaboradores com férias vencendo em 60 dias.',    trigger: 'mensal',  triggerDetail: 'Dia 1 de cada mês', assigneeRole: 'Gestor de RH',     slaDays: 5, status: 'ativo',   runCount: 6,   lastRun: '01/01/2025', tags: ['Férias','Alerta'] },
  { id: '4', name: 'Integração de Novos Membros',     description: 'Cria tarefas de onboarding ao admitir um novo colaborador no departamento.',  trigger: 'evento',  triggerDetail: 'Ao criar colaborador', assigneeRole: 'Tech Lead',      slaDays: 3, status: 'ativo',   runCount: 4,   lastRun: '15/01/2025', tags: ['Onboarding','Evento'] },
  { id: '5', name: 'Consolidação Financeira Mensal',  description: 'Compila custos diretos e indiretos e gera DRE departamental no ERP.',         trigger: 'mensal',  triggerDetail: 'Último dia útil',   assigneeRole: 'Controller',       slaDays: 2, status: 'pausado', runCount: 12,  lastRun: '31/12/2024', tags: ['Financeiro','ERP'] },
];

/* ── Constants ────────────────────────────────────────────────────────────── */

const TRIGGER_ICON: Record<Trigger, React.ElementType> = {
  diario:  Clock,
  semanal: RefreshCw,
  mensal:  Calendar,
  evento:  AlertCircle,
};
const TRIGGER_LABEL: Record<Trigger, string> = {
  diario:  'Diário',
  semanal: 'Semanal',
  mensal:  'Mensal',
  evento:  'Por Evento',
};
const STATUS_CFG: Record<AutoStatus, { label: string; cls: string }> = {
  ativo:    { label: 'Ativo',    cls: 'bg-green-100 text-green-700'  },
  pausado:  { label: 'Pausado',  cls: 'bg-amber-100 text-amber-700'  },
  rascunho: { label: 'Rascunho', cls: 'bg-slate-100 text-slate-500'  },
};

/* ── Form ─────────────────────────────────────────────────────────────────── */

interface AutoForm {
  name: string; description: string; trigger: Trigger; triggerDetail: string;
  assigneeRole: string; slaDays: string; tags: string; status: AutoStatus;
}
const INIT_FORM: AutoForm = {
  name: '', description: '', trigger: 'diario', triggerDetail: '', assigneeRole: '', slaDays: '1', tags: '', status: 'rascunho',
};
const INPUT = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400';

function NewAutoModal({ onClose, onSave }: { onClose: () => void; onSave: (a: Automation) => void }) {
  const [form, setForm] = useState<AutoForm>(INIT_FORM);
  const set = (p: Partial<AutoForm>) => setForm((prev) => ({ ...prev, ...p }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Nova Automação</h3>
            <p className="text-xs text-slate-400 mt-0.5">Configure uma atividade automática para este departamento</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome da Automação *</label>
            <input type="text" value={form.name} onChange={(e) => set({ name: e.target.value })} className={INPUT} placeholder="Ex: Relatório Diário de Presença" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição</label>
            <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} className={INPUT + ' resize-none'} rows={3} placeholder="O que esta automação faz?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Gatilho / Frequência *</label>
              <select value={form.trigger} onChange={(e) => set({ trigger: e.target.value as Trigger })} className={INPUT}>
                <option value="diario">Diário</option>
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
                <option value="evento">Por Evento</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Detalhe do Gatilho</label>
              <input type="text" value={form.triggerDetail} onChange={(e) => set({ triggerDetail: e.target.value })} className={INPUT} placeholder={form.trigger === 'diario' ? 'Ex: Todo dia às 08:00' : form.trigger === 'evento' ? 'Ex: Ao criar colaborador' : 'Ex: Toda sexta às 17:00'} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cargo Responsável *</label>
              <input type="text" value={form.assigneeRole} onChange={(e) => set({ assigneeRole: e.target.value })} className={INPUT} placeholder="Ex: Gestor de RH" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">SLA (dias)</label>
              <input type="number" min="1" value={form.slaDays} onChange={(e) => set({ slaDays: e.target.value })} className={INPUT} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tags (separadas por vírgula)</label>
            <input type="text" value={form.tags} onChange={(e) => set({ tags: e.target.value })} className={INPUT} placeholder="Ex: RH, Automático, Ponto" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status inicial</label>
            <div className="flex gap-2">
              {(['rascunho', 'ativo'] as AutoStatus[]).map((s) => (
                <label key={s} className={`flex-1 text-center px-3 py-2 border rounded-xl cursor-pointer text-sm font-medium transition-all ${form.status === s ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-slate-200 text-slate-600'}`}>
                  <input type="radio" className="sr-only" checked={form.status === s} onChange={() => set({ status: s })} />
                  {STATUS_CFG[s].label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 font-medium">Cancelar</button>
          <button
            onClick={() => {
              if (!form.name || !form.assigneeRole) return;
              onSave({
                id: Date.now().toString(), name: form.name, description: form.description,
                trigger: form.trigger, triggerDetail: form.triggerDetail || '—',
                assigneeRole: form.assigneeRole, slaDays: parseInt(form.slaDays) || 1,
                status: form.status, runCount: 0, lastRun: '—',
                tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
              });
              onClose();
            }}
            className="px-5 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium"
          >Salvar Automação</button>
        </div>
      </div>
    </div>
  );
}

/* ── Automation card ────────────────────────────────────────────────────── */
function AutoCard({ auto, onToggle }: { auto: Automation; onToggle: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const TIcon = TRIGGER_ICON[auto.trigger];
  const s = STATUS_CFG[auto.status];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${auto.status === 'ativo' ? 'bg-pink-100 text-pink-600' : 'bg-slate-100 text-slate-400'}`}>
            <TIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-800">{auto.name}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{auto.description}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
              <span className="flex items-center gap-1"><TIcon className="w-3 h-3" /> {TRIGGER_LABEL[auto.trigger]} — {auto.triggerDetail}</span>
              <span>·</span>
              <span>SLA {auto.slaDays}d</span>
              <span>·</span>
              <span>Resp: {auto.assigneeRole}</span>
              <span>·</span>
              <span>{auto.runCount} execuções</span>
              <span>·</span>
              <span>Último: {auto.lastRun}</span>
            </div>
            {auto.tags.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {auto.tags.map((t) => (
                  <span key={t} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onToggle(auto.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${auto.status === 'ativo' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
          >
            {auto.status === 'ativo' ? 'Pausar' : 'Ativar'}
          </button>
          <button onClick={() => setExpanded((v) => !v)} className="text-slate-400 hover:text-slate-600">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 text-sm text-slate-600">
          <p className="font-medium text-slate-700 mb-2">Detalhes da Automação</p>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div><p className="text-slate-400">Gatilho</p><p className="font-medium mt-0.5">{TRIGGER_LABEL[auto.trigger]}</p></div>
            <div><p className="text-slate-400">Frequência</p><p className="font-medium mt-0.5">{auto.triggerDetail}</p></div>
            <div><p className="text-slate-400">Responsável</p><p className="font-medium mt-0.5">{auto.assigneeRole}</p></div>
            <div><p className="text-slate-400">SLA</p><p className="font-medium mt-0.5">{auto.slaDays} dia(s)</p></div>
            <div><p className="text-slate-400">Execuções</p><p className="font-medium mt-0.5">{auto.runCount}×</p></div>
            <div><p className="text-slate-400">Última execução</p><p className="font-medium mt-0.5">{auto.lastRun}</p></div>
          </div>
          <p className="mt-3 text-slate-500">{auto.description}</p>
        </div>
      )}
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────────── */

export default function TabAutomacoes({ dept: _dept }: { dept: DeptRow }) {
  const [autos, setAutos] = useState<Automation[]>(INIT);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<AutoStatus | 'todos'>('todos');

  const visible = filter === 'todos' ? autos : autos.filter((a) => a.status === filter);

  const toggle = (id: string) =>
    setAutos((prev) => prev.map((a) =>
      a.id === id ? { ...a, status: a.status === 'ativo' ? 'pausado' : 'ativo' } : a,
    ));

  const ativos   = autos.filter((a) => a.status === 'ativo').length;
  const pausados = autos.filter((a) => a.status === 'pausado').length;

  return (
    <div className="p-8 space-y-6">
      {showForm && <NewAutoModal onClose={() => setShowForm(false)} onSave={(a) => setAutos((prev) => [...prev, a])} />}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Automações Ativas</p>
          <p className="text-2xl font-bold text-green-600">{ativos}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Pausadas</p>
          <p className="text-2xl font-bold text-amber-600">{pausados}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Execuções este mês</p>
          <p className="text-2xl font-bold text-slate-800">{autos.reduce((s, a) => s + a.runCount, 0)}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          {(['todos', 'ativo', 'pausado'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${filter === f ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500'}`}>
              {f === 'todos' ? 'Todas' : STATUS_CFG[f].label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
          <Plus className="w-4 h-4" /> Nova Automação
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {visible.map((a) => <AutoCard key={a.id} auto={a} onToggle={toggle} />)}
        {visible.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
            <Zap className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Nenhuma automação encontrada</p>
            <p className="text-sm text-slate-400 mt-1">Crie sua primeira automação para este departamento.</p>
          </div>
        )}
      </div>
    </div>
  );
}

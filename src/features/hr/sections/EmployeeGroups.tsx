import { useState, useRef } from 'react';
import {
  Plus, Search, Users, Clock, Tag, Calendar,
  X, Trash2, UserPlus, Bell, Zap, Edit2, Check, ChevronDown, Settings,
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ─── Types ───────────────────────────────────────────────────────────────────

interface DirectCost {
  id: number;
  description: string;
  amount: number | '';
}

interface CustomGroupType {
  id: string;
  name: string;
  directCosts: DirectCost[];
  autoAlertLabel: string;
}

type GroupType = 'Turno' | 'Departamento' | 'Projeto' | 'Benefício' | 'Personalizado' | 'Automático';

type TriggerCondition =
  | 'Atraso'
  | 'Rapidez'
  | 'Prazo Ideal'
  | 'Tempo de Resposta'
  | 'Não Concluída'
  | 'Concluída'
  | 'Conclusão Somada';

type EntryMode = 'Imediato' | 'Data Fixa' | 'Após X Dias';

interface GroupMember {
  id: string;
  name: string;
  dept: string;
  role: string;
  joinedAt: string;
  removalDeadline: string;
}

interface GroupTrigger {
  id: number;
  allEmployees: boolean;
  employeeIds: string[];
  activityId: string;
  condition: TriggerCondition | '';
  conditionDate: string;
  responseDays: number;
  linkedActivityId: string;
  entryMode: EntryMode;
  entryDate: string;
  entryDays: number;
}

interface AlertRecord {
  id: string;
  label: string;
  enabled: boolean;
  threshold: number;
  thresholdUnit: 'dias' | 'horas' | 'anos';
  inactiveDays: number;
  removalWarningDays: number;
}

interface Group {
  id: string;
  name: string;
  type: GroupType;
  customTypeName: string;
  directCosts: DirectCost[];
  autoAlertLabel: string;
  members: number;
  description: string;
  createdAt: string;
  tags: string[];
  memberList: GroupMember[];
  capacity: number | null;
  triggers: GroupTrigger[];
  alerts: AlertRecord[];
}

// ─── Static data ──────────────────────────────────────────────────────────────

const SAMPLE_EMPLOYEES = [
  { id: 'E001', name: 'Ana Lima',         dept: 'Comercial',  role: 'Executiva de Vendas' },
  { id: 'E002', name: 'Carlos Mota',      dept: 'TI',         role: 'Dev Full Stack'      },
  { id: 'E003', name: 'Fernanda Costa',   dept: 'Comercial',  role: 'Gerente Comercial'   },
  { id: 'E004', name: 'Rafael Santos',    dept: 'TI',         role: 'Analista Sênior'     },
  { id: 'E005', name: 'Beatriz Oliveira', dept: 'RH',         role: 'Analista de RH'      },
  { id: 'E006', name: 'Marcos Ribeiro',   dept: 'Operações',  role: 'Coordenador'         },
  { id: 'E007', name: 'Juliana Pereira',  dept: 'Marketing',  role: 'Designer UX'         },
  { id: 'E008', name: 'André Ferreira',   dept: 'Jurídico',   role: 'Analista Jurídico'   },
  { id: 'E009', name: 'Patrícia Duarte',  dept: 'Qualidade',  role: 'Especialista SGQ'    },
  { id: 'E010', name: 'Roberto Alves',    dept: 'TI',         role: 'Gerente de TI'       },
];

const SAMPLE_ACTIVITIES = [
  { id: 'A001', name: 'Atendimento ao cliente'  },
  { id: 'A002', name: 'Relatório semanal'       },
  { id: 'A003', name: 'Revisão de código'       },
  { id: 'A004', name: 'Reunião de alinhamento'  },
  { id: 'A005', name: 'Entrega de projeto'      },
  { id: 'A006', name: 'Suporte técnico'         },
  { id: 'A007', name: 'Treinamento obrigatório' },
  { id: 'A008', name: 'Proposta comercial'      },
  { id: 'A009', name: 'Auditoria interna'       },
];

const TRIGGER_CONDITIONS: TriggerCondition[] = [
  'Atraso', 'Rapidez', 'Prazo Ideal', 'Tempo de Resposta',
  'Não Concluída', 'Concluída', 'Conclusão Somada',
];

const ALERT_DEFS: {
  id: string; label: string;
  hasThreshold: boolean; hasInactive: boolean; hasRemoval: boolean;
}[] = [
  { id: 'novo',     label: 'Colaborador novo no grupo',           hasThreshold: false, hasInactive: false, hasRemoval: false },
  { id: 'antigo',   label: 'Colaborador há muito tempo no grupo', hasThreshold: true,  hasInactive: false, hasRemoval: false },
  { id: 'depto',    label: 'Colaboradores do mesmo departamento', hasThreshold: false, hasInactive: false, hasRemoval: false },
  { id: 'cargo',    label: 'Colaboradores do mesmo cargo',        hasThreshold: false, hasInactive: false, hasRemoval: false },
  { id: 'limite',   label: 'Limite de capacidade atingido',       hasThreshold: false, hasInactive: false, hasRemoval: false },
  { id: 'removido', label: 'Colaborador removido do grupo',       hasThreshold: false, hasInactive: false, hasRemoval: false },
  { id: 'prazo',    label: 'Prazo de remoção próximo',            hasThreshold: false, hasInactive: false, hasRemoval: true  },
  { id: 'meta',     label: 'Meta do grupo atingida',              hasThreshold: false, hasInactive: false, hasRemoval: false },
  { id: 'inativo',  label: 'Sem atividade recente',               hasThreshold: false, hasInactive: true,  hasRemoval: false },
];

const mkAlerts = (): AlertRecord[] =>
  ALERT_DEFS.map((d) => ({
    id: d.id, label: d.label, enabled: false,
    threshold: 30, thresholdUnit: 'dias' as const,
    inactiveDays: 7, removalWarningDays: 3,
  }));

// ─── Styles ──────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  'Turno':         'bg-blue-100 text-blue-700',
  'Departamento':  'bg-indigo-100 text-indigo-700',
  'Projeto':       'bg-amber-100 text-amber-700',
  'Benefício':     'bg-green-100 text-green-700',
  'Personalizado': 'bg-purple-100 text-purple-700',
  'Automático':    'bg-pink-100 text-pink-700',
};

const TYPE_ICON_COLOR: Record<string, string> = {
  'Turno':         'bg-blue-50 text-blue-600',
  'Departamento':  'bg-indigo-50 text-indigo-600',
  'Projeto':       'bg-amber-50 text-amber-600',
  'Benefício':     'bg-green-50 text-green-600',
  'Personalizado': 'bg-purple-50 text-purple-600',
  'Automático':    'bg-pink-50 text-pink-600',
};

const ALL_TYPES = ['Todos', 'Turno', 'Departamento', 'Projeto', 'Benefício', 'Personalizado', 'Automático'];

interface BuiltinTypeOpt {
  type: GroupType;
  label: string;
  desc: string;
  activeBorder: string;
  activeBg: string;
  activeText: string;
}

const BUILTIN_TYPE_OPTS: BuiltinTypeOpt[] = [
  { type: 'Turno',        label: 'Turno',        desc: 'Colaboradores por turno de trabalho',   activeBorder: 'border-blue-400',   activeBg: 'bg-blue-50',   activeText: 'text-blue-700'   },
  { type: 'Departamento', label: 'Departamento', desc: 'Agrupamento por departamento ou área',  activeBorder: 'border-indigo-400', activeBg: 'bg-indigo-50', activeText: 'text-indigo-700' },
  { type: 'Projeto',      label: 'Projeto',      desc: 'Equipe de um projeto específico',       activeBorder: 'border-amber-400',  activeBg: 'bg-amber-50',  activeText: 'text-amber-700'  },
  { type: 'Benefício',    label: 'Benefício',    desc: 'Elegibilidade a um benefício',          activeBorder: 'border-green-400',  activeBg: 'bg-green-50',  activeText: 'text-green-700'  },
  { type: 'Automático',   label: 'Automático',   desc: 'Entrada por gatilho automático',        activeBorder: 'border-pink-400',   activeBg: 'bg-pink-50',   activeText: 'text-pink-700'   },
];

// ─── Initial data ─────────────────────────────────────────────────────────────

const G = (partial: Omit<Group, 'customTypeName' | 'directCosts' | 'autoAlertLabel'>): Group => ({
  ...partial, customTypeName: '', directCosts: [], autoAlertLabel: '',
});

const GROUPS_INIT: Group[] = [
  G({
    id: 'G001', name: 'Turno Manhã (06h–14h)', type: 'Turno', members: 84,
    description: 'Colaboradores alocados no turno da manhã, incluindo produção e atendimento.',
    createdAt: '2023-01-15', tags: ['turno', 'produção', 'ponto'],
    capacity: null, triggers: [], alerts: mkAlerts(),
    memberList: [
      { id: 'E001', name: 'Ana Lima',       dept: 'Comercial', role: 'Executiva de Vendas', joinedAt: '2023-01-20', removalDeadline: '' },
      { id: 'E006', name: 'Marcos Ribeiro', dept: 'Operações', role: 'Coordenador',          joinedAt: '2023-01-20', removalDeadline: '' },
    ],
  }),
  G({ id: 'G002', name: 'Turno Tarde (14h–22h)', type: 'Turno', members: 72,
    description: 'Colaboradores alocados no turno vespertino.',
    createdAt: '2023-01-15', tags: ['turno', 'produção', 'ponto'],
    capacity: null, triggers: [], alerts: mkAlerts(), memberList: [] }),
  G({ id: 'G003', name: 'Home Office Integral', type: 'Personalizado', members: 38,
    description: 'Funcionários em regime 100% remoto com acesso a benefícios de home office.',
    createdAt: '2021-03-01', tags: ['remoto', 'home office', 'benefício'],
    capacity: null, triggers: [], alerts: mkAlerts(), memberList: [] }),
  G({ id: 'G004', name: 'Híbrido (3×2)', type: 'Personalizado', members: 61,
    description: '3 dias no escritório, 2 dias remotos por semana.',
    createdAt: '2022-06-01', tags: ['híbrido', 'flexível'],
    capacity: null, triggers: [], alerts: mkAlerts(), memberList: [] }),
  G({ id: 'G005', name: 'Projeto ZIA 2.0', type: 'Projeto', members: 18,
    description: 'Equipe multidisciplinar designada para o projeto ZIA Omnisystem versão 2.0.',
    createdAt: '2024-02-10', tags: ['projeto', 'TI', 'temporário'],
    capacity: 20, triggers: [], alerts: mkAlerts(), memberList: [] }),
  G({ id: 'G006', name: 'Plano de Saúde Premium', type: 'Benefício', members: 112,
    description: 'Colaboradores elegíveis ao plano de saúde na categoria premium.',
    createdAt: '2023-07-01', tags: ['benefício', 'saúde'],
    capacity: null, triggers: [], alerts: mkAlerts(), memberList: [] }),
  G({ id: 'G007', name: 'Gestores e Líderes', type: 'Departamento', members: 34,
    description: 'Todos os gestores, coordenadores e diretores da organização.',
    createdAt: '2022-01-01', tags: ['liderança', 'gestão', 'aprovação'],
    capacity: null, triggers: [], alerts: mkAlerts(), memberList: [] }),
  G({ id: 'G008', name: 'Comercial – Comissão Variável', type: 'Benefício', members: 44,
    description: 'Executivos e gerentes comerciais com remuneração variável via comissão.',
    createdAt: '2023-03-15', tags: ['comissão', 'vendas', 'variável'],
    capacity: null, triggers: [], alerts: mkAlerts(), memberList: [] }),
];

// ─── Shared form helpers ──────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 bg-white';
const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

function EGField({ label, value, onChange, type, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-rose-500 ml-0.5">*</span>}</label>
      <input
        type={type ?? 'text'} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </div>
  );
}

// ─── TriggerRow ───────────────────────────────────────────────────────────────

function TriggerRow({
  trigger, onUpdate, onRemove,
}: {
  trigger: GroupTrigger;
  onUpdate: (patch: Partial<GroupTrigger>) => void;
  onRemove: () => void;
}) {
  const [showEmpPicker, setShowEmpPicker] = useState(false);

  const needsDate   = trigger.condition === 'Atraso' || trigger.condition === 'Rapidez' || trigger.condition === 'Prazo Ideal';
  const needsRDays  = trigger.condition === 'Tempo de Resposta';
  const needsLinked = trigger.condition === 'Conclusão Somada';

  const dateLabel: Record<string, string> = {
    'Atraso':      'Prazo limite',
    'Rapidez':     'Concluído antes de',
    'Prazo Ideal': 'Data do prazo ideal',
  };

  const toggleEmp = (id: string) => {
    if (trigger.allEmployees) return;
    const ids = trigger.employeeIds.includes(id)
      ? trigger.employeeIds.filter((x) => x !== id)
      : [...trigger.employeeIds, id];
    onUpdate({ employeeIds: ids });
  };

  const empSummary = trigger.allEmployees
    ? 'Todos os colaboradores'
    : trigger.employeeIds.length === 0
    ? 'Nenhum selecionado (opcional)'
    : trigger.employeeIds.length === 1
    ? (SAMPLE_EMPLOYEES.find((e) => e.id === trigger.employeeIds[0])?.name ?? '')
    : `${trigger.employeeIds.length} colaboradores selecionados`;

  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3 relative bg-slate-50/40">
      <button onClick={onRemove} className="absolute top-3 right-3 text-slate-300 hover:text-rose-400 transition-colors">
        <Trash2 className="w-4 h-4" />
      </button>

      <div className="grid grid-cols-2 gap-3 pr-6">
        {/* Employee multi-select */}
        <div>
          <label className={labelCls}>Colaborador(es) <span className="text-slate-300 font-normal">(opcional)</span></label>
          <button
            onClick={() => setShowEmpPicker((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:border-pink-400 transition-colors"
          >
            <span className={trigger.allEmployees || trigger.employeeIds.length > 0 ? 'text-slate-700' : 'text-slate-400'}>
              {empSummary}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showEmpPicker ? 'rotate-180' : ''}`} />
          </button>

          {showEmpPicker && (
            <div className="mt-1 border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
              {/* Todos toggle */}
              <button
                onClick={() => onUpdate({ allEmployees: !trigger.allEmployees, employeeIds: [] })}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 transition-colors"
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${trigger.allEmployees ? 'bg-pink-600 border-pink-600' : 'border-slate-300'}`}>
                  {trigger.allEmployees && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="text-xs font-bold text-slate-700">Todos os colaboradores</span>
              </button>
              {/* Individual */}
              <div className="max-h-36 overflow-y-auto">
                {SAMPLE_EMPLOYEES.map((emp) => {
                  const sel = trigger.employeeIds.includes(emp.id);
                  return (
                    <button
                      key={emp.id}
                      onClick={() => toggleEmp(emp.id)}
                      disabled={trigger.allEmployees}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors disabled:opacity-40 ${sel && !trigger.allEmployees ? 'bg-pink-50' : 'hover:bg-slate-50'}`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${sel && !trigger.allEmployees ? 'bg-pink-600 border-pink-600' : 'border-slate-300'}`}>
                        {sel && !trigger.allEmployees && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-700">{emp.name}</p>
                        <p className="text-[10px] text-slate-400">{emp.dept}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-slate-100 px-4 py-2">
                <button onClick={() => setShowEmpPicker(false)} className="text-xs text-pink-600 font-semibold">Fechar</button>
              </div>
            </div>
          )}
        </div>

        {/* Activity */}
        <div>
          <label className={labelCls}>Atividade</label>
          <select
            value={trigger.activityId}
            onChange={(e) => onUpdate({ activityId: e.target.value })}
            className={inputCls}
          >
            <option value="">Selecione...</option>
            {SAMPLE_ACTIVITIES.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Condition */}
      <div>
        <label className={labelCls}>Ação / Condição</label>
        <select
          value={trigger.condition}
          onChange={(e) => onUpdate({ condition: e.target.value as TriggerCondition | '' })}
          className={inputCls}
        >
          <option value="">Selecione a condição...</option>
          {TRIGGER_CONDITIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {needsDate && (
        <div>
          <label className={labelCls}>{dateLabel[trigger.condition]}</label>
          <input type="date" value={trigger.conditionDate}
            onChange={(e) => onUpdate({ conditionDate: e.target.value })} className={inputCls} />
        </div>
      )}
      {needsRDays && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Responder em</label>
          <input type="number" min={1} value={trigger.responseDays}
            onChange={(e) => onUpdate({ responseDays: Number(e.target.value) })}
            className="w-20 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 text-center bg-white" />
          <span className="text-xs text-slate-500">dias</span>
        </div>
      )}
      {needsLinked && (
        <div>
          <label className={labelCls}>Atividade somada</label>
          <select value={trigger.linkedActivityId}
            onChange={(e) => onUpdate({ linkedActivityId: e.target.value })} className={inputCls}>
            <option value="">Selecione a atividade...</option>
            {SAMPLE_ACTIVITIES.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}

      {/* Entry mode */}
      <div>
        <label className={labelCls}>Modo de Entrada</label>
        <div className="flex gap-1.5">
          {(['Imediato', 'Data Fixa', 'Após X Dias'] as EntryMode[]).map((m) => (
            <button key={m} onClick={() => onUpdate({ entryMode: m })}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                trigger.entryMode === m ? 'bg-pink-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>{m}</button>
          ))}
        </div>
        {trigger.entryMode === 'Data Fixa' && (
          <input type="date" value={trigger.entryDate}
            onChange={(e) => onUpdate({ entryDate: e.target.value })} className={`mt-2 ${inputCls}`} />
        )}
        {trigger.entryMode === 'Após X Dias' && (
          <div className="mt-2 flex items-center gap-2">
            <input type="number" min={1} value={trigger.entryDays}
              onChange={(e) => onUpdate({ entryDays: Number(e.target.value) })}
              className="w-20 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 text-center bg-white" />
            <span className="text-xs text-slate-500">dias após atingir a condição</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NewCustomTypeModal ────────────────────────────────────────────────────────

function NewCustomTypeModal({ onCreate, onClose }: {
  onCreate: (ct: CustomGroupType) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [directCosts, setDirectCosts] = useState<DirectCost[]>([]);
  const [autoAlertLabel, setAutoAlertLabel] = useState('');
  const uidRef = useRef(0);

  const addCost = () =>
    setDirectCosts((prev) => [...prev, { id: ++uidRef.current, description: '', amount: '' }]);

  const removeCost = (id: number) =>
    setDirectCosts((prev) => prev.filter((c) => c.id !== id));

  const updateCost = (id: number, patch: Partial<DirectCost>) =>
    setDirectCosts((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c));

  const handleSave = () => {
    if (!name.trim()) return;
    onCreate({ id: `CT${Date.now()}`, name: name.trim(), directCosts, autoAlertLabel });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 overflow-y-auto py-10">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-800">Novo Tipo Personalizado</h3>
            <p className="text-xs text-slate-400 mt-0.5">Configure nome, custos padrão e alerta automático</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className={labelCls}>Nome do Tipo <span className="text-rose-500">*</span></label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Equipe de Prontidão"
              className={inputCls}
            />
          </div>

          {/* Direct costs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className={labelCls}>Custos Diretos Padrão</label>
                <p className="text-[10px] text-slate-400 -mt-1">Incluídos automaticamente em todo grupo deste tipo</p>
              </div>
              <button onClick={addCost}
                className="flex items-center gap-1 text-xs text-pink-600 hover:text-pink-700 font-semibold">
                <Plus className="w-3 h-3" /> Custo
              </button>
            </div>
            {directCosts.length === 0 && (
              <p className="text-xs text-slate-400 italic">Nenhum custo configurado.</p>
            )}
            <div className="space-y-2">
              {directCosts.map((cost) => (
                <div key={cost.id} className="flex items-center gap-2">
                  <input
                    type="text" placeholder="Descrição do custo" value={cost.description}
                    onChange={(e) => updateCost(cost.id, { description: e.target.value })}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400"
                  />
                  <input
                    type="number" placeholder="0" min={0} value={cost.amount}
                    onChange={(e) => updateCost(cost.id, { amount: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-28 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 text-right"
                  />
                  <button onClick={() => removeCost(cost.id)} className="text-slate-300 hover:text-rose-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {directCosts.length > 0 && (
              <p className="text-[10px] text-slate-400 mt-2 text-right">
                Total padrão: {fmt(directCosts.reduce((s, c) => s + (Number(c.amount) || 0), 0))}
              </p>
            )}
          </div>

          {/* Auto alert */}
          <div>
            <label className={labelCls}>Alerta Automático</label>
            <input
              type="text" value={autoAlertLabel}
              onChange={(e) => setAutoAlertLabel(e.target.value)}
              placeholder="Ex: Verificar disponibilidade do grupo"
              className={inputCls}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Gerado automaticamente sempre que um grupo deste tipo for criado
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!name.trim()}
            className="px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 transition-colors font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
            Criar Tipo
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TypePickerModal ──────────────────────────────────────────────────────────

function TypePickerModal({ current, currentCustomName, customTypes, onSelect, onCreateCustomType, onClose }: {
  current: GroupType;
  currentCustomName: string;
  customTypes: CustomGroupType[];
  onSelect: (type: GroupType, customTypeName?: string, costs?: DirectCost[], autoAlert?: string) => void;
  onCreateCustomType: (ct: CustomGroupType) => void;
  onClose: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);

  const handleCreateType = (ct: CustomGroupType) => {
    onCreateCustomType(ct);
    onSelect('Personalizado', ct.name, ct.directCosts, ct.autoAlertLabel);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-800">Selecionar Tipo de Grupo</h3>
            <p className="text-xs text-slate-400 mt-0.5">Tipos predefinidos ou crie um tipo personalizado</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-2">
          {/* Built-in types */}
          {BUILTIN_TYPE_OPTS.map(({ type, label, desc, activeBorder, activeBg, activeText }) => {
            const isActive = current === type && !currentCustomName;
            return (
              <button
                key={type}
                onClick={() => { onSelect(type, '', [], ''); onClose(); }}
                className={`w-full flex items-center gap-4 p-4 border-2 rounded-xl text-left transition-all ${
                  isActive
                    ? `${activeBorder} ${activeBg}`
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${TYPE_ICON_COLOR[type]}`}>
                  {type === 'Turno'        && <Clock    className="w-5 h-5" />}
                  {type === 'Departamento' && <Users    className="w-5 h-5" />}
                  {type === 'Projeto'      && <Calendar className="w-5 h-5" />}
                  {type === 'Benefício'    && <Tag      className="w-5 h-5" />}
                  {type === 'Automático'   && <Zap      className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${isActive ? activeText : 'text-slate-800'}`}>{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
                {isActive && <Check className={`w-5 h-5 flex-shrink-0 ${activeText}`} />}
              </button>
            );
          })}

          {/* Existing custom types */}
          {customTypes.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tipos Personalizados</p>
              <div className="space-y-2">
                {customTypes.map((ct) => {
                  const isActive = current === 'Personalizado' && currentCustomName === ct.name;
                  return (
                    <button
                      key={ct.id}
                      onClick={() => { onSelect('Personalizado', ct.name, ct.directCosts, ct.autoAlertLabel); onClose(); }}
                      className={`w-full flex items-center gap-4 p-4 border-2 rounded-xl text-left transition-all ${
                        isActive
                          ? 'border-purple-400 bg-purple-50'
                          : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/30'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-purple-50 text-purple-600">
                        <Settings className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${isActive ? 'text-purple-700' : 'text-slate-800'}`}>{ct.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {ct.directCosts.length > 0
                            ? `${ct.directCosts.length} custo(s) · ${fmt(ct.directCosts.reduce((s, c) => s + (Number(c.amount) || 0), 0))}`
                            : 'Sem custos padrão'}
                          {ct.autoAlertLabel && ' · alerta automático'}
                        </p>
                      </div>
                      {isActive && <Check className="w-5 h-5 text-purple-600 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create new custom type */}
          <div className="pt-2">
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-3 p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-purple-300 hover:bg-purple-50/30 transition-all text-left"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-100 text-slate-500">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">Criar Tipo Personalizado</p>
                <p className="text-xs text-slate-400 mt-0.5">Defina nome, custos padrão e alerta automático</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {showCreate && (
        <NewCustomTypeModal
          onCreate={handleCreateType}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

// ─── NewGroupModal ─────────────────────────────────────────────────────────────

type NGTab = 'config' | 'triggers' | 'members' | 'alerts';

const NG_TABS: { id: NGTab; label: string }[] = [
  { id: 'config',   label: '1. Configuração'  },
  { id: 'triggers', label: '2. Gatilhos'      },
  { id: 'members',  label: '3. Colaboradores' },
  { id: 'alerts',   label: '4. Alertas'       },
];

interface NewGroupForm {
  name: string;
  type: GroupType;
  customTypeName: string;
  customTypeDirectCosts: DirectCost[];
  customTypeAutoAlert: string;
  description: string;
  tags: string;
  capacity: number | '';
  triggers: GroupTrigger[];
  memberList: GroupMember[];
  alerts: AlertRecord[];
}

const EMPTY_GROUP: NewGroupForm = {
  name: '', type: 'Turno', customTypeName: '', customTypeDirectCosts: [], customTypeAutoAlert: '',
  description: '', tags: '', capacity: '',
  triggers: [], memberList: [], alerts: mkAlerts(),
};

function NewGroupModal({ onClose, onSave, customTypes, onCreateCustomType }: {
  onClose: () => void;
  onSave: (group: Group) => void;
  customTypes: CustomGroupType[];
  onCreateCustomType: (ct: CustomGroupType) => void;
}) {
  const [tab, setTab] = useState<NGTab>('config');
  const [form, setForm] = useState<NewGroupForm>(EMPTY_GROUP);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const uidRef = useRef(0);

  const set = <K extends keyof NewGroupForm>(k: K) =>
    (v: NewGroupForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  /* ── Triggers ── */
  const addTrigger = () => {
    const id = ++uidRef.current;
    setForm((f) => ({
      ...f,
      triggers: [...f.triggers, {
        id, allEmployees: false, employeeIds: [], activityId: '', condition: '',
        conditionDate: '', responseDays: 1, linkedActivityId: '',
        entryMode: 'Imediato', entryDate: '', entryDays: 1,
      }],
    }));
  };

  const updateTrigger = (id: number, patch: Partial<GroupTrigger>) =>
    setForm((f) => ({
      ...f,
      triggers: f.triggers.map((t) => t.id === id ? { ...t, ...patch } : t),
    }));

  const removeTrigger = (id: number) =>
    setForm((f) => ({ ...f, triggers: f.triggers.filter((t) => t.id !== id) }));

  /* ── Members ── */
  const addMember = (emp: typeof SAMPLE_EMPLOYEES[0]) => {
    if (form.memberList.some((m) => m.id === emp.id)) return;
    setForm((f) => ({
      ...f,
      memberList: [...f.memberList, {
        id: emp.id, name: emp.name, dept: emp.dept, role: emp.role,
        joinedAt: new Date().toISOString().slice(0, 10), removalDeadline: '',
      }],
    }));
  };

  const removeMember = (id: string) =>
    setForm((f) => ({ ...f, memberList: f.memberList.filter((m) => m.id !== id) }));

  const setMemberDeadline = (id: string, date: string) =>
    setForm((f) => ({
      ...f,
      memberList: f.memberList.map((m) => m.id === id ? { ...m, removalDeadline: date } : m),
    }));

  /* ── Alerts ── */
  const toggleAlert = (id: string) =>
    setForm((f) => ({
      ...f,
      alerts: f.alerts.map((a) => a.id === id ? { ...a, enabled: !a.enabled } : a),
    }));

  const updateAlert = (id: string, patch: Partial<AlertRecord>) =>
    setForm((f) => ({
      ...f,
      alerts: f.alerts.map((a) => a.id === id ? { ...a, ...patch } : a),
    }));

  /* ── Save ── */
  const handleSave = () => {
    let alerts = form.alerts;
    if (form.customTypeAutoAlert.trim()) {
      alerts = [
        ...alerts,
        {
          id: `auto_${Date.now()}`,
          label: form.customTypeAutoAlert,
          enabled: true,
          threshold: 30, thresholdUnit: 'dias' as const,
          inactiveDays: 7, removalWarningDays: 3,
        },
      ];
    }
    const id = `G${Date.now().toString().slice(-5)}`;
    onSave({
      id,
      name: form.name.trim() || 'Novo Grupo',
      type: form.type,
      customTypeName: form.customTypeName,
      directCosts: form.customTypeDirectCosts,
      autoAlertLabel: form.customTypeAutoAlert,
      description: form.description,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      members: form.memberList.length,
      createdAt: new Date().toISOString().slice(0, 10),
      memberList: form.memberList,
      capacity: form.capacity === '' ? null : Number(form.capacity),
      triggers: form.triggers,
      alerts,
    });
    onClose();
  };

  const available = SAMPLE_EMPLOYEES.filter((e) => !form.memberList.some((m) => m.id === e.id));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Novo Grupo</h2>
            <p className="text-xs text-slate-400 mt-0.5">Configure gatilhos automáticos, membros e alertas</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab strip */}
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {NG_TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-shrink-0 px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${
                tab === id
                  ? 'border-pink-600 text-pink-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5 min-h-80">

          {/* ── Tab 1: Configuração ── */}
          {tab === 'config' && (
            <div className="space-y-4">
              <EGField
                label="Nome do Grupo" required
                value={form.name} onChange={set('name')}
                placeholder="Ex: Atendimento Prioritário"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Tipo de Grupo</label>
                  <button
                    onClick={() => setShowTypePicker(true)}
                    className="w-full flex items-center justify-between px-3 py-2 border border-slate-200 rounded-lg hover:border-pink-400 hover:bg-slate-50 transition-colors text-sm bg-white"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[form.type]}`}>
                        {form.customTypeName || form.type}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                <div>
                  <label className={labelCls}>Capacidade Máxima</label>
                  <input
                    type="number" min={1}
                    value={form.capacity}
                    onChange={(e) => set('capacity')(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ilimitado"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Custom type template info */}
              {form.customTypeName && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-1.5">
                  <p className="text-xs font-bold text-purple-700 flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5" /> Tipo: {form.customTypeName}
                  </p>
                  {form.customTypeDirectCosts.length > 0 && (
                    <div>
                      <p className="text-[10px] text-purple-500 font-semibold uppercase tracking-wide mb-1">Custos padrão incluídos</p>
                      {form.customTypeDirectCosts.map((c, i) => (
                        <p key={i} className="text-xs text-purple-600 flex justify-between">
                          <span>{c.description || '—'}</span>
                          <span className="font-mono">{fmt(Number(c.amount) || 0)}</span>
                        </p>
                      ))}
                      <p className="text-xs text-purple-700 font-bold flex justify-between border-t border-purple-200 mt-1 pt-1">
                        <span>Total</span>
                        <span className="font-mono">{fmt(form.customTypeDirectCosts.reduce((s, c) => s + (Number(c.amount) || 0), 0))}</span>
                      </p>
                    </div>
                  )}
                  {form.customTypeAutoAlert && (
                    <p className="text-[10px] text-purple-500">
                      <span className="font-semibold">Alerta automático:</span> {form.customTypeAutoAlert}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className={labelCls}>Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set('description')(e.target.value)}
                  placeholder="Descreva o propósito deste grupo..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 resize-none"
                />
              </div>
              <div>
                <label className={labelCls}>Tags (separadas por vírgula)</label>
                <input
                  type="text" value={form.tags} onChange={(e) => set('tags')(e.target.value)}
                  placeholder="ex: vendas, prioridade, norte"
                  className={inputCls}
                />
                <p className="text-[10px] text-slate-400 mt-1">Exemplo: turno, produção, benefício</p>
              </div>
            </div>
          )}

          {/* ── Tab 2: Gatilhos ── */}
          {tab === 'triggers' && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <p className="text-xs text-slate-500 leading-relaxed flex-1">
                  Quando um colaborador gerar a atividade selecionada e atingir a condição configurada,
                  ele será incluído automaticamente neste grupo.
                </p>
                <button
                  onClick={addTrigger}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-pink-600 rounded-lg font-semibold hover:bg-pink-700 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Gatilho
                </button>
              </div>

              {form.triggers.length === 0 && (
                <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
                  Nenhum gatilho configurado. Clique em "+ Gatilho" para adicionar.
                </div>
              )}

              <div className="space-y-3">
                {form.triggers.map((trig) => (
                  <TriggerRow
                    key={trig.id}
                    trigger={trig}
                    onUpdate={(patch) => updateTrigger(trig.id, patch)}
                    onRemove={() => removeTrigger(trig.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Tab 3: Colaboradores ── */}
          {tab === 'members' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Adicione colaboradores manualmente. Eles também entrarão automaticamente ao atingir os gatilhos configurados.
              </p>

              {/* Picker */}
              {available.length > 0 && (
                <div>
                  <label className={labelCls}>Adicionar colaborador</label>
                  <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto border border-slate-100 rounded-xl p-2 bg-slate-50">
                    {available.map((emp) => (
                      <button
                        key={emp.id}
                        onClick={() => addMember(emp)}
                        className="flex items-center gap-2 p-2 text-left rounded-lg hover:bg-pink-50 transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-700 truncate">{emp.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{emp.dept}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Members list */}
              {form.memberList.length > 0 ? (
                <div>
                  <label className={labelCls}>Membros adicionados ({form.memberList.length})</label>
                  <div className="space-y-2">
                    {form.memberList.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {m.name.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                          <p className="text-xs text-slate-400">{m.dept} · {m.role}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div>
                            <p className="text-[10px] text-slate-400 mb-0.5">Prazo de remoção</p>
                            <input
                              type="date"
                              value={m.removalDeadline}
                              onChange={(e) => setMemberDeadline(m.id, e.target.value)}
                              className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-pink-400"
                            />
                          </div>
                          <button onClick={() => removeMember(m.id)} className="text-slate-300 hover:text-rose-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
                  Nenhum colaborador adicionado ainda.
                </div>
              )}
            </div>
          )}

          {/* ── Tab 4: Alertas ── */}
          {tab === 'alerts' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 mb-3">Ative os alertas para receber notificações sobre eventos deste grupo.</p>
              {form.customTypeAutoAlert.trim() && (
                <div className="flex items-center justify-between border border-purple-200 bg-purple-50/40 rounded-xl p-3 mb-1">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium text-slate-700">{form.customTypeAutoAlert}</span>
                    <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-semibold">automático</span>
                  </div>
                  <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-purple-500">
                    <span className="inline-block h-3.5 w-3.5 translate-x-4 transform rounded-full bg-white shadow" />
                  </div>
                </div>
              )}
              {form.alerts.map((alert) => {
                const def = ALERT_DEFS.find((d) => d.id === alert.id)!;
                return (
                  <div
                    key={alert.id}
                    className={`border rounded-xl p-3 transition-colors ${
                      alert.enabled ? 'border-pink-200 bg-pink-50/30' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className={`w-4 h-4 ${alert.enabled ? 'text-pink-500' : 'text-slate-400'}`} />
                        <span className="text-sm font-medium text-slate-700">{alert.label}</span>
                      </div>
                      <button
                        onClick={() => toggleAlert(alert.id)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                          alert.enabled ? 'bg-pink-600' : 'bg-slate-200'
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          alert.enabled ? 'translate-x-4' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>

                    {alert.enabled && def.hasThreshold && (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-500">Após</span>
                        <input
                          type="number" min={1} value={alert.threshold}
                          onChange={(e) => updateAlert(alert.id, { threshold: Number(e.target.value) })}
                          className="w-16 px-2 py-1 text-xs border border-slate-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-pink-400"
                        />
                        <select
                          value={alert.thresholdUnit}
                          onChange={(e) => updateAlert(alert.id, { thresholdUnit: e.target.value as AlertRecord['thresholdUnit'] })}
                          className="px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-pink-400 bg-white"
                        >
                          <option value="dias">dias</option>
                          <option value="horas">horas</option>
                          <option value="anos">anos</option>
                        </select>
                        <span className="text-xs text-slate-500">no grupo</span>
                      </div>
                    )}

                    {alert.enabled && def.hasInactive && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-slate-500">Sem atividade há mais de</span>
                        <input
                          type="number" min={1} value={alert.inactiveDays}
                          onChange={(e) => updateAlert(alert.id, { inactiveDays: Number(e.target.value) })}
                          className="w-16 px-2 py-1 text-xs border border-slate-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-pink-400"
                        />
                        <span className="text-xs text-slate-500">dias</span>
                      </div>
                    )}

                    {alert.enabled && def.hasRemoval && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-slate-500">Alertar</span>
                        <input
                          type="number" min={1} value={alert.removalWarningDays}
                          onChange={(e) => updateAlert(alert.id, { removalWarningDays: Number(e.target.value) })}
                          className="w-16 px-2 py-1 text-xs border border-slate-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-pink-400"
                        />
                        <span className="text-xs text-slate-500">dias antes do prazo de remoção</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name.trim()}
            className="px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 transition-colors font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Criar Grupo
          </button>
        </div>
      </div>

      {showTypePicker && (
        <TypePickerModal
          current={form.type}
          currentCustomName={form.customTypeName}
          customTypes={customTypes}
          onSelect={(type, customTypeName = '', costs = [], autoAlert = '') => {
            setForm((f) => ({ ...f, type, customTypeName, customTypeDirectCosts: costs, customTypeAutoAlert: autoAlert }));
          }}
          onCreateCustomType={onCreateCustomType}
          onClose={() => setShowTypePicker(false)}
        />
      )}
    </div>
  );
}

// ─── GroupDetailModal ─────────────────────────────────────────────────────────

function GroupDetailModal({ group, onClose, onUpdate }: {
  group: Group;
  onClose: () => void;
  onUpdate: (updated: Group) => void;
}) {
  const [members, setMembers] = useState<GroupMember[]>(group.memberList);
  const [search, setSearch] = useState('');

  const addMember = (emp: typeof SAMPLE_EMPLOYEES[0]) => {
    if (members.some((m) => m.id === emp.id)) return;
    setMembers((prev) => [
      ...prev,
      {
        id: emp.id, name: emp.name, dept: emp.dept, role: emp.role,
        joinedAt: new Date().toISOString().slice(0, 10), removalDeadline: '',
      },
    ]);
    setSearch('');
  };

  const removeMember = (id: string) =>
    setMembers((prev) => prev.filter((m) => m.id !== id));

  const setDeadline = (id: string, date: string) =>
    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, removalDeadline: date } : m));

  const handleSave = () => {
    onUpdate({ ...group, memberList: members, members: members.length });
    onClose();
  };

  const available = SAMPLE_EMPLOYEES.filter(
    (e) =>
      !members.some((m) => m.id === e.id) &&
      (search === '' || e.name.toLowerCase().includes(search.toLowerCase()) || e.dept.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-slate-800">{group.name}</h2>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[group.type]}`}>
                {group.type}
              </span>
            </div>
            <p className="text-xs text-slate-400">{group.description}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
          <div className="px-6 py-3 text-center">
            <p className="text-xs text-slate-400 mb-0.5">Membros</p>
            <p className="text-xl font-bold text-slate-800">{members.length}</p>
          </div>
          <div className="px-6 py-3 text-center">
            <p className="text-xs text-slate-400 mb-0.5">Capacidade</p>
            <p className="text-xl font-bold text-slate-800">{group.capacity ?? '∞'}</p>
          </div>
          <div className="px-6 py-3 text-center">
            <p className="text-xs text-slate-400 mb-0.5">Gatilhos</p>
            <p className="text-xl font-bold text-slate-800">{group.triggers.length}</p>
          </div>
        </div>

        <div className="px-6 py-5">
          {/* Search to add */}
          <div className="mb-4">
            <label className={labelCls}>Adicionar colaborador</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou departamento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400"
              />
            </div>
            {search && (
              <div className="mt-1 border border-slate-200 rounded-xl divide-y divide-slate-50 max-h-36 overflow-y-auto shadow-sm">
                {available.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-slate-400">Nenhum resultado encontrado.</p>
                ) : available.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => addMember(emp)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-pink-50 text-left transition-colors"
                  >
                    <UserPlus className="w-4 h-4 text-pink-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{emp.name}</p>
                      <p className="text-xs text-slate-400">{emp.dept} · {emp.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Members list */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-700">
              Colaboradores do Grupo
              <span className="ml-2 text-xs font-normal text-slate-400">({members.length})</span>
            </h3>
          </div>

          {members.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
              Nenhum colaborador neste grupo.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {m.name.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                    <p className="text-xs text-slate-400">{m.dept} · {m.role}</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">Entrou em {m.joinedAt}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div>
                      <p className="text-[10px] text-slate-400 mb-0.5">Prazo de remoção</p>
                      <input
                        type="date"
                        value={m.removalDeadline}
                        onChange={(e) => setDeadline(m.id, e.target.value)}
                        className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-pink-400"
                      />
                    </div>
                    <button
                      onClick={() => removeMember(m.id)}
                      className="text-slate-300 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            {group.triggers.length > 0 && (
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-pink-500" />
                {group.triggers.length} gatilho{group.triggers.length > 1 ? 's' : ''} automático{group.triggers.length > 1 ? 's' : ''}
              </span>
            )}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 transition-colors font-semibold"
            >
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EmployeeGroups (main) ────────────────────────────────────────────────────

export default function EmployeeGroups() {
  const [groups, setGroups]         = useState<Group[]>(GROUPS_INIT);
  const [customTypes, setCustomTypes] = useState<CustomGroupType[]>([]);
  const [search, setSearch]         = useState('');
  const [filterType, setFilterType] = useState('Todos');
  const [showNew, setShowNew]       = useState(false);
  const [detailGroup, setDetailGroup] = useState<Group | null>(null);

  const handleCreateCustomType = (ct: CustomGroupType) =>
    setCustomTypes((prev) => [...prev, ct]);

  const filtered = groups.filter((g) => {
    const q = search.toLowerCase();
    const matchSearch = g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q);
    const matchType = filterType === 'Todos' || g.type === filterType;
    return matchSearch && matchType;
  });

  const totalMembers = groups.reduce((s, g) => s + g.members, 0);

  const handleSaveGroup = (group: Group) =>
    setGroups((prev) => [...prev, group]);

  const handleUpdateGroup = (updated: Group) =>
    setGroups((prev) => prev.map((g) => g.id === updated.id ? updated : g));

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Grupos de Funcionários</h1>
          <p className="text-slate-500 text-sm mt-1">Agrupe colaboradores por turno, projeto, benefício ou gatilhos automáticos</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Grupo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Total de Grupos</p>
          <p className="text-2xl font-bold text-slate-800">{groups.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Total de Membros</p>
          <p className="text-2xl font-bold text-slate-800">{totalMembers}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Grupos Automáticos</p>
          <p className="text-2xl font-bold text-slate-800">{groups.filter((g) => g.type === 'Automático' || g.triggers.length > 0).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Média por Grupo</p>
          <p className="text-2xl font-bold text-slate-800">{groups.length ? Math.round(totalMembers / groups.length) : 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar grupos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 w-full"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {ALL_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterType === t
                  ? 'bg-pink-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Group cards grid */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map((group) => (
          <div
            key={group.id}
            onClick={() => setDetailGroup(group)}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${TYPE_ICON_COLOR[group.type]}`}>
                  {group.type === 'Turno'         && <Clock    className="w-5 h-5" />}
                  {group.type === 'Departamento'  && <Users    className="w-5 h-5" />}
                  {group.type === 'Projeto'       && <Calendar className="w-5 h-5" />}
                  {group.type === 'Benefício'     && <Tag      className="w-5 h-5" />}
                  {group.type === 'Personalizado' && <Users    className="w-5 h-5" />}
                  {group.type === 'Automático'    && <Zap      className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{group.name}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${TYPE_COLORS[group.type]}`}>
                    {group.customTypeName || group.type}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setDetailGroup(group); }}
                className="text-slate-400 hover:text-pink-600 transition-colors flex-shrink-0"
                title="Editar membros"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">{group.description}</p>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">{group.members}</span>
                  <span className="text-xs text-slate-400">membros</span>
                </div>
                {group.triggers.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-pink-600 font-medium">
                    <Zap className="w-3 h-3" /> {group.triggers.length} gatilho{group.triggers.length > 1 ? 's' : ''}
                  </span>
                )}
                {group.capacity !== null && (
                  <span className="text-xs text-slate-400">
                    / {group.capacity} max
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {group.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                    #{tag}
                  </span>
                ))}
                {group.tags.length > 2 && (
                  <span className="text-[10px] text-slate-400 px-1">+{group.tags.length - 2}</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-16 text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
            Nenhum grupo encontrado.
          </div>
        )}
      </div>

      {/* Modals */}
      {showNew && (
        <NewGroupModal
          onClose={() => setShowNew(false)}
          onSave={handleSaveGroup}
          customTypes={customTypes}
          onCreateCustomType={handleCreateCustomType}
        />
      )}
      {detailGroup && (
        <GroupDetailModal
          group={detailGroup}
          onClose={() => setDetailGroup(null)}
          onUpdate={handleUpdateGroup}
        />
      )}
    </div>
  );
}

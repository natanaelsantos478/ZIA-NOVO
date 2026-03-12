import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Download, X, ChevronLeft, ChevronRight,
  Trash2, History, Users, ClipboardList, CalendarDays,
  ArrowLeft, UserCog, AlertTriangle, Edit2, Check, Briefcase,
  Link2, Link2Off, ShieldCheck, ShieldAlert,
} from 'lucide-react';
import {
  getEmployees, createEmployee, deleteEmployee, updateEmployee,
  getHrActivitiesByEmployee, getVacationsByEmployee,
  getEmployeeNotes, getEmployeeGroupMemberships,
  getPositionHistory, getSalaryHistory, getPositions,
} from '../../../lib/hr';
import type {
  Employee as HrEmployee, HrActivity, Vacation, EmployeeNote,
  PositionHistory, SalaryHistory, Position as HrPosition,
} from '../../../lib/hr';
import { useProfiles } from '../../../context/ProfileContext';
import type { OperatorProfile } from '../../../context/ProfileContext';

type EmployeeStatus = 'Ativo' | 'Férias' | 'Afastado' | 'Experiência' | 'Inativo';
type ContractType   = 'CLT' | 'PJ' | 'Estágio' | 'Aprendiz' | 'Temporário';
type WorkMode       = 'Presencial' | 'Híbrido' | 'Remoto';

interface Employee {
  id: string;
  name: string;
  cpf: string;
  email: string;
  position: string;
  department: string;
  admissionDate: string;
  status: EmployeeStatus;
  contract: ContractType;
  workMode: WorkMode;
  personalData: Record<string, unknown>;
  addressData: Record<string, unknown>;
  bankData: Record<string, unknown>;
}

const STATUS_BADGE: Record<EmployeeStatus, string> = {
  'Ativo':       'bg-green-100 text-green-700',
  'Férias':      'bg-blue-100 text-blue-700',
  'Afastado':    'bg-amber-100 text-amber-700',
  'Experiência': 'bg-purple-100 text-purple-700',
  'Inativo':     'bg-slate-100 text-slate-500',
};

const CONTRACT_BADGE: Record<ContractType, string> = {
  'CLT':        'bg-emerald-50 text-emerald-700',
  'PJ':         'bg-sky-50 text-sky-700',
  'Estágio':    'bg-violet-50 text-violet-700',
  'Aprendiz':   'bg-pink-50 text-pink-700',
  'Temporário': 'bg-orange-50 text-orange-700',
};

const WORK_MODE_BADGE: Record<WorkMode, string> = {
  'Presencial': 'bg-slate-100 text-slate-600',
  'Híbrido':    'bg-indigo-50 text-indigo-700',
  'Remoto':     'bg-teal-50 text-teal-700',
};

const AVATAR_COLORS = [
  'bg-pink-100 text-pink-700',
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
];

function mapEmployee(e: HrEmployee): Employee {
  return {
    id: e.id,
    name: e.full_name,
    cpf: e.cpf,
    email: e.email,
    position: e.position_title ?? '—',
    department: e.departments?.name ?? '—',
    admissionDate: e.admission_date
      ? new Date(e.admission_date + 'T00:00:00').toLocaleDateString('pt-BR')
      : '—',
    status: (e.status as EmployeeStatus) || 'Ativo',
    contract: (e.contract_type as ContractType) || 'CLT',
    workMode: (e.work_mode as WorkMode) || 'Presencial',
    personalData: e.personal_data ?? {},
    addressData: e.address_data ?? {},
    bankData: e.bank_data ?? {},
  };
}

const initials = (name: string) =>
  name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

// ─── History Panel ─────────────────────────────────────────────────────────────

function HistoryPanel({ emp, onClose }: { emp: Employee; onClose: () => void }) {
  const [tab, setTab] = useState<'cargos' | 'financeiro'>('cargos');
  const [positions, setPositions] = useState<PositionHistory[]>([]);
  const [salaries, setSalaries]   = useState<SalaryHistory[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getPositionHistory(emp.id), getSalaryHistory(emp.id)])
      .then(([p, s]) => { setPositions(p); setSalaries(s); })
      .finally(() => setLoading(false));
  }, [emp.id]);

  const fmt = (d: string | null) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-pink-500" />
            <h2 className="font-bold text-slate-800">Histórico — {emp.name}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex gap-1 px-6 pt-3 border-b border-slate-100">
          {([['cargos', 'Histórico de Cargos'], ['financeiro', 'Histórico Financeiro']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`pb-3 px-3 text-sm font-medium border-b-2 -mb-px transition-all ${tab === id ? 'text-pink-600 border-pink-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && <p className="text-slate-400 text-sm text-center py-8">Carregando...</p>}
          {!loading && tab === 'cargos' && (
            positions.length === 0
              ? <p className="text-slate-400 text-sm text-center py-8">Nenhum histórico de cargo registrado.</p>
              : <div className="space-y-3">
                  {positions.map((p) => (
                    <div key={p.id} className="border border-slate-100 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{p.position_title ?? '—'}</p>
                          <p className="text-xs text-slate-500">{p.department ?? '—'}</p>
                        </div>
                        <span className="text-xs text-slate-400">{fmt(p.effective_on)}</span>
                      </div>
                      {p.reason && <p className="text-xs text-slate-500 mt-1">Motivo: {p.reason}</p>}
                      {p.notes && <p className="text-xs text-slate-400 mt-0.5">{p.notes}</p>}
                    </div>
                  ))}
                </div>
          )}
          {!loading && tab === 'financeiro' && (
            salaries.length === 0
              ? <p className="text-slate-400 text-sm text-center py-8">Nenhum histórico financeiro registrado.</p>
              : <div className="space-y-3">
                  {salaries.map((s) => (
                    <div key={s.id} className="border border-slate-100 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">
                            {s.salary.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                          {s.reason && <p className="text-xs text-slate-500">{s.reason}</p>}
                        </div>
                        <span className="text-xs text-slate-400">{fmt(s.effective_on)}</span>
                      </div>
                      {s.notes && <p className="text-xs text-slate-400 mt-1">{s.notes}</p>}
                    </div>
                  ))}
                </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Employee Detail ───────────────────────────────────────────────────────────

type DetailTab = 'dados' | 'acesso' | 'atividades' | 'ferias' | 'grupos';

const DETAIL_TABS: { id: DetailTab; label: string; icon: React.ElementType }[] = [
  { id: 'dados',      label: 'Dados e Contrato', icon: UserCog        },
  { id: 'acesso',     label: 'Usuário de Acesso', icon: UserCog       },
  { id: 'atividades', label: 'Atividades',         icon: ClipboardList },
  { id: 'ferias',     label: 'Férias e Anotações', icon: CalendarDays  },
  { id: 'grupos',     label: 'Grupos',             icon: Users         },
];

function InfoGrid({ rows }: { rows: [string, string][] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {rows.map(([label, value]) => (
        <div key={label} className="bg-slate-50 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
          <p className="text-sm font-medium text-slate-700 truncate">{value || '—'}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Access Tab ────────────────────────────────────────────────────────────────

function AccessTab({ emp }: { emp: Employee }) {
  const { profiles, linkProfileToEmployee, unlinkProfileFromEmployee } = useProfiles();
  const [showSelector, setShowSelector] = useState(false);
  const [saving, setSaving] = useState(false);

  const linked = profiles.find(p => p.employeeId === emp.id) ?? null;
  const unlinked = profiles.filter(p => !p.employeeId && p.id !== 'profile-00001');

  const LEVEL_LABELS: Record<number, string> = { 1: 'Gestor Holding', 2: 'Gestor Matriz', 3: 'Gestor Filial', 4: 'Funcionário' };

  async function handleLink(profile: OperatorProfile) {
    setSaving(true);
    await linkProfileToEmployee(profile.id, emp.id).catch(console.error);
    setSaving(false);
    setShowSelector(false);
  }

  async function handleUnlink() {
    if (!linked) return;
    setSaving(true);
    await unlinkProfileFromEmployee(linked.id).catch(console.error);
    setSaving(false);
  }

  return (
    <div className="max-w-lg space-y-4">
      {/* Linked user card */}
      {linked ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-pink-100 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">{linked.name}</p>
                <p className="text-xs text-slate-500">#{linked.code} · {LEVEL_LABELS[linked.level] ?? `Nível ${linked.level}`}</p>
              </div>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${linked.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {linked.active ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          <div className="mt-4 space-y-1.5">
            {linked.email && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold uppercase tracking-wide">E-mail</span>
                <span className="text-slate-700 flex items-center gap-1.5">
                  {linked.email}
                  {linked.emailVerified
                    ? <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                    : <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold uppercase tracking-wide">Entidade</span>
              <span className="text-slate-700">{linked.entityName}</span>
            </div>
            {linked.moduleAccess && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold uppercase tracking-wide">Módulo</span>
                <span className="text-slate-700">{linked.moduleAccess.toUpperCase()}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleUnlink}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              <Link2Off className="w-3.5 h-3.5" />
              {saving ? 'Desvinculando...' : 'Desvincular usuário'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center">
          <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">Nenhum usuário vinculado</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Este colaborador ainda não possui acesso ao sistema.
          </p>
          <button
            onClick={() => setShowSelector(true)}
            disabled={unlinked.length === 0}
            className="flex items-center gap-2 mx-auto px-4 py-2 text-sm font-semibold text-white bg-pink-600 rounded-xl hover:bg-pink-700 transition-colors disabled:opacity-50"
          >
            <Link2 className="w-4 h-4" />
            {unlinked.length === 0 ? 'Nenhum perfil disponível' : 'Vincular usuário existente'}
          </button>
        </div>
      )}

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
        <p className="font-semibold mb-1">Regra de vinculação</p>
        <p>Um perfil de acesso só pode estar vinculado a um funcionário. Para criar novos perfis acesse <strong>Configurações → Perfis e Acessos</strong>. Todo novo perfil requer e-mail verificado.</p>
      </div>

      {/* Selector modal */}
      {showSelector && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-pink-500" />
                <h2 className="font-bold text-slate-800">Vincular Perfil de Acesso</h2>
              </div>
              <button onClick={() => setShowSelector(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto flex-1 custom-scrollbar p-4 space-y-2">
              {unlinked.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  Todos os perfis já estão vinculados a funcionários.<br />
                  Crie um novo em <strong>Configurações → Perfis e Acessos</strong>.
                </p>
              ) : unlinked.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleLink(p)}
                  disabled={saving}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-pink-400 hover:bg-pink-50/30 text-left transition-all disabled:opacity-50"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">#{p.code} · {LEVEL_LABELS[p.level]} · {p.entityName}</p>
                    {p.email && <p className="text-[10px] text-blue-500 mt-0.5">{p.email}</p>}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${p.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {p.active ? 'Ativo' : 'Inativo'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Position Selector Modal ───────────────────────────────────────────────────

function PositionSelectorModal({ current, onClose, onSelect }: {
  current: string;
  onClose: () => void;
  onSelect: (title: string) => void;
}) {
  const [positions, setPositions] = useState<HrPosition[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    getPositions().then(setPositions).finally(() => setLoading(false));
  }, []);

  const filtered = positions.filter(
    (p) => p.title.toLowerCase().includes(search.toLowerCase()) ||
           (p.department_name ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-pink-500" />
            <h2 className="font-bold text-slate-800">Selecionar Cargo</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-3 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cargo ou departamento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-pink-500/30"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {loading && <p className="text-center text-slate-400 text-sm py-6">Carregando cargos...</p>}
          {!loading && filtered.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-6">Nenhum cargo encontrado. Cadastre em Cargos e Salários.</p>
          )}
          {!loading && filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => { onSelect(p.title); onClose(); }}
              className={`w-full flex items-center gap-3 py-3 px-3 rounded-xl text-left transition-colors hover:bg-pink-50 ${
                current === p.title ? 'bg-pink-50 border border-pink-200' : ''
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{p.title}</p>
                <p className="text-xs text-slate-400">{p.department_name ?? '—'} · {p.level ?? '—'}</p>
              </div>
              {current === p.title && <Check className="w-4 h-4 text-pink-600 shrink-0" />}
            </button>
          ))}
        </div>
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Form ─────────────────────────────────────────────────────────────────

interface EditForm {
  name: string; cpf: string; email: string;
  rg: string; birthDate: string; gender: string; maritalStatus: string;
  nationality: string; pis: string;
  phone: string; mobile: string; personalEmail: string;
  position: string; department: string; admissionDate: string;
  contractType: string; workMode: string; status: string;
  cep: string; street: string; num: string; complement: string;
  neighborhood: string; city: string; state: string;
  bank: string; accountType: string; agency: string;
  account: string; pixType: string; pixKey: string;
}

function buildEditForm(emp: Employee): EditForm {
  const pd = emp.personalData as Record<string, string>;
  const ad = emp.addressData  as Record<string, string>;
  const bd = emp.bankData     as Record<string, string>;
  return {
    name: emp.name, cpf: emp.cpf, email: emp.email,
    rg: pd.rg ?? '', birthDate: pd.birthDate ?? '', gender: pd.gender ?? '',
    maritalStatus: pd.maritalStatus ?? '', nationality: pd.nationality ?? '',
    pis: pd.pis ?? '', phone: pd.phone ?? '', mobile: pd.mobile ?? '',
    personalEmail: pd.personalEmail ?? '',
    position: emp.position === '—' ? '' : emp.position,
    department: emp.department === '—' ? '' : emp.department,
    admissionDate: '', contractType: emp.contract, workMode: emp.workMode,
    status: emp.status,
    cep: ad.cep ?? '', street: ad.street ?? '', num: ad.num ?? '',
    complement: ad.complement ?? '', neighborhood: ad.neighborhood ?? '',
    city: ad.city ?? '', state: ad.state ?? '',
    bank: bd.bank ?? '', accountType: bd.accountType ?? '',
    agency: bd.agency ?? '', account: bd.account ?? '',
    pixType: bd.pixType ?? '', pixKey: bd.pixKey ?? '',
  };
}

const EI = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400';

function EField({ label, value, onChange, type }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</label>
      <input type={type ?? 'text'} value={value} onChange={(e) => onChange(e.target.value)} className={EI} />
    </div>
  );
}
function ESelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${EI} bg-white`}>
        <option value="">Selecione...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function EmployeeDetail({
  emp, onBack, onDelete, onRefresh,
}: {
  emp: Employee;
  onBack: () => void;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => void;
}) {
  const [tab, setTab]           = useState<DetailTab>('dados');
  const [showHistory, setShowHistory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit mode
  const [editMode, setEditMode]       = useState(false);
  const [editForm, setEditForm]       = useState<EditForm>(() => buildEditForm(emp));
  const [saving, setSaving]           = useState(false);
  const [showPosSel, setShowPosSel]   = useState(false);
  const setEF = (k: keyof EditForm) => (v: string) => setEditForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateEmployee(emp.id, {
        full_name: editForm.name,
        cpf: editForm.cpf,
        email: editForm.email,
        position_title: editForm.position || null,
        work_mode: editForm.workMode || null,
        contract_type: editForm.contractType || null,
        status: editForm.status,
        personal_data: {
          rg: editForm.rg, birthDate: editForm.birthDate, gender: editForm.gender,
          maritalStatus: editForm.maritalStatus, nationality: editForm.nationality,
          pis: editForm.pis, phone: editForm.phone, mobile: editForm.mobile,
          personalEmail: editForm.personalEmail,
        },
        address_data: {
          cep: editForm.cep, street: editForm.street, num: editForm.num,
          complement: editForm.complement, neighborhood: editForm.neighborhood,
          city: editForm.city, state: editForm.state,
        },
        bank_data: {
          bank: editForm.bank, accountType: editForm.accountType,
          agency: editForm.agency, account: editForm.account,
          pixType: editForm.pixType, pixKey: editForm.pixKey,
        },
      });
      onRefresh();
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  };

  const [activities, setActivities] = useState<HrActivity[]>([]);
  const [vacations, setVacations]   = useState<Vacation[]>([]);
  const [notes, setNotes]           = useState<EmployeeNote[]>([]);
  const [groups, setGroups]         = useState<{ id: string; name: string; type: string; added_at: string }[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  // Load tab data on switch
  useEffect(() => {
    if (tab === 'atividades') {
      setTabLoading(true);
      getHrActivitiesByEmployee(emp.id).then(setActivities).finally(() => setTabLoading(false));
    } else if (tab === 'ferias') {
      setTabLoading(true);
      Promise.all([getVacationsByEmployee(emp.id), getEmployeeNotes(emp.id)])
        .then(([v, n]) => { setVacations(v); setNotes(n); })
        .finally(() => setTabLoading(false));
    } else if (tab === 'grupos') {
      setTabLoading(true);
      getEmployeeGroupMemberships(emp.id)
        .then((ms) => setGroups(ms.map((m) => ({
          id: m.employee_groups.id,
          name: m.employee_groups.name,
          type: m.employee_groups.type,
          added_at: m.added_at,
        }))))
        .finally(() => setTabLoading(false));
    }
  }, [tab, emp.id]);

  const pd = emp.personalData as Record<string, string>;
  const ad = emp.addressData  as Record<string, string>;
  const bd = emp.bankData     as Record<string, string>;

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(emp.id);
    onRefresh();
    onBack();
  };

  return (
    <div className="p-8">
      {showHistory && <HistoryPanel emp={emp} onClose={() => setShowHistory(false)} />}
      {showPosSel && (
        <PositionSelectorModal
          current={editForm.position}
          onClose={() => setShowPosSel(false)}
          onSelect={(t) => setEditForm((f) => ({ ...f, position: t }))}
        />
      )}

      {/* Confirm delete overlay */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-bold text-slate-800">Remover funcionário?</p>
                <p className="text-xs text-slate-500">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              Tem certeza que deseja remover <strong>{emp.name}</strong> do sistema?
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 font-medium">
                {deleting ? 'Removendo...' : 'Sim, remover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center text-xl font-bold text-pink-600">
              {initials(emp.name)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{emp.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-slate-500">{emp.position}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[emp.status]}`}>
                  {emp.status}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <button onClick={() => { setEditMode(false); setEditForm(buildEditForm(emp)); }}
                className="px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium disabled:opacity-60">
                <Check className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setEditForm(buildEditForm(emp)); setEditMode(true); setTab('dados'); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <Edit2 className="w-4 h-4" /> Editar
              </button>
              <button onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <History className="w-4 h-4" /> Histórico
              </button>
              <button onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                <Trash2 className="w-4 h-4" /> Remover
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-slate-200 mb-6 overflow-x-auto">
        {DETAIL_TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-all ${
                tab === t.id ? 'text-pink-600 border-pink-600' : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}>
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === 'dados' && !editMode && (
        <div className="space-y-6">
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Dados Pessoais</h3>
            <InfoGrid rows={[
              ['Nome Completo', emp.name],
              ['CPF', emp.cpf],
              ['RG', pd.rg ?? ''],
              ['Data de Nascimento', pd.birthDate ?? ''],
              ['Sexo', pd.gender ?? ''],
              ['Estado Civil', pd.maritalStatus ?? ''],
              ['Nacionalidade', pd.nationality ?? ''],
              ['PIS / PASEP', pd.pis ?? ''],
            ]} />
          </section>
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Contato</h3>
            <InfoGrid rows={[
              ['E-mail Corporativo', emp.email],
              ['E-mail Pessoal', pd.personalEmail ?? ''],
              ['Telefone', pd.phone ?? ''],
              ['Celular', pd.mobile ?? ''],
            ]} />
          </section>
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Dados Profissionais</h3>
            <InfoGrid rows={[
              ['Cargo', emp.position],
              ['Departamento', emp.department],
              ['Data de Admissão', emp.admissionDate],
              ['Tipo de Contrato', emp.contract],
              ['Modalidade', emp.workMode],
              ['Status', emp.status],
            ]} />
          </section>
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Endereço</h3>
            <InfoGrid rows={[
              ['CEP', ad.cep ?? ''],
              ['Logradouro', ad.street ?? ''],
              ['Número', ad.num ?? ''],
              ['Complemento', ad.complement ?? ''],
              ['Bairro', ad.neighborhood ?? ''],
              ['Cidade', ad.city ?? ''],
              ['Estado', ad.state ?? ''],
            ]} />
          </section>
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Dados Bancários</h3>
            <InfoGrid rows={[
              ['Banco', bd.bank ?? ''],
              ['Tipo de Conta', bd.accountType ?? ''],
              ['Agência', bd.agency ?? ''],
              ['Conta', bd.account ?? ''],
              ['Tipo Chave PIX', bd.pixType ?? ''],
              ['Chave PIX', bd.pixKey ?? ''],
            ]} />
          </section>
        </div>
      )}

      {tab === 'dados' && editMode && (
        <div className="space-y-6 max-w-2xl">
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Dados Pessoais</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><EField label="Nome Completo" value={editForm.name} onChange={setEF('name')} /></div>
              <EField label="CPF" value={editForm.cpf} onChange={setEF('cpf')} />
              <EField label="RG" value={editForm.rg} onChange={setEF('rg')} />
              <EField label="Data de Nascimento" value={editForm.birthDate} onChange={setEF('birthDate')} type="date" />
              <ESelect label="Sexo" value={editForm.gender} onChange={setEF('gender')}
                options={['Masculino', 'Feminino', 'Não Binário', 'Prefiro não informar']} />
              <ESelect label="Estado Civil" value={editForm.maritalStatus} onChange={setEF('maritalStatus')}
                options={['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável']} />
              <EField label="Nacionalidade" value={editForm.nationality} onChange={setEF('nationality')} />
              <div className="col-span-2"><EField label="PIS / PASEP" value={editForm.pis} onChange={setEF('pis')} /></div>
            </div>
          </section>
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Contato</h3>
            <div className="grid grid-cols-2 gap-3">
              <EField label="E-mail Corporativo" value={editForm.email} onChange={setEF('email')} type="email" />
              <EField label="E-mail Pessoal" value={editForm.personalEmail} onChange={setEF('personalEmail')} type="email" />
              <EField label="Telefone" value={editForm.phone} onChange={setEF('phone')} />
              <EField label="Celular" value={editForm.mobile} onChange={setEF('mobile')} />
            </div>
          </section>
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Dados Profissionais</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Cargo</label>
                <button
                  type="button"
                  onClick={() => setShowPosSel(true)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm border border-slate-200 rounded-lg hover:border-pink-400 hover:bg-pink-50/30 transition-colors text-left"
                >
                  <span className={editForm.position ? 'text-slate-800' : 'text-slate-400'}>
                    {editForm.position || 'Clique para selecionar um cargo...'}
                  </span>
                  <Briefcase className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                </button>
              </div>
              <EField label="Departamento" value={editForm.department} onChange={setEF('department')} />
              <ESelect label="Tipo de Contrato" value={editForm.contractType} onChange={setEF('contractType')}
                options={['CLT', 'PJ', 'Estágio', 'Aprendiz', 'Temporário']} />
              <ESelect label="Modalidade" value={editForm.workMode} onChange={setEF('workMode')}
                options={['Presencial', 'Híbrido', 'Remoto']} />
              <ESelect label="Status" value={editForm.status} onChange={setEF('status')}
                options={['Ativo', 'Férias', 'Afastado', 'Experiência', 'Inativo']} />
            </div>
          </section>
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Endereço</h3>
            <div className="grid grid-cols-2 gap-3">
              <EField label="CEP" value={editForm.cep} onChange={setEF('cep')} />
              <div />
              <div className="col-span-2"><EField label="Logradouro" value={editForm.street} onChange={setEF('street')} /></div>
              <EField label="Número" value={editForm.num} onChange={setEF('num')} />
              <EField label="Complemento" value={editForm.complement} onChange={setEF('complement')} />
              <EField label="Bairro" value={editForm.neighborhood} onChange={setEF('neighborhood')} />
              <EField label="Cidade" value={editForm.city} onChange={setEF('city')} />
              <div className="col-span-2">
                <ESelect label="Estado" value={editForm.state} onChange={setEF('state')}
                  options={['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']} />
              </div>
            </div>
          </section>
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Dados Bancários</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><EField label="Banco" value={editForm.bank} onChange={setEF('bank')} /></div>
              <ESelect label="Tipo de Conta" value={editForm.accountType} onChange={setEF('accountType')}
                options={['Conta Corrente', 'Conta Poupança', 'Conta Salário']} />
              <EField label="Agência" value={editForm.agency} onChange={setEF('agency')} />
              <EField label="Número da Conta" value={editForm.account} onChange={setEF('account')} />
              <div />
              <ESelect label="Tipo Chave PIX" value={editForm.pixType} onChange={setEF('pixType')}
                options={['CPF', 'E-mail', 'Celular', 'Chave Aleatória']} />
              <EField label="Chave PIX" value={editForm.pixKey} onChange={setEF('pixKey')} />
            </div>
          </section>
        </div>
      )}

      {tab === 'acesso' && (
        <AccessTab emp={emp} />
      )}

      {tab === 'atividades' && (
        <div>
          {tabLoading && <p className="text-slate-400 text-sm text-center py-8">Carregando atividades...</p>}
          {!tabLoading && activities.length === 0 && (
            <div className="text-center py-12">
              <ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Nenhuma atividade cadastrada para este colaborador.</p>
              <p className="text-xs text-slate-400 mt-1">Vincule atividades em <strong>Gestão de Atividades</strong>.</p>
            </div>
          )}
          {!tabLoading && activities.length > 0 && (
            <div className="space-y-2">
              {activities.map((a) => (
                <div key={a.id} className="flex items-start gap-4 bg-white border border-slate-100 rounded-xl px-5 py-4 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{a.title}</p>
                    {a.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{a.description}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        a.status === 'Concluída' ? 'bg-green-100 text-green-700'
                        : a.status === 'Ativa' ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-500'
                      }`}>{a.status}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        a.priority === 'Alta' ? 'bg-red-100 text-red-700'
                        : a.priority === 'Média' ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                      }`}>{a.priority}</span>
                      {a.project && <span className="text-[10px] text-slate-400">Projeto: {a.project}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {a.due_date && (
                      <p className="text-xs text-slate-400">
                        Prazo: {new Date(a.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'ferias' && (
        <div className="space-y-6">
          {tabLoading && <p className="text-slate-400 text-sm text-center py-8">Carregando...</p>}
          {!tabLoading && (
            <>
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Férias</h3>
                {vacations.length === 0
                  ? <p className="text-slate-400 text-sm">Nenhum registro de férias.</p>
                  : <div className="space-y-2">
                      {vacations.map((v) => (
                        <div key={v.id} className="bg-white border border-slate-100 rounded-xl px-5 py-4 shadow-sm">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">
                                {v.days_available} dias disponíveis · {v.days_scheduled} agendados
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Período aquisitivo: {v.acquisition_start ?? '—'} → {v.acquisition_end ?? '—'}
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              v.status === 'Aprovado' ? 'bg-green-100 text-green-700'
                              : v.status === 'Agendado' ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-500'
                            }`}>{v.status}</span>
                          </div>
                          {v.start_date && (
                            <p className="text-xs text-slate-400 mt-2">
                              Período de gozo: {new Date(v.start_date + 'T00:00:00').toLocaleDateString('pt-BR')} →{' '}
                              {v.end_date ? new Date(v.end_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                }
              </section>

              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Anotações</h3>
                {notes.length === 0
                  ? <p className="text-slate-400 text-sm">Nenhuma anotação registrada para este colaborador.</p>
                  : <div className="space-y-2">
                      {notes.map((n) => (
                        <div key={n.id} className="bg-white border border-slate-100 rounded-xl px-5 py-4 shadow-sm">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-700">{n.content}</p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {n.tags?.map((tag) => (
                                  <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-semibold">{tag}</span>
                                ))}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[10px] text-slate-400">{n.author_name ?? 'Sistema'}</p>
                              <p className="text-[10px] text-slate-400">
                                {new Date(n.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                }
              </section>
            </>
          )}
        </div>
      )}

      {tab === 'grupos' && (
        <div>
          {tabLoading && <p className="text-slate-400 text-sm text-center py-8">Carregando grupos...</p>}
          {!tabLoading && groups.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Este colaborador não pertence a nenhum grupo.</p>
              <p className="text-xs text-slate-400 mt-1">Adicione-o em <strong>Grupos de Funcionários</strong>.</p>
            </div>
          )}
          {!tabLoading && groups.length > 0 && (
            <div className="space-y-2">
              {groups.map((g) => (
                <div key={g.id} className="flex items-center gap-4 bg-white border border-slate-100 rounded-xl px-5 py-4 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-pink-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{g.name}</p>
                    <p className="text-xs text-slate-400">{g.type}</p>
                  </div>
                  <p className="text-xs text-slate-400 shrink-0">
                    Entrou em {new Date(g.added_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── New Employee Form ─────────────────────────────────────────────────────────

type FormStep = 'pessoal' | 'contato' | 'profissional' | 'endereco' | 'bancario';

const FORM_STEPS: { id: FormStep; label: string }[] = [
  { id: 'pessoal',      label: 'Dados Pessoais'      },
  { id: 'contato',      label: 'Contato'             },
  { id: 'profissional', label: 'Dados Profissionais' },
  { id: 'endereco',     label: 'Endereço'            },
  { id: 'bancario',     label: 'Dados Bancários'     },
];

interface NewEmployeeForm {
  name: string; cpf: string; rg: string; birthDate: string;
  gender: string; maritalStatus: string; nationality: string;
  corpEmail: string; personalEmail: string; phone: string; mobile: string;
  position: string; department: string; manager: string;
  admissionDate: string; contractType: string; workMode: string; pis: string;
  cep: string; street: string; num: string; complement: string;
  neighborhood: string; city: string; state: string;
  bank: string; accountType: string; agency: string;
  account: string; pixType: string; pixKey: string;
}

const EMPTY_FORM: NewEmployeeForm = {
  name: '', cpf: '', rg: '', birthDate: '', gender: '', maritalStatus: '', nationality: 'Brasileira',
  corpEmail: '', personalEmail: '', phone: '', mobile: '',
  position: '', department: '', manager: '', admissionDate: '', contractType: '', workMode: '', pis: '',
  cep: '', street: '', num: '', complement: '', neighborhood: '', city: '', state: '',
  bank: '', accountType: '', agency: '', account: '', pixType: '', pixKey: '',
};

const STATES = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

const INPUT_CLS = 'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400';

function FField({ label, value, onChange, type, placeholder, required, error }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; error?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <input
        type={type ?? 'text'}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT_CLS} ${error ? 'border-rose-400 bg-rose-50' : 'border-slate-200'}`}
      />
      {error && <p className="text-xs text-rose-500 mt-1">Campo obrigatório</p>}
    </div>
  );
}

function FSelect({ label, value, onChange, options, required }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT_CLS} border-slate-200 bg-white`}
      >
        <option value="">Selecione...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function NewEmployeeModal({ onClose, onSave }: { onClose: () => void; onSave: (form: NewEmployeeForm) => Promise<void> }) {
  const [step, setStep] = useState<FormStep>('pessoal');
  const [form, setForm] = useState<NewEmployeeForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<{ name?: boolean; cpf?: boolean }>({});
  const [saving, setSaving] = useState(false);

  const currentIdx = FORM_STEPS.findIndex((s) => s.id === step);
  const isFirst    = currentIdx === 0;
  const isLast     = currentIdx === FORM_STEPS.length - 1;
  const set        = (k: keyof NewEmployeeForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const newErrors = { name: !form.name.trim(), cpf: !form.cpf.trim() };
    setErrors(newErrors);
    if (newErrors.name || newErrors.cpf) { setStep('pessoal'); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Novo Funcionário</h2>
            <p className="text-xs text-slate-400 mt-0.5">Campos com * são obrigatórios (Nome e CPF)</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex px-6 pt-4 pb-0 border-b border-slate-100 gap-1 overflow-x-auto">
          {FORM_STEPS.map((s, i) => (
            <button key={s.id} onClick={() => setStep(s.id)}
              className={`flex items-center gap-1.5 pb-3 text-xs font-semibold border-b-2 -mb-px px-2 whitespace-nowrap transition-all ${
                step === s.id ? 'text-pink-600 border-pink-600'
                  : i < currentIdx ? 'text-green-600 border-green-400'
                  : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}>
              <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-black ${
                step === s.id ? 'bg-pink-100 text-pink-700'
                  : i < currentIdx ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-500'
              }`}>{i + 1}</span>
              {s.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          {step === 'pessoal' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FField label="Nome Completo" value={form.name} onChange={set('name')} required
                  placeholder="Nome e sobrenome" error={errors.name} />
              </div>
              <FField label="CPF" value={form.cpf} onChange={set('cpf')} required placeholder="000.000.000-00" error={errors.cpf} />
              <FField label="RG" value={form.rg} onChange={set('rg')} placeholder="00.000.000-0" />
              <FField label="Data de Nascimento" value={form.birthDate} onChange={set('birthDate')} type="date" />
              <FSelect label="Sexo" value={form.gender} onChange={set('gender')}
                options={['Masculino', 'Feminino', 'Não Binário', 'Prefiro não informar']} />
              <FSelect label="Estado Civil" value={form.maritalStatus} onChange={set('maritalStatus')}
                options={['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável']} />
              <FField label="Nacionalidade" value={form.nationality} onChange={set('nationality')} placeholder="Ex: Brasileira" />
            </div>
          )}
          {step === 'contato' && (
            <div className="grid grid-cols-2 gap-4">
              <FField label="E-mail Corporativo" value={form.corpEmail} onChange={set('corpEmail')} type="email" placeholder="colaborador@empresa.com" />
              <FField label="E-mail Pessoal" value={form.personalEmail} onChange={set('personalEmail')} type="email" placeholder="email@pessoal.com" />
              <FField label="Telefone" value={form.phone} onChange={set('phone')} placeholder="(11) 3000-0000" />
              <FField label="Celular" value={form.mobile} onChange={set('mobile')} placeholder="(11) 9 0000-0000" />
            </div>
          )}
          {step === 'profissional' && (
            <div className="grid grid-cols-2 gap-4">
              <FField label="Cargo" value={form.position} onChange={set('position')} placeholder="Ex: Analista de RH Pleno" />
              <FField label="Departamento" value={form.department} onChange={set('department')} placeholder="Ex: Recursos Humanos" />
              <FField label="Gestor Direto" value={form.manager} onChange={set('manager')} placeholder="Nome do gestor" />
              <FField label="Data de Admissão" value={form.admissionDate} onChange={set('admissionDate')} type="date" />
              <FSelect label="Tipo de Contrato" value={form.contractType} onChange={set('contractType')}
                options={['CLT', 'PJ', 'Estágio', 'Aprendiz', 'Temporário']} />
              <FSelect label="Modalidade de Trabalho" value={form.workMode} onChange={set('workMode')}
                options={['Presencial', 'Híbrido', 'Remoto']} />
              <div className="col-span-2">
                <FField label="PIS/PASEP" value={form.pis} onChange={set('pis')} placeholder="000.00000.00-0" />
              </div>
            </div>
          )}
          {step === 'endereco' && (
            <div className="grid grid-cols-2 gap-4">
              <FField label="CEP" value={form.cep} onChange={set('cep')} placeholder="00000-000" />
              <div />
              <div className="col-span-2">
                <FField label="Logradouro" value={form.street} onChange={set('street')} placeholder="Rua, Avenida, etc." />
              </div>
              <FField label="Número" value={form.num} onChange={set('num')} placeholder="000" />
              <FField label="Complemento" value={form.complement} onChange={set('complement')} placeholder="Apto, Bloco..." />
              <FField label="Bairro" value={form.neighborhood} onChange={set('neighborhood')} />
              <FField label="Cidade" value={form.city} onChange={set('city')} />
              <div className="col-span-2">
                <FSelect label="Estado" value={form.state} onChange={set('state')} options={STATES} />
              </div>
            </div>
          )}
          {step === 'bancario' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FField label="Banco" value={form.bank} onChange={set('bank')} placeholder="Ex: 001 – Banco do Brasil" />
              </div>
              <FSelect label="Tipo de Conta" value={form.accountType} onChange={set('accountType')}
                options={['Conta Corrente', 'Conta Poupança', 'Conta Salário']} />
              <FField label="Agência" value={form.agency} onChange={set('agency')} placeholder="0000-0" />
              <FField label="Número da Conta" value={form.account} onChange={set('account')} placeholder="00000-0" />
              <div />
              <FSelect label="Tipo de Chave PIX" value={form.pixType} onChange={set('pixType')}
                options={['CPF', 'E-mail', 'Celular', 'Chave Aleatória']} />
              <FField label="Chave PIX" value={form.pixKey} onChange={set('pixKey')} placeholder="Informe a chave" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <button onClick={() => !isFirst && setStep(FORM_STEPS[currentIdx - 1].id)} disabled={isFirst}
            className="flex items-center gap-1 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <span className="text-xs text-slate-400">{currentIdx + 1} / {FORM_STEPS.length}</span>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium disabled:opacity-60">
              {saving ? 'Salvando...' : 'Salvar Funcionário'}
            </button>
            {!isLast && (
              <button onClick={() => setStep(FORM_STEPS[currentIdx + 1].id)}
                className="flex items-center gap-1 px-4 py-2 text-sm text-pink-600 border border-pink-200 bg-pink-50 rounded-lg hover:bg-pink-100 font-medium">
                Próximo <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Employees() {
  const [employees, setEmployees]         = useState<Employee[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState<EmployeeStatus | 'Todos'>('Todos');
  const [showModal, setShowModal]         = useState(false);
  const [selectedEmp, setSelectedEmp]     = useState<Employee | null>(null);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEmployees();
      setEmployees(data.map(mapEmployee));
    } catch (err) {
      console.error('Erro ao carregar funcionários:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  // If an employee is selected, show full-page detail
  if (selectedEmp) {
    return (
      <EmployeeDetail
        emp={selectedEmp}
        onBack={() => setSelectedEmp(null)}
        onDelete={deleteEmployee}
        onRefresh={loadEmployees}
      />
    );
  }

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = e.name.toLowerCase().includes(q) ||
                        e.position.toLowerCase().includes(q) ||
                        e.department.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'Todos' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total:       employees.filter((e) => e.status !== 'Inativo').length,
    ativo:       employees.filter((e) => e.status === 'Ativo').length,
    ferias:      employees.filter((e) => e.status === 'Férias').length,
    afastado:    employees.filter((e) => e.status === 'Afastado').length,
    experiencia: employees.filter((e) => e.status === 'Experiência').length,
  };

  const handleDeleteFromList = async (id: string) => {
    await deleteEmployee(id);
    await loadEmployees();
  };

  return (
    <div className="p-8">
      {showModal && (
        <NewEmployeeModal
          onClose={() => setShowModal(false)}
          onSave={async (form) => {
            await createEmployee({
              full_name: form.name,
              cpf: form.cpf,
              email: form.corpEmail || form.personalEmail || '',
              position_title: form.position || null,
              work_mode: form.workMode || 'Presencial',
              contract_type: form.contractType || 'CLT',
              status: 'Ativo',
              admission_date: form.admissionDate || new Date().toISOString().split('T')[0],
              personal_data: { rg: form.rg, birthDate: form.birthDate, gender: form.gender, maritalStatus: form.maritalStatus, nationality: form.nationality, phone: form.phone, mobile: form.mobile, personalEmail: form.personalEmail, pis: form.pis },
              address_data: { cep: form.cep, street: form.street, num: form.num, complement: form.complement, neighborhood: form.neighborhood, city: form.city, state: form.state },
              bank_data: { bank: form.bank, accountType: form.accountType, agency: form.agency, account: form.account, pixType: form.pixType, pixKey: form.pixKey },
            });
            await loadEmployees();
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cadastro de Funcionários</h1>
          <p className="text-slate-500 text-sm mt-1">Registro de todos os colaboradores ativos e histórico</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
          <Plus className="w-4 h-4" /> Novo Funcionário
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Total Ativo</p>
          <p className="text-3xl font-bold text-slate-800">{counts.total}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <p className="text-xs text-green-600 font-semibold uppercase tracking-wider mb-1">Ativos</p>
          <p className="text-3xl font-bold text-green-700">{counts.ativo}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">Em Férias</p>
          <p className="text-3xl font-bold text-blue-700">{counts.ferias}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-1">Afastados</p>
          <p className="text-3xl font-bold text-amber-700">{counts.afastado}</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
          <p className="text-xs text-purple-600 font-semibold uppercase tracking-wider mb-1">Experiência</p>
          <p className="text-3xl font-bold text-purple-700">{counts.experiencia}</p>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome, cargo ou departamento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 w-80"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as EmployeeStatus | 'Todos')}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none bg-white"
            >
              <option value="Todos">Todos os status</option>
              <option value="Ativo">Ativo</option>
              <option value="Férias">Em Férias</option>
              <option value="Afastado">Afastado</option>
              <option value="Experiência">Em Experiência</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>

        <div className="overflow-x-auto">
          {loading && <div className="text-center py-10 text-slate-400 text-sm">Carregando funcionários...</div>}
          {!loading && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Colaborador</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CPF</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cargo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Departamento</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contrato</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Modalidade</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Admissão</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((emp, idx) => (
                  <tr key={emp.id} onClick={() => setSelectedEmp(emp)}
                    className="hover:bg-pink-50/40 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                          {initials(emp.name)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 leading-tight">{emp.name}</p>
                          <p className="text-xs text-slate-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{emp.cpf}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{emp.position}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{emp.department}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CONTRACT_BADGE[emp.contract]}`}>
                        {emp.contract}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${WORK_MODE_BADGE[emp.workMode]}`}>
                        {emp.workMode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{emp.admissionDate}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[emp.status]}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); void handleDeleteFromList(emp.id); }}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                        title="Remover funcionário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">Nenhum funcionário encontrado.</div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">Exibindo {filtered.length} de {employees.length} funcionários</p>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">Anterior</button>
            <span className="px-3 py-1.5 text-xs text-white bg-pink-600 rounded-lg font-medium">1</span>
            <button className="px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">Próxima</button>
          </div>
        </div>
      </div>
    </div>
  );
}

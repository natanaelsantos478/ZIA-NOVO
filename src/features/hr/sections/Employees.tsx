import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Download, X, ChevronLeft, ChevronRight, Eye, History, Lock, Users, Activity, Heart, DollarSign, User, Send, AlertCircle } from 'lucide-react';
import { getEmployees, createEmployee, updateEmployee, getHrActivities, getEmployeeGroups, getAbsences, getVacations, getOvertimeRequests } from '../../../lib/hr';
import type { Employee as HrEmployee, HrActivity, EmployeeGroup, Absence, Vacation, OvertimeRequest } from '../../../lib/hr';

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
  };
}

// ─── Employee View Modal (tabbed) ──────────────────────────────────────────────

type ViewTab = 'pessoal' | 'financeiro' | 'saude' | 'login' | 'atividades' | 'grupos';

const VIEW_TABS: { id: ViewTab; label: string; icon: React.ElementType }[] = [
  { id: 'pessoal',    label: 'Dados Pessoais',  icon: User         },
  { id: 'financeiro', label: 'Financeiro',       icon: DollarSign   },
  { id: 'saude',      label: 'Saúde',            icon: Heart        },
  { id: 'login',      label: 'Login',            icon: Lock         },
  { id: 'atividades', label: 'Atividades',        icon: Activity     },
  { id: 'grupos',     label: 'Grupos',            icon: Users        },
];

// History popup
function HistoryModal({ emp, onClose }: { emp: Employee; onClose: () => void }) {
  const [tab, setTab] = useState<'salario' | 'cargo' | 'alteracoes'>('salario');
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Histórico — {emp.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-1 px-6 pt-4 border-b border-slate-100">
          {[
            { id: 'salario' as const, label: 'Salário' },
            { id: 'cargo' as const, label: 'Cargo' },
            { id: 'alteracoes' as const, label: 'Alterações' },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`pb-3 px-3 text-sm font-semibold border-b-2 -mb-px transition-all ${tab === t.id ? 'text-pink-600 border-pink-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {tab === 'salario' && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <div className="flex-1"><p className="text-sm font-medium text-slate-800">Salário atual</p><p className="text-xs text-slate-400">Informação disponível no ERP Financeiro</p></div>
                <span className="text-xs text-slate-400">—</span>
              </div>
              <p className="text-xs text-slate-400 text-center py-4">Histórico de remuneração integrado com o módulo ERP em breve</p>
            </div>
          )}
          {tab === 'cargo' && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{emp.position}</p>
                  <p className="text-xs text-slate-400">Cargo atual · desde {emp.admissionDate}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center py-4">Histórico de promoções e transferências em breve</p>
            </div>
          )}
          {tab === 'alteracoes' && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <div className="flex-1"><p className="text-sm font-medium text-slate-800">Registro criado</p><p className="text-xs text-slate-400">Colaborador adicionado ao sistema</p></div>
                <span className="text-xs text-slate-400">{emp.admissionDate}</span>
              </div>
              <p className="text-xs text-slate-400 text-center py-4">Auditoria automática de alterações em breve</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Fechar</button>
        </div>
      </div>
    </div>
  );
}

// Personal data tab — editable
function PessoalTab({ emp, rawEmp, onUpdated }: { emp: Employee; rawEmp: HrEmployee; onUpdated: () => void }) {
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const pd = (rawEmp.personal_data ?? {}) as Record<string, string>;
  const ad = (rawEmp.address_data ?? {}) as Record<string, string>;

  const [form, setForm] = useState({
    position: emp.position,
    department: emp.department,
    contract: emp.contract,
    workMode: emp.workMode,
    status: emp.status,
    phone: pd.phone ?? '',
    mobile: pd.mobile ?? '',
    personalEmail: pd.personalEmail ?? '',
    birthDate: pd.birthDate ?? '',
    gender: pd.gender ?? '',
    maritalStatus: pd.maritalStatus ?? '',
    street: ad.street ?? '', city: ad.city ?? '', state: ad.state ?? '', cep: ad.cep ?? '',
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateEmployee(rawEmp.id, {
        position_title: form.position || null,
        work_mode: form.workMode,
        contract_type: form.contract,
        status: form.status,
        personal_data: { ...pd, phone: form.phone, mobile: form.mobile, personalEmail: form.personalEmail, birthDate: form.birthDate, gender: form.gender, maritalStatus: form.maritalStatus },
        address_data: { ...ad, street: form.street, city: form.city, state: form.state, cep: form.cep },
      });
      setEditing(false);
      onUpdated();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const Field = ({ label, value, onChange, type }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      {editing
        ? <input type={type ?? 'text'} value={value} onChange={(e) => onChange(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 bg-white" />
        : <p className="text-sm font-medium text-slate-700">{value || '—'}</p>}
    </div>
  );

  const FSelect = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) => (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      {editing
        ? <select value={value} onChange={(e) => onChange(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 bg-white">
            {options.map((o) => <option key={o}>{o}</option>)}
          </select>
        : <p className="text-sm font-medium text-slate-700">{value || '—'}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Identity (read-only) */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Identificação</p>
        <div className="grid grid-cols-2 gap-3">
          {[['Nome Completo', emp.name], ['CPF', emp.cpf], ['E-mail Corporativo', emp.email]].map(([l, v]) => (
            <div key={l} className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{l}</p>
              <p className="text-sm font-medium text-slate-700">{v || '—'}</p>
            </div>
          ))}
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Data de Admissão</p>
            <p className="text-sm font-medium text-slate-700">{emp.admissionDate}</p>
          </div>
        </div>
      </div>

      {/* Editable fields */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dados do Contrato</p>
          {!editing && <button onClick={() => setEditing(true)} className="text-xs text-pink-600 font-semibold hover:text-pink-700">Editar</button>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cargo" value={form.position} onChange={set('position')} />
          <Field label="Departamento" value={form.department} onChange={set('department')} />
          <FSelect label="Tipo de Contrato" value={form.contract} onChange={set('contract')} options={['CLT','PJ','Estágio','Aprendiz','Temporário']} />
          <FSelect label="Modalidade" value={form.workMode} onChange={set('workMode')} options={['Presencial','Híbrido','Remoto']} />
          <FSelect label="Status" value={form.status} onChange={set('status')} options={['Ativo','Férias','Afastado','Experiência','Inativo']} />
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Contato e Dados Pessoais</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Telefone" value={form.phone} onChange={set('phone')} />
          <Field label="Celular" value={form.mobile} onChange={set('mobile')} />
          <Field label="E-mail Pessoal" value={form.personalEmail} onChange={set('personalEmail')} />
          <Field label="Data de Nascimento" value={form.birthDate} onChange={set('birthDate')} type="date" />
          <FSelect label="Sexo" value={form.gender} onChange={set('gender')} options={['','Masculino','Feminino','Não Binário','Prefiro não informar']} />
          <FSelect label="Estado Civil" value={form.maritalStatus} onChange={set('maritalStatus')} options={['','Solteiro(a)','Casado(a)','Divorciado(a)','Viúvo(a)','União Estável']} />
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Endereço</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CEP" value={form.cep} onChange={set('cep')} />
          <Field label="Cidade / UF" value={form.city ? `${form.city} / ${form.state}` : ''} onChange={() => {}} />
          <div className="col-span-2"><Field label="Logradouro" value={form.street} onChange={set('street')} /></div>
        </div>
      </div>

      {editing && (
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700 disabled:opacity-60">
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      )}
    </div>
  );
}

// Financial tab — read-only, request change only
function FinanceiroTab({ rawEmp }: { rawEmp: HrEmployee }) {
  const [requesting, setRequesting] = useState(false);
  const [changeField, setChangeField] = useState('');
  const [changeValue, setChangeValue] = useState('');
  const [sent, setSent] = useState(false);
  const bd = (rawEmp.bank_data ?? {}) as Record<string, string>;

  const rows: [string, string][] = [
    ['Banco', bd.bank ?? '—'],
    ['Tipo de Conta', bd.accountType ?? '—'],
    ['Agência', bd.agency ?? '—'],
    ['Conta', bd.account ?? '—'],
    ['Tipo de Chave PIX', bd.pixType ?? '—'],
    ['Chave PIX', bd.pixKey ?? '—'],
  ];

  const handleSend = () => {
    // In a real system this would create a request in ERP/financial module
    setSent(true);
    setTimeout(() => { setSent(false); setRequesting(false); setChangeField(''); setChangeValue(''); }, 3000);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">Dados bancários são gerenciados pelo módulo ERP Financeiro. Para alterar, solicite ao financeiro.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {rows.map(([l, v]) => (
          <div key={l} className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{l}</p>
            <p className="text-sm font-medium text-slate-700">{v}</p>
          </div>
        ))}
      </div>

      {!requesting && !sent && (
        <button onClick={() => setRequesting(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100">
          <Send className="w-4 h-4" /> Solicitar Alteração ao Financeiro
        </button>
      )}

      {requesting && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Solicitar alteração</p>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Campo a alterar</label>
            <select value={changeField} onChange={(e) => setChangeField(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 bg-white">
              <option value="">Selecione...</option>
              {rows.map(([l]) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Novo valor</label>
            <input value={changeValue} onChange={(e) => setChangeValue(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30"
              placeholder="Informe o novo valor..." />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setRequesting(false)} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100">Cancelar</button>
            <button onClick={handleSend} disabled={!changeField || !changeValue}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700 disabled:opacity-50">
              <Send className="w-3 h-3" /> Enviar para Financeiro
            </button>
          </div>
        </div>
      )}

      {sent && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
          Solicitação enviada ao financeiro com sucesso.
        </div>
      )}
    </div>
  );
}

// Health tab — pull absences, vacations, overtime
function SaudeTab({ emp }: { emp: Employee }) {
  const [absences, setAbsences]   = useState<Absence[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [overtime, setOvertime]   = useState<OvertimeRequest[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([getAbsences(), getVacations(), getOvertimeRequests()])
      .then(([abs, vac, ot]) => {
        const name = emp.name.toLowerCase();
        setAbsences(abs.filter((a) => a.employee_name.toLowerCase().includes(name)));
        setVacations(vac.filter((v) => (v.employee_name ?? '').toLowerCase().includes(name)));
        setOvertime(ot.filter((o) => (o.employee_name ?? '').toLowerCase().includes(name)));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [emp.name]);

  if (loading) return <div className="text-center py-8 text-slate-400 text-sm">Carregando...</div>;

  return (
    <div className="space-y-5">
      {/* Absences */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Faltas e Atestados ({absences.length})</p>
        {absences.length === 0
          ? <p className="text-sm text-slate-400 italic">Nenhuma falta registrada.</p>
          : <div className="space-y-2">
              {absences.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5">
                  <div><p className="text-sm font-medium text-slate-700">{a.type ?? 'Falta'}</p><p className="text-xs text-slate-400">{a.date} · {a.days} dia(s)</p></div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.justified ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>{a.justified ? 'Justificada' : 'Injustificada'}</span>
                </div>
              ))}
            </div>
        }
      </div>

      {/* Vacations */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Férias</p>
        {vacations.length === 0
          ? <p className="text-sm text-slate-400 italic">Nenhum registro de férias.</p>
          : <div className="space-y-2">
              {vacations.slice(0, 3).map((v) => (
                <div key={v.id} className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-2.5">
                  <div><p className="text-sm font-medium text-slate-700">{v.days_available} dias disponíveis</p>
                    <p className="text-xs text-slate-400">{v.acquisition_start ?? '—'} → {v.acquisition_end ?? '—'}</p></div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700`}>{v.status}</span>
                </div>
              ))}
            </div>
        }
      </div>

      {/* Overtime */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Horas Extras ({overtime.length})</p>
        {overtime.length === 0
          ? <p className="text-sm text-slate-400 italic">Nenhuma hora extra registrada.</p>
          : <div className="space-y-2">
              {overtime.slice(0, 5).map((o) => (
                <div key={o.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5">
                  <div><p className="text-sm font-medium text-slate-700">{o.hours}h extras</p><p className="text-xs text-slate-400">{o.date} · {o.type}</p></div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${o.status === 'Aprovado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{o.status}</span>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}

// Login tab — mock (no auth system yet)
function LoginTab({ emp }: { emp: Employee }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
        <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-700">Credenciais de acesso gerenciadas pelo administrador do sistema. Redefinições de senha são enviadas ao e-mail corporativo.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          ['Usuário / Login', emp.email],
          ['E-mail de Recuperação', emp.email],
          ['Perfil de Acesso', 'Colaborador Padrão'],
          ['Último Acesso', '—'],
          ['Status da Conta', 'Ativo'],
          ['Autenticação 2FA', 'Não configurado'],
        ].map(([l, v]) => (
          <div key={l} className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{l}</p>
            <p className="text-sm font-medium text-slate-700">{v}</p>
          </div>
        ))}
      </div>
      <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100">
        <Send className="w-4 h-4" /> Enviar redefinição de senha
      </button>
    </div>
  );
}

// Activities tab — filter from Supabase
function AtividadesTab({ emp }: { emp: Employee }) {
  const [activities, setActivities] = useState<HrActivity[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    getHrActivities()
      .then((data) => {
        const name = emp.name.toLowerCase();
        setActivities(data.filter((a) => (a.employee_name ?? '').toLowerCase().includes(name)));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [emp.name]);

  if (loading) return <div className="text-center py-8 text-slate-400 text-sm">Carregando...</div>;

  return (
    <div className="space-y-3">
      {activities.length === 0
        ? <p className="text-sm text-slate-400 italic py-4">Nenhuma atividade cadastrada para este colaborador.</p>
        : activities.map((a) => (
            <div key={a.id} className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{a.title}</p>
                <p className="text-xs text-slate-400">{a.project ?? '—'} · {a.due_date ? new Date(a.due_date).toLocaleDateString('pt-BR') : 'Sem prazo'}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${a.status === 'Concluída' ? 'bg-green-100 text-green-700' : a.status === 'Ativa' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{a.status}</span>
            </div>
          ))
      }
    </div>
  );
}

// Groups tab
function GruposTab(_: { emp: Employee }) {
  const [groups, setGroups] = useState<EmployeeGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEmployeeGroups()
      .then((data) => setGroups(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8 text-slate-400 text-sm">Carregando...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
        <Users className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500">Grupos disponíveis na organização. Associação individual por grupo em desenvolvimento.</p>
      </div>
      {groups.length === 0
        ? <p className="text-sm text-slate-400 italic">Nenhum grupo cadastrado.</p>
        : groups.map((g) => (
            <div key={g.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-pink-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{g.name}</p>
                <p className="text-xs text-slate-400">{g.type} · {g.member_count} membros</p>
              </div>
            </div>
          ))
      }
    </div>
  );
}

function EmployeeViewModal({ emp, rawEmp, onClose, onUpdated }: { emp: Employee; rawEmp: HrEmployee; onClose: () => void; onUpdated: () => void }) {
  const [activeTab, setActiveTab] = useState<ViewTab>('pessoal');
  const [showHistory, setShowHistory] = useState(false);
  const initials = emp.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  return (
    <>
      {showHistory && <HistoryModal emp={emp} onClose={() => setShowHistory(false)} />}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center text-xl font-bold text-pink-600 flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800 truncate">{emp.name}</p>
              <p className="text-xs text-slate-500">{emp.position} · {emp.department}</p>
            </div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_BADGE[emp.status]}`}>{emp.status}</span>
            <button onClick={() => setShowHistory(true)} className="text-slate-400 hover:text-pink-600 transition-colors" title="Histórico">
              <History className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 px-6 border-b border-slate-100 overflow-x-auto">
            {VIEW_TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 py-3 px-3 text-xs font-semibold border-b-2 -mb-px whitespace-nowrap transition-all ${
                    activeTab === t.id ? 'text-pink-600 border-pink-600' : 'text-slate-400 border-transparent hover:text-slate-600'
                  }`}>
                  <Icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              );
            })}
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-6 py-5">
            {activeTab === 'pessoal'    && <PessoalTab emp={emp} rawEmp={rawEmp} onUpdated={onUpdated} />}
            {activeTab === 'financeiro' && <FinanceiroTab rawEmp={rawEmp} />}
            {activeTab === 'saude'      && <SaudeTab emp={emp} />}
            {activeTab === 'login'      && <LoginTab emp={emp} />}
            {activeTab === 'atividades' && <AtividadesTab emp={emp} />}
            {activeTab === 'grupos'     && <GruposTab emp={emp} />}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
              Fechar
            </button>
          </div>
        </div>
      </div>
    </>
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
    const newErrors = {
      name: !form.name.trim(),
      cpf:  !form.cpf.trim(),
    };
    setErrors(newErrors);
    if (newErrors.name || newErrors.cpf) {
      setStep('pessoal');
      return;
    }
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Novo Funcionário</h2>
            <p className="text-xs text-slate-400 mt-0.5">Campos com * são obrigatórios (Nome e CPF)</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step tabs */}
        <div className="flex px-6 pt-4 pb-0 border-b border-slate-100 gap-1 overflow-x-auto">
          {FORM_STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={`flex items-center gap-1.5 pb-3 text-xs font-semibold border-b-2 -mb-px px-2 whitespace-nowrap transition-all ${
                step === s.id
                  ? 'text-pink-600 border-pink-600'
                  : i < currentIdx
                    ? 'text-green-600 border-green-400'
                    : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
            >
              <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-black ${
                step === s.id ? 'bg-pink-100 text-pink-700'
                  : i < currentIdx ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-500'
              }`}>{i + 1}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Form body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {step === 'pessoal' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FField label="Nome Completo" value={form.name} onChange={set('name')} required
                  placeholder="Nome e sobrenome" error={errors.name} />
              </div>
              <FField label="CPF" value={form.cpf} onChange={set('cpf')} required
                placeholder="000.000.000-00" error={errors.cpf} />
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

        {/* Footer — Salvar always visible, Próximo/Anterior for navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <button
            onClick={() => !isFirst && setStep(FORM_STEPS[currentIdx - 1].id)}
            disabled={isFirst}
            className="flex items-center gap-1 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>

          <span className="text-xs text-slate-400">{currentIdx + 1} / {FORM_STEPS.length}</span>

          <div className="flex items-center gap-2">
            {/* Salvar always visible */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar Funcionário'}
            </button>
            {/* Próximo only if not last */}
            {!isLast && (
              <button
                onClick={() => setStep(FORM_STEPS[currentIdx + 1].id)}
                className="flex items-center gap-1 px-4 py-2 text-sm text-pink-600 border border-pink-200 bg-pink-50 rounded-lg hover:bg-pink-100 font-medium"
              >
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
  const [rawEmployees, setRawEmployees]   = useState<HrEmployee[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState<EmployeeStatus | 'Todos'>('Todos');
  const [showModal, setShowModal]         = useState(false);
  const [viewing, setViewing]             = useState<{ emp: Employee; raw: HrEmployee } | null>(null);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEmployees();
      setRawEmployees(data);
      setEmployees(data.map(mapEmployee));
    } catch (err) {
      console.error('Erro ao carregar funcionários:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

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

  const initials = (name: string) =>
    name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

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
      {viewing && (
        <EmployeeViewModal
          emp={viewing.emp}
          rawEmp={viewing.raw}
          onClose={() => setViewing(null)}
          onUpdated={loadEmployees}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cadastro de Funcionários</h1>
          <p className="text-slate-500 text-sm mt-1">Registro de todos os colaboradores ativos e histórico</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium"
        >
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
        {/* Toolbar */}
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
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 bg-white"
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

        {/* Table */}
        <div className="overflow-x-auto">
          {loading && (
            <div className="text-center py-10 text-slate-400 text-sm">Carregando funcionários...</div>
          )}
          {!loading && <table className="w-full text-sm">
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
              {filtered.map((emp, idx) => {
                const raw = rawEmployees.find((r) => r.id === emp.id) ?? rawEmployees[0];
                return (
                <tr
                  key={emp.id}
                  onClick={() => setViewing({ emp, raw })}
                  className="hover:bg-pink-50/40 transition-colors cursor-pointer"
                >
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
                      onClick={(e) => { e.stopPropagation(); setViewing({ emp, raw }); }}
                      className="text-slate-400 hover:text-pink-600 transition-colors"
                      title="Ver ficha"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">Nenhum funcionário encontrado.</div>
          )}
        </div>

        {/* Pagination stub */}
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

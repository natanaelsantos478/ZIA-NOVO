import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Download, ChevronUp, ChevronDown,
} from 'lucide-react';
import { getEmployees, createEmployee } from '../../../lib/hr';
import type { Employee as HrEmployee } from '../../../lib/hr';
import EmployeeProfileModal from './EmployeeProfileModal';

// ── Types ─────────────────────────────────────────────────────────────────────

type EmployeeStatus = 'Ativo' | 'Férias' | 'Afastado' | 'Experiência' | 'Inativo';
type ContractType   = 'CLT' | 'PJ' | 'Estágio' | 'Aprendiz' | 'Temporário';
type WorkMode       = 'Presencial' | 'Híbrido' | 'Remoto';
type SortField      = 'name' | 'position' | 'department' | 'admissionDate' | 'status' | 'contract';
type StatusFilter   = EmployeeStatus | 'Todos';

// ── Badges ────────────────────────────────────────────────────────────────────

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
  'bg-pink-100 text-pink-700',   'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700', 'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',   'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',   'bg-orange-100 text-orange-700',
];

// ── Mapped employee for table display ─────────────────────────────────────────

interface MappedEmployee {
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

function mapEmployee(e: HrEmployee): MappedEmployee {
  return {
    id:            e.id,
    name:          e.full_name,
    cpf:           e.cpf,
    email:         e.email,
    position:      e.position_title ?? '—',
    department:    (e as HrEmployee & { departments?: { name: string } | null }).departments?.name ?? '—',
    admissionDate: e.admission_date
      ? new Date(e.admission_date + 'T00:00:00').toLocaleDateString('pt-BR')
      : '—',
    status:    (e.status as EmployeeStatus)       || 'Ativo',
    contract:  (e.contract_type as ContractType)  || 'CLT',
    workMode:  (e.work_mode as WorkMode)           || 'Presencial',
  };
}

const initials = (name: string) =>
  name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

// ── Sortable header ────────────────────────────────────────────────────────────

function SortHeader({
  label, field, current, dir, onClick,
}: {
  label: string; field: SortField; current: SortField; dir: 'asc' | 'desc'; onClick: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700"
      onClick={() => onClick(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className="flex flex-col">
          <ChevronUp   className={`w-2.5 h-2.5 -mb-0.5 ${active && dir === 'asc'  ? 'text-pink-600' : 'text-slate-300'}`} />
          <ChevronDown className={`w-2.5 h-2.5 ${active && dir === 'desc' ? 'text-pink-600' : 'text-slate-300'}`} />
        </span>
      </div>
    </th>
  );
}

// ── New Employee Form ──────────────────────────────────────────────────────────

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

const STATES_LIST = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
const INPUT_CLS   = 'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400';

function FField({ label, value, onChange, type, placeholder, required, error }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; error?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <input type={type ?? 'text'} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className={`${INPUT_CLS} ${error ? 'border-rose-400 bg-rose-50' : 'border-slate-200'}`} />
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
      <select value={value} onChange={e => onChange(e.target.value)}
        className={`${INPUT_CLS} border-slate-200 bg-white`}>
        <option value="">Selecione...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function NewEmployeeModal({
  onClose, onSave,
}: {
  onClose: () => void;
  onSave: (form: NewEmployeeForm) => Promise<void>;
}) {
  const [step, setStep]   = useState<FormStep>('pessoal');
  const [form, setForm]   = useState<NewEmployeeForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<{ name?: boolean; cpf?: boolean }>({});
  const [saving, setSaving] = useState(false);

  const currentIdx = FORM_STEPS.findIndex(s => s.id === step);
  const isFirst    = currentIdx === 0;
  const isLast     = currentIdx === FORM_STEPS.length - 1;
  const set        = (k: keyof NewEmployeeForm) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const errs = { name: !form.name.trim(), cpf: !form.cpf.trim() };
    setErrors(errs);
    if (errs.name || errs.cpf) { setStep('pessoal'); return; }
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
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <ChevronDown className="w-5 h-5 rotate-45" />
          </button>
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
              <div className="col-span-2"><FField label="Nome Completo" value={form.name} onChange={set('name')} required placeholder="Nome e sobrenome" error={errors.name} /></div>
              <FField label="CPF" value={form.cpf} onChange={set('cpf')} required placeholder="000.000.000-00" error={errors.cpf} />
              <FField label="RG" value={form.rg} onChange={set('rg')} placeholder="00.000.000-0" />
              <FField label="Data de Nascimento" value={form.birthDate} onChange={set('birthDate')} type="date" />
              <FSelect label="Sexo" value={form.gender} onChange={set('gender')} options={['Masculino','Feminino','Não Binário','Prefiro não informar']} />
              <FSelect label="Estado Civil" value={form.maritalStatus} onChange={set('maritalStatus')} options={['Solteiro(a)','Casado(a)','Divorciado(a)','Viúvo(a)','União Estável']} />
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
              <FSelect label="Tipo de Contrato" value={form.contractType} onChange={set('contractType')} options={['CLT','PJ','Estágio','Aprendiz','Temporário']} />
              <FSelect label="Modalidade de Trabalho" value={form.workMode} onChange={set('workMode')} options={['Presencial','Híbrido','Remoto']} />
              <div className="col-span-2"><FField label="PIS/PASEP" value={form.pis} onChange={set('pis')} placeholder="000.00000.00-0" /></div>
            </div>
          )}
          {step === 'endereco' && (
            <div className="grid grid-cols-2 gap-4">
              <FField label="CEP" value={form.cep} onChange={set('cep')} placeholder="00000-000" />
              <div />
              <div className="col-span-2"><FField label="Logradouro" value={form.street} onChange={set('street')} placeholder="Rua, Avenida, etc." /></div>
              <FField label="Número" value={form.num} onChange={set('num')} placeholder="000" />
              <FField label="Complemento" value={form.complement} onChange={set('complement')} placeholder="Apto, Bloco..." />
              <FField label="Bairro" value={form.neighborhood} onChange={set('neighborhood')} />
              <FField label="Cidade" value={form.city} onChange={set('city')} />
              <div className="col-span-2"><FSelect label="Estado" value={form.state} onChange={set('state')} options={STATES_LIST} /></div>
            </div>
          )}
          {step === 'bancario' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><FField label="Banco" value={form.bank} onChange={set('bank')} placeholder="Ex: 001 – Banco do Brasil" /></div>
              <FSelect label="Tipo de Conta" value={form.accountType} onChange={set('accountType')} options={['Conta Corrente','Conta Poupança','Conta Salário']} />
              <FField label="Agência" value={form.agency} onChange={set('agency')} placeholder="0000-0" />
              <FField label="Número da Conta" value={form.account} onChange={set('account')} placeholder="00000-0" />
              <div />
              <FSelect label="Tipo de Chave PIX" value={form.pixType} onChange={set('pixType')} options={['CPF','E-mail','Celular','Chave Aleatória']} />
              <FField label="Chave PIX" value={form.pixKey} onChange={set('pixKey')} placeholder="Informe a chave" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <button
            onClick={() => !isFirst && setStep(FORM_STEPS[currentIdx - 1].id)}
            disabled={isFirst}
            className="flex items-center gap-1 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronDown className="w-4 h-4 rotate-90" /> Anterior
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
                Próximo <ChevronDown className="w-4 h-4 -rotate-90" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Employees() {
  const [rawEmployees, setRawEmployees] = useState<HrEmployee[]>([]);
  const [employees, setEmployees]       = useState<MappedEmployee[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todos');
  const [showNew, setShowNew]           = useState(false);
  const [viewing, setViewing]           = useState<HrEmployee | null>(null);
  const [sortField, setSortField]       = useState<SortField>('name');
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('asc');

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

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const counts = {
    total:       employees.filter(e => e.status !== 'Inativo').length,
    ativo:       employees.filter(e => e.status === 'Ativo').length,
    ferias:      employees.filter(e => e.status === 'Férias').length,
    afastado:    employees.filter(e => e.status === 'Afastado').length,
    experiencia: employees.filter(e => e.status === 'Experiência').length,
  };

  const filtered = employees
    .filter(e => {
      const q = search.toLowerCase();
      const matchSearch = e.name.toLowerCase().includes(q) ||
                          e.position.toLowerCase().includes(q) ||
                          e.department.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'Todos' || e.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      const va = a[sortField] ?? '';
      const vb = b[sortField] ?? '';
      const cmp = va.localeCompare(vb, 'pt-BR');
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const openProfile = (emp: MappedEmployee) => {
    const raw = rawEmployees.find(r => r.id === emp.id);
    if (raw) setViewing(raw);
  };

  const STAT_CARDS = [
    { label: 'Total Ativo',  count: counts.total,       filter: 'Todos'      as StatusFilter, bg: 'bg-white',          text: 'text-slate-800',  sub: 'text-slate-500' },
    { label: 'Ativos',       count: counts.ativo,       filter: 'Ativo'      as StatusFilter, bg: 'bg-green-50',       text: 'text-green-700',  sub: 'text-green-600' },
    { label: 'Em Férias',    count: counts.ferias,      filter: 'Férias'     as StatusFilter, bg: 'bg-blue-50',        text: 'text-blue-700',   sub: 'text-blue-600'  },
    { label: 'Afastados',    count: counts.afastado,    filter: 'Afastado'   as StatusFilter, bg: 'bg-amber-50',       text: 'text-amber-700',  sub: 'text-amber-600' },
    { label: 'Experiência',  count: counts.experiencia, filter: 'Experiência' as StatusFilter, bg: 'bg-purple-50',      text: 'text-purple-700', sub: 'text-purple-600'},
  ];

  return (
    <div className="p-8">
      {/* Prontuário modal */}
      {viewing && (
        <EmployeeProfileModal
          emp={viewing}
          onClose={() => setViewing(null)}
          onSaved={() => loadEmployees()}
        />
      )}

      {/* New employee modal */}
      {showNew && (
        <NewEmployeeModal
          onClose={() => setShowNew(false)}
          onSave={async form => {
            await createEmployee({
              full_name:     form.name,
              cpf:           form.cpf,
              email:         form.corpEmail || form.personalEmail || '',
              position_title: form.position || null,
              work_mode:     form.workMode  || 'Presencial',
              contract_type: form.contractType || 'CLT',
              status:        'Ativo',
              admission_date: form.admissionDate || new Date().toISOString().split('T')[0],
              personal_data: { rg: form.rg, birthDate: form.birthDate, gender: form.gender, maritalStatus: form.maritalStatus, nationality: form.nationality, phone: form.phone, mobile: form.mobile, personalEmail: form.personalEmail, pis: form.pis },
              address_data:  { cep: form.cep, street: form.street, num: form.num, complement: form.complement, neighborhood: form.neighborhood, city: form.city, state: form.state },
              bank_data:     { bank: form.bank, accountType: form.accountType, agency: form.agency, account: form.account, pixType: form.pixType, pixKey: form.pixKey },
            });
            await loadEmployees();
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cadastro de Funcionários</h1>
          <p className="text-slate-500 text-sm mt-1">Registro e prontuário completo de todos os colaboradores</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
          <Plus className="w-4 h-4" /> Novo Funcionário
        </button>
      </div>

      {/* Stat cards — clicáveis para filtrar */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {STAT_CARDS.map(card => (
          <button
            key={card.filter}
            onClick={() => setStatusFilter(statusFilter === card.filter ? 'Todos' : card.filter)}
            className={`${card.bg} border rounded-xl p-4 text-left transition-all hover:shadow-md ${
              statusFilter === card.filter ? 'ring-2 ring-pink-400 shadow-sm' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${card.sub}`}>{card.label}</p>
            <p className={`text-3xl font-bold ${card.text}`}>{card.count}</p>
          </button>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Buscar por nome, cargo ou departamento..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 w-80" />
            </div>
            {statusFilter !== 'Todos' && (
              <button
                onClick={() => setStatusFilter('Todos')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-pink-700 bg-pink-50 border border-pink-200 rounded-lg hover:bg-pink-100">
                {statusFilter} ×
              </button>
            )}
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading && <div className="text-center py-10 text-slate-400 text-sm">Carregando funcionários...</div>}
          {!loading && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <SortHeader label="Colaborador"  field="name"          current={sortField} dir={sortDir} onClick={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CPF</th>
                  <SortHeader label="Cargo"        field="position"      current={sortField} dir={sortDir} onClick={handleSort} />
                  <SortHeader label="Departamento" field="department"    current={sortField} dir={sortDir} onClick={handleSort} />
                  <SortHeader label="Contrato"     field="contract"      current={sortField} dir={sortDir} onClick={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Modalidade</th>
                  <SortHeader label="Admissão"     field="admissionDate" current={sortField} dir={sortDir} onClick={handleSort} />
                  <SortHeader label="Status"       field="status"        current={sortField} dir={sortDir} onClick={handleSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((emp, idx) => (
                  <tr
                    key={emp.id}
                    onClick={() => openProfile(emp)}
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
          <p className="text-xs text-slate-400">
            Exibindo <span className="font-semibold">{filtered.length}</span> de <span className="font-semibold">{employees.length}</span> funcionários
            {statusFilter !== 'Todos' && <span> · filtrado por <strong>{statusFilter}</strong></span>}
          </p>
        </div>
      </div>
    </div>
  );
}

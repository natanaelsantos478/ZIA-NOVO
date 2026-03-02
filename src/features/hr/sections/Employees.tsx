import { useState } from 'react';
import {
  Plus, Search, Download, MoreHorizontal, X, ChevronLeft, ChevronRight,
  User, DollarSign, HeartPulse, ClipboardCheck, Users, History, MessageSquare,
  FileText, Send, CheckCircle2, Clock
} from 'lucide-react';

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

const EMPLOYEES: Employee[] = [
  { id: 'E001', name: 'Ana Beatriz Ferreira',  cpf: '***.***.456-78', email: 'ana.ferreira@empresa.com',      position: 'Desenvolvedora Full Stack Pleno', department: 'TI – Desenvolvimento', admissionDate: '15/03/2021', status: 'Ativo',       contract: 'CLT',     workMode: 'Híbrido'    },
  { id: 'E002', name: 'Bruno Henrique Lima',   cpf: '***.***.789-01', email: 'bruno.lima@empresa.com',        position: 'Analista de RH Pleno',          department: 'Recursos Humanos',     admissionDate: '02/07/2019', status: 'Ativo',       contract: 'CLT',     workMode: 'Presencial' },
  { id: 'E003', name: 'Carla Rodrigues',       cpf: '***.***.123-45', email: 'carla.rodrigues@empresa.com',   position: 'Gerente Comercial',             department: 'Comercial & Vendas',   admissionDate: '10/01/2017', status: 'Férias',      contract: 'CLT',     workMode: 'Presencial' },
  { id: 'E004', name: 'Diego Matos',           cpf: '***.***.456-12', email: 'diego.matos@empresa.com',       position: 'Analista Financeiro Pleno',     department: 'Financeiro',           admissionDate: '22/09/2020', status: 'Ativo',       contract: 'CLT',     workMode: 'Híbrido'    },
  { id: 'E005', name: 'Eduarda Sousa',         cpf: '***.***.789-34', email: 'eduarda.sousa@empresa.com',     position: 'Designer UX/UI Pleno',          department: 'Tecnologia',           admissionDate: '05/04/2022', status: 'Ativo',       contract: 'CLT',     workMode: 'Remoto'     },
  { id: 'E006', name: 'Felipe Cardoso',        cpf: '***.***.012-56', email: 'felipe.cardoso@empresa.com',    position: 'Dev. Full Stack Sênior',        department: 'TI – Desenvolvimento', admissionDate: '14/11/2018', status: 'Ativo',       contract: 'CLT',     workMode: 'Remoto'     },
  { id: 'E007', name: 'Giovana Pereira',       cpf: '***.***.345-67', email: 'giovana.pereira@empresa.com',   position: 'Especialista em Qualidade',     department: 'Qualidade (SGQ)',      admissionDate: '08/06/2020', status: 'Afastado',    contract: 'CLT',     workMode: 'Presencial' },
  { id: 'E008', name: 'Henrique Torres',       cpf: '***.***.678-90', email: 'henrique.torres@empresa.com',   position: 'Executivo de Vendas Pleno',     department: 'Comercial & Vendas',   admissionDate: '19/02/2023', status: 'Experiência', contract: 'CLT',     workMode: 'Presencial' },
  { id: 'E009', name: 'Isabela Nascimento',    cpf: '***.***.901-23', email: 'isabela.nascimento@empresa.com', position: 'Coordenadora de Suporte',      department: 'TI – Suporte',         admissionDate: '30/08/2019', status: 'Ativo',       contract: 'CLT',     workMode: 'Híbrido'    },
  { id: 'E010', name: 'João Victor Santos',    cpf: '***.***.234-56', email: 'joao.santos@empresa.com',       position: 'Analista de RH Júnior',         department: 'Recursos Humanos',     admissionDate: '03/01/2024', status: 'Experiência', contract: 'Estágio', workMode: 'Presencial' },
  { id: 'E011', name: 'Larissa Mendes',        cpf: '***.***.567-89', email: 'larissa.mendes@empresa.com',    position: 'Analista de Marketing Pleno',   department: 'Marketing',            admissionDate: '11/05/2021', status: 'Ativo',       contract: 'CLT',     workMode: 'Híbrido'    },
  { id: 'E012', name: 'Marcelo Oliveira',      cpf: '***.***.890-12', email: 'marcelo.oliveira@empresa.com',  position: 'Gerente de Operações',          department: 'Operações',            admissionDate: '07/08/2016', status: 'Ativo',       contract: 'CLT',     workMode: 'Presencial' },
];

// ---------- Modal Form ----------

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

function FField({ label, value, onChange, type, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
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
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400"
      />
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
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 bg-white"
      >
        <option value="">Selecione...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function NewEmployeeModal({ onClose }: { onClose: () => void }) {
  const [step, setStep]   = useState<FormStep>('pessoal');
  const [form, setForm]   = useState<NewEmployeeForm>(EMPTY_FORM);

  const currentIdx = FORM_STEPS.findIndex((s) => s.id === step);
  const isFirst    = currentIdx === 0;
  const isLast     = currentIdx === FORM_STEPS.length - 1;
  const set        = (k: keyof NewEmployeeForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Novo Funcionário</h2>
            <p className="text-xs text-slate-400 mt-0.5">Preencha os dados do colaborador</p>
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
                step === s.id ? 'bg-pink-100 text-pink-700' : i < currentIdx ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
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
                <FField label="Nome Completo" value={form.name} onChange={set('name')} required placeholder="Nome e sobrenome" />
              </div>
              <FField label="CPF" value={form.cpf} onChange={set('cpf')} required placeholder="000.000.000-00" />
              <FField label="RG" value={form.rg} onChange={set('rg')} placeholder="00.000.000-0" />
              <FField label="Data de Nascimento" value={form.birthDate} onChange={set('birthDate')} required type="date" />
              <FSelect label="Sexo" value={form.gender} onChange={set('gender')} required
                options={['Masculino', 'Feminino', 'Não Binário', 'Prefiro não informar']} />
              <FSelect label="Estado Civil" value={form.maritalStatus} onChange={set('maritalStatus')}
                options={['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável']} />
              <FField label="Nacionalidade" value={form.nationality} onChange={set('nationality')} placeholder="Ex: Brasileira" />
            </div>
          )}

          {step === 'contato' && (
            <div className="grid grid-cols-2 gap-4">
              <FField label="E-mail Corporativo" value={form.corpEmail} onChange={set('corpEmail')} required type="email" placeholder="colaborador@empresa.com" />
              <FField label="E-mail Pessoal" value={form.personalEmail} onChange={set('personalEmail')} type="email" placeholder="email@pessoal.com" />
              <FField label="Telefone" value={form.phone} onChange={set('phone')} placeholder="(11) 3000-0000" />
              <FField label="Celular" value={form.mobile} onChange={set('mobile')} placeholder="(11) 9 0000-0000" />
            </div>
          )}

          {step === 'profissional' && (
            <div className="grid grid-cols-2 gap-4">
              <FField label="Cargo" value={form.position} onChange={set('position')} required placeholder="Ex: Analista de RH Pleno" />
              <FField label="Departamento" value={form.department} onChange={set('department')} required placeholder="Ex: Recursos Humanos" />
              <FField label="Gestor Direto" value={form.manager} onChange={set('manager')} placeholder="Nome do gestor" />
              <FField label="Data de Admissão" value={form.admissionDate} onChange={set('admissionDate')} required type="date" />
              <FSelect label="Tipo de Contrato" value={form.contractType} onChange={set('contractType')} required
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
              <FField label="Cidade" value={form.city} onChange={set('city')} required />
              <div className="col-span-2">
                <FSelect label="Estado" value={form.state} onChange={set('state')} required options={STATES} />
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

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <button
            onClick={() => !isFirst && setStep(FORM_STEPS[currentIdx - 1].id)}
            disabled={isFirst}
            className="flex items-center gap-1 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <span className="text-xs text-slate-400">{currentIdx + 1} / {FORM_STEPS.length}</span>
          {isLast ? (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-5 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium"
            >
              Salvar Funcionário
            </button>
          ) : (
            <button
              onClick={() => setStep(FORM_STEPS[currentIdx + 1].id)}
              className="flex items-center gap-1 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium"
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Employee View Modal ----------

type EmployeeTab = 'pessoal' | 'financeiro' | 'saude' | 'atividades' | 'grupos' | 'historico' | 'zia';
type HistoricoTab = 'anotacoes' | 'cargos' | 'salarios';

interface Message {
  id: string;
  sender: 'user' | 'zia';
  text: string;
  time: string;
}

function EmployeeViewModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<EmployeeTab>('pessoal');
  const [activeHistTab, setActiveHistTab] = useState<HistoricoTab>('anotacoes');

  // Chat state
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'zia',
      text: `Olá! Sou a ZIA. Estou conectada ao prontuário de ${employee.name}. O que deseja saber ou analisar sobre ele(a)?`,
      time: '10:00'
    }
  ]);

  const initials = employee.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  // Use sum of char codes to pick color to be consistent with table
  const charSum = employee.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const avatarColorClass = AVATAR_COLORS[charSum % AVATAR_COLORS.length];

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: chatMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, newMsg]);
    setChatMessage('');

    // Mock response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'zia',
        text: `Entendi. Posso gerar um relatório de desempenho ou buscar informações no histórico de ${employee.name.split(' ')[0]} para te ajudar com isso.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1000);
  };

  const tabs: { id: EmployeeTab; label: string; icon: React.ReactNode }[] = [
    { id: 'pessoal', label: 'Dados Pessoais', icon: <User className="w-4 h-4" /> },
    { id: 'financeiro', label: 'Financeiro', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'saude', label: 'Saúde', icon: <HeartPulse className="w-4 h-4" /> },
    { id: 'atividades', label: 'Atividades', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'grupos', label: 'Grupos', icon: <Users className="w-4 h-4" /> },
    { id: 'historico', label: 'Histórico', icon: <History className="w-4 h-4" /> },
    { id: 'zia', label: 'Fale com a ZIA', icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-5xl h-[85vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex-shrink-0 flex items-start justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0 shadow-sm ${avatarColorClass}`}>
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-slate-800">{employee.name}</h2>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[employee.status]}`}>
                  {employee.status}
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium">{employee.position}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> {employee.department}</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> {employee.contract}</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> {employee.workMode}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex-shrink-0 flex gap-1 p-3 border-b border-slate-100 bg-white overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex flex-shrink-0 items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? 'bg-pink-50 text-pink-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={activeTab === t.id ? 'text-pink-600' : 'text-slate-400'}>
                {t.icon}
              </span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">

          {/* Aba: Dados Pessoais */}
          {activeTab === 'pessoal' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-slate-400" /> Informações Básicas
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">CPF</p>
                    <p className="text-sm text-slate-700 font-medium">{employee.cpf}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">E-mail Corporativo</p>
                    <p className="text-sm text-slate-700 font-medium">{employee.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Data de Admissão</p>
                    <p className="text-sm text-slate-700 font-medium">{employee.admissionDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Data de Nascimento</p>
                    <p className="text-sm text-slate-700 font-medium">12/04/1992 (31 anos)</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Telefone / Celular</p>
                    <p className="text-sm text-slate-700 font-medium">(11) 98765-4321</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Contato de Emergência</p>
                    <p className="text-sm text-slate-700 font-medium">Maria (Mãe) - (11) 91234-5678</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 mb-4">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Logradouro</p>
                    <p className="text-sm text-slate-700 font-medium">Rua das Flores, 123 - Apto 45</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Bairro</p>
                      <p className="text-sm text-slate-700 font-medium">Jardim Paulista</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Cidade / UF</p>
                      <p className="text-sm text-slate-700 font-medium">São Paulo / SP</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">CEP</p>
                    <p className="text-sm text-slate-700 font-medium">01415-001</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aba: Financeiro */}
          {activeTab === 'financeiro' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-slate-400" /> Remuneração
                  </h3>
                  <div className="mb-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Salário Base</p>
                    <p className="text-2xl font-bold text-slate-800">R$ 5.400,00</p>
                  </div>
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Adicional Noturno</span>
                      <span className="font-medium text-slate-700">Não Elegível</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Periculosidade</span>
                      <span className="font-medium text-slate-700">Não Elegível</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Bônus / PLR</span>
                      <span className="font-medium text-slate-700">Elegível (Meta: 2 salários)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="text-base font-bold text-slate-800 mb-4">Dados Bancários</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Banco</p>
                      <p className="text-sm text-slate-700 font-medium">341 - Itaú Unibanco S.A.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Agência</p>
                        <p className="text-sm text-slate-700 font-medium">1234</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Conta (Corrente)</p>
                        <p className="text-sm text-slate-700 font-medium">56789-0</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Chave PIX</p>
                      <p className="text-sm text-slate-700 font-medium">{employee.cpf}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-800">Últimos Contracheques</h3>
                  <button className="text-xs font-semibold text-pink-600 hover:text-pink-700">Ver Todos</button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Mês/Ano</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Vencimentos</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Descontos</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Líquido</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-700">Dezembro/2023</td>
                      <td className="px-4 py-3 text-emerald-600">R$ 5.400,00</td>
                      <td className="px-4 py-3 text-rose-600">R$ 685,20</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">R$ 4.714,80</td>
                      <td className="px-4 py-3 text-center">
                        <button className="text-pink-600 hover:text-pink-700"><Download className="w-4 h-4 mx-auto" /></button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-700">13º Salário (2ª parc)</td>
                      <td className="px-4 py-3 text-emerald-600">R$ 2.700,00</td>
                      <td className="px-4 py-3 text-rose-600">R$ 215,00</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">R$ 2.485,00</td>
                      <td className="px-4 py-3 text-center">
                        <button className="text-pink-600 hover:text-pink-700"><Download className="w-4 h-4 mx-auto" /></button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-700">Novembro/2023</td>
                      <td className="px-4 py-3 text-emerald-600">R$ 5.400,00</td>
                      <td className="px-4 py-3 text-rose-600">R$ 685,20</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">R$ 4.714,80</td>
                      <td className="px-4 py-3 text-center">
                        <button className="text-pink-600 hover:text-pink-700"><Download className="w-4 h-4 mx-auto" /></button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Aba: Saúde */}
          {activeTab === 'saude' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-1 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                    <HeartPulse className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Atestado de Saúde Ocupacional</h3>
                  <p className="text-3xl font-black text-emerald-600 mb-2">APTO</p>
                  <p className="text-xs text-slate-500">Último exame: 10/05/2023</p>
                  <div className="mt-4 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
                    Válido até: <strong>10/05/2024</strong>
                  </div>
                </div>

                <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-800">Histórico Médico e Atestados</h3>
                    <button className="text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 px-3 py-1.5 rounded-lg flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> Novo Atestado
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Data</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Motivo (CID)</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Dias</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-700">10/05/2023</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">ASO Periódico</span></td>
                          <td className="px-4 py-3 text-slate-500">-</td>
                          <td className="px-4 py-3 text-slate-500">-</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-700">15/02/2023</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Atestado Médico</span></td>
                          <td className="px-4 py-3 text-slate-500">J00 - Resfriado comum</td>
                          <td className="px-4 py-3 font-medium text-slate-800">2 dias</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aba: Atividades */}
          {activeTab === 'atividades' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Atividades e Treinamentos</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Gestão de tarefas e cursos vinculados ao colaborador</p>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
                  <Plus className="w-4 h-4" /> Vincular Atividade
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-white hover:border-pink-300 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">Treinamento LGPD e Segurança da Informação</h4>
                        <p className="text-xs text-slate-500">Concluído em 12/08/2023</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Concluído
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-white hover:border-pink-300 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">Avaliação de Desempenho (Autoavaliação)</h4>
                        <p className="text-xs text-slate-500">Prazo: 30/11/2023</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Pendente
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-white hover:border-pink-300 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">Integração Onboarding</h4>
                        <p className="text-xs text-slate-500">Concluído em {employee.admissionDate}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Concluído
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aba: Grupos */}
          {activeTab === 'grupos' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-400" /> Grupos e Comitês
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white hover:border-pink-300 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-pink-100 text-pink-700 rounded-lg"><Users className="w-4 h-4" /></div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Folha</span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">CLT Matriz</h4>
                  <p className="text-xs text-slate-500 mt-1">186 membros</p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white hover:border-pink-300 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-orange-100 text-orange-700 rounded-lg"><HeartPulse className="w-4 h-4" /></div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Segurança</span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Brigada de Incêndio</h4>
                  <p className="text-xs text-slate-500 mt-1">12 membros</p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white hover:border-pink-300 transition-colors border-dashed flex flex-col items-center justify-center text-center text-slate-400 hover:text-pink-600 cursor-pointer min-h-[120px]">
                  <Plus className="w-6 h-6 mb-2" />
                  <span className="text-sm font-semibold">Adicionar a Grupo</span>
                </div>
              </div>
            </div>
          )}

          {/* Aba: Histórico */}
          {activeTab === 'historico' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
              <div className="flex border-b border-slate-100 bg-slate-50/50">
                <button
                  onClick={() => setActiveHistTab('anotacoes')}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeHistTab === 'anotacoes' ? 'border-pink-600 text-pink-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  Anotações e Feedbacks
                </button>
                <button
                  onClick={() => setActiveHistTab('cargos')}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeHistTab === 'cargos' ? 'border-pink-600 text-pink-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  Histórico de Cargos
                </button>
                <button
                  onClick={() => setActiveHistTab('salarios')}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeHistTab === 'salarios' ? 'border-pink-600 text-pink-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  Evolução Salarial
                </button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                {activeHistTab === 'anotacoes' && (
                  <div className="space-y-6">
                    <div className="flex justify-end">
                      <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-pink-600 bg-pink-50 rounded-lg hover:bg-pink-100 font-medium">
                        <Plus className="w-4 h-4" /> Nova Anotação
                      </button>
                    </div>
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                      <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-100 text-blue-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-800 text-sm">Feedback Positivo</span>
                            <span className="text-xs text-slate-400">10/09/2023</span>
                          </div>
                          <p className="text-sm text-slate-600">Excelente performance na entrega do projeto X. Demonstrou proatividade e ótimo trabalho em equipe.</p>
                          <p className="text-xs text-slate-400 mt-2">Por: Carlos (Gestor)</p>
                        </div>
                      </div>

                      <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-amber-100 text-amber-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-800 text-sm">Avaliação 1º Semestre</span>
                            <span className="text-xs text-slate-400">15/07/2023</span>
                          </div>
                          <p className="text-sm text-slate-600">Nota final: 4.2/5.0. Pontos fortes: Comunicação e entregas no prazo. A melhorar: Conhecimento técnico em novas ferramentas.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeHistTab === 'cargos' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-pink-200 bg-pink-50 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-pink-500"></div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-800">{employee.position}</h4>
                          <p className="text-sm text-slate-600">{employee.department}</p>
                        </div>
                        <span className="text-xs font-semibold text-pink-700 bg-pink-100 px-2 py-1 rounded-md">Atual</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-3">Desde: 01/01/2023</p>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white relative overflow-hidden opacity-75 hover:opacity-100 transition-opacity">
                      <div className="absolute top-0 left-0 w-1 h-full bg-slate-300"></div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-700">{employee.position.replace('Pleno', 'Júnior').replace('Sênior', 'Pleno')}</h4>
                          <p className="text-sm text-slate-500">{employee.department}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-3">Período: {employee.admissionDate} a 31/12/2022</p>
                    </div>
                  </div>
                )}

                {activeHistTab === 'salarios' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Data Início</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Motivo</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Salário</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">% Aumento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="bg-pink-50/30">
                          <td className="px-4 py-3 font-medium text-slate-800">01/01/2023</td>
                          <td className="px-4 py-3 text-slate-600">Promoção (Mérito)</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800">R$ 5.400,00</td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-medium">+15.5%</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-slate-600">01/05/2022</td>
                          <td className="px-4 py-3 text-slate-600">Dissídio Sindical</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700">R$ 4.675,00</td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-medium">+5.2%</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-slate-600">{employee.admissionDate}</td>
                          <td className="px-4 py-3 text-slate-600">Admissão</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700">R$ 4.440,00</td>
                          <td className="px-4 py-3 text-right text-slate-400">-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Aba: ZIA Chat */}
          {activeTab === 'zia' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden relative">
              <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-pink-50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
                  Z
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">ZIA Intelligence</h3>
                  <p className="text-xs text-slate-500">Conectada ao prontuário de {employee.name.split(' ')[0]}</p>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-3 shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-pink-600 text-white rounded-tr-sm'
                        : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                    }`}>
                      <p className="text-sm">{msg.text}</p>
                      <span className={`text-[10px] block mt-1 ${msg.sender === 'user' ? 'text-pink-200 text-right' : 'text-slate-400'}`}>
                        {msg.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-slate-100 bg-white">
                <div className="relative">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ex: Como foi a última avaliação de desempenho?"
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:hover:bg-pink-600 transition-colors"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}


// ---------- Main Component ----------

export default function Employees() {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | 'Todos'>('Todos');
  const [showModal, setShowModal]     = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const filtered = EMPLOYEES.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = e.name.toLowerCase().includes(q) ||
                        e.position.toLowerCase().includes(q) ||
                        e.department.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'Todos' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total:       EMPLOYEES.filter((e) => e.status !== 'Inativo').length,
    ativo:       EMPLOYEES.filter((e) => e.status === 'Ativo').length,
    ferias:      EMPLOYEES.filter((e) => e.status === 'Férias').length,
    afastado:    EMPLOYEES.filter((e) => e.status === 'Afastado').length,
    experiencia: EMPLOYEES.filter((e) => e.status === 'Experiência').length,
  };

  const initials = (name: string) =>
    name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  return (
    <div className="p-8">
      {showModal && <NewEmployeeModal onClose={() => setShowModal(false)} />}
      {selectedEmployee && <EmployeeViewModal employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />}

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
                <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
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
                      onClick={() => setSelectedEmployee(emp)}
                      className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">Nenhum funcionário encontrado.</div>
          )}
        </div>

        {/* Pagination stub */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">Exibindo {filtered.length} de {EMPLOYEES.length} funcionários</p>
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

import { useState } from 'react';
import { Plus, Search, Download, X, ChevronLeft, ChevronRight, Eye, MoreHorizontal, ArrowUp, ArrowDown, ArrowUpDown, Filter } from 'lucide-react';
import { useHRContext } from '../../../context/HRContext';
import type { Employee, EmployeeStatus, ContractType, WorkMode, Shift } from '../../../context/HRContext';

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

// ─── Sub-components for Employee View Modal ────────────────────────────────────

function DataField({ label, value, mode, type = 'text', options, onChange, name }: { label: string; value: string; mode: 'view' | 'edit'; type?: string; options?: { label: string; value: string }[] | string[]; onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void; name?: string; }) {
  // Fix date format for input type="date"
  let inputValue = value;
  if (type === 'date' && value && value.includes('/')) {
    const parts = value.split('/');
    if (parts.length === 3) {
      inputValue = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      {mode === 'view' ? (
        <p className="text-sm font-medium text-slate-800">{value || '—'}</p>
      ) : options ? (
        <select
          name={name}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 bg-white"
          defaultValue={value}
          onChange={onChange}
        >
          {options.map((opt) => {
            const optValue = typeof opt === 'string' ? opt : opt.value;
            const optLabel = typeof opt === 'string' ? opt : opt.label;
            return <option key={optValue} value={optValue}>{optLabel}</option>;
          })}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30"
          defaultValue={inputValue}
          onChange={onChange}
        />
      )}
    </div>
  );
}

function DadosTab({ emp, mode, shifts, onFieldChange }: { emp: Employee; mode: 'view' | 'edit'; shifts: Shift[]; onFieldChange: (field: string, value: string) => void }) {
  const [dependents, setDependents] = useState([
    { id: 1, name: 'Pedro Henrique Silva', age: '8 anos', cpf: '111.222.333-44' },
    { id: 2, name: 'Mariana Silva', age: '5 anos', cpf: '555.666.777-88' },
  ]);

  const [customFields, setCustomFields] = useState([
    { id: 1, label: 'Tamanho do Uniforme', value: 'M' },
    { id: 2, label: 'Restrição Alimentar', value: 'Nenhuma' },
  ]);

  const addDependent = () => {
    setDependents([...dependents, { id: Date.now(), name: '', age: '', cpf: '' }]);
  };

  const removeDependent = (id: number) => {
    setDependents(dependents.filter((d) => d.id !== id));
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { id: Date.now(), label: 'Novo Campo', value: '' }]);
  };

  const removeCustomField = (id: number) => {
    setCustomFields(customFields.filter((f) => f.id !== id));
  };

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Informações Básicas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <DataField label="Nome Completo" value={emp.name} mode={mode} />
          <DataField label="CPF" value={emp.cpf} mode={mode} />
          <DataField label="RG" value="12.345.678-9" mode={mode} />
          <DataField label="Idade" value="32 anos" mode={mode} />
          <DataField label="Data de Nascimento" value="15/05/1991" mode={mode} type="date" />
          <DataField label="Local de Nascimento" value="São Paulo - SP" mode={mode} />
          <DataField label="Sexo" value="Feminino" mode={mode} options={['Feminino', 'Masculino', 'Outro']} />
          <DataField label="Nome da Mãe" value="Maria das Graças Silva" mode={mode} />
          <DataField label="Nome do Pai" value="João Batista Silva" mode={mode} />
          <DataField label="Cartão SUS" value="789 1234 5678 9012" mode={mode} />
          <DataField label="PIS" value="123.45678.90-1" mode={mode} />
          <DataField label="CTPS" value="1234567 Série 001-SP" mode={mode} />
        </div>
      </fieldset>

      <fieldset className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Endereço</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <DataField label="CEP" value="01234-567" mode={mode} />
          <div className="md:col-span-2">
            <DataField label="Logradouro" value="Avenida Paulista" mode={mode} />
          </div>
          <DataField label="Número" value="1000" mode={mode} />
          <DataField label="Complemento" value="Apto 123" mode={mode} />
          <DataField label="Bairro" value="Bela Vista" mode={mode} />
          <DataField label="Cidade" value="São Paulo" mode={mode} />
          <DataField label="Estado" value="SP" mode={mode} options={['SP', 'RJ', 'MG', 'ES', 'PR', 'SC', 'RS', 'Outros']} />
        </div>
      </fieldset>

      <fieldset className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Dados Bancários</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <DataField label="Banco" value="001 - Banco do Brasil" mode={mode} />
          <DataField label="Agência" value="1234-5" mode={mode} />
          <DataField label="Conta" value="123456-7" mode={mode} />
          <DataField label="Tipo de Conta" value="Conta Corrente" mode={mode} options={['Conta Corrente', 'Conta Poupança']} />
          <DataField label="Chave PIX" value={emp.cpf} mode={mode} />
        </div>
      </fieldset>

      <fieldset className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
          <h3 className="text-sm font-bold text-slate-800">Dependentes</h3>
          {mode === 'edit' && (
            <button onClick={addDependent} className="text-xs font-semibold text-pink-600 hover:text-pink-700 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Adicionar Dependente
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3">
          {dependents.map((dep) => (
            <div key={dep.id} className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex-1">
                <DataField label="Nome" value={dep.name} mode={mode} />
              </div>
              <div className="w-24">
                <DataField label="Idade" value={dep.age} mode={mode} />
              </div>
              <div className="flex-1">
                <DataField label="CPF" value={dep.cpf} mode={mode} />
              </div>
              {mode === 'edit' && (
                <button onClick={() => removeDependent(dep.id)} className="mt-4 text-slate-400 hover:text-rose-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {dependents.length === 0 && mode === 'view' && (
            <p className="text-sm text-slate-500">Nenhum dependente cadastrado.</p>
          )}
        </div>
      </fieldset>

      <fieldset className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Dados do Cargo & Contrato</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <DataField label="Departamento" value={emp.department} mode={mode} />
          <DataField label="Cargo" value={emp.position} mode={mode} options={[emp.position, 'Desenvolvedor Junior', 'Desenvolvedor Pleno', 'Desenvolvedor Sênior', 'Outro']} />

          <DataField
            label="Escala/Horário"
            value={emp.shiftId || ''}
            mode={mode}
            options={[
              { label: 'Sem escala definida', value: '' },
              ...shifts.map(s => ({ label: s.name, value: s.id }))
            ]}
            onChange={(e) => onFieldChange('shiftId', e.target.value)}
          />

          <DataField label="Salário Base" value="R$ 8.500,00" mode={mode} />
          <DataField label="Data de Admissão" value={emp.admissionDate} mode={mode} type="date" />
          <DataField label="Tipo de Contrato" value={emp.contract} mode={mode} options={['CLT', 'PJ', 'Estágio', 'Temporário']} />
        </div>
      </fieldset>

      <fieldset className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
          <h3 className="text-sm font-bold text-slate-800">Campos Personalizados</h3>
          {mode === 'edit' && (
            <button onClick={addCustomField} className="text-xs font-semibold text-pink-600 hover:text-pink-700 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Adicionar Campo Personalizado
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {customFields.map((field) => (
            <div key={field.id} className="relative group">
              {mode === 'edit' ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <DataField label={field.label} value={field.value} mode={mode} />
                  </div>
                  <button onClick={() => removeCustomField(field.id)} className="mt-4 text-slate-400 hover:text-rose-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <DataField label={field.label} value={field.value} mode={mode} />
              )}
            </div>
          ))}
          {customFields.length === 0 && mode === 'view' && (
            <p className="text-sm text-slate-500 col-span-2">Nenhum campo personalizado cadastrado.</p>
          )}
        </div>
      </fieldset>
    </div>
  );
}

function FinanceiroTab() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Salário Base Atual</span>
          <p className="text-2xl font-bold text-slate-800">R$ 8.500,00</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">+12%</span>
            <span className="text-xs text-slate-400">vs. último reajuste (Mar/2023)</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Média de Bônus (12m)</span>
          <p className="text-2xl font-bold text-slate-800">R$ 1.250,00</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">Variável</span>
            <span className="text-xs text-slate-400">Paga no mês seguinte</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Benefícios Deduzidos</span>
          <p className="text-2xl font-bold text-slate-800">R$ 485,00</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-slate-400">VT, VR e Plano de Saúde</span>
          </div>
        </div>
      </div>

      <fieldset className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Histórico Recente de Contracheques</h3>
        <div className="overflow-hidden border border-slate-100 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Mês/Ano</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Proventos</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Descontos</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Líquido</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Recibo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">Novembro / 2023</td>
                <td className="px-4 py-3 text-slate-600">R$ 9.750,00</td>
                <td className="px-4 py-3 text-rose-500">R$ 2.415,00</td>
                <td className="px-4 py-3 font-bold text-slate-800">R$ 7.335,00</td>
                <td className="px-4 py-3 text-center">
                  <button className="text-pink-600 hover:text-pink-700 font-medium text-xs">Baixar PDF</button>
                </td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">Outubro / 2023</td>
                <td className="px-4 py-3 text-slate-600">R$ 8.500,00</td>
                <td className="px-4 py-3 text-rose-500">R$ 2.050,00</td>
                <td className="px-4 py-3 font-bold text-slate-800">R$ 6.450,00</td>
                <td className="px-4 py-3 text-center">
                  <button className="text-pink-600 hover:text-pink-700 font-medium text-xs">Baixar PDF</button>
                </td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">Setembro / 2023</td>
                <td className="px-4 py-3 text-slate-600">R$ 9.100,00</td>
                <td className="px-4 py-3 text-rose-500">R$ 2.230,00</td>
                <td className="px-4 py-3 font-bold text-slate-800">R$ 6.870,00</td>
                <td className="px-4 py-3 text-center">
                  <button className="text-pink-600 hover:text-pink-700 font-medium text-xs">Baixar PDF</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </fieldset>
    </div>
  );
}

// ─── Employee View Modal ───────────────────────────────────────────────────────

function EmployeeViewModal({ emp, mode, onClose, shifts, onSave }: { emp: Employee; mode: 'view' | 'edit'; onClose: () => void; shifts: Shift[]; onSave: (updates: Partial<Employee>) => void }) {
  const [activeTab, setActiveTab] = useState<'dados' | 'financeiro' | 'saude' | 'atividades' | 'grupos' | 'historico' | 'fale'>('dados');
  const [editedEmp, setEditedEmp] = useState<Partial<Employee>>({});

  const handleFieldChange = (field: string, value: string) => {
    setEditedEmp(prev => ({ ...prev, [field]: value }));
  };
  const initials = emp.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  const TABS = [
    { id: 'dados', label: 'Dados' },
    { id: 'financeiro', label: 'Financeiro' },
    { id: 'saude', label: 'Saúde' },
    { id: 'atividades', label: 'Atividades' },
    { id: 'grupos', label: 'Grupos' },
    { id: 'historico', label: 'Histórico' },
    { id: 'fale', label: 'Fale com a ZIA' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800">
              {mode === 'view' ? 'Ficha do Colaborador' : 'Editar Colaborador'}
            </h2>
            <span className="px-2.5 py-1 text-xs font-semibold text-slate-500 bg-slate-100 rounded-lg">
              ID: {emp.id}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Info & Tabs */}
        <div className="px-6 pt-5 shrink-0">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-pink-100 flex items-center justify-center text-2xl font-bold text-pink-600 flex-shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">{emp.name}</p>
              <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                <span>{emp.position}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span>{emp.department}</span>
              </div>
              <span className={`inline-flex mt-2 items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[emp.status]}`}>
                {emp.status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 border-b border-slate-200 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                  activeTab === tab.id ? 'text-pink-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-600 rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50/50">
          {activeTab === 'dados' && <DadosTab emp={{...emp, ...editedEmp}} mode={mode} shifts={shifts} onFieldChange={handleFieldChange} />}
          {activeTab === 'financeiro' && <FinanceiroTab />}
          {/* Outras abas ficariam aqui */}
          {activeTab !== 'dados' && activeTab !== 'financeiro' && (
            <div className="text-center py-12 text-slate-400">Conteúdo da aba {activeTab} em desenvolvimento.</div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-white rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            {mode === 'edit' ? 'Cancelar' : 'Fechar'}
          </button>
          {mode === 'edit' && (
            <button
              onClick={() => { onSave(editedEmp); onClose(); }}
              className="px-4 py-2 text-sm text-white bg-pink-600 border border-transparent rounded-lg hover:bg-pink-700 font-medium"
            >
              Salvar Alterações
            </button>
          )}
        </div>
      </div>
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

function NewEmployeeModal({ onClose, onSave }: { onClose: () => void; onSave: (e: Employee) => void }) {
  const [step, setStep] = useState<FormStep>('pessoal');
  const [form, setForm] = useState<NewEmployeeForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<{ name?: boolean; cpf?: boolean }>({});

  const currentIdx = FORM_STEPS.findIndex((s) => s.id === step);
  const isFirst    = currentIdx === 0;
  const isLast     = currentIdx === FORM_STEPS.length - 1;
  const set        = (k: keyof NewEmployeeForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    const newErrors = {
      name: !form.name.trim(),
      cpf:  !form.cpf.trim(),
    };
    setErrors(newErrors);
    if (newErrors.name || newErrors.cpf) {
      // Navigate to step 1 so the user sees the errors
      setStep('pessoal');
      return;
    }
    onSave({
      id: `E${String(Date.now()).slice(-4)}`,
      name: form.name,
      cpf:  form.cpf,
      email: form.corpEmail || form.personalEmail || '—',
      position:      form.position || '—',
      department:    form.department || '—',
      admissionDate: form.admissionDate
        ? new Date(form.admissionDate).toLocaleDateString('pt-BR')
        : new Date().toLocaleDateString('pt-BR'),
      status:   'Ativo',
      contract: (form.contractType as ContractType) || 'CLT',
      workMode: (form.workMode as WorkMode) || 'Presencial',
      shiftId: null,
    });
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
              className="flex items-center gap-2 px-5 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium"
            >
              Salvar Funcionário
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
  const { employees, shifts, updateEmployee, addEmployee } = useHRContext();
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | 'Todos'>('Todos');
  const [showModal, setShowModal]   = useState(false);
  const [viewing, setViewing]       = useState<{emp: Employee, mode: 'view' | 'edit'} | null>(null);

  const [sortConfig, setSortConfig] = useState<{key: keyof Employee, direction: 'asc' | 'desc'} | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [openFilterMenu, setOpenFilterMenu] = useState<string | null>(null);

  const handleSort = (key: keyof Employee) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      setSortConfig(null);
      return;
    }
    setSortConfig({ key, direction });
  };

  const toggleColumnFilter = (columnKey: string, value: string) => {
    setColumnFilters((prev) => {
      const current = prev[columnKey] || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];

      if (updated.length === 0) {
        const { [columnKey]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [columnKey]: updated };
    });
  };

  const clearColumnFilter = (columnKey: string) => {
    setColumnFilters((prev) => {
      const { [columnKey]: _, ...rest } = prev;
      return rest;
    });
    setOpenFilterMenu(null);
  };

  const getUniqueValues = (columnKey: keyof Employee) => {
    return Array.from(new Set(employees.map(e => String(e[columnKey]))));
  };

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = e.name.toLowerCase().includes(q) ||
                        e.position.toLowerCase().includes(q) ||
                        e.department.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'Todos' || e.status === statusFilter;

    // Check column filters
    const matchColumnFilters = Object.entries(columnFilters).every(([key, values]) => {
      if (!values || values.length === 0) return true;
      return values.includes(String(e[key as keyof Employee]));
    });

    return matchSearch && matchStatus && matchColumnFilters;
  }).sort((a, b) => {
    if (!sortConfig) return 0;
    const aValue = a[sortConfig.key] || '';
    const bValue = b[sortConfig.key] || '';
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
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
    <div className="p-8 relative">
      {openFilterMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenFilterMenu(null)}
        />
      )}
      {showModal && (
        <NewEmployeeModal
          onClose={() => setShowModal(false)}
          onSave={(emp) => addEmployee(emp)}
        />
      )}
      {viewing && (
        <EmployeeViewModal
          emp={viewing.emp}
          mode={viewing.mode}
          onClose={() => setViewing(null)}
          shifts={shifts}
          onSave={(updates) => {
            updateEmployee(viewing.emp.id, updates);
            setViewing(null);
          }}
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
        <button
          onClick={() => setStatusFilter('Todos')}
          className={`text-left bg-white border border-slate-200 rounded-xl p-4 transition-all hover:shadow-md ${statusFilter === 'Todos' ? 'ring-2 ring-slate-400 ring-offset-2' : ''}`}
        >
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Total Ativo</p>
          <p className="text-3xl font-bold text-slate-800">{counts.total}</p>
        </button>
        <button
          onClick={() => setStatusFilter('Ativo')}
          className={`text-left bg-green-50 border border-green-100 rounded-xl p-4 transition-all hover:shadow-md ${statusFilter === 'Ativo' ? 'ring-2 ring-green-400 ring-offset-2' : ''}`}
        >
          <p className="text-xs text-green-600 font-semibold uppercase tracking-wider mb-1">Ativos</p>
          <p className="text-3xl font-bold text-green-700">{counts.ativo}</p>
        </button>
        <button
          onClick={() => setStatusFilter('Férias')}
          className={`text-left bg-blue-50 border border-blue-100 rounded-xl p-4 transition-all hover:shadow-md ${statusFilter === 'Férias' ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}
        >
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">Em Férias</p>
          <p className="text-3xl font-bold text-blue-700">{counts.ferias}</p>
        </button>
        <button
          onClick={() => setStatusFilter('Afastado')}
          className={`text-left bg-amber-50 border border-amber-100 rounded-xl p-4 transition-all hover:shadow-md ${statusFilter === 'Afastado' ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}
        >
          <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-1">Afastados</p>
          <p className="text-3xl font-bold text-amber-700">{counts.afastado}</p>
        </button>
        <button
          onClick={() => setStatusFilter('Experiência')}
          className={`text-left bg-purple-50 border border-purple-100 rounded-xl p-4 transition-all hover:shadow-md ${statusFilter === 'Experiência' ? 'ring-2 ring-purple-400 ring-offset-2' : ''}`}
        >
          <p className="text-xs text-purple-600 font-semibold uppercase tracking-wider mb-1">Experiência</p>
          <p className="text-3xl font-bold text-purple-700">{counts.experiencia}</p>
        </button>
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
        <div className="overflow-x-auto relative">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-left">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-800 transition-colors">
                    Colaborador
                    {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => handleSort('cpf')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-800 transition-colors">
                    CPF
                    {sortConfig?.key === 'cpf' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left relative">
                  <div className="flex items-center justify-between">
                    <button onClick={() => handleSort('position')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-800 transition-colors">
                      Cargo
                      {sortConfig?.key === 'position' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                    </button>
                    <button onClick={() => setOpenFilterMenu(openFilterMenu === 'position' ? null : 'position')} className={`p-1 rounded hover:bg-slate-100 transition-colors ${columnFilters['position'] ? 'text-pink-600' : 'text-slate-400'}`}>
                      <Filter className="w-3 h-3" />
                    </button>
                  </div>
                  {openFilterMenu === 'position' && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 text-sm font-normal normal-case tracking-normal">
                      <div className="max-h-48 overflow-y-auto space-y-1 mb-2">
                        {getUniqueValues('position').map(val => (
                          <label key={val} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                            <input type="checkbox" checked={columnFilters['position']?.includes(val) || false} onChange={() => toggleColumnFilter('position', val)} className="rounded text-pink-600 focus:ring-pink-500" />
                            <span className="text-slate-700 truncate">{val}</span>
                          </label>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <button onClick={() => clearColumnFilter('position')} className="w-full text-center text-xs text-slate-500 hover:text-slate-800 py-1 font-medium transition-colors">Limpar Filtro</button>
                      </div>
                    </div>
                  )}
                </th>
                <th className="px-4 py-3 text-left relative">
                  <div className="flex items-center justify-between">
                    <button onClick={() => handleSort('department')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-800 transition-colors">
                      Departamento
                      {sortConfig?.key === 'department' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                    </button>
                    <button onClick={() => setOpenFilterMenu(openFilterMenu === 'department' ? null : 'department')} className={`p-1 rounded hover:bg-slate-100 transition-colors ${columnFilters['department'] ? 'text-pink-600' : 'text-slate-400'}`}>
                      <Filter className="w-3 h-3" />
                    </button>
                  </div>
                  {openFilterMenu === 'department' && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 text-sm font-normal normal-case tracking-normal">
                      <div className="max-h-48 overflow-y-auto space-y-1 mb-2">
                        {getUniqueValues('department').map(val => (
                          <label key={val} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                            <input type="checkbox" checked={columnFilters['department']?.includes(val) || false} onChange={() => toggleColumnFilter('department', val)} className="rounded text-pink-600 focus:ring-pink-500" />
                            <span className="text-slate-700 truncate">{val}</span>
                          </label>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <button onClick={() => clearColumnFilter('department')} className="w-full text-center text-xs text-slate-500 hover:text-slate-800 py-1 font-medium transition-colors">Limpar Filtro</button>
                      </div>
                    </div>
                  )}
                </th>
                <th className="px-4 py-3 text-left relative">
                  <div className="flex items-center justify-between">
                    <button onClick={() => handleSort('contract')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-800 transition-colors">
                      Contrato
                      {sortConfig?.key === 'contract' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                    </button>
                    <button onClick={() => setOpenFilterMenu(openFilterMenu === 'contract' ? null : 'contract')} className={`p-1 rounded hover:bg-slate-100 transition-colors ${columnFilters['contract'] ? 'text-pink-600' : 'text-slate-400'}`}>
                      <Filter className="w-3 h-3" />
                    </button>
                  </div>
                  {openFilterMenu === 'contract' && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 text-sm font-normal normal-case tracking-normal">
                      <div className="max-h-48 overflow-y-auto space-y-1 mb-2">
                        {getUniqueValues('contract').map(val => (
                          <label key={val} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                            <input type="checkbox" checked={columnFilters['contract']?.includes(val) || false} onChange={() => toggleColumnFilter('contract', val)} className="rounded text-pink-600 focus:ring-pink-500" />
                            <span className="text-slate-700 truncate">{val}</span>
                          </label>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <button onClick={() => clearColumnFilter('contract')} className="w-full text-center text-xs text-slate-500 hover:text-slate-800 py-1 font-medium transition-colors">Limpar Filtro</button>
                      </div>
                    </div>
                  )}
                </th>
                <th className="px-4 py-3 text-left relative">
                  <div className="flex items-center justify-between">
                    <button onClick={() => handleSort('workMode')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-800 transition-colors">
                      Modalidade
                      {sortConfig?.key === 'workMode' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                    </button>
                    <button onClick={() => setOpenFilterMenu(openFilterMenu === 'workMode' ? null : 'workMode')} className={`p-1 rounded hover:bg-slate-100 transition-colors ${columnFilters['workMode'] ? 'text-pink-600' : 'text-slate-400'}`}>
                      <Filter className="w-3 h-3" />
                    </button>
                  </div>
                  {openFilterMenu === 'workMode' && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 text-sm font-normal normal-case tracking-normal">
                      <div className="max-h-48 overflow-y-auto space-y-1 mb-2">
                        {getUniqueValues('workMode').map(val => (
                          <label key={val} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                            <input type="checkbox" checked={columnFilters['workMode']?.includes(val) || false} onChange={() => toggleColumnFilter('workMode', val)} className="rounded text-pink-600 focus:ring-pink-500" />
                            <span className="text-slate-700 truncate">{val}</span>
                          </label>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <button onClick={() => clearColumnFilter('workMode')} className="w-full text-center text-xs text-slate-500 hover:text-slate-800 py-1 font-medium transition-colors">Limpar Filtro</button>
                      </div>
                    </div>
                  )}
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => handleSort('admissionDate')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-800 transition-colors">
                    Admissão
                    {sortConfig?.key === 'admissionDate' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left relative">
                  <div className="flex items-center justify-between">
                    <button onClick={() => handleSort('status')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-800 transition-colors">
                      Status
                      {sortConfig?.key === 'status' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                    </button>
                    <button onClick={() => setOpenFilterMenu(openFilterMenu === 'status' ? null : 'status')} className={`p-1 rounded hover:bg-slate-100 transition-colors ${columnFilters['status'] ? 'text-pink-600' : 'text-slate-400'}`}>
                      <Filter className="w-3 h-3" />
                    </button>
                  </div>
                  {openFilterMenu === 'status' && (
                    <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 text-sm font-normal normal-case tracking-normal">
                      <div className="max-h-48 overflow-y-auto space-y-1 mb-2">
                        {getUniqueValues('status').map(val => (
                          <label key={val} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                            <input type="checkbox" checked={columnFilters['status']?.includes(val) || false} onChange={() => toggleColumnFilter('status', val)} className="rounded text-pink-600 focus:ring-pink-500" />
                            <span className="text-slate-700 truncate">{val}</span>
                          </label>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <button onClick={() => clearColumnFilter('status')} className="w-full text-center text-xs text-slate-500 hover:text-slate-800 py-1 font-medium transition-colors">Limpar Filtro</button>
                      </div>
                    </div>
                  )}
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((emp, idx) => (
                <tr
                  key={emp.id}
                  onClick={() => setViewing({ emp, mode: 'view' })}
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
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setViewing({ emp, mode: 'view' }); }}
                        className="text-slate-400 hover:text-pink-600 transition-colors"
                        title="Ver ficha"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setViewing({ emp, mode: 'edit' }); }}
                        className="text-slate-400 hover:text-pink-600 transition-colors"
                        title="Editar ficha"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
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

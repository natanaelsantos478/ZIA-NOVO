import { useState } from 'react';
import {
  Plus, Search, MoreHorizontal, CheckCircle,
  Clock, AlertCircle, Users, FileText,
} from 'lucide-react';

interface Admission {
  id: string;
  name: string;
  cpf: string;
  role: string;
  dept: string;
  contractType: 'CLT' | 'PJ' | 'Estágio';
  startDate: string;
  status: 'Documentação Pendente' | 'Em Análise' | 'Aprovada' | 'Rascunho';
  completeness: number;
}

const ADMISSIONS: Admission[] = [
  { id: 'A001', name: 'Ana Beatriz Souza',    cpf: '***.***.123-**', role: 'Analista de RH Pleno',           dept: 'Recursos Humanos',  contractType: 'CLT',    startDate: '2025-02-10', status: 'Aprovada',               completeness: 100 },
  { id: 'A002', name: 'Carlos Eduardo Lima',  cpf: '***.***.456-**', role: 'Desenvolvedor Full Stack Sênior', dept: 'TI – Dev',          contractType: 'CLT',    startDate: '2025-02-03', status: 'Aprovada',               completeness: 100 },
  { id: 'A003', name: 'Fernanda Rocha',        cpf: '***.***.789-**', role: 'Gerente de Qualidade',           dept: 'Qualidade (SGQ)',    contractType: 'CLT',    startDate: '2025-01-27', status: 'Aprovada',               completeness: 100 },
  { id: 'A004', name: 'Guilherme Martins',     cpf: '***.***.321-**', role: 'Executivo de Vendas',            dept: 'Comercial',         contractType: 'CLT',    startDate: '2025-03-03', status: 'Documentação Pendente',  completeness: 65  },
  { id: 'A005', name: 'Isabela Ferreira',      cpf: '***.***.654-**', role: 'Designer UX/UI',                 dept: 'Produto',           contractType: 'PJ',     startDate: '2025-03-10', status: 'Em Análise',             completeness: 88  },
  { id: 'A006', name: 'Lucas Araújo',          cpf: '',               role: 'Estagiário de Marketing',         dept: 'Marketing',         contractType: 'Estágio', startDate: '2025-03-17', status: 'Rascunho',              completeness: 30  },
];

const STATUS_CONFIG: Record<Admission['status'], { color: string; icon: React.ElementType }> = {
  'Aprovada':               { color: 'bg-green-100 text-green-700',  icon: CheckCircle  },
  'Em Análise':             { color: 'bg-blue-100 text-blue-700',    icon: Clock        },
  'Documentação Pendente':  { color: 'bg-amber-100 text-amber-700',  icon: AlertCircle  },
  'Rascunho':               { color: 'bg-slate-100 text-slate-600',  icon: FileText     },
};

const CONTRACT_BADGE: Record<string, string> = {
  'CLT':     'bg-indigo-100 text-indigo-700',
  'PJ':      'bg-purple-100 text-purple-700',
  'Estágio': 'bg-teal-100 text-teal-700',
};

const FORM_SECTIONS = [
  {
    title: 'Dados Pessoais',
    fields: [
      { label: 'Nome Completo *',           type: 'text',   placeholder: 'Nome completo conforme RG'   },
      { label: 'CPF *',                      type: 'text',   placeholder: '000.000.000-00'              },
      { label: 'RG / Órgão Emissor *',       type: 'text',   placeholder: 'Ex: 12.345.678-9 SSP/SP'    },
      { label: 'Data de Nascimento *',       type: 'date',   placeholder: ''                            },
      { label: 'Sexo',                       type: 'select', options: ['Masculino', 'Feminino', 'Não informar'] },
      { label: 'Estado Civil',               type: 'select', options: ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)'] },
      { label: 'Nacionalidade',              type: 'text',   placeholder: 'Brasileiro(a)'              },
      { label: 'PIS/PASEP',                  type: 'text',   placeholder: '000.00000.00-0'             },
    ],
  },
  {
    title: 'Endereço',
    fields: [
      { label: 'CEP *',          type: 'text',   placeholder: '00000-000'    },
      { label: 'Logradouro *',   type: 'text',   placeholder: 'Rua, Av., ...' },
      { label: 'Número',         type: 'text',   placeholder: 'Ex: 100'      },
      { label: 'Complemento',    type: 'text',   placeholder: 'Apto, Bloco...' },
      { label: 'Bairro *',       type: 'text',   placeholder: 'Bairro'       },
      { label: 'Cidade *',       type: 'text',   placeholder: 'Cidade'       },
      { label: 'Estado *',       type: 'text',   placeholder: 'UF'           },
    ],
  },
  {
    title: 'Contrato e Cargo',
    fields: [
      { label: 'Cargo *',             type: 'select', options: ['Selecionar...', 'Desenvolvedor Full Stack Pleno', 'Analista de RH Pleno', 'Gerente de Qualidade', 'Designer UX/UI'] },
      { label: 'Departamento *',      type: 'select', options: ['Selecionar...', 'TI – Desenvolvimento', 'Recursos Humanos', 'Qualidade', 'Produto'] },
      { label: 'Tipo de Contrato *',  type: 'select', options: ['CLT', 'PJ', 'Estágio', 'Temporário'] },
      { label: 'Data de Admissão *',  type: 'date',   placeholder: '' },
      { label: 'Salário Base (R$) *', type: 'text',   placeholder: 'Ex: 8.500,00' },
      { label: 'Jornada Semanal *',   type: 'select', options: ['44h', '40h', '30h', '20h'] },
    ],
  },
  {
    title: 'Dados Bancários',
    fields: [
      { label: 'Banco *',       type: 'text',   placeholder: 'Ex: Banco do Brasil (001)' },
      { label: 'Agência *',     type: 'text',   placeholder: '0000-0' },
      { label: 'Conta *',       type: 'text',   placeholder: '000000-0' },
      { label: 'Tipo de Conta', type: 'select', options: ['Corrente', 'Poupança'] },
      { label: 'Chave PIX',     type: 'text',   placeholder: 'CPF, e-mail ou telefone' },
    ],
  },
];

function NewAdmissionForm({ onCancel }: { onCancel: () => void }) {
  const [section, setSection] = useState(0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-slate-800 text-lg">Nova Admissão</h2>
        <button onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {FORM_SECTIONS.map((s, i) => (
          <button
            key={s.title}
            onClick={() => setSection(i)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
              section === i ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {i + 1}. {s.title}
          </button>
        ))}
      </div>

      {/* Form fields */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {FORM_SECTIONS[section].fields.map((field) => (
          <div key={field.label}>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">{field.label}</label>
            {field.type === 'select' ? (
              <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 bg-white">
                {field.options?.map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type={field.type}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="text-xs text-slate-400">
          Seção {section + 1} de {FORM_SECTIONS.length}
        </div>
        <div className="flex gap-2">
          {section > 0 && (
            <button onClick={() => setSection(section - 1)} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium">
              ← Anterior
            </button>
          )}
          {section < FORM_SECTIONS.length - 1 ? (
            <button onClick={() => setSection(section + 1)} className="px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
              Próximo →
            </button>
          ) : (
            <button className="px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
              Salvar e Enviar para Aprovação
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Admission() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const filtered = ADMISSIONS.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.role.toLowerCase().includes(search.toLowerCase()),
  );

  const stats = [
    { label: 'Total de Admissões',   value: ADMISSIONS.length.toString(),                                           icon: Users,      color: 'text-pink-600 bg-pink-50'  },
    { label: 'Aprovadas',            value: ADMISSIONS.filter((a) => a.status === 'Aprovada').length.toString(),    icon: CheckCircle, color: 'text-green-600 bg-green-50' },
    { label: 'Pendências',           value: ADMISSIONS.filter((a) => a.status !== 'Aprovada').length.toString(),    icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
    { label: 'Este Mês',             value: '3',                                                                     icon: FileText,   color: 'text-blue-600 bg-blue-50'  },
  ];

  if (showForm) {
    return (
      <div className="p-8">
        <NewAdmissionForm onCancel={() => setShowForm(false)} />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admissão de Funcionário</h1>
          <p className="text-slate-500 text-sm mt-1">Cadastro digital com coleta e validação de documentos</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium"
        >
          <Plus className="w-4 h-4" /> Nova Admissão
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500">{s.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Registros de Admissão</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 w-56"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Colaborador</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cargo / Depto.</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contrato</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Início</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Preenchimento</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((a) => {
                const cfg = STATUS_CONFIG[a.status];
                const Icon = cfg.icon;
                return (
                  <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {a.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{a.name}</p>
                          {a.cpf && <p className="text-xs text-slate-400">{a.cpf}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-700 text-xs">{a.role}</p>
                      <p className="text-xs text-slate-400">{a.dept}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CONTRACT_BADGE[a.contractType]}`}>
                        {a.contractType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{a.startDate}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${a.completeness === 100 ? 'bg-green-500' : a.completeness >= 70 ? 'bg-amber-400' : 'bg-rose-400'}`}
                            style={{ width: `${a.completeness}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{a.completeness}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        <Icon className="w-3 h-3" />{a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-slate-400 hover:text-slate-600">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">Nenhuma admissão encontrada.</div>
          )}
        </div>
      </div>
    </div>
  );
}

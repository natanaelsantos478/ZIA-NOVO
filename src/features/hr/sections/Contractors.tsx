import { useState } from 'react';
import {
  Plus, Search, MoreHorizontal, CheckCircle,
  Clock, AlertCircle, Upload, FileText,
  Building2, Users, DollarSign, Calendar,
} from 'lucide-react';

interface Contractor {
  id: string;
  name: string;
  company: string;
  cnpj: string;
  type: 'PJ' | 'Freelancer' | 'Consultoria';
  role: string;
  dept: string;
  rate: string;
  contractStart: string;
  contractEnd: string;
  nfStatus: 'Em Dia' | 'Pendente' | 'Vencida' | 'Aguardando NF';
  contractStatus: 'Ativo' | 'Encerrado' | 'Em Renovação';
}

const CONTRACTORS: Contractor[] = [
  {
    id: 'T001',
    name: 'Vinícius Carvalho',
    company: 'VC Digital LTDA',
    cnpj: '12.345.678/0001-90',
    type: 'PJ',
    role: 'Desenvolvedor React Sênior',
    dept: 'TI – Desenvolvimento',
    rate: 'R$ 18.000/mês',
    contractStart: '2024-06-01',
    contractEnd: '2025-05-31',
    nfStatus: 'Em Dia',
    contractStatus: 'Ativo',
  },
  {
    id: 'T002',
    name: 'Priya Consultores',
    company: 'Priya Solutions ME',
    cnpj: '98.765.432/0001-12',
    type: 'Consultoria',
    role: 'Consultora de Processos (BPMN)',
    dept: 'Qualidade (SGQ)',
    rate: 'R$ 12.500/mês',
    contractStart: '2024-09-01',
    contractEnd: '2025-02-28',
    nfStatus: 'Pendente',
    contractStatus: 'Em Renovação',
  },
  {
    id: 'T003',
    name: 'Rafael Nunes',
    company: 'RN Dados ME',
    cnpj: '55.123.456/0001-77',
    type: 'PJ',
    role: 'Analista de BI / Power BI',
    dept: 'TI – Dados',
    rate: 'R$ 9.800/mês',
    contractStart: '2024-11-01',
    contractEnd: '2025-10-31',
    nfStatus: 'Em Dia',
    contractStatus: 'Ativo',
  },
  {
    id: 'T004',
    name: 'Studio MKT Criativo',
    company: 'Studio MKT EIRELI',
    cnpj: '44.987.654/0001-33',
    type: 'Consultoria',
    role: 'Agência de Marketing Digital',
    dept: 'Marketing',
    rate: 'R$ 8.000/mês',
    contractStart: '2024-01-01',
    contractEnd: '2024-12-31',
    nfStatus: 'Vencida',
    contractStatus: 'Encerrado',
  },
  {
    id: 'T005',
    name: 'Beatriz Fontana',
    company: 'BF Design ME',
    cnpj: '22.333.444/0001-55',
    type: 'Freelancer',
    role: 'Designer Gráfico',
    dept: 'Marketing',
    rate: 'R$ 180/hora',
    contractStart: '2025-01-15',
    contractEnd: '2025-04-15',
    nfStatus: 'Aguardando NF',
    contractStatus: 'Ativo',
  },
];

interface NFUpload {
  contractorId: string;
  month: string;
  amount: string;
  file: string;
}

const NF_HISTORY: NFUpload[] = [
  { contractorId: 'T001', month: 'Jan/2025', amount: 'R$ 18.000,00', file: 'NF_VC_Jan25.xml' },
  { contractorId: 'T001', month: 'Fev/2025', amount: 'R$ 18.000,00', file: 'NF_VC_Fev25.xml' },
  { contractorId: 'T003', month: 'Jan/2025', amount: 'R$ 9.800,00',  file: 'NF_RN_Jan25.pdf' },
  { contractorId: 'T003', month: 'Fev/2025', amount: 'R$ 9.800,00',  file: 'NF_RN_Fev25.pdf' },
];

const NF_STATUS_CONFIG: Record<Contractor['nfStatus'], { color: string; icon: React.ElementType }> = {
  'Em Dia':        { color: 'bg-green-100 text-green-700',  icon: CheckCircle  },
  'Pendente':      { color: 'bg-amber-100 text-amber-700',  icon: Clock        },
  'Vencida':       { color: 'bg-rose-100 text-rose-700',    icon: AlertCircle  },
  'Aguardando NF': { color: 'bg-blue-100 text-blue-700',    icon: FileText     },
};

const CONTRACT_STATUS_CONFIG: Record<Contractor['contractStatus'], string> = {
  'Ativo':         'bg-green-100 text-green-700',
  'Encerrado':     'bg-slate-100 text-slate-600',
  'Em Renovação':  'bg-amber-100 text-amber-700',
};

const TYPE_BADGE: Record<string, string> = {
  'PJ':          'bg-indigo-100 text-indigo-700',
  'Freelancer':  'bg-purple-100 text-purple-700',
  'Consultoria': 'bg-teal-100 text-teal-700',
};

function NFModal({ contractor, onClose }: { contractor: Contractor; onClose: () => void }) {
  const contractorNFs = NF_HISTORY.filter((nf) => nf.contractorId === contractor.id);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800">Notas Fiscais – {contractor.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{contractor.company} · {contractor.cnpj}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-medium">Fechar</button>
        </div>

        <div className="p-6">
          {/* Upload area */}
          <div className="border-2 border-dashed border-pink-200 rounded-xl p-6 flex flex-col items-center justify-center bg-pink-50/40 mb-6 cursor-pointer hover:bg-pink-50/70 transition-colors">
            <Upload className="w-8 h-8 text-pink-400 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Enviar Nota Fiscal</p>
            <p className="text-xs text-slate-400 mt-1">Arraste o arquivo ou clique para selecionar (.xml, .pdf)</p>
            <p className="text-xs text-slate-400 mt-0.5">Competência: Fevereiro/2025 · Valor esperado: {contractor.rate}</p>
          </div>

          {/* NF History */}
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Histórico de NFs</h4>
          {contractorNFs.length > 0 ? (
            <div className="space-y-2">
              {contractorNFs.map((nf, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">{nf.file}</p>
                      <p className="text-xs text-slate-400">{nf.month}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800">{nf.amount}</p>
                    <span className="inline-flex items-center gap-0.5 text-xs text-green-600">
                      <CheckCircle className="w-3 h-3" /> Aprovada
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-sm">
              Nenhuma NF registrada para este terceiro.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Contractors() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [nfModal, setNfModal] = useState<Contractor | null>(null);

  const filtered = CONTRACTORS.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.role.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'Todos' || c.contractStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = [
    { label: 'Terceiros Ativos',   value: CONTRACTORS.filter((c) => c.contractStatus === 'Ativo').length.toString(),   icon: Users,      color: 'text-pink-600 bg-pink-50'   },
    { label: 'Empresas / CNPJs',   value: CONTRACTORS.length.toString(),                                               icon: Building2,  color: 'text-blue-600 bg-blue-50'   },
    { label: 'NFs Pendentes',      value: CONTRACTORS.filter((c) => c.nfStatus === 'Pendente' || c.nfStatus === 'Aguardando NF').length.toString(), icon: FileText, color: 'text-amber-600 bg-amber-50' },
    { label: 'Gasto Mensal Est.',  value: 'R$ 48.300',                                                                 icon: DollarSign, color: 'text-green-600 bg-green-50' },
  ];

  return (
    <div className="p-8">
      {nfModal && <NFModal contractor={nfModal} onClose={() => setNfModal(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Terceiros</h1>
          <p className="text-slate-500 text-sm mt-1">PJ, freelancers e consultorias com controle de NFs e contratos</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
          <Plus className="w-4 h-4" /> Novo Terceiro
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

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar terceiro, empresa ou função..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 w-full"
          />
        </div>
        <div className="flex gap-1.5">
          {['Todos', 'Ativo', 'Em Renovação', 'Encerrado'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterStatus === s ? 'bg-pink-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Prestador</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Função / Depto.</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Vigência</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">NF</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contrato</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((c) => {
                const nfCfg = NF_STATUS_CONFIG[c.nfStatus];
                const NFIcon = nfCfg.icon;
                return (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.company}</p>
                      <p className="text-xs font-mono text-slate-400">{c.cnpj}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700 font-medium">{c.role}</p>
                      <p className="text-xs text-slate-400">{c.dept}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[c.type]}`}>
                        {c.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700 text-sm">{c.rate}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        <span>{c.contractStart}</span>
                        <span>→</span>
                        <span className={new Date(c.contractEnd) < new Date() ? 'text-rose-500 font-medium' : ''}>{c.contractEnd}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setNfModal(c)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${nfCfg.color}`}
                      >
                        <NFIcon className="w-3 h-3" />{c.nfStatus}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CONTRACT_STATUS_CONFIG[c.contractStatus]}`}>
                        {c.contractStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-slate-400 hover:text-slate-600 transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">Nenhum terceiro encontrado.</div>
          )}
        </div>
      </div>
    </div>
  );
}

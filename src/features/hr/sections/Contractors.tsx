/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import {
  Plus, Search, MoreHorizontal, CheckCircle,
  Clock, AlertCircle, Upload, FileText,
  Building2, Users, DollarSign, Calendar
} from 'lucide-react';
import { getContractors, createContractor } from '../../../lib/hr';

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

interface NFUpload {
  contractorId: string;
  month: string;
  amount: string;
  file: string;
}

const NF_HISTORY: NFUpload[] = [];

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

function NewContractorForm({ onClose, onSave }: { onClose: () => void, onSave: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    cnpj: '',
    type: 'PJ',
    role: '',
    dept: '',
    rate: '',
    contractStart: '',
    contractEnd: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createContractor({
        name: formData.name,
        company: formData.company,
        cnpj: formData.cnpj,
        type: formData.type,
        role: formData.role,
        dept: formData.dept,
        rate: formData.rate,
        contract_start: formData.contractStart,
        contract_end: formData.contractEnd,
        nf_status: 'Aguardando NF',
        contract_status: 'Ativo',
      });
      onSave();
      onClose();
    } catch (err) {
      console.error('Error creating contractor:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800">Novo Terceiro</h3>
            <p className="text-xs text-slate-500 mt-0.5">Cadastrar novo prestador de serviço</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-medium">Fechar</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome do Prestador *</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Empresa *</label>
              <input required type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">CNPJ *</label>
              <input required type="text" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo *</label>
              <select required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30">
                <option value="PJ">PJ</option>
                <option value="Freelancer">Freelancer</option>
                <option value="Consultoria">Consultoria</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Função *</label>
              <input required type="text" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Departamento *</label>
              <input required type="text" value={formData.dept} onChange={e => setFormData({...formData, dept: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Valor (R$) *</label>
              <input required type="text" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Início do Contrato *</label>
              <input required type="date" value={formData.contractStart} onChange={e => setFormData({...formData, contractStart: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fim do Contrato *</label>
              <input required type="date" value={formData.contractEnd} onChange={e => setFormData({...formData, contractEnd: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">Salvar Terceiro</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Contractors() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [nfModal, setNfModal] = useState<Contractor | null>(null);
  const [showNewContractor, setShowNewContractor] = useState(false);
  const [contractors, setContractors] = useState<Contractor[]>([]);

  const fetchContractors = async () => {
    try {
      const data = await getContractors();
      setContractors(data.map(item => ({
        id: item.id,
        name: item.name,
        company: item.company ?? '',
        cnpj: item.cnpj ?? '',
        type: item.type as Contractor['type'],
        role: item.role ?? '',
        dept: item.dept ?? '',
        rate: item.rate ?? '',
        contractStart: item.contract_start ?? '',
        contractEnd: item.contract_end ?? '',
        nfStatus: item.nf_status as Contractor['nfStatus'],
        contractStatus: item.contract_status as Contractor['contractStatus'],
      })));
    } catch (err) {
      console.error('Error fetching contractors:', err);
    }
  };

  useEffect(() => {
    fetchContractors();
  }, []);

  const filtered = contractors.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.role.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'Todos' || c.contractStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = [
    { label: 'Terceiros Ativos',   value: contractors.filter((c) => c.contractStatus === 'Ativo').length.toString(),   icon: Users,      color: 'text-pink-600 bg-pink-50'   },
    { label: 'Empresas / CNPJs',   value: contractors.length.toString(),                                               icon: Building2,  color: 'text-blue-600 bg-blue-50'   },
    { label: 'NFs Pendentes',      value: contractors.filter((c) => c.nfStatus === 'Pendente' || c.nfStatus === 'Aguardando NF').length.toString(), icon: FileText, color: 'text-amber-600 bg-amber-50' },
    { label: 'Gasto Mensal Est.',  value: 'R$ 48.300',                                                                 icon: DollarSign, color: 'text-green-600 bg-green-50' },
  ];

  return (
    <div className="p-8">
      {nfModal && <NFModal contractor={nfModal} onClose={() => setNfModal(null)} />}
      {showNewContractor && <NewContractorForm onClose={() => setShowNewContractor(false)} onSave={() => fetchContractors()} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Terceiros</h1>
          <p className="text-slate-500 text-sm mt-1">PJ, freelancers e consultorias com controle de NFs e contratos</p>
        </div>
        <button onClick={() => setShowNewContractor(true)} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
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

import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, MoreVertical, Filter, Download, Activity } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

// Define interface for data items to avoid 'any'
interface RecordItem {
  id: string;
  status: string;
  date: string;
  description: string;
  value: string;
}

export default function FallbackView() {
  const { currentView, config } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dataList, setDataList] = useState<RecordItem[]>([]);

  const th = {
    bg: `bg-${config.primaryColor}-600`,
    text: `text-${config.primaryColor}-600`,
    btnHover: `hover:bg-${config.primaryColor}-700`
  };

  // Formata o ID da view para um título legível (ex: hr_payroll -> Hr Payroll)
  const viewTitle = currentView
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Gera dados mockados dinâmicos sempre que a view mudar
  useEffect(() => {
    const mockData: RecordItem[] = Array.from({ length: 8 }).map((_, i) => ({
      id: `REG-${Math.floor(Math.random() * 10000)}`,
      status: i % 3 === 0 ? 'Pendente' : 'Ativo',
      date: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toLocaleDateString('pt-BR'),
      description: `Registro automático para ${viewTitle} #${i + 1}`,
      value: `R$ ${(Math.random() * 5000).toFixed(2)}`
    }));
    // eslint-disable-next-line
    setDataList(mockData);
    setSearchTerm('');
  }, [currentView, viewTitle]);

  const filteredData = useMemo(() => {
    return dataList.filter(item =>
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [dataList, searchTerm]);

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: RecordItem = {
      id: `REG-NOVO-${Math.floor(Math.random() * 1000)}`,
      status: 'Ativo',
      date: new Date().toLocaleDateString('pt-BR'),
      description: `Novo item inserido em ${viewTitle}`,
      value: `R$ 0,00`
    };
    setDataList([newRecord, ...dataList]);
    setIsModalOpen(false);
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-300">

      {/* HEADER DE AÇÕES */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{viewTitle}</h2>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Gestão de Registros</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 ${th.bg} ${th.btnHover} text-white text-sm font-bold rounded-xl transition-colors shadow-md`}
          >
            <Plus className="w-4 h-4" /> Novo Registro
          </button>
        </div>
      </div>

      {/* KPIS DINÂMICOS */}
      <div className="grid grid-cols-3 gap-4 mb-6 shrink-0">
        {[
          { label: 'Total de Registros', val: dataList.length, color: 'text-slate-800' },
          { label: 'Ativos / Regulares', val: dataList.filter(d => d.status === 'Ativo').length, color: 'text-emerald-600' },
          { label: 'Pendências', val: dataList.filter(d => d.status === 'Pendente').length, color: 'text-amber-500' }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{kpi.label}</p>
              <p className={`text-3xl font-black ${kpi.color}`}>{kpi.val}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
              <Activity className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        ))}
      </div>

      {/* TABELA DE DADOS */}
      <div className="bg-white border border-slate-200 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-sm">
        {/* Barra de Pesquisa */}
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar registros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-bold">
            <Filter className="w-4 h-4" /> Filtros
          </button>
        </div>

        {/* Scroll da Tabela */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Código ID</th>
                <th className="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Descrição</th>
                <th className="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Data</th>
                <th className="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Valor / Métrica</th>
                <th className="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                <th className="py-3 px-6 border-b border-slate-100"></th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 border-b border-slate-50 transition-colors group">
                  <td className="py-3 px-6 text-xs font-mono text-slate-500">{row.id}</td>
                  <td className="py-3 px-6 text-sm font-bold text-slate-700">{row.description}</td>
                  <td className="py-3 px-6 text-sm text-slate-500">{row.date}</td>
                  <td className="py-3 px-6 text-sm font-medium text-slate-800">{row.value}</td>
                  <td className="py-3 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${row.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-right">
                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors opacity-0 group-hover:opacity-100">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">Nenhum registro encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CRIAÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className={`px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50`}>
              <h3 className="font-bold text-slate-800 text-lg">Novo em {viewTitle}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 font-bold text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleAddNew} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Descrição</label>
                  <input type="text" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Insira o detalhamento..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Métrica</label>
                    <input type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="R$ 0,00" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Status</label>
                    <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option>Ativo</option>
                      <option>Pendente</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex gap-3 justify-end">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" className={`px-5 py-2.5 text-sm font-bold text-white ${th.bg} ${th.btnHover} rounded-xl transition-colors shadow-md`}>Salvar Registro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

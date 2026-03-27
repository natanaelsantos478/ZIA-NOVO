// ERP — Pedido de Demonstração
import { useState, useEffect } from 'react';
import { Package, Plus, X, CheckCircle, AlertCircle, Search, RefreshCw } from 'lucide-react';
import { getPedidos } from '../../../lib/erp';

interface ItemDemo {
  id: string;
  produto: string;
  quantidade: number;
}

interface Demo {
  id: string;
  numero: string;
  cliente: string;
  contato: string;
  dataSaida: string;
  dataRetorno: string;
  status: 'PENDENTE' | 'ATIVO' | 'DEVOLVIDO' | 'CONVERTIDO' | 'PERDIDO';
  observacoes: string;
  itens: ItemDemo[];
}

const STATUS_BADGE: Record<string, string> = {
  PENDENTE:   'bg-slate-100 text-slate-600',
  ATIVO:      'bg-blue-100 text-blue-700',
  DEVOLVIDO:  'bg-yellow-100 text-yellow-700',
  CONVERTIDO: 'bg-green-100 text-green-700',
  PERDIDO:    'bg-red-100 text-red-700',
};

export default function PedidoDemonstracao() {
  const [aba, setAba] = useState<'lista' | 'novo'>('lista');
  const [demos, setDemos] = useState<Demo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    getPedidos('DEMONSTRACAO')
      .then(pedidos => setDemos(pedidos.map(p => ({
        id: p.id,
        numero: `DEM-${String(p.numero).padStart(4, '0')}`,
        cliente: p.erp_clientes?.nome ?? '',
        contato: '',
        dataSaida: p.data_emissao,
        dataRetorno: p.data_entrega_prevista ?? '',
        status: (
          p.status === 'CONFIRMADO' ? 'ATIVO' :
          p.status === 'FATURADO'   ? 'CONVERTIDO' :
          p.status === 'CANCELADO'  ? 'PERDIDO' : 'PENDENTE'
        ) as Demo['status'],
        observacoes: p.observacoes ?? '',
        itens: [],
      }))))
      .catch(() => setDemos([]))
      .finally(() => setLoading(false));
  }, []);

  // form
  const [cliente, setCliente] = useState('');
  const [contato, setContato] = useState('');
  const [dataSaida, setDataSaida] = useState(new Date().toISOString().split('T')[0]);
  const [dataRetorno, setDataRetorno] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState<ItemDemo[]>([{ id: '1', produto: '', quantidade: 1 }]);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); }

  function handleSalvar() {
    if (!cliente.trim() || !dataRetorno) { showToast('Preencha cliente e data de retorno.', false); return; }
    if (itens.some(i => !i.produto.trim())) { showToast('Preencha todos os produtos.', false); return; }
    const nova: Demo = {
      id: String(Date.now()),
      numero: `DEM-${String(demos.length + 1).padStart(4, '0')}`,
      cliente, contato, dataSaida, dataRetorno, status: 'PENDENTE', observacoes, itens: [...itens],
    };
    setDemos(prev => [nova, ...prev]);
    showToast('Demonstração registrada com sucesso!', true);
    setCliente(''); setContato(''); setDataRetorno(''); setObservacoes('');
    setItens([{ id: '1', produto: '', quantidade: 1 }]);
    setAba('lista');
  }

  const filtradas = demos.filter(d =>
    d.numero.toLowerCase().includes(busca.toLowerCase()) ||
    d.cliente.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" /> Pedido de Demonstração
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie empréstimos de demonstração para prospecção de clientes</p>
        </div>
        <button
          onClick={() => setAba(aba === 'lista' ? 'novo' : 'lista')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {aba === 'lista' ? <><Plus className="w-4 h-4" /> Nova Demonstração</> : <><X className="w-4 h-4" /> Cancelar</>}
        </button>
      </div>

      {/* KPIs */}
      {aba === 'lista' && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Demos Ativas', value: demos.filter(d => d.status === 'ATIVO').length, color: 'blue' },
            { label: 'Convertidas', value: demos.filter(d => d.status === 'CONVERTIDO').length, color: 'green' },
            { label: 'Devolvidas', value: demos.filter(d => d.status === 'DEVOLVIDO').length, color: 'yellow' },
            { label: 'Taxa de Conversão', value: `${Math.round(demos.filter(d => d.status === 'CONVERTIDO').length / Math.max(demos.length, 1) * 100)}%`, color: 'emerald' },
          ].map(k => (
            <div key={k.label} className={`bg-${k.color}-50 border border-${k.color}-200 rounded-xl p-4`}>
              <div className={`text-2xl font-bold text-${k.color}-700`}>{k.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {aba === 'lista' ? (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Buscar por número ou cliente…" value={busca} onChange={e => setBusca(e.target.value)} />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin" /> Carregando demonstrações…
              </div>
            ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Número', 'Cliente', 'Contato', 'Saída', 'Retorno', 'Itens', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Nenhuma demonstração encontrada</td></tr>
                )}
                {filtradas.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">{d.numero}</td>
                    <td className="px-4 py-3 text-slate-700">{d.cliente}</td>
                    <td className="px-4 py-3 text-slate-600">{d.contato}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(d.dataSaida + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(d.dataRetorno + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 text-slate-600">{d.itens.length}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[d.status]}`}>{d.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
          <h2 className="text-base font-semibold text-slate-800 mb-5">Nova Demonstração</h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cliente *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome da empresa" value={cliente} onChange={e => setCliente(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contato</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome do contato" value={contato} onChange={e => setContato(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data de Saída</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={dataSaida} onChange={e => setDataSaida(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data de Retorno *</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={dataRetorno} onChange={e => setDataRetorno(e.target.value)} />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600">Produtos para demonstração *</label>
              <button onClick={() => setItens(prev => [...prev, { id: String(Date.now()), produto: '', quantidade: 1 }])} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {itens.map((item, idx) => (
                <div key={item.id} className="flex gap-2 items-center">
                  <input className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome do produto" value={item.produto} onChange={e => setItens(prev => prev.map((i, j) => j === idx ? { ...i, produto: e.target.value } : i))} />
                  <input type="number" min="1" className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Qtd" value={item.quantidade} onChange={e => setItens(prev => prev.map((i, j) => j === idx ? { ...i, quantidade: +e.target.value } : i))} />
                  {itens.length > 1 && (
                    <button onClick={() => setItens(prev => prev.filter((_, j) => j !== idx))} className="text-red-400 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
            <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={3} placeholder="Condições do empréstimo, requisitos especiais…" value={observacoes} onChange={e => setObservacoes(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button onClick={() => setAba('lista')} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
            <button onClick={handleSalvar} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">Registrar Demonstração</button>
          </div>
        </div>
      )}
    </div>
  );
}

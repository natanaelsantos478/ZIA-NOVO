// ERP — Pedido de Devolução
import { useState, useEffect } from 'react';
import { RefreshCw, Search, Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import { getPedidos } from '../../../lib/erp';

interface ItemDevolucao {
  id: string;
  produto: string;
  quantidade: number;
  valorUnitario: number;
  motivo: string;
}

interface Devolucao {
  id: string;
  numero: string;
  cliente: string;
  pedidoOrigem: string;
  data: string;
  status: 'PENDENTE' | 'APROVADA' | 'PROCESSADA' | 'REJEITADA';
  total: number;
  itens: ItemDevolucao[];
}


const STATUS_BADGE: Record<string, string> = {
  PENDENTE:   'bg-yellow-100 text-yellow-700',
  APROVADA:   'bg-blue-100 text-blue-700',
  PROCESSADA: 'bg-green-100 text-green-700',
  REJEITADA:  'bg-red-100 text-red-700',
};

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const MOTIVOS = ['Defeito de fabricação', 'Produto errado', 'Quantidade incorreta', 'Avaria no transporte', 'Insatisfação com produto', 'Prazo de entrega não cumprido', 'Outro'];

export default function PedidoDevolucao() {
  const [aba, setAba] = useState<'lista' | 'novo'>('lista');
  const [devolucos, setDevolucos] = useState<Devolucao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPedidos('DEVOLUCAO')
      .then(pedidos => setDevolucos(pedidos.map(p => ({
        id: p.id,
        numero: `DEV-${String(p.numero).padStart(4, '0')}`,
        cliente: p.erp_clientes?.nome ?? '',
        pedidoOrigem: p.observacoes?.match(/PV-\d+/)?.[0] ?? '—',
        data: p.data_emissao,
        status: (
          p.status === 'FATURADO'  ? 'PROCESSADA' :
          p.status === 'CANCELADO' ? 'REJEITADA' :
          p.status === 'CONFIRMADO'? 'APROVADA' : 'PENDENTE'
        ) as Devolucao['status'],
        total: p.total_pedido,
        itens: [],
      }))))
      .catch(() => setDevolucos([]))
      .finally(() => setLoading(false));
  }, []);
  const [busca, setBusca] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // form
  const [cliente, setCliente] = useState('');
  const [pedidoOrigem, setPedidoOrigem] = useState('');
  const [itens, setItens] = useState<ItemDevolucao[]>([{ id: '1', produto: '', quantidade: 1, valorUnitario: 0, motivo: MOTIVOS[0] }]);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); }

  function addItem() {
    setItens(prev => [...prev, { id: String(Date.now()), produto: '', quantidade: 1, valorUnitario: 0, motivo: MOTIVOS[0] }]);
  }

  function removeItem(id: string) { setItens(prev => prev.filter(i => i.id !== id)); }

  function handleSalvar() {
    if (!cliente.trim() || !pedidoOrigem.trim()) { showToast('Preencha o cliente e pedido de origem.', false); return; }
    if (itens.some(i => !i.produto.trim())) { showToast('Preencha todos os produtos.', false); return; }
    const total = itens.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0);
    const nova: Devolucao = {
      id: String(Date.now()),
      numero: `DEV-${String(devolucos.length + 1).padStart(4, '0')}`,
      cliente, pedidoOrigem,
      data: new Date().toISOString().split('T')[0],
      status: 'PENDENTE', total, itens: [...itens],
    };
    setDevolucos(prev => [nova, ...prev]);
    showToast('Devolução registrada com sucesso!', true);
    setCliente(''); setPedidoOrigem('');
    setItens([{ id: '1', produto: '', quantidade: 1, valorUnitario: 0, motivo: MOTIVOS[0] }]);
    setAba('lista');
  }

  const filtradas = devolucos.filter(d =>
    d.numero.toLowerCase().includes(busca.toLowerCase()) ||
    d.cliente.toLowerCase().includes(busca.toLowerCase()) ||
    d.pedidoOrigem.toLowerCase().includes(busca.toLowerCase()),
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
            <RefreshCw className="w-5 h-5 text-blue-600" /> Pedido de Devolução
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Registre devoluções de produtos com rastreamento do pedido original</p>
        </div>
        <button
          onClick={() => setAba(aba === 'lista' ? 'novo' : 'lista')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {aba === 'lista' ? <><Plus className="w-4 h-4" /> Nova Devolução</> : <><X className="w-4 h-4" /> Cancelar</>}
        </button>
      </div>

      {aba === 'lista' ? (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Buscar por número, cliente ou pedido de origem…"
              value={busca} onChange={e => setBusca(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin" /> Carregando devoluções…
              </div>
            ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Número', 'Cliente', 'Pedido Origem', 'Data', 'Itens', 'Total', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Nenhuma devolução encontrada</td></tr>
                )}
                {filtradas.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">{d.numero}</td>
                    <td className="px-4 py-3 text-slate-700">{d.cliente}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{d.pedidoOrigem}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 text-slate-600">{d.itens.length} {d.itens.length === 1 ? 'item' : 'itens'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{BRL(d.total)}</td>
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
          <h2 className="text-base font-semibold text-slate-800 mb-5">Nova Devolução</h2>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cliente *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome do cliente" value={cliente} onChange={e => setCliente(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Pedido de Origem *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: PV-0021" value={pedidoOrigem} onChange={e => setPedidoOrigem(e.target.value)} />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600">Itens a devolver *</label>
              <button onClick={addItem} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Adicionar item
              </button>
            </div>
            <div className="space-y-2">
              {itens.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Produto" value={item.produto} onChange={e => setItens(prev => prev.map((i, j) => j === idx ? { ...i, produto: e.target.value } : i))} />
                  </div>
                  <div className="col-span-2">
                    <input type="number" min="1" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Qtd" value={item.quantidade} onChange={e => setItens(prev => prev.map((i, j) => j === idx ? { ...i, quantidade: +e.target.value } : i))} />
                  </div>
                  <div className="col-span-2">
                    <input type="number" min="0" step="0.01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Valor" value={item.valorUnitario} onChange={e => setItens(prev => prev.map((i, j) => j === idx ? { ...i, valorUnitario: +e.target.value } : i))} />
                  </div>
                  <div className="col-span-3">
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={item.motivo} onChange={e => setItens(prev => prev.map((i, j) => j === idx ? { ...i, motivo: e.target.value } : i))}>
                      {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {itens.length > 1 && (
                      <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="text-sm text-slate-600">
              Total: <span className="font-bold text-slate-900">{BRL(itens.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0))}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAba('lista')} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSalvar} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                Registrar Devolução
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

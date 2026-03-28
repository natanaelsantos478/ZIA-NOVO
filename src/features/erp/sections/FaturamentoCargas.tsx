// ERP — Faturamento de Cargas (NF-e de saída para transporte)
import { useState } from 'react';
import { Package, Plus, X, CheckCircle, AlertCircle, Search } from 'lucide-react';

interface CargaItem { id: string; produto: string; ncm: string; quantidade: number; peso: number; valorUnitario: number; }

interface Carga {
  id: string;
  numero: string;
  nfe?: string;
  cliente: string;
  cnpjCliente: string;
  transportadora: string;
  dataEmissao: string;
  dataPrevisaoEntrega: string;
  origem: string;
  destino: string;
  pesoTotal: number;
  valorTotal: number;
  valorFrete: number;
  status: 'RASCUNHO' | 'EMITIDA' | 'EM_TRANSITO' | 'ENTREGUE' | 'CANCELADA';
  itens: CargaItem[];
}


const STATUS_BADGE: Record<string, string> = {
  RASCUNHO:   'bg-slate-100 text-slate-600',
  EMITIDA:    'bg-blue-100 text-blue-700',
  EM_TRANSITO:'bg-yellow-100 text-yellow-700',
  ENTREGUE:   'bg-green-100 text-green-700',
  CANCELADA:  'bg-red-100 text-red-700',
};

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function FaturamentoCargas() {
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [busca, setBusca] = useState('');
  const [detalhe, setDetalhe] = useState<Carga | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); }

  function emitir(id: string) {
    setCargas(prev => prev.map(c => c.id === id ? { ...c, status: 'EMITIDA', nfe: `5500${Date.now()}` } : c));
    showToast('NF-e emitida com sucesso!', true);
    setDetalhe(null);
  }

  const filtradas = cargas.filter(c =>
    c.numero.toLowerCase().includes(busca.toLowerCase()) ||
    c.cliente.toLowerCase().includes(busca.toLowerCase()) ||
    c.destino.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {detalhe && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="font-mono font-bold text-slate-800">{detalhe.numero}</span>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[detalhe.status]}`}>{detalhe.status}</span>
              </div>
              <button onClick={() => setDetalhe(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div><span className="text-slate-500">Cliente:</span> <span className="font-medium">{detalhe.cliente}</span></div>
              <div><span className="text-slate-500">CNPJ:</span> <span>{detalhe.cnpjCliente}</span></div>
              <div><span className="text-slate-500">Origem:</span> <span>{detalhe.origem}</span></div>
              <div><span className="text-slate-500">Destino:</span> <span>{detalhe.destino}</span></div>
              <div><span className="text-slate-500">Transportadora:</span> <span>{detalhe.transportadora}</span></div>
              <div><span className="text-slate-500">Peso:</span> <span>{detalhe.pesoTotal} kg</span></div>
              <div><span className="text-slate-500">Emissão:</span> <span>{new Date(detalhe.dataEmissao + 'T00:00:00').toLocaleDateString('pt-BR')}</span></div>
              <div><span className="text-slate-500">Previsão:</span> <span>{new Date(detalhe.dataPrevisaoEntrega + 'T00:00:00').toLocaleDateString('pt-BR')}</span></div>
            </div>

            {detalhe.nfe && (
              <div className="bg-blue-50 rounded-lg p-2 mb-4 text-xs font-mono text-blue-700 break-all">
                Chave NF-e: {detalhe.nfe}
              </div>
            )}

            <div className="mb-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Itens da Carga</h4>
              <div className="space-y-1">
                {detalhe.itens.map(i => (
                  <div key={i.id} className="flex justify-between text-sm bg-slate-50 rounded-lg p-2">
                    <div>
                      <div className="font-medium text-slate-700">{i.produto}</div>
                      <div className="text-xs text-slate-500">NCM: {i.ncm} · {i.quantidade} un · {i.peso} kg</div>
                    </div>
                    <div className="font-semibold text-slate-800">{BRL(i.quantidade * i.valorUnitario)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between text-sm border-t border-slate-100 pt-3 mb-4">
              <span>Frete: <strong>{BRL(detalhe.valorFrete)}</strong></span>
              <span>Total: <strong className="text-slate-900">{BRL(detalhe.valorTotal)}</strong></span>
            </div>

            <div className="flex gap-2">
              {detalhe.status === 'RASCUNHO' && (
                <button onClick={() => emitir(detalhe.id)} className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700">
                  Emitir NF-e
                </button>
              )}
              <button onClick={() => setDetalhe(null)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Fechar</button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" /> Faturamento de Cargas
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Emissão de NF-e para saída de mercadorias e cargas</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
          <Plus className="w-4 h-4" /> Nova Carga
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-700">{cargas.filter(c => c.status === 'RASCUNHO').length}</div>
          <div className="text-xs text-slate-500">Rascunhos</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-700">{cargas.filter(c => c.status === 'EMITIDA').length}</div>
          <div className="text-xs text-slate-500">NF-e Emitidas</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-yellow-700">{cargas.filter(c => c.status === 'EM_TRANSITO').length}</div>
          <div className="text-xs text-slate-500">Em Trânsito</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="text-lg font-bold text-emerald-700">{BRL(cargas.reduce((s, c) => s + c.valorTotal, 0))}</div>
          <div className="text-xs text-slate-500">Valor Total</div>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Buscar por número, cliente ou destino…" value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Número', 'Cliente', 'Destino', 'Transportadora', 'Peso (kg)', 'Valor Total', 'Frete', 'Emissão', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtradas.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Nenhuma carga encontrada</td></tr>
            )}
            {filtradas.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setDetalhe(c)}>
                <td className="px-4 py-3 font-mono font-semibold text-slate-800">{c.numero}</td>
                <td className="px-4 py-3 text-slate-700">{c.cliente}</td>
                <td className="px-4 py-3 text-slate-600">{c.destino}</td>
                <td className="px-4 py-3 text-slate-600">{c.transportadora}</td>
                <td className="px-4 py-3 text-slate-600">{c.pesoTotal} kg</td>
                <td className="px-4 py-3 font-semibold text-slate-800">{BRL(c.valorTotal)}</td>
                <td className="px-4 py-3 text-slate-600">{BRL(c.valorFrete)}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{new Date(c.dataEmissao + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[c.status]}`}>{c.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

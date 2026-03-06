import { useState, useEffect } from 'react';
import { RefreshCw, Search, Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { getProdutos, registrarMovimento } from '../../../lib/erp';
import type { ErpProduto } from '../../../lib/erp';

const DEPOSITOS = ['Principal', 'Filial 1', 'Filial 2', 'Almoxarifado', 'Expedição', 'Quarentena'];

export default function TransacaoProduto() {
  const [produtos, setProdutos] = useState<ErpProduto[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ErpProduto | null>(null);
  const [quantidade, setQuantidade] = useState('');
  const [origem, setOrigem] = useState(DEPOSITOS[0]);
  const [destino, setDestino] = useState(DEPOSITOS[1]);
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => { getProdutos(search).then(setProdutos).catch(() => {}); }, [search]);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); }

  async function handleSave() {
    if (!selected || !quantidade || +quantidade <= 0) return showToast('Selecione produto e quantidade.', false);
    if (origem === destino) return showToast('Origem e destino devem ser diferentes.', false);
    setSaving(true);
    try {
      await registrarMovimento({
        produto_id: selected.id,
        tipo_movimento: 'TRANSFERENCIA',
        quantidade: +quantidade,
        deposito_origem: origem,
        deposito_destino: destino,
        observacao: observacao || undefined,
      });
      showToast(`Transferência registrada: ${quantidade} ${selected.unidade_medida} de ${selected.nome}`, true);
      setSelected(null); setQuantidade(''); setObservacao(''); setSearch('');
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSaving(false); }
  }

  return (
    <div className="p-6 max-w-2xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <RefreshCw className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900">Transação de Produto</h1>
        </div>
        <p className="text-sm text-slate-500">Transferência de produto entre depósitos da mesma empresa</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        {/* Produto */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Produto *</label>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Buscar produto..." value={search} onChange={e => { setSearch(e.target.value); setSelected(null); }} />
          </div>
          {search && !selected && produtos.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {produtos.slice(0, 8).map(p => (
                <button key={p.id} onClick={() => { setSelected(p); setSearch(p.nome); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 text-sm text-left border-b border-slate-100 last:border-b-0">
                  <span className="font-medium text-slate-800">{p.nome}</span>
                  <span className="text-xs text-slate-500">{p.estoque_atual} {p.unidade_medida}</span>
                </button>
              ))}
            </div>
          )}
          {selected && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
              <span className="font-medium text-blue-800">{selected.nome}</span>
              <button onClick={() => { setSelected(null); setSearch(''); }} className="text-blue-600 text-xs">Alterar</button>
            </div>
          )}
        </div>

        {/* Depósitos */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">Depósito de Origem *</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={origem} onChange={e => setOrigem(e.target.value)}>
              {DEPOSITOS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="mt-5"><ArrowRight className="w-5 h-5 text-slate-400" /></div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">Depósito de Destino *</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={destino} onChange={e => setDestino(e.target.value)}>
              {DEPOSITOS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {origem === destino && origem && (
          <p className="text-xs text-red-600 -mt-2">Origem e destino devem ser depósitos diferentes.</p>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Quantidade *</label>
          <input type="number" min="0.0001" step="0.0001"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00" value={quantidade} onChange={e => setQuantidade(e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Observação</label>
          <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            value={observacao} onChange={e => setObservacao(e.target.value)} />
        </div>

        <button onClick={handleSave} disabled={saving || !selected || !quantidade || origem === destino}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-3 rounded-lg font-medium text-sm transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Registrar Transferência
        </button>
      </div>
    </div>
  );
}

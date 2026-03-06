import { useState, useEffect } from 'react';
import { ArrowDownCircle, Search, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getProdutos, registrarMovimento } from '../../../lib/erp';
import type { ErpProduto } from '../../../lib/erp';

export default function EntradaEstoque() {
  const [produtos, setProdutos] = useState<ErpProduto[]>([]);
  const [search, setSearch] = useState('');
  const [selectedProduto, setSelectedProduto] = useState<ErpProduto | null>(null);
  const [quantidade, setQuantidade] = useState('');
  const [deposito, setDeposito] = useState('Principal');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    getProdutos(search).then(setProdutos).catch(() => {});
  }, [search]);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); }

  async function handleSave() {
    if (!selectedProduto || !quantidade || +quantidade <= 0) {
      return showToast('Selecione um produto e informe a quantidade.', false);
    }
    setSaving(true);
    try {
      await registrarMovimento({
        produto_id: selectedProduto.id,
        tipo_movimento: 'ENTRADA',
        quantidade: +quantidade,
        deposito_destino: deposito,
        observacao: observacao || undefined,
      });
      showToast(`Entrada registrada: ${quantidade} ${selectedProduto.unidade_medida} de ${selectedProduto.nome}`, true);
      setSelectedProduto(null);
      setQuantidade('');
      setObservacao('');
      setSearch('');
      getProdutos('').then(setProdutos);
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
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
          <ArrowDownCircle className="w-5 h-5 text-green-600" />
          <h1 className="text-xl font-bold text-slate-900">Entrada em Estoque</h1>
        </div>
        <p className="text-sm text-slate-500">Registre entradas manuais de produtos no estoque</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        {/* Produto */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Produto *</label>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Buscar produto por nome..." value={search} onChange={e => { setSearch(e.target.value); setSelectedProduto(null); }} />
          </div>
          {search && !selectedProduto && (
            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {produtos.slice(0, 8).map(p => (
                <button key={p.id} onClick={() => { setSelectedProduto(p); setSearch(p.nome); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 text-sm text-left border-b border-slate-100 last:border-b-0 transition-colors">
                  <div>
                    <span className="font-medium text-slate-800">{p.nome}</span>
                    <span className="text-slate-500 ml-2 text-xs">{p.codigo_interno}</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.estoque_atual <= (p.estoque_minimo ?? 0) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {p.estoque_atual} {p.unidade_medida}
                  </span>
                </button>
              ))}
            </div>
          )}
          {selectedProduto && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
              <div>
                <span className="font-medium text-green-800">{selectedProduto.nome}</span>
                <span className="text-green-600 text-xs ml-2">Estoque atual: {selectedProduto.estoque_atual} {selectedProduto.unidade_medida}</span>
              </div>
              <button onClick={() => { setSelectedProduto(null); setSearch(''); }} className="text-green-600 hover:text-green-800 text-xs">Alterar</button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Quantidade *</label>
            <input type="number" min="0.0001" step="0.0001"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="0.00" value={quantidade} onChange={e => setQuantidade(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Depósito de Destino</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={deposito} onChange={e => setDeposito(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Observação / Motivo</label>
          <textarea rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            placeholder="Ex: Recebimento NF 001234..." value={observacao} onChange={e => setObservacao(e.target.value)} />
        </div>

        {/* Preview */}
        {selectedProduto && quantidade && +quantidade > 0 && (
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-2">Resumo da Operação</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700">Estoque após entrada:</span>
              <span className="font-bold text-green-600">
                {(selectedProduto.estoque_atual + +quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 4 })} {selectedProduto.unidade_medida}
              </span>
            </div>
          </div>
        )}

        <button onClick={handleSave} disabled={saving || !selectedProduto || !quantidade}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-3 rounded-lg font-medium text-sm transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownCircle className="w-4 h-4" />}
          Registrar Entrada
        </button>
      </div>
    </div>
  );
}

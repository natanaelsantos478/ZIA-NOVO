import { useState, useEffect } from 'react';
import { ArrowUpCircle, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { createLancamento, getLancamentos, getContasBancarias, pagarLancamento } from '../../../lib/erp';
import type { ErpLancamento, ErpContaBancaria } from '../../../lib/erp';

const CATEGORIAS = ['OPERACIONAL', 'FISCAL', 'FOLHA', 'HOSPEDAGEM', 'OUTROS'];

export default function SaidaValores() {
  const [lancamentos, setLancamentos] = useState<ErpLancamento[]>([]);
  const [contas, setContas] = useState<ErpContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [dataVencimento, setDataVencimento] = useState(new Date().toISOString().split('T')[0]);
  const [contaId, setContaId] = useState('');
  const [pagar, setPagar] = useState(false);

  useEffect(() => {
    Promise.all([
      getLancamentos('DESPESA').then(setLancamentos),
      getContasBancarias().then(setContas),
    ]).finally(() => setLoading(false));
  }, []);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }

  async function handleSave() {
    if (!descricao || !valor || +valor <= 0) return showToast('Descrição e valor são obrigatórios.', false);
    setSaving(true);
    try {
      await createLancamento({
        tipo: 'DESPESA', categoria, descricao, valor: +valor, data_vencimento: dataVencimento,
        data_pagamento: pagar ? new Date().toISOString().split('T')[0] : null,
        status: pagar ? 'PAGO' : 'PENDENTE', nfe_id: null, pedido_id: null, conta_bancaria_id: contaId || null,
      });
      showToast('Despesa registrada.', true);
      setDescricao(''); setValor(''); setPagar(false);
      getLancamentos('DESPESA').then(setLancamentos);
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSaving(false); }
  }

  async function handlePagar(id: string) {
    try {
      await pagarLancamento(id, new Date().toISOString().split('T')[0], contaId || undefined);
      showToast('Despesa marcada como paga.', true);
      getLancamentos('DESPESA').then(setLancamentos);
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
  }

  const totalPendente = lancamentos.filter(l => l.status === 'PENDENTE').reduce((s, l) => s + l.valor, 0);
  const totalPago = lancamentos.filter(l => l.status === 'PAGO').reduce((s, l) => s + l.valor, 0);

  return (
    <div className="p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <ArrowUpCircle className="w-5 h-5 text-red-600" />
          <h1 className="text-xl font-bold text-slate-900">Saída de Valores</h1>
        </div>
        <p className="text-sm text-slate-500">Registre despesas e contas a pagar</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="text-xs text-slate-500 mb-1">Total Pago</div>
          <div className="text-xl font-bold text-red-600">{totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <div className="text-xs text-slate-500 mb-1">A Pagar</div>
          <div className="text-xl font-bold text-amber-600">{totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Nova Despesa</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descrição *</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Aluguel, energia..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Valor (R$) *</label>
                <input type="number" min="0.01" step="0.01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={valor} onChange={e => setValor(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Categoria</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={categoria} onChange={e => setCategoria(e.target.value)}>
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Vencimento</label>
                <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Conta Bancária</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={contaId} onChange={e => setContaId(e.target.value)}>
                  <option value="">Sem conta</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="pago" checked={pagar} onChange={e => setPagar(e.target.checked)} className="rounded" />
                <label htmlFor="pago" className="text-sm text-slate-700">Marcar como pago</label>
              </div>
              <button onClick={handleSave} disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Registrar Despesa
              </button>
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-700">Histórico de Saídas</h3>
            </div>
            {loading ? (
              <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Descrição</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Vencimento</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Valor</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lancamentos.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-400">Nenhum lançamento.</td></tr>
                  ) : lancamentos.slice(0, 20).map(l => (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{l.descricao}</td>
                      <td className="px-4 py-3 text-slate-600">{new Date(l.data_vencimento + 'T00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600">
                        {l.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${l.status === 'PAGO' ? 'bg-slate-100 text-slate-600' : l.status === 'PENDENTE' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {l.status === 'PENDENTE' && (
                          <button onClick={() => handlePagar(l.id)} className="text-xs text-red-600 hover:text-red-800 font-medium">Pagar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

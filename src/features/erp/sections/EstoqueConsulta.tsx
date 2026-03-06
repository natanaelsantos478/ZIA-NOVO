import { useState, useEffect, useCallback } from 'react';
import { Search, AlertTriangle, Package, Loader2, TrendingDown } from 'lucide-react';
import { getProdutos } from '../../../lib/erp';
import type { ErpProduto } from '../../../lib/erp';

export default function EstoqueConsulta() {
  const [produtos, setProdutos] = useState<ErpProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'abaixo_minimo' | 'sem_estoque'>('todos');

  const load = useCallback(async () => {
    try { setLoading(true); setProdutos(await getProdutos(search)); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const filtered = produtos.filter(p => {
    if (filtro === 'abaixo_minimo') return p.estoque_minimo != null && p.estoque_atual <= p.estoque_minimo;
    if (filtro === 'sem_estoque') return p.estoque_atual === 0;
    return true;
  });

  const totalProdutos = produtos.length;
  const abaixoMinimo = produtos.filter(p => p.estoque_minimo != null && p.estoque_atual <= p.estoque_minimo).length;
  const semEstoque = produtos.filter(p => p.estoque_atual === 0).length;
  const valorTotal = produtos.reduce((s, p) => s + (p.preco_custo ?? p.preco_venda) * p.estoque_atual, 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Consulta de Estoque</h1>
        <p className="text-sm text-slate-500">Visão geral do estoque atual</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1"><Package className="w-4 h-4 text-blue-500" /><span className="text-xs text-slate-500">Total de Produtos</span></div>
          <div className="text-2xl font-bold text-slate-900">{totalProdutos}</div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-red-500" /><span className="text-xs text-slate-500">Abaixo do Mínimo</span></div>
          <div className="text-2xl font-bold text-red-600">{abaixoMinimo}</div>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingDown className="w-4 h-4 text-amber-500" /><span className="text-xs text-slate-500">Sem Estoque</span></div>
          <div className="text-2xl font-bold text-amber-600">{semEstoque}</div>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <div className="flex items-center gap-2 mb-1"><Package className="w-4 h-4 text-green-500" /><span className="text-xs text-slate-500">Valor em Estoque</span></div>
          <div className="text-xl font-bold text-green-600">{valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
        </div>
      </div>

      {/* Filtros e busca */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {(['todos', 'abaixo_minimo', 'sem_estoque'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filtro === f ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'}`}>
              {f === 'todos' ? 'Todos' : f === 'abaixo_minimo' ? 'Abaixo Mínimo' : 'Sem Estoque'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Código</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Produto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Grupo</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">UN</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Estoque Atual</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Estoque Mínimo</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Valor em Estoque</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-slate-400">Nenhum produto encontrado.</td></tr>
            ) : filtered.map(p => {
              const abaixo = p.estoque_minimo != null && p.estoque_atual <= p.estoque_minimo;
              const semStock = p.estoque_atual === 0;
              const valor = (p.preco_custo ?? p.preco_venda) * p.estoque_atual;
              return (
                <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${abaixo ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.codigo_interno}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.nome}</td>
                  <td className="px-4 py-3 text-slate-600">{p.erp_grupo_produtos?.nome ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-slate-500 text-xs">{p.unidade_medida}</td>
                  <td className="px-4 py-3 text-right font-bold">
                    <span className={semStock ? 'text-red-600' : abaixo ? 'text-amber-600' : 'text-slate-800'}>
                      {p.estoque_atual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    {p.estoque_minimo?.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {semStock ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Zerado</span>
                    ) : abaixo ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Baixo</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">OK</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

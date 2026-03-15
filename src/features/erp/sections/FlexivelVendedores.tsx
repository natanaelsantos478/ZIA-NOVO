// ERP — Flexível — Vendedores (visão configurável por vendedor)
import { useState } from 'react';
import { Users, Package, Calendar, ChevronDown } from 'lucide-react';

interface VendedorData {
  id: string;
  nome: string;
  regiao: string;
  vendas: { mes: string; valor: number; qtd: number }[];
  topProdutos: { nome: string; valor: number; qtd: number }[];
  topClientes: { nome: string; valor: number }[];
  comissaoMes: number;
  comissaoPct: number;
}

const VENDEDORES: VendedorData[] = [
  {
    id: '1', nome: 'Carlos Vieira', regiao: 'São Paulo',
    vendas: [
      { mes: 'Jan/26', valor: 68000, qtd: 13 },
      { mes: 'Fev/26', valor: 80000, qtd: 16 },
      { mes: 'Mar/26', valor: 97200, qtd: 18 },
    ],
    topProdutos: [
      { nome: 'ERP Full Suite', valor: 48000, qtd: 3 },
      { nome: 'Módulo RH', valor: 22500, qtd: 3 },
      { nome: 'Suporte Gold', valor: 14400, qtd: 4 },
    ],
    topClientes: [
      { nome: 'Empresa Alpha Ltda', valor: 48000 },
      { nome: 'Tech Solutions S/A', valor: 28000 },
      { nome: 'Grupo Delta', valor: 21200 },
    ],
    comissaoMes: 4860, comissaoPct: 5,
  },
  {
    id: '2', nome: 'Ana Souza', regiao: 'Rio de Janeiro',
    vendas: [
      { mes: 'Jan/26', valor: 62000, qtd: 11 },
      { mes: 'Fev/26', valor: 68000, qtd: 13 },
      { mes: 'Mar/26', valor: 74500, qtd: 14 },
    ],
    topProdutos: [
      { nome: 'Consultoria Impl.', valor: 32000, qtd: 4 },
      { nome: 'ERP Módulo CRM', valor: 21000, qtd: 2 },
      { nome: 'Suporte Padrão', valor: 10500, qtd: 5 },
    ],
    topClientes: [
      { nome: 'Comércio Beta S/A', valor: 36000 },
      { nome: 'Indústria Norte ME', valor: 22500 },
    ],
    comissaoMes: 3725, comissaoPct: 5,
  },
];

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function FlexivelVendedores() {
  const [selectedId, setSelectedId] = useState(VENDEDORES[0].id);
  const [viewMode, setViewMode] = useState<'resumo' | 'produtos' | 'clientes' | 'historico'>('resumo');

  const v = VENDEDORES.find(x => x.id === selectedId)!;
  const mesAtual = v.vendas[v.vendas.length - 1];
  const mesAnterior = v.vendas[v.vendas.length - 2];
  const crescimento = mesAnterior ? ((mesAtual.valor - mesAnterior.valor) / mesAnterior.valor) * 100 : 0;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" /> Flexível — Vendedores
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Visão detalhada e configurável por vendedor</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              className="appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium text-slate-700"
              value={selectedId} onChange={e => setSelectedId(e.target.value)}
            >
              {VENDEDORES.map(vc => <option key={vc.id} value={vc.id}>{vc.nome}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* KPIs do vendedor selecionado */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="text-lg font-bold text-emerald-700">{BRL(mesAtual.valor)}</div>
          <div className="text-xs text-slate-500">Vendas em Mar/26</div>
          <div className={`text-xs font-medium mt-1 ${crescimento >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {crescimento >= 0 ? '▲' : '▼'} {Math.abs(crescimento).toFixed(1)}% vs mês anterior
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-700">{mesAtual.qtd}</div>
          <div className="text-xs text-slate-500">Vendas Realizadas</div>
        </div>
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
          <div className="text-lg font-bold text-violet-700">{BRL(mesAtual.valor / mesAtual.qtd)}</div>
          <div className="text-xs text-slate-500">Ticket Médio</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="text-lg font-bold text-amber-700">{BRL(v.comissaoMes)}</div>
          <div className="text-xs text-slate-500">Comissão ({v.comissaoPct}%)</div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {(['resumo', 'produtos', 'clientes', 'historico'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setViewMode(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${viewMode === tab ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {tab === 'historico' ? 'Histórico' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Conteúdo por aba */}
      {viewMode === 'resumo' && (
        <div className="grid grid-cols-2 gap-4">
          {/* Top Produtos */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-400" /> Top Produtos
            </h3>
            <div className="space-y-2">
              {v.topProdutos.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{i + 1}</span>
                    <span className="text-slate-700">{p.nome}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-800">{BRL(p.valor)}</div>
                    <div className="text-xs text-slate-400">{p.qtd} un</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Clientes */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" /> Top Clientes
            </h3>
            <div className="space-y-2">
              {v.topClientes.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{i + 1}</span>
                    <span className="text-slate-700">{c.nome}</span>
                  </div>
                  <span className="font-semibold text-slate-800">{BRL(c.valor)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'historico' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" /> Histórico de Vendas
          </h3>
          <div className="space-y-4">
            {v.vendas.map((m, i) => {
              const prev = v.vendas[i - 1];
              const delta = prev ? ((m.valor - prev.valor) / prev.valor) * 100 : null;
              const maxVal = Math.max(...v.vendas.map(x => x.valor));
              return (
                <div key={m.mes}>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span className="font-medium text-slate-700">{m.mes}</span>
                    <div className="flex items-center gap-3">
                      {delta !== null && (
                        <span className={`text-xs font-medium ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
                        </span>
                      )}
                      <span className="font-bold text-slate-900">{BRL(m.valor)}</span>
                      <span className="text-slate-400 text-xs">{m.qtd} vendas</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div className="bg-emerald-500 h-3 rounded-full" style={{ width: `${(m.valor / maxVal) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'produtos' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Produto', 'Qtd Vendida', 'Valor Total', 'Participação'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {v.topProdutos.map((p, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.nome}</td>
                  <td className="px-4 py-3 text-slate-600">{p.qtd}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{BRL(p.valor)}</td>
                  <td className="px-4 py-3 text-slate-600">{Math.round((p.valor / mesAtual.valor) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'clientes' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Cliente', 'Valor Total', 'Participação'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {v.topClientes.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.nome}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{BRL(c.valor)}</td>
                  <td className="px-4 py-3 text-slate-600">{Math.round((c.valor / mesAtual.valor) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

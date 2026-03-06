import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { getProjetos } from '../../../lib/erp';
import type { ErpProjeto } from '../../../lib/erp';

const STATUS_COLORS: Record<string, string> = {
  PLANEJAMENTO: '#94a3b8',
  EM_ANDAMENTO: '#3b82f6',
  PAUSADO: '#f59e0b',
  CONCLUIDO: '#22c55e',
  CANCELADO: '#ef4444',
};

export default function MetricasProjetos() {
  const [projetos, setProjetos] = useState<ErpProjeto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjetos().then(setProjetos).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  const por_status = projetos.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  const em_andamento = projetos.filter(p => p.status === 'EM_ANDAMENTO');
  const progresso_medio = em_andamento.length > 0
    ? em_andamento.reduce((s, p) => s + p.progresso_pct, 0) / em_andamento.length
    : 0;

  const total_orcamento = projetos.reduce((s, p) => s + (p.orcamento_previsto ?? 0), 0);
  const total_realizado = projetos.reduce((s, p) => s + (p.orcamento_realizado ?? 0), 0);

  const atrasados = projetos.filter(p =>
    p.status === 'EM_ANDAMENTO' &&
    p.data_fim_prevista &&
    new Date(p.data_fim_prevista) < new Date()
  ).length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Métricas de Projetos</h1>
        <p className="text-sm text-slate-500">Dashboard executivo de projetos</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2"><BarChart3 className="w-4 h-4 text-blue-500" /><span className="text-xs text-slate-500">Total de Projetos</span></div>
          <div className="text-2xl font-bold text-slate-800">{projetos.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-blue-600" /><span className="text-xs text-slate-500">Em Andamento</span></div>
          <div className="text-2xl font-bold text-blue-600">{em_andamento.length}</div>
          <div className="text-xs text-slate-400 mt-1">Progresso médio: {progresso_medio.toFixed(0)}%</div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-red-500" /><span className="text-xs text-slate-500">Atrasados</span></div>
          <div className="text-2xl font-bold text-red-600">{atrasados}</div>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-xs text-slate-500">Concluídos</span></div>
          <div className="text-2xl font-bold text-green-600">{por_status['CONCLUIDO'] ?? 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Distribuição por status */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Projetos por Status</h3>
          <div className="space-y-3">
            {Object.entries(por_status).map(([s, count]) => {
              const pct = projetos.length > 0 ? (count / projetos.length) * 100 : 0;
              return (
                <div key={s}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{s.replace('_', ' ')}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[s] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Em andamento com progresso */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Projetos em Andamento</h3>
          {em_andamento.length === 0 ? (
            <p className="text-slate-400 text-sm">Nenhum projeto em andamento.</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
              {em_andamento.map(p => (
                <div key={p.id} className="border-b border-slate-100 pb-3 last:border-b-0">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 truncate">{p.nome}</span>
                    <span className="text-slate-500 ml-2 flex-shrink-0">{p.progresso_pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${p.progresso_pct}%` }} />
                  </div>
                  {p.data_fim_prevista && (
                    <p className={`text-xs mt-1 ${new Date(p.data_fim_prevista) < new Date() ? 'text-red-500' : 'text-slate-400'}`}>
                      Previsto: {new Date(p.data_fim_prevista + 'T00:00').toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Orçamento */}
        {total_orcamento > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 col-span-2">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Orçamento vs. Realizado</h3>
            <div className="flex items-center gap-8">
              <div>
                <p className="text-xs text-slate-500">Orçamento Total Previsto</p>
                <p className="text-xl font-bold text-slate-800">{total_orcamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Realizado</p>
                <p className="text-xl font-bold text-blue-600">{total_realizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">% Utilizado</p>
                <p className="text-xl font-bold text-amber-600">
                  {total_orcamento > 0 ? ((total_realizado / total_orcamento) * 100).toFixed(1) + '%' : '—'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

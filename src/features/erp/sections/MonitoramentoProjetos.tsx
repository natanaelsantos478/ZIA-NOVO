// ERP — Monitoramento de Projetos (visão agregada de saúde dos projetos)
import { useState } from 'react';
import {
  Activity, CheckCircle2, TrendingUp, TrendingDown, BarChart2,
  Users, Calendar, Minus, AlertTriangle,
} from 'lucide-react';

interface IndicadorProjeto {
  id: string;
  nome: string;
  responsavel: string;
  categoria: string;
  dataInicio: string;
  dataFim: string;
  percentualReal: number;
  percentualPrevisto: number;
  orcamentoPrevisto: number;
  orcamentoRealizado: number;
  tarefasTotais: number;
  tarefasConcluidas: number;
  tarefasAtrasadas: number;
  riscos: number;
  saude: 'VERDE' | 'AMARELO' | 'VERMELHO';
  status: 'EM_ANDAMENTO' | 'PAUSADO' | 'CONCLUIDO' | 'CANCELADO';
}

const PROJETOS: IndicadorProjeto[] = [
  {
    id: '1', nome: 'Implantação ERP — Cliente Alpha', responsavel: 'Carlos T.', categoria: 'Implantação',
    dataInicio: '2026-01-15', dataFim: '2026-06-30',
    percentualReal: 42, percentualPrevisto: 40,
    orcamentoPrevisto: 120000, orcamentoRealizado: 48500,
    tarefasTotais: 48, tarefasConcluidas: 20, tarefasAtrasadas: 1,
    riscos: 1, saude: 'VERDE', status: 'EM_ANDAMENTO',
  },
  {
    id: '2', nome: 'Desenvolvimento Módulo Fiscal', responsavel: 'Dev Team B', categoria: 'Desenvolvimento',
    dataInicio: '2026-02-01', dataFim: '2026-05-31',
    percentualReal: 55, percentualPrevisto: 70,
    orcamentoPrevisto: 80000, orcamentoRealizado: 52000,
    tarefasTotais: 60, tarefasConcluidas: 33, tarefasAtrasadas: 8,
    riscos: 3, saude: 'AMARELO', status: 'EM_ANDAMENTO',
  },
  {
    id: '3', nome: 'Migração para Nuvem AWS', responsavel: 'DevOps Team', categoria: 'Infraestrutura',
    dataInicio: '2026-01-10', dataFim: '2026-04-10',
    percentualReal: 28, percentualPrevisto: 90,
    orcamentoPrevisto: 45000, orcamentoRealizado: 38000,
    tarefasTotais: 30, tarefasConcluidas: 8, tarefasAtrasadas: 15,
    riscos: 5, saude: 'VERMELHO', status: 'EM_ANDAMENTO',
  },
  {
    id: '4', nome: 'Portal de Autoatendimento', responsavel: 'UX Team', categoria: 'Produto',
    dataInicio: '2025-10-01', dataFim: '2026-02-28',
    percentualReal: 100, percentualPrevisto: 100,
    orcamentoPrevisto: 60000, orcamentoRealizado: 58200,
    tarefasTotais: 40, tarefasConcluidas: 40, tarefasAtrasadas: 0,
    riscos: 0, saude: 'VERDE', status: 'CONCLUIDO',
  },
];

const SAUDE_CONFIG = {
  VERDE:    { label: 'No Prazo',  bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300',  dot: 'bg-green-500' },
  AMARELO:  { label: 'Atenção',   bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', dot: 'bg-yellow-500' },
  VERMELHO: { label: 'Em Risco',  bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300',    dot: 'bg-red-500' },
};

const STATUS_BADGE: Record<string, string> = {
  EM_ANDAMENTO: 'bg-blue-100 text-blue-700',
  PAUSADO:      'bg-slate-100 text-slate-600',
  CONCLUIDO:    'bg-green-100 text-green-700',
  CANCELADO:    'bg-red-100 text-red-700',
};

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function HealthDot({ saude }: { saude: 'VERDE' | 'AMARELO' | 'VERMELHO' }) {
  const cfg = SAUDE_CONFIG[saude];
  return <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} inline-block`} />;
}

export default function MonitoramentoProjetos() {
  const [filtroSaude, setFiltroSaude] = useState<string>('TODOS');
  const [selected, setSelected] = useState<IndicadorProjeto | null>(null);

  const filtrados = PROJETOS.filter(p => filtroSaude === 'TODOS' || p.saude === filtroSaude);

  const ativos = PROJETOS.filter(p => p.status === 'EM_ANDAMENTO');
  const verdes = PROJETOS.filter(p => p.saude === 'VERDE').length;
  const amarelos = PROJETOS.filter(p => p.saude === 'AMARELO').length;
  const vermelhos = PROJETOS.filter(p => p.saude === 'VERMELHO').length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-600" /> Monitoramento de Projetos
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Visão consolidada de saúde, progresso e indicadores de todos os projetos</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-800">{ativos.length}</div>
          <div className="text-xs text-slate-500">Em Andamento</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-700">{verdes}</div>
          <div className="text-xs text-slate-500">No Prazo</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-yellow-700">{amarelos}</div>
          <div className="text-xs text-slate-500">Com Atenção</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-red-700">{vermelhos}</div>
          <div className="text-xs text-slate-500">Em Risco</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-amber-700">{PROJETOS.flatMap(p => Array(p.tarefasAtrasadas).fill(0)).length}</div>
          <div className="text-xs text-slate-500">Tarefas Atrasadas</div>
        </div>
      </div>

      {/* Filtro saúde */}
      <div className="flex gap-2 mb-4">
        {['TODOS', 'VERDE', 'AMARELO', 'VERMELHO'].map(s => (
          <button key={s} onClick={() => setFiltroSaude(s)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtroSaude === s ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {s !== 'TODOS' && <HealthDot saude={s as 'VERDE' | 'AMARELO' | 'VERMELHO'} />}
            {s === 'TODOS' ? 'Todos' : SAUDE_CONFIG[s as keyof typeof SAUDE_CONFIG].label}
          </button>
        ))}
      </div>

      {/* Tabela de projetos */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Projeto', 'Saúde', 'Status', 'Progresso', 'Orçamento', 'Tarefas', 'Riscos', 'Prazo'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Nenhum projeto encontrado</td></tr>
            )}
            {filtrados.map(p => {
              const saudeCfg = SAUDE_CONFIG[p.saude];
              const delta = p.percentualReal - p.percentualPrevisto;
              const orcDelta = p.orcamentoRealizado - (p.orcamentoPrevisto * (p.percentualPrevisto / 100));
              return (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelected(selected?.id === p.id ? null : p)}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800 text-sm leading-tight">{p.nome}</div>
                    <div className="text-xs text-slate-400">{p.responsavel} · {p.categoria}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${saudeCfg.bg} ${saudeCfg.text} ${saudeCfg.border}`}>
                      <HealthDot saude={p.saude} />
                      {saudeCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[p.status]}`}>{p.status.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${p.saude === 'VERDE' ? 'bg-green-500' : p.saude === 'AMARELO' ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(p.percentualReal, 100)}%` }} />
                      </div>
                      <span className="text-xs font-medium text-slate-700">{p.percentualReal}%</span>
                      {delta > 0 ? (
                        <span className="text-xs text-green-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />+{delta}%</span>
                      ) : delta < 0 ? (
                        <span className="text-xs text-red-600 flex items-center gap-0.5"><TrendingDown className="w-3 h-3" />{delta}%</span>
                      ) : (
                        <span className="text-xs text-slate-400"><Minus className="w-3 h-3" /></span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs">
                      <div className="font-medium text-slate-700">{BRL(p.orcamentoRealizado)}</div>
                      <div className={`${orcDelta > 0 ? 'text-red-500' : 'text-green-600'}`}>
                        {orcDelta > 0 ? '+' : ''}{BRL(orcDelta)}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-slate-600">
                      <span className="text-green-600 font-medium">{p.tarefasConcluidas}</span>
                      <span className="text-slate-400">/{p.tarefasTotais}</span>
                      {p.tarefasAtrasadas > 0 && <span className="text-red-500 ml-1">({p.tarefasAtrasadas} atras.)</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {p.riscos > 0 ? (
                      <span className="flex items-center gap-1 text-xs text-red-600">
                        <AlertTriangle className="w-3 h-3" /> {p.riscos}
                      </span>
                    ) : (
                      <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> 0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(p.dataFim + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detalhe ao clicar */}
      {selected && (
        <div className="mt-4 bg-white rounded-xl border border-amber-300 p-5">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-amber-600" /> {selected.nome}
          </h3>
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Responsável</div>
              <div className="font-medium">{selected.responsavel}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Período</div>
              <div className="font-medium text-xs">{new Date(selected.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')} — {new Date(selected.dataFim + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Previsto vs Realizado</div>
              <div className="font-medium">{selected.percentualPrevisto}% prev. / {selected.percentualReal}% real.</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Orçamento</div>
              <div className="font-medium">{BRL(selected.orcamentoPrevisto)} prev.<br />{BRL(selected.orcamentoRealizado)} real.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ERP — Monitoramento de Projetos (visão agregada de saúde dos projetos)
import { useState, useEffect } from 'react';
import {
  Activity, TrendingUp, TrendingDown, BarChart2,
  Calendar, Minus, RefreshCw,
} from 'lucide-react';
import { getProjetos, type ErpProjeto } from '../../../lib/erp';

// ── Cálculo dinâmico de saúde ──────────────────────────────────────────────────

function computeSaude(p: ErpProjeto): 'VERDE' | 'AMARELO' | 'VERMELHO' {
  if (p.status === 'CONCLUIDO' || p.status === 'CANCELADO') return 'VERDE';

  // Verificação de orçamento: acima de 10% do previsto → vermelho
  if (p.orcamento_previsto && p.orcamento_previsto > 0) {
    if (p.orcamento_realizado > p.orcamento_previsto * 1.1) return 'VERMELHO';
  }

  // Verificação de prazo: calcula progresso esperado pelo tempo decorrido
  if (p.data_inicio && p.data_fim_prevista) {
    const now  = Date.now();
    const start = new Date(p.data_inicio).getTime();
    const end   = new Date(p.data_fim_prevista).getTime();
    const total = end - start;
    if (total > 0) {
      const expectedPct = Math.min(Math.max(((now - start) / total) * 100, 0), 100);
      const delta = p.progresso_pct - expectedPct;
      if (delta < -25) return 'VERMELHO';
      if (delta < -10) return 'AMARELO';
    }
  }

  return 'VERDE';
}

function computeExpectedPct(p: ErpProjeto): number {
  if (!p.data_inicio || !p.data_fim_prevista) return 0;
  const now   = Date.now();
  const start = new Date(p.data_inicio).getTime();
  const end   = new Date(p.data_fim_prevista).getTime();
  const total = end - start;
  if (total <= 0) return 100;
  return Math.min(Math.max(((now - start) / total) * 100, 0), 100);
}

// ── Config de saúde ────────────────────────────────────────────────────────────

const SAUDE_CONFIG = {
  VERDE:    { label: 'No Prazo',  bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300',  dot: 'bg-green-500' },
  AMARELO:  { label: 'Atenção',   bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', dot: 'bg-yellow-500' },
  VERMELHO: { label: 'Em Risco',  bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300',    dot: 'bg-red-500' },
};

const STATUS_BADGE: Record<string, string> = {
  PLANEJAMENTO: 'bg-slate-100 text-slate-600',
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
  const [projetos, setProjetos]     = useState<ErpProjeto[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filtroSaude, setFiltroSaude] = useState<string>('TODOS');
  const [selected, setSelected]     = useState<ErpProjeto | null>(null);

  useEffect(() => {
    getProjetos()
      .then(setProjetos)
      .catch(() => setProjetos([]))
      .finally(() => setLoading(false));
  }, []);

  const comSaude = projetos.map(p => ({ ...p, _saude: computeSaude(p), _expectedPct: computeExpectedPct(p) }));

  const filtrados = comSaude.filter(p =>
    filtroSaude === 'TODOS' || p._saude === filtroSaude,
  );

  const ativos    = comSaude.filter(p => p.status === 'EM_ANDAMENTO').length;
  const verdes    = comSaude.filter(p => p._saude === 'VERDE').length;
  const amarelos  = comSaude.filter(p => p._saude === 'AMARELO').length;
  const vermelhos = comSaude.filter(p => p._saude === 'VERMELHO').length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-600" /> Monitoramento de Projetos
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Visão consolidada de saúde, progresso e indicadores de todos os projetos</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-800">{ativos}</div>
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
      </div>

      {/* Filtro saúde */}
      <div className="flex gap-2 mb-4">
        {(['TODOS', 'VERDE', 'AMARELO', 'VERMELHO'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFiltroSaude(s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filtroSaude === s ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s !== 'TODOS' && <HealthDot saude={s} />}
            {s === 'TODOS' ? 'Todos' : SAUDE_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" /> Carregando projetos…
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Projeto', 'Saúde', 'Status', 'Progresso', 'Orçamento', 'Prazo'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    {projetos.length === 0 ? 'Nenhum projeto cadastrado' : 'Nenhum projeto encontrado'}
                  </td>
                </tr>
              )}
              {filtrados.map(p => {
                const saudeCfg  = SAUDE_CONFIG[p._saude];
                const delta     = p.progresso_pct - p._expectedPct;
                const orcDelta  = p.orcamento_previsto
                  ? p.orcamento_realizado - (p.orcamento_previsto * (p._expectedPct / 100))
                  : 0;
                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setSelected(selected?.id === p.id ? null : p)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 text-sm leading-tight">{p.nome}</div>
                      <div className="text-xs text-slate-400">{p.erp_grupos_projetos?.nome ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border w-fit ${saudeCfg.bg} ${saudeCfg.text} ${saudeCfg.border}`}>
                        <HealthDot saude={p._saude} />
                        {saudeCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[p.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {p.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${p._saude === 'VERDE' ? 'bg-green-500' : p._saude === 'AMARELO' ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(p.progresso_pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-700">{p.progresso_pct}%</span>
                        {delta > 0 ? (
                          <span className="text-xs text-green-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />+{delta.toFixed(0)}%</span>
                        ) : delta < -1 ? (
                          <span className="text-xs text-red-600 flex items-center gap-0.5"><TrendingDown className="w-3 h-3" />{delta.toFixed(0)}%</span>
                        ) : (
                          <span className="text-xs text-slate-400"><Minus className="w-3 h-3" /></span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <div className="font-medium text-slate-700">{BRL(p.orcamento_realizado)}</div>
                        {p.orcamento_previsto != null && (
                          <div className={`${orcDelta > 0 ? 'text-red-500' : 'text-green-600'}`}>
                            {orcDelta > 0 ? '+' : ''}{BRL(orcDelta)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {p.data_fim_prevista
                        ? new Date(p.data_fim_prevista + 'T00:00:00').toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detalhe ao clicar */}
      {selected && (
        <div className="mt-4 bg-white rounded-xl border border-amber-300 p-5">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-amber-600" /> {selected.nome}
          </h3>
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Grupo</div>
              <div className="font-medium">{selected.erp_grupos_projetos?.nome ?? '—'}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Período</div>
              <div className="font-medium text-xs">
                {selected.data_inicio ? new Date(selected.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                {' — '}
                {selected.data_fim_prevista ? new Date(selected.data_fim_prevista + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Progresso Real</div>
              <div className="font-medium">{selected.progresso_pct}%</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Orçamento</div>
              <div className="font-medium text-xs">
                {selected.orcamento_previsto != null ? BRL(selected.orcamento_previsto) : '—'} prev.<br />
                {BRL(selected.orcamento_realizado)} real.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Users, Wrench, Truck, Building,
  ShieldCheck, FolderOpen, Settings, BrainCircuit, Repeat2,
  ChevronRight, LayoutGrid, TrendingUp, TrendingDown,
  AlertTriangle, AlertCircle, CheckCircle, RefreshCw,
  DollarSign, UserCheck, Wallet, Activity,
} from 'lucide-react';
import ChatArea from '../ia/sections/chat/ChatArea';
import type { Agente } from '../ia/sections/chat/types';
import { supabase } from '../../lib/supabase';
import { getTenantIds } from '../../lib/auth';
import { fetchModuleHubData, type HubModuleData } from '../../lib/hubDashboard';
import { getLancamentos, getContasBancarias } from '../../lib/erp';
import { getEmployees } from '../../lib/hr';

// ── IA Geral ──────────────────────────────────────────────────────────────────

const IA_GERAL: Agente = {
  id: 'gestor-ia-geral',
  nome: 'IA Geral',
  descricao: 'Assistente do painel Gestor ZIA',
  avatar_emoji: '🧠',
  cor: '#7c3aed',
  funcao: 'Você é a IA Geral do ZIA Gestor — tem acesso a todos os módulos e pode analisar dados, comparar métricas e responder sobre qualquer área do sistema: Vendas, Pessoas, Ativos, Logística, Backoffice, Assinaturas, Qualidade, Documentos e IA. Seja conciso e orientado a decisões.',
  modelo: 'gemini-2.5-flash',
  modelo_versao: 'gemini-2.5-flash',
  status: 'ativo',
  tipo: 'ORQUESTRADOR',
};

// ── Módulos ───────────────────────────────────────────────────────────────────

interface SubmoduleDef { name: string; path: string }
interface ModuleDef {
  id: string; name: string; icon: React.ElementType;
  color: string; route: string; submodules: SubmoduleDef[];
}

const MODULES: ModuleDef[] = [
  {
    id: 'crm', name: 'Vendas', icon: Briefcase,
    color: 'from-purple-500 to-indigo-600', route: '/app/crm',
    submodules: [
      { name: 'Pipeline', path: '/app/crm/pipeline' },
      { name: 'Clientes', path: '/app/crm' },
      { name: 'Propostas', path: '/app/crm/propostas' },
      { name: 'Agenda', path: '/app/crm/agenda' },
      { name: 'Relatórios', path: '/app/crm/relatorios' },
    ],
  },
  {
    id: 'hr', name: 'Pessoas', icon: Users,
    color: 'from-pink-500 to-rose-600', route: '/app/hr',
    submodules: [
      { name: 'Funcionários', path: '/app/hr' },
      { name: 'Vagas', path: '/app/hr/vagas' },
      { name: 'Férias', path: '/app/hr/ferias' },
      { name: 'Treinamentos', path: '/app/hr/treinamentos' },
    ],
  },
  {
    id: 'assets', name: 'Ativos', icon: Wrench,
    color: 'from-blue-500 to-cyan-600', route: '/app/assets',
    submodules: [
      { name: 'Ativos', path: '/app/assets' },
      { name: 'Manutenções', path: '/app/assets/manutencoes' },
      { name: 'Inventário', path: '/app/assets/inventario' },
    ],
  },
  {
    id: 'logistics', name: 'Logística', icon: Truck,
    color: 'from-emerald-500 to-teal-600', route: '/app/logistics',
    submodules: [
      { name: 'Estoque', path: '/app/logistics' },
      { name: 'Pedidos', path: '/app/logistics/pedidos' },
      { name: 'Fornecedores', path: '/app/logistics/fornecedores' },
    ],
  },
  {
    id: 'backoffice', name: 'Backoffice', icon: Building,
    color: 'from-slate-600 to-slate-800', route: '/app/backoffice',
    submodules: [
      { name: 'Visão Geral', path: '/app/backoffice' },
      { name: 'Contas a Pagar', path: '/app/backoffice/contas-pagar' },
      { name: 'Contas a Receber', path: '/app/backoffice/contas-receber' },
      { name: 'Fluxo de Caixa', path: '/app/backoffice/fluxo' },
    ],
  },
  {
    id: 'assinaturas', name: 'Assinaturas', icon: Repeat2,
    color: 'from-violet-500 to-purple-700', route: '/app/assinaturas',
    submodules: [
      { name: 'Visão Geral', path: '/app/assinaturas' },
      { name: 'Planos', path: '/app/assinaturas/planos' },
      { name: 'Assinantes', path: '/app/assinaturas/clientes' },
    ],
  },
  {
    id: 'quality', name: 'Qualidade', icon: ShieldCheck,
    color: 'from-green-500 to-emerald-600', route: '/app/quality',
    submodules: [
      { name: 'Visão Geral', path: '/app/quality' },
      { name: 'Não Conformidades', path: '/app/quality/nc' },
      { name: 'Auditorias', path: '/app/quality/auditorias' },
    ],
  },
  {
    id: 'docs', name: 'Documentos', icon: FolderOpen,
    color: 'from-amber-500 to-orange-600', route: '/app/docs',
    submodules: [{ name: 'Documentos', path: '/app/docs' }],
  },
  {
    id: 'ia', name: 'IA', icon: BrainCircuit,
    color: 'from-violet-500 to-purple-800', route: '/app/ia',
    submodules: [
      { name: 'Chat', path: '/app/ia' },
      { name: 'Agentes', path: '/app/ia/agentes' },
      { name: 'Conversas', path: '/app/ia/conversas' },
    ],
  },
  {
    id: 'settings', name: 'Config', icon: Settings,
    color: 'from-slate-500 to-slate-700', route: '/app/settings',
    submodules: [
      { name: 'Empresa', path: '/app/settings' },
      { name: 'Usuários', path: '/app/settings/usuarios' },
      { name: 'Integrações', path: '/app/settings/integracoes' },
    ],
  },
];

// ── Types locais ──────────────────────────────────────────────────────────────

interface BusinessHealth {
  receitaMensal: number;
  resultadoLiquido: number;
  headcount: number;
  caixaDisponivel: number;
  loading: boolean;
}

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  module: string;
  message: string;
  count?: number;
}

interface AreaSummary {
  moduleId: string;
  name: string;
  icon: React.ElementType;
  color: string;
  route: string;
  kpis: { label: string; value: string; positive: boolean }[];
  loading: boolean;
}

// ── Helpers de formatação ─────────────────────────────────────────────────────

function fmtCurrency(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}K`;
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ── Seção 1: Saúde do Negócio — hook ─────────────────────────────────────────

function useBusinessHealth(): BusinessHealth {
  const [state, setState] = useState<BusinessHealth>({
    receitaMensal: 0, resultadoLiquido: 0, headcount: 0, caixaDisponivel: 0, loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [lancRes, contasRes, empRes] = await Promise.allSettled([
        getLancamentos(),
        getContasBancarias(),
        getEmployees(),
      ]);

      if (cancelled) return;

      const lancamentos = lancRes.status === 'fulfilled' ? lancRes.value : [];
      const contas      = contasRes.status === 'fulfilled' ? contasRes.value : [];
      const employees   = empRes.status === 'fulfilled' ? empRes.value : [];

      // Receita e despesa do mês corrente
      const now = new Date();
      const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const receitaMes = lancamentos
        .filter(l => l.tipo === 'RECEITA' && l.data_vencimento?.startsWith(mesAtual))
        .reduce((s, l) => s + Number(l.valor ?? 0), 0);

      const despesaMes = lancamentos
        .filter(l => l.tipo === 'DESPESA' && l.data_vencimento?.startsWith(mesAtual))
        .reduce((s, l) => s + Number(l.valor ?? 0), 0);

      const resultado = receitaMes - despesaMes;

      const caixa = contas.reduce((s, c) => s + Number(c.saldo_atual ?? 0), 0);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const headcount = employees.filter((e: any) => e.status === 'ativo').length;

      setState({ receitaMensal: receitaMes, resultadoLiquido: resultado, headcount, caixaDisponivel: caixa, loading: false });
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}

// ── Seção 2: Central de Alertas — hook ───────────────────────────────────────

function useAlerts(): { alerts: Alert[]; loading: boolean } {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const tids = getTenantIds();

      const [
        contasVencerRes,
        inadimplentesRes,
        estoqueBaixoRes,
        vacanciesRes,
        ncAbertas,
      ] = await Promise.allSettled([
        // Lançamentos vencidos (status PENDENTE, vencimento < hoje)
        supabase
          .from('erp_financeiro_lancamentos')
          .select('id', { count: 'exact', head: true })
          .in('tenant_id', tids)
          .eq('status', 'PENDENTE')
          .lt('data_vencimento', new Date().toISOString().split('T')[0]),

        // Assinaturas inadimplentes
        supabase
          .from('erp_assinaturas')
          .select('id', { count: 'exact', head: true })
          .in('tenant_id', tids)
          .eq('status', 'inadimplente'),

        // Produtos com estoque abaixo do mínimo
        supabase
          .from('erp_produtos')
          .select('id', { count: 'exact', head: true })
          .in('tenant_id', tids)
          .eq('ativo', true)
          .filter('estoque_atual', 'lt', supabase.rpc as unknown as string)
          .not('estoque_minimo', 'is', null),

        // Vagas abertas (RH)
        supabase
          .from('hr_vacancies')
          .select('id', { count: 'exact', head: true })
          .in('company_id', tids)
          .eq('status', 'aberta'),

        // Não-conformidades abertas
        supabase
          .from('quality_ncs')
          .select('id', { count: 'exact', head: true })
          .in('company_id', tids)
          .eq('status', 'aberta'),
      ]);

      if (cancelled) return;

      const result: Alert[] = [];

      const vencidos = contasVencerRes.status === 'fulfilled' ? (contasVencerRes.value.count ?? 0) : 0;
      if (vencidos > 0) {
        result.push({
          id: 'lancamentos-vencidos',
          severity: vencidos > 5 ? 'critical' : 'warning',
          module: 'Backoffice',
          message: `${vencidos} lançamento(s) vencido(s) sem pagamento`,
          count: vencidos,
        });
      }

      const inadimplentes = inadimplentesRes.status === 'fulfilled' ? (inadimplentesRes.value.count ?? 0) : 0;
      if (inadimplentes > 0) {
        result.push({
          id: 'assinaturas-inadimplentes',
          severity: 'critical',
          module: 'Assinaturas',
          message: `${inadimplentes} assinatura(s) inadimplente(s)`,
          count: inadimplentes,
        });
      }

      const vagas = vacanciesRes.status === 'fulfilled' ? (vacanciesRes.value.count ?? 0) : 0;
      if (vagas > 0) {
        result.push({
          id: 'vagas-abertas',
          severity: 'info',
          module: 'Pessoas',
          message: `${vagas} vaga(s) em aberto`,
          count: vagas,
        });
      }

      const ncs = ncAbertas.status === 'fulfilled' ? (ncAbertas.value.count ?? 0) : 0;
      if (ncs > 0) {
        result.push({
          id: 'nc-abertas',
          severity: 'warning',
          module: 'Qualidade',
          message: `${ncs} não-conformidade(s) aberta(s)`,
          count: ncs,
        });
      }

      if (result.length === 0) {
        result.push({
          id: 'ok',
          severity: 'info',
          module: 'Sistema',
          message: 'Nenhum alerta crítico no momento',
        });
      }

      setAlerts(result);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { alerts, loading };
}

// ── Seção 3: Resumo por Área — hook ──────────────────────────────────────────

const AREA_MODULES = ['crm', 'hr', 'backoffice', 'assinaturas', 'assets', 'logistics'] as const;

function useAreaSummary(): AreaSummary[] {
  const [summaries, setSummaries] = useState<AreaSummary[]>(() =>
    AREA_MODULES.map(id => {
      const mod = MODULES.find(m => m.id === id)!;
      return { moduleId: id, name: mod.name, icon: mod.icon, color: mod.color, route: mod.route, kpis: [], loading: true };
    })
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const results = await Promise.allSettled(
        AREA_MODULES.map(id => fetchModuleHubData(id))
      );
      if (cancelled) return;

      setSummaries(prev => prev.map((s, i) => {
        const res = results[i];
        if (res.status !== 'fulfilled') return { ...s, loading: false };
        const data: HubModuleData = res.value;
        // Pega os 3 primeiros KPIs de cada módulo
        const kpis = data.kpis.slice(0, 3).map(k => ({
          label: k.label,
          value: k.value,
          positive: k.positive,
        }));
        return { ...s, kpis, loading: false };
      }));
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return summaries;
}

// ── Componentes de UI ─────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, positive, loading }: {
  icon: React.ElementType; label: string; value: string; positive: boolean; loading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${positive ? 'bg-emerald-50' : 'bg-red-50'}`}>
        <Icon className={`w-5 h-5 ${positive ? 'text-emerald-500' : 'text-red-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-gray-400 font-medium uppercase tracking-wide truncate">{label}</div>
        {loading
          ? <div className="h-5 w-20 bg-gray-100 rounded animate-pulse mt-0.5" />
          : <div className={`text-base font-bold ${positive ? 'text-gray-900' : 'text-red-600'}`}>{value}</div>
        }
      </div>
      {positive
        ? <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
        : <TrendingDown className="w-4 h-4 text-red-400 shrink-0" />
      }
    </div>
  );
}

function AlertBadge({ severity }: { severity: Alert['severity'] }) {
  if (severity === 'critical') return <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />;
  if (severity === 'warning')  return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
  return <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />;
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function GestorContent() {
  const navigate = useNavigate();
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const health  = useBusinessHealth();
  const { alerts, loading: alertsLoading } = useAlerts();
  const areas   = useAreaSummary();

  // Força re-mount dos hooks ao clicar em refresh
  const handleRefresh = () => setRefreshKey(k => k + 1);

  return (
    <div className="flex flex-1 overflow-hidden" key={refreshKey}>

      {/* LEFT — Module Nav */}
      <div className="w-52 bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden shrink-0">
        <div className="px-4 py-2.5 border-b border-gray-100">
          <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Módulos</span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
          {MODULES.map(mod => (
            <button
              key={mod.id}
              onClick={() => navigate(mod.route)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all text-gray-600 hover:text-gray-900 hover:bg-white group"
            >
              <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${mod.color} flex items-center justify-center shrink-0 shadow-sm`}>
                <mod.icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold">{mod.name}</span>
              <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-50 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      {/* CENTER — Dashboard */}
      <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar bg-white min-w-0">

        {/* Header do painel */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-gray-400" />
            <h1 className="text-sm font-bold text-gray-800">Visão Geral</h1>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* SEÇÃO 1 — Saúde do Negócio */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-indigo-500" />
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Saúde do Negócio</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <KpiCard
                icon={DollarSign}
                label="Receita Mensal"
                value={health.loading ? '...' : fmtCurrency(health.receitaMensal)}
                positive={health.receitaMensal >= 0}
                loading={health.loading}
              />
              <KpiCard
                icon={TrendingUp}
                label="Resultado Líquido"
                value={health.loading ? '...' : fmtCurrency(health.resultadoLiquido)}
                positive={health.resultadoLiquido >= 0}
                loading={health.loading}
              />
              <KpiCard
                icon={UserCheck}
                label="Headcount Ativo"
                value={health.loading ? '...' : String(health.headcount)}
                positive={true}
                loading={health.loading}
              />
              <KpiCard
                icon={Wallet}
                label="Caixa Disponível"
                value={health.loading ? '...' : fmtCurrency(health.caixaDisponivel)}
                positive={health.caixaDisponivel >= 0}
                loading={health.loading}
              />
            </div>
          </section>

          {/* SEÇÃO 2 — Central de Alertas */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Central de Alertas</h2>
              {!alertsLoading && (
                <span className="ml-auto text-[10px] text-gray-400">
                  {alerts.filter(a => a.severity !== 'info' || a.id === 'ok').length > 0
                    ? `${alerts.filter(a => a.severity !== 'info').length} pendente(s)`
                    : 'Tudo em ordem'
                  }
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {alertsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />
                ))
              ) : (
                alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs ${
                      alert.severity === 'critical'
                        ? 'bg-red-50 border-red-100 text-red-700'
                        : alert.severity === 'warning'
                        ? 'bg-amber-50 border-amber-100 text-amber-700'
                        : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    }`}
                  >
                    <AlertBadge severity={alert.severity} />
                    <span className="font-semibold shrink-0">{alert.module}</span>
                    <span className="text-[11px] opacity-80 truncate">{alert.message}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* SEÇÃO 3 — Resumo por Área */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <LayoutGrid className="w-4 h-4 text-gray-400" />
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Resumo por Área</h2>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {areas.map(area => (
                <button
                  key={area.moduleId}
                  onClick={() => navigate(area.route)}
                  className="flex items-start gap-3 p-4 rounded-2xl border border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white hover:shadow-sm transition-all text-left group"
                >
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${area.color} flex items-center justify-center shrink-0 shadow-sm mt-0.5`}>
                    <area.icon className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold text-gray-900">{area.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                    {area.loading ? (
                      <div className="flex gap-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {area.kpis.map(kpi => (
                          <div key={kpi.label} className="flex items-baseline gap-1">
                            <span className="text-[10px] text-gray-400 shrink-0">{kpi.label}</span>
                            <span className={`text-xs font-semibold ${kpi.positive ? 'text-gray-800' : 'text-red-600'}`}>
                              {kpi.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>

        </div>
      </div>

      {/* RIGHT — IA Geral */}
      <div className="w-96 bg-gray-50 border-l border-gray-200 flex flex-col overflow-hidden shrink-0">
        <div className="h-11 px-4 flex items-center gap-2 border-b border-gray-100 shrink-0">
          <BrainCircuit className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-gray-900">IA Geral</span>
          <span className="ml-auto text-[10px] bg-violet-50 text-violet-500 px-2 py-0.5 rounded-full border border-violet-100">Gestor</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatArea
            conversaId={conversaId}
            agente={IA_GERAL}
            agentes={[IA_GERAL]}
            onAgenteChange={() => {}}
            onNovaConversa={setConversaId}
          />
        </div>
      </div>

    </div>
  );
}

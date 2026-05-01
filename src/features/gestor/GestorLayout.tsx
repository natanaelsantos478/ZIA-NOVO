import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Users, Wrench, Truck, Building,
  ShieldCheck, FolderOpen, Settings, BrainCircuit, Repeat2,
  ArrowRight, Activity, BarChart3, RefreshCw, List, ChevronRight,
} from 'lucide-react';
import { fetchModuleHubData, type HubModuleData } from '../../lib/hubDashboard';
import ChatArea from '../ia/sections/chat/ChatArea';
import type { Agente } from '../ia/sections/chat/types';

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

interface SubmoduleDef {
  name: string;
  path: string;
}

interface ModuleDef {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  route: string;
  submodules: SubmoduleDef[];
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
    submodules: [
      { name: 'Documentos', path: '/app/docs' },
    ],
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

const EMPTY_DATA: HubModuleData = {
  kpis: Array.from({ length: 6 }, (_, i) => ({
    id: `k${i}`, label: '...', value: '—', change: '—', positive: true, spark: Array(8).fill(0),
  })),
  drill: [],
  chart: Array(8).fill(0).map((_, i) => ({ label: String(i), value: 0 })),
};

export default function GestorLayout() {
  const navigate = useNavigate();
  const [selectedModule, setSelectedModule] = useState<ModuleDef>(MODULES[0]);
  const [hubData, setHubData] = useState<HubModuleData>(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [conversaId, setConversaId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setHubData(EMPTY_DATA);
    fetchModuleHubData(selectedModule.id).then(data => {
      if (!cancelled) { setHubData(data); setLoading(false); }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedModule.id]);

  const maxChart = Math.max(...hubData.chart.map(b => b.value), 1);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden">

      {/* HEADER */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Activity className="w-7 h-7 text-indigo-500" />
          <span className="text-lg font-bold text-white">ZIA</span>
          <span className="text-lg font-light text-slate-500">gestor</span>
          <div className="h-5 w-px bg-slate-700 mx-2" />
          <span className="text-sm text-slate-400">Painel de gestão unificado</span>
        </div>
        <div className="flex items-center gap-3">
          {loading && <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />}
          <button
            onClick={() => navigate('/app')}
            className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800"
          >
            ← Hub
          </button>
          <button
            onClick={() => navigate(selectedModule.route)}
            className={`bg-gradient-to-r ${selectedModule.color} text-white rounded-xl px-4 py-2 font-semibold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity`}
          >
            Abrir {selectedModule.name} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* BODY: 3 PANELS */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANEL — Module Nav */}
        <div className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden shrink-0">
          <div className="px-4 py-2.5 border-b border-slate-800">
            <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Módulos</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
            {MODULES.map(mod => (
              <div key={mod.id}>
                <button
                  onClick={() => setSelectedModule(mod)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                    selectedModule.id === mod.id
                      ? `bg-gradient-to-r ${mod.color} text-white shadow-lg`
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <mod.icon className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-semibold">{mod.name}</span>
                  {selectedModule.id === mod.id && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                </button>

                {selectedModule.id === mod.id && (
                  <div className="ml-4 mt-0.5 mb-1 border-l border-slate-700 pl-3 space-y-0.5">
                    {mod.submodules.map(sub => (
                      <button
                        key={sub.path}
                        onClick={() => navigate(sub.path)}
                        className="w-full text-left text-xs text-slate-500 hover:text-slate-200 py-1.5 px-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
                      >
                        <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0" />
                        {sub.name}
                      </button>
                    ))}
                    <button
                      onClick={() => navigate(mod.route)}
                      className="w-full text-left text-xs text-indigo-400 hover:text-indigo-300 py-1 px-2 mt-1 flex items-center gap-1 transition-colors"
                    >
                      Módulo completo →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CENTER PANEL — KPIs + Chart + Drill */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 p-4 gap-4 min-w-0">

          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            {hubData.kpis.slice(0, 3).map(kpi => (
              <div key={kpi.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1 flex items-center gap-1.5">
                  <Activity className="w-3 h-3" />{kpi.label}
                </div>
                <div className="text-2xl font-black text-white">{kpi.value}</div>
                <div className={`text-xs mt-1 ${kpi.positive ? 'text-green-400' : 'text-red-400'}`}>
                  {kpi.positive ? '↑' : '↓'} {kpi.change}
                </div>
              </div>
            ))}
          </div>

          {/* Bar Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shrink-0" style={{ height: '148px' }}>
            <h3 className="text-white font-bold text-sm mb-2">Evolução — {selectedModule.name}</h3>
            <div className="flex items-end gap-1 h-20">
              {hubData.chart.map((bar, idx) => (
                <div key={idx} className="flex flex-col items-center gap-0.5 flex-1 h-full justify-end">
                  <div
                    className={`bg-gradient-to-t ${selectedModule.color} rounded-t-sm w-full min-h-[3px] opacity-80`}
                    style={{ height: `${(bar.value / maxChart) * 100}%` }}
                  />
                  <span className="text-[8px] text-slate-600 font-mono">{bar.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Drill-down */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col flex-1 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 shrink-0">
              <List className="w-4 h-4 text-slate-400" />
              <span className="text-white font-bold text-sm">Detalhamento — {selectedModule.name}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-1">
              {loading && hubData.drill.length === 0 &&
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="h-10 bg-slate-800/60 rounded-xl animate-pulse" />
                ))
              }
              {!loading && hubData.drill.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-600 text-sm gap-2 py-8">
                  <BarChart3 className="w-8 h-8 opacity-30" />
                  <span>Sem dados ainda</span>
                </div>
              )}
              {hubData.drill.map(item => (
                <div key={item.rank} className="flex items-center gap-3 py-2 px-2 border-b border-slate-800/50 hover:bg-slate-800/40 rounded-xl cursor-default">
                  <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${selectedModule.color} text-white text-[10px] font-black flex items-center justify-center shrink-0`}>
                    {item.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <span className="text-slate-300 text-xs truncate">{item.name}</span>
                      <span className="text-white text-xs font-bold ml-2 shrink-0">{item.value}</span>
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${selectedModule.color}`} style={{ width: `${item.barWidth}%` }} />
                    </div>
                  </div>
                  <span className={`text-[10px] w-10 text-right shrink-0 ${item.positive ? 'text-green-400' : 'text-red-400'}`}>
                    {item.positive ? '↑' : '↓'} {item.change}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — IA Geral */}
        <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden shrink-0">
          <div className="h-12 px-4 flex items-center gap-2 border-b border-slate-800 shrink-0">
            <BrainCircuit className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-semibold text-white">IA Geral</span>
            <span className="ml-auto text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">Gestor</span>
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
    </div>
  );
}

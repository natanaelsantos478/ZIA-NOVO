import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Users, Wrench, Truck, Building, ShieldCheck, FolderOpen, Settings,
  Search, Bell, ArrowRight, BarChart3, Download,
  ChevronDown, ChevronUp, Command, Activity,
  TrendingUp, List, Grid
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

// --- Types ---

type ChartType = 'bar' | 'line' | 'area' | 'donut' | 'gauge';

interface ModuleTab {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
  path: string;
}

interface KPICardData {
  id: string;
  label: string;
  value: string;
  change: string;
  positive: boolean;
  spark: number[];
  icon: string;
}

interface DrillDownItem {
  id: string;
  rank: number;
  name: string;
  value: string;
  change: string;
  positive: boolean;
  barWidth: number; // 0-100
}

interface MainChartData {
  labels: string[];
  values: number[];
  secondaryValues?: number[]; // For comparison or stacked
  type: ChartType;
  title: string;
}

// --- Mock Data ---

const MODULES: ModuleTab[] = [
  { id: 'crm', name: 'Vendas', icon: Briefcase, color: 'indigo', gradient: 'from-purple-500 to-indigo-600', path: '/module/sales' },
  { id: 'hr', name: 'Pessoas', icon: Users, color: 'rose', gradient: 'from-pink-500 to-rose-600', path: '/module/hr' },
  { id: 'assets', name: 'Ativos', icon: Wrench, color: 'cyan', gradient: 'from-blue-500 to-cyan-600', path: '/module/assets' },
  { id: 'logistics', name: 'Logística', icon: Truck, color: 'emerald', gradient: 'from-emerald-500 to-teal-600', path: '/module/logistics' },
  { id: 'backoffice', name: 'Financeiro', icon: Building, color: 'slate', gradient: 'from-slate-600 to-slate-800', path: '/module/backoffice' },
  { id: 'quality', name: 'Qualidade', icon: ShieldCheck, color: 'green', gradient: 'from-green-500 to-emerald-600', path: '/module/quality' },
  { id: 'docs', name: 'Documentos', icon: FolderOpen, color: 'amber', gradient: 'from-amber-500 to-orange-600', path: '/module/docs' },
  { id: 'settings', name: 'Config', icon: Settings, color: 'slate', gradient: 'from-slate-500 to-slate-700', path: '/module/settings' },
];

const MOCK_MAIN_CHART: Record<string, MainChartData> = {
  crm: {
    title: 'Receita Recorrente Mensal (MRR)',
    type: 'bar',
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'],
    values: [120, 145, 132, 178, 195, 210, 188, 225]
  },
  hr: {
    title: 'Headcount por Departamento',
    type: 'bar',
    labels: ['Ops', 'Com', 'TI', 'Fin', 'RH', 'Jur'],
    values: [45, 32, 28, 19, 67, 23]
  },
  assets: {
    title: 'Manutenções Preventivas vs Corretivas',
    type: 'area',
    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6'],
    values: [12, 8, 23, 6, 15, 9]
  },
  logistics: {
    title: 'Entregas Realizadas por Semana',
    type: 'line',
    labels: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    values: [340, 289, 412, 378, 445, 390]
  },
  backoffice: {
    title: 'DRE - Receita vs Despesa',
    type: 'bar', // Using bar for simplicity in mock logic, could be multi-bar
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    values: [800, 920, 875, 1050, 990, 1120],
    secondaryValues: [650, 700, 690, 780, 820, 850]
  },
  quality: {
    title: 'Não Conformidades Abertas',
    type: 'line',
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    values: [8, 12, 6, 9, 4, 7]
  },
  docs: {
    title: 'Documentos Criados vs Aprovados',
    type: 'bar',
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    values: [23, 18, 31, 25, 28, 35]
  },
  settings: {
    title: 'Uso de Sistema',
    type: 'line',
    labels: ['00h', '04h', '08h', '12h', '16h', '20h'],
    values: [5, 2, 85, 120, 110, 45]
  }
};

const MOCK_MAIN_KPI: Record<string, KPICardData> = {
  crm: { id: 'revenue', label: 'Receita Total', value: 'R$ 2.4M', change: '+18.2%', positive: true, spark: [100, 120, 115, 140, 138, 160, 158, 180], icon: '💰' },
  hr: { id: 'headcount', label: 'Total Colaboradores', value: '847', change: '+3.2%', positive: true, spark: [780, 790, 800, 810, 820, 830, 840, 847], icon: '👤' },
  assets: { id: 'uptime', label: 'Uptime Global', value: '98.7%', change: '+0.3%', positive: true, spark: [97, 97.5, 98, 97.8, 98.2, 98.5, 98.6, 98.7], icon: '⚡' },
  logistics: { id: 'deliveries', label: 'Entregas Totais', value: '2.847', change: '+8.4%', positive: true, spark: [2200, 2300, 2400, 2500, 2600, 2700, 2800, 2847], icon: '🚚' },
  backoffice: { id: 'mrr', label: 'Receita Recorrente', value: 'R$ 890K', change: '+11.5%', positive: true, spark: [700, 720, 740, 760, 790, 820, 860, 890], icon: '📈' },
  quality: { id: 'ncs', label: 'NCs Abertas', value: '7', change: '-30%', positive: true, spark: [15, 12, 10, 9, 8, 8, 7, 7], icon: '⚠️' },
  docs: { id: 'active_docs', label: 'Docs Ativos', value: '284', change: '+8.4%', positive: true, spark: [220, 235, 245, 255, 260, 270, 278, 284], icon: '📄' },
  settings: { id: 'users', label: 'Usuários Ativos', value: '42', change: '+2', positive: true, spark: [38, 39, 40, 40, 41, 41, 42, 42], icon: '👥' }
};

const MOCK_DRILLDOWN: Record<string, DrillDownItem[]> = {
  crm: [
    { id: 'sp', rank: 1, name: 'São Paulo', value: 'R$ 820K', change: '+22%', positive: true, barWidth: 100 },
    { id: 'rj', rank: 2, name: 'Rio de Janeiro', value: 'R$ 640K', change: '+15%', positive: true, barWidth: 78 },
    { id: 'mg', rank: 3, name: 'Belo Horizonte', value: 'R$ 480K', change: '+8%', positive: true, barWidth: 58 },
    { id: 'pr', rank: 4, name: 'Curitiba', value: 'R$ 390K', change: '+31%', positive: true, barWidth: 47 },
    { id: 'rs', rank: 5, name: 'Porto Alegre', value: 'R$ 310K', change: '-4%', positive: false, barWidth: 37 },
    { id: 'ba', rank: 6, name: 'Salvador', value: 'R$ 240K', change: '+18%', positive: true, barWidth: 29 },
    { id: 'pe', rank: 7, name: 'Recife', value: 'R$ 180K', change: '+7%', positive: true, barWidth: 21 },
    { id: 'ce', rank: 8, name: 'Fortaleza', value: 'R$ 160K', change: '+12%', positive: true, barWidth: 19 },
  ],
  hr: [
    { id: 'ops', rank: 1, name: 'Operações', value: '234', change: '+5', positive: true, barWidth: 100 },
    { id: 'com', rank: 2, name: 'Comercial', value: '187', change: '+12', positive: true, barWidth: 80 },
    { id: 'ti', rank: 3, name: 'TI', value: '134', change: '+8', positive: true, barWidth: 57 },
    { id: 'fin', rank: 4, name: 'Financeiro', value: '98', change: '0', positive: true, barWidth: 41 },
    { id: 'rh', rank: 5, name: 'RH', value: '67', change: '+2', positive: true, barWidth: 28 },
    { id: 'jur', rank: 6, name: 'Jurídico', value: '28', change: '-1', positive: false, barWidth: 12 },
  ],
  // Default fallback for others
  default: [
    { id: '1', rank: 1, name: 'Item Principal', value: '980', change: '+10%', positive: true, barWidth: 100 },
    { id: '2', rank: 2, name: 'Item Secundário', value: '750', change: '+5%', positive: true, barWidth: 76 },
    { id: '3', rank: 3, name: 'Item Terciário', value: '520', change: '-2%', positive: false, barWidth: 53 },
    { id: '4', rank: 4, name: 'Outro Item', value: '310', change: '+12%', positive: true, barWidth: 31 },
  ]
};

const MOCK_KPIS_GRID: Record<string, KPICardData[]> = {
  crm: [
    { id: 'rev', label: 'Receita', value: 'R$ 2.4M', change: '+18.2%', positive: true, spark: [1, 2, 3, 4], icon: '💰' },
    { id: 'leads', label: 'Leads', value: '1.847', change: '+24.1%', positive: true, spark: [1, 2, 3, 4], icon: '👥' },
    { id: 'conv', label: 'Conversão', value: '34.2%', change: '+2.1%', positive: true, spark: [1, 2, 3, 4], icon: '🎯' },
    { id: 'prop', label: 'Propostas', value: '312', change: '+8.7%', positive: true, spark: [1, 2, 3, 4], icon: '📋' },
    { id: 'cycle', label: 'Ciclo Médio', value: '18 dias', change: '-2 dias', positive: true, spark: [1, 2, 3, 4], icon: '⏱' },
    { id: 'nps', label: 'NPS', value: '72', change: '+5', positive: true, spark: [1, 2, 3, 4], icon: '😊' },
  ],
  // Fallback generic grid
  default: [
    { id: 'kpi1', label: 'Métrica A', value: '1.2M', change: '+10%', positive: true, spark: [1, 2, 3, 4], icon: '📊' },
    { id: 'kpi2', label: 'Métrica B', value: '840', change: '-5%', positive: false, spark: [1, 2, 3, 4], icon: '📉' },
    { id: 'kpi3', label: 'Métrica C', value: '98%', change: '+1%', positive: true, spark: [1, 2, 3, 4], icon: '📈' },
    { id: 'kpi4', label: 'Métrica D', value: '45', change: '+2', positive: true, spark: [1, 2, 3, 4], icon: '📋' },
    { id: 'kpi5', label: 'Métrica E', value: '12d', change: '-1d', positive: true, spark: [1, 2, 3, 4], icon: '⏱' },
    { id: 'kpi6', label: 'Métrica F', value: '4.8', change: '+0.2', positive: true, spark: [1, 2, 3, 4], icon: '⭐' },
  ]
};

// --- Helper Components ---

const Sparkline = ({ data, color }: { data: number[], color: string }) => {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={color}
      />
    </svg>
  );
};

const BarChart = ({ data, colorClass }: { data: MainChartData, colorClass: string }) => {
  const max = Math.max(...data.values, ...(data.secondaryValues || []));

  return (
    <div className="flex items-end justify-between h-48 gap-2 mt-4">
      {data.values.map((v, i) => (
        <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group cursor-pointer">
          <div className="relative w-full flex items-end justify-center h-full gap-1">
             {/* Main Bar */}
             <div
               className={`w-full rounded-t-sm transition-all duration-500 hover:opacity-80 bg-gradient-to-t ${colorClass}`}
               style={{ height: `${(v / max) * 100}%` }}
             >
               {/* Tooltip */}
               <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                 {v}
               </div>
             </div>
             {/* Secondary Bar if exists */}
             {data.secondaryValues && (
               <div
                 className="w-full bg-slate-700/50 rounded-t-sm transition-all duration-500 hover:bg-slate-600"
                 style={{ height: `${(data.secondaryValues[i] / max) * 100}%` }}
               />
             )}
          </div>
          <span className="text-xs text-slate-500 mt-2 font-medium truncate w-full text-center">{data.labels[i]}</span>
        </div>
      ))}
    </div>
  );
};

export default function ModuleHub() {
  const navigate = useNavigate();
  const {
    activeModule, setActiveModule,
    activeEntity, setActiveEntity,
    activeIndicator, setActiveIndicator,
    biPanelOpen, setBiPanelOpen,
    biConfig
  } = useAppContext();

  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);

  // Ensure default active module is set if context is empty (though provider sets default)
  useEffect(() => {
    if (!activeModule) setActiveModule('crm');
  }, [activeModule, setActiveModule]);

  const currentModule = MODULES.find(m => m.id === activeModule) || MODULES[0];
  const chartData = MOCK_MAIN_CHART[activeModule] || MOCK_MAIN_CHART['crm'];
  const mainKPI = MOCK_MAIN_KPI[activeModule] || MOCK_MAIN_KPI['crm'];
  const drillDownData = MOCK_DRILLDOWN[activeModule] || MOCK_DRILLDOWN['default'];
  const kpisGrid = MOCK_KPIS_GRID[activeModule] || MOCK_KPIS_GRID['default'];

  // Dynamic gradient text class based on module color
  const getGradientText = (modId: string) => {
      const mod = MODULES.find(m => m.id === modId);
      return mod ? `bg-gradient-to-r ${mod.gradient} bg-clip-text text-transparent` : 'text-white';
  };

  const getGradientBg = (modId: string) => {
      const mod = MODULES.find(m => m.id === modId);
      return mod ? `bg-gradient-to-r ${mod.gradient}` : 'bg-slate-700';
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-200 overflow-hidden">

      {/* --- ZONA AZUL: HEADER --- */}
      <header className="flex-none h-14 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
               <span className="font-bold text-white text-lg">Z</span>
            </div>
            <span className="font-bold text-slate-100 hidden md:block">ZIA Mind</span>
          </div>
          <div className="h-6 w-px bg-slate-800 mx-2"></div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>Dashboard Central</span>
            <span className="text-slate-600">›</span>
            <span className="text-slate-200 font-medium capitalize">{currentModule.name}</span>
          </div>
        </div>

        <div className="flex-1 max-w-md mx-8 hidden md:block relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar em todos os módulos..."
            className="w-full h-9 pl-9 pr-12 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-slate-600 font-mono">
            <Command className="w-3 h-3" />K
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-950"></span>
          </button>

          <select className="bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 py-1.5 px-3 outline-none focus:border-slate-500 hidden sm:block">
            <option value="today">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="year">Este Ano</option>
          </select>

          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border border-slate-700 cursor-pointer hover:ring-2 ring-indigo-500/50 transition-all"></div>

          <button
            onClick={() => navigate(currentModule.path)}
            className={`hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all transform hover:-translate-y-0.5 ${getGradientBg(activeModule)}`}
          >
            Acessar Módulo <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </header>

      {/* --- ZONA ROXA: ABAS DE MÓDULOS --- */}
      <nav className="flex-none h-12 bg-slate-900 border-b border-slate-800 px-6 flex items-center gap-1 overflow-x-auto no-scrollbar z-10">
        {MODULES.map((mod) => (
          <React.Fragment key={mod.id}>
            <button
              onClick={() => setActiveModule(mod.id)}
              className={`
                flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 whitespace-nowrap
                ${activeModule === mod.id
                  ? `${getGradientBg(mod.id)} text-white shadow-lg scale-105 relative z-10`
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }
              `}
            >
              <mod.icon className="w-4 h-4" />
              {mod.name}
              {activeModule === mod.id && (
                <span className={`absolute bottom-0 left-2 right-2 h-0.5 bg-white/50 rounded-full`}></span>
              )}
            </button>
            {(mod.id === 'backoffice' || mod.id === 'docs') && (
               <div className="h-4 w-px bg-slate-700 mx-2 flex-shrink-0"></div>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* --- CONTEÚDO PRINCIPAL (SCROLLÁVEL) --- */}
      <main className="flex-1 overflow-y-auto p-4 bg-slate-950">
        <div className="max-w-[1600px] mx-auto space-y-4">

          {/* --- ZONA VERMELHA: DASHBOARDS PRINCIPAIS --- */}
          <section className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 min-h-[300px]">
            {/* Gráfico Principal */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col shadow-xl shadow-black/20">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">{chartData.title}</h2>
                  <p className="text-sm text-slate-500">Visão geral consolidada</p>
                </div>
                <div className="flex bg-slate-800 p-1 rounded-lg">
                  <button className="p-1.5 rounded bg-slate-700 text-white shadow-sm"><BarChart3 className="w-4 h-4" /></button>
                  <button className="p-1.5 rounded text-slate-500 hover:text-slate-300"><Activity className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="flex-1 relative min-h-[180px]">
                <BarChart data={chartData} colorClass={currentModule.gradient} />
              </div>
            </div>

            {/* KPI Principal */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl shadow-black/20">
              <div className="flex justify-between items-start">
                 <div className={`px-3 py-1 rounded-full bg-slate-800 border border-slate-700 flex items-center gap-2`}>
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{mainKPI.label}</span>
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                 </div>
                 <div className="flex gap-2">
                    {/* Select indicator mock dropdown area */}
                 </div>
              </div>

              <div className="py-8 text-center sm:text-left">
                <div className={`text-5xl sm:text-6xl font-black mb-2 ${getGradientText(activeModule)}`}>
                  {mainKPI.value}
                </div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 ${mainKPI.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                   {mainKPI.positive ? '↑' : '↓'}
                   <span className="font-bold text-sm">{mainKPI.change}</span>
                   <span className="text-xs text-slate-500 ml-1">vs período anterior</span>
                </div>
              </div>

              <div className="relative h-16 w-full opacity-70">
                 <Sparkline data={mainKPI.spark} color={mainKPI.positive ? 'text-emerald-500' : 'text-red-500'} />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-4 text-xs text-slate-500">
                <div className="flex gap-4">
                  <span>Média: <span className="text-slate-300 font-mono">15%</span></span>
                  <div className="w-px h-3 bg-slate-700"></div>
                  <span>Meta: <span className="text-slate-300 font-mono">98%</span></span>
                  <div className="w-px h-3 bg-slate-700"></div>
                  <span>Projeção: <span className="text-slate-300 font-mono">+2%</span></span>
                </div>
              </div>
            </div>
          </section>

          {/* --- LINHA 2: DRILL-DOWN & KPIs --- */}
          <section className="grid grid-cols-1 xl:grid-cols-[45%_55%] gap-4 items-start">

            {/* --- ZONA MAGENTA: DRILL-DOWN --- */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col shadow-xl shadow-black/20 max-h-[500px]">
               <div className="flex justify-between items-center mb-6">
                 <div>
                   <h3 className="text-lg font-bold text-white">Detalhamento — {mainKPI.label}</h3>
                   <div className="flex items-center gap-2 text-sm text-slate-500">
                     <span className="capitalize">{currentModule.name}</span>
                     <span>›</span>
                     <span>Todas as Entidades</span>
                   </div>
                 </div>
                 <button className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                   <Download className="w-4 h-4" />
                 </button>
               </div>

               <div className="flex-1 overflow-y-auto pr-2 space-y-1">
                 {drillDownData.map((item) => (
                   <div key={item.id} className="group flex items-center gap-4 py-3 px-3 rounded-xl border border-transparent hover:bg-slate-800/50 hover:border-slate-800 transition-all cursor-pointer">
                     <div className={`w-6 h-6 rounded-full ${getGradientBg(activeModule)} flex items-center justify-center text-[10px] font-black text-white shadow-lg`}>
                       {item.rank}
                     </div>

                     <div className="flex-1 min-w-0">
                       <div className="flex justify-between mb-1">
                         <span className="text-sm font-medium text-slate-200 truncate pr-2">{item.name}</span>
                         <span className="text-sm font-bold text-white">{item.value}</span>
                       </div>
                       <div className="flex items-center gap-3">
                         <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                           <div
                             className={`h-full ${getGradientBg(activeModule)} rounded-full`}
                             style={{ width: `${item.barWidth}%` }}
                           />
                         </div>
                         <span className={`text-xs w-12 text-right ${item.positive ? 'text-emerald-500' : 'text-red-500'}`}>
                           {item.change}
                         </span>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>

            {/* --- COLUNA DIREITA: KPIS & BI --- */}
            <div className="space-y-4">

              {/* --- ZONA LARANJA: KPIs POR ENTIDADE --- */}
              <div className="bg-slate-950 p-4 border border-slate-800/50 rounded-2xl">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <h3 className="text-lg font-bold text-white">Indicadores Principais</h3>

                  <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
                    <button
                      onClick={() => setActiveEntity('all')}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap ${activeEntity === 'all' ? `${getGradientBg(activeModule)} text-white` : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                    >
                      Todas
                    </button>
                    {['Empresa A', 'Empresa B', 'Filial SP'].map(ent => (
                      <button
                        key={ent}
                        onClick={() => setActiveEntity(ent)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap ${activeEntity === ent ? `${getGradientBg(activeModule)} text-white` : 'bg-slate-900 text-slate-500 border border-slate-800 hover:border-slate-600'}`}
                      >
                        {ent}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {kpisGrid.map((kpi) => (
                    <button
                      key={kpi.id}
                      onClick={() => setActiveIndicator(kpi.id)}
                      className={`
                        relative bg-slate-900 border rounded-xl p-4 text-left transition-all group
                        ${activeIndicator === kpi.id
                          ? `border-${currentModule.color}-500/50 ring-1 ring-${currentModule.color}-500/50 bg-slate-800/50`
                          : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/30'
                        }
                      `}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
                        <span className="text-base grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all">{kpi.icon}</span>
                      </div>
                      <div className="text-xl font-black text-white mb-1">{kpi.value}</div>
                      <div className={`text-[10px] font-bold ${kpi.positive ? 'text-emerald-500' : 'text-red-500'}`}>
                        {kpi.change}
                      </div>

                      {/* Mini Sparkline Background */}
                      <div className="absolute bottom-0 left-0 right-0 h-8 opacity-10 pointer-events-none px-2">
                         <Sparkline data={kpi.spark} color={activeIndicator === kpi.id ? 'text-white' : 'text-slate-400'} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* --- ZONA AMARELA: PAINEL BI CONFIGURÁVEL --- */}
              <div className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all duration-300 ${biPanelOpen ? 'border-amber-500/30 shadow-2xl shadow-amber-900/10' : 'border-slate-800'}`}>

                {/* Header Toggle */}
                <button
                  onClick={() => setBiPanelOpen(!biPanelOpen)}
                  className="w-full h-12 px-4 flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border-b border-amber-500/10 hover:bg-amber-500/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-amber-500" />
                    <span className="font-bold text-slate-200 text-sm">Configurações de Análise (Power BI)</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-[10px] font-bold text-amber-500 uppercase tracking-wide">Beta</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="hidden sm:inline">Clique para expandir</span>
                    {biPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Body Content */}
                <div className={`transition-all duration-500 ease-in-out overflow-hidden flex flex-col md:flex-row ${biPanelOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>

                   {/* LISTA PAINÉIS (Esquerda) */}
                   <div className="w-full md:w-[35%] bg-slate-950 border-r border-slate-800 flex flex-col">
                      <div className="flex-1 overflow-y-auto">
                        <button
                          onClick={() => setSelectedPanel('mainChart')}
                          className={`w-full text-left px-4 py-3 border-l-2 transition-colors flex items-center gap-3 ${selectedPanel === 'mainChart' ? 'bg-slate-800 border-amber-500' : 'border-transparent hover:bg-slate-900'}`}
                        >
                          <BarChart3 className={`w-4 h-4 ${selectedPanel === 'mainChart' ? 'text-amber-500' : 'text-slate-500'}`} />
                          <div className="overflow-hidden">
                            <p className={`text-sm font-medium ${selectedPanel === 'mainChart' ? 'text-white' : 'text-slate-300'}`}>Gráfico Principal</p>
                            <p className="text-xs text-slate-500 truncate">{biConfig.panels.mainChart.moduleId} › {biConfig.panels.mainChart.indicatorId}</p>
                          </div>
                        </button>

                        <button
                          onClick={() => setSelectedPanel('kpiPrimary')}
                          className={`w-full text-left px-4 py-3 border-l-2 transition-colors flex items-center gap-3 ${selectedPanel === 'kpiPrimary' ? 'bg-slate-800 border-amber-500' : 'border-transparent hover:bg-slate-900'}`}
                        >
                          <TrendingUp className={`w-4 h-4 ${selectedPanel === 'kpiPrimary' ? 'text-amber-500' : 'text-slate-500'}`} />
                          <div className="overflow-hidden">
                            <p className={`text-sm font-medium ${selectedPanel === 'kpiPrimary' ? 'text-white' : 'text-slate-300'}`}>KPI em Destaque</p>
                            <p className="text-xs text-slate-500 truncate">{biConfig.panels.kpiPrimary.moduleId} › {biConfig.panels.kpiPrimary.indicatorId}</p>
                          </div>
                        </button>

                        <button
                          onClick={() => setSelectedPanel('drilldown')}
                          className={`w-full text-left px-4 py-3 border-l-2 transition-colors flex items-center gap-3 ${selectedPanel === 'drilldown' ? 'bg-slate-800 border-amber-500' : 'border-transparent hover:bg-slate-900'}`}
                        >
                          <List className={`w-4 h-4 ${selectedPanel === 'drilldown' ? 'text-amber-500' : 'text-slate-500'}`} />
                          <div className="overflow-hidden">
                            <p className={`text-sm font-medium ${selectedPanel === 'drilldown' ? 'text-white' : 'text-slate-300'}`}>Drill-down</p>
                            <p className="text-xs text-slate-500 truncate">{biConfig.panels.drilldown.moduleId} › {biConfig.panels.drilldown.indicatorId}</p>
                          </div>
                        </button>

                        {/* KPI Cards Placeholder - could map through kpiCards array */}
                        {[1, 2, 3, 4, 5, 6].map(n => (
                          <button
                            key={`kpiCard${n}`}
                            onClick={() => setSelectedPanel(`kpiCard${n}`)}
                            className={`w-full text-left px-4 py-3 border-l-2 transition-colors flex items-center gap-3 ${selectedPanel === `kpiCard${n}` ? 'bg-slate-800 border-amber-500' : 'border-transparent hover:bg-slate-900'}`}
                          >
                            <Grid className={`w-4 h-4 ${selectedPanel === `kpiCard${n}` ? 'text-amber-500' : 'text-slate-500'}`} />
                            <div className="overflow-hidden">
                              <p className={`text-sm font-medium ${selectedPanel === `kpiCard${n}` ? 'text-white' : 'text-slate-300'}`}>Card KPI {n}</p>
                              <p className="text-xs text-slate-500 truncate">crm › revenue</p>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="p-3 border-t border-slate-800">
                        <button className="text-xs text-slate-500 hover:text-slate-300 w-full text-center">Resetar padrão</button>
                      </div>
                   </div>

                   {/* CONFIGURADOR (Direita) */}
                   <div className="w-full md:w-[65%] bg-slate-900 p-6 flex flex-col">
                      {selectedPanel === null ? (
                        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                          ← Selecione um painel para configurar
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* SEÇÃO 1: Fonte de Dados */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest">Fonte de Dados</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs text-slate-400 mb-1">Módulo</label>
                                <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 outline-none">
                                  <option value="crm">CRM (Vendas)</option>
                                  <option value="hr">RH (Pessoas)</option>
                                  <option value="assets">EAM (Ativos)</option>
                                  <option value="logistics">SCM (Logística)</option>
                                  <option value="backoffice">ERP (Financeiro)</option>
                                  <option value="quality">QMS (Qualidade)</option>
                                  <option value="docs">DMS (Documentos)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-slate-400 mb-1">Indicador</label>
                                <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 outline-none">
                                  <option value="revenue">Receita Total</option>
                                  <option value="leads">Leads</option>
                                  <option value="conversion">Conversão</option>
                                  <option value="proposals">Propostas</option>
                                </select>
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs text-slate-400 mb-1">Empresa / Entidade</label>
                                <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 outline-none">
                                  <option value="all">Todas</option>
                                  <option value="empresa_a">Empresa A</option>
                                  <option value="empresa_b">Empresa B</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* SEÇÃO 2: Período e Comparação */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest">Período e Comparação</h4>
                            <div className="flex gap-2 bg-slate-800 p-1 rounded-lg w-max">
                              {['Hoje', '7d', '30d', '90d', '6m', '1a'].map(p => (
                                <button key={p} className={`px-3 py-1 rounded text-xs font-medium ${p === '30d' ? 'bg-amber-500 text-black' : 'text-slate-300 hover:text-white'}`}>
                                  {p}
                                </button>
                              ))}
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Comparar com</label>
                              <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 outline-none">
                                <option value="previous">Período anterior</option>
                                <option value="year">Ano passado</option>
                                <option value="target">Meta definida</option>
                                <option value="benchmark">Benchmark</option>
                                <option value="none">Não comparar</option>
                              </select>
                            </div>
                          </div>

                          {/* SEÇÃO 3: Visualização */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest">Visualização</h4>
                            <div className="grid grid-cols-6 gap-2">
                              {['Barras', 'Linhas', 'Área', 'Rosca', 'Tabela', 'Gauge'].map((t, i) => (
                                <button key={t} className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${i === 0 ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'border-slate-700 text-slate-500 hover:bg-slate-800'}`}>
                                  <span className="text-[10px] font-medium">{t}</span>
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-6">
                              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                <div className="w-8 h-4 bg-amber-500/20 rounded-full relative">
                                  <div className="w-4 h-4 bg-amber-500 rounded-full absolute right-0 top-0 shadow-sm" />
                                </div>
                                Mostrar metas
                              </label>
                              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                <div className="w-8 h-4 bg-amber-500/20 rounded-full relative">
                                  <div className="w-4 h-4 bg-amber-500 rounded-full absolute right-0 top-0 shadow-sm" />
                                </div>
                                Mostrar variação
                              </label>
                            </div>
                          </div>

                          {/* SEÇÃO 4: Aparência */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest">Aparência</h4>
                            <input type="text" placeholder="Nome exibido no painel" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 outline-none" />
                            <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700 cursor-pointer">
                              <div className="w-10 h-6 bg-emerald-500/20 rounded-full relative transition-colors">
                                <div className="w-6 h-6 bg-emerald-500 rounded-full absolute right-0 top-0 shadow-sm" />
                              </div>
                              <span className="text-sm font-medium text-slate-200">Visível no dashboard</span>
                            </label>
                          </div>

                          {/* RODAPÉ */}
                          <div className="flex gap-3 pt-6 border-t border-slate-800 mt-auto">
                            <button className="flex-1 bg-amber-500 text-slate-950 font-bold py-2.5 rounded-xl hover:bg-amber-400 transition-colors">
                              Aplicar Alterações
                            </button>
                            <button className="flex-1 bg-transparent border border-slate-700 text-slate-300 font-medium py-2.5 rounded-xl hover:bg-slate-800 transition-colors">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                   </div>
                </div>
              </div>

            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

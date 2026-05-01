import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Users, Wrench, Truck, Building,
  ShieldCheck, FolderOpen, Settings, ArrowRight,
  BarChart3, TrendingUp, List, Grid2x2,
  ChevronDown, ChevronUp, Search, Bell,
  Activity, Repeat2, BrainCircuit, RefreshCw, LayoutDashboard,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { fetchModuleHubData, type HubModuleData } from '../../lib/hubDashboard';
import GestorContent from '../gestor/GestorContent';

// --- Types ---
interface ModuleTab {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
}

// --- Module Tabs ---
const MODULE_TABS: ModuleTab[] = [
  { id:'gestor',     name:'Gestor',      icon:LayoutDashboard, color:'from-indigo-500 to-violet-600', gradient:'indigo' },
  { id:'crm',        name:'Vendas',      icon:Briefcase,  color:'from-purple-500 to-indigo-600',  gradient:'purple' },
  { id:'hr',         name:'Pessoas',     icon:Users,      color:'from-pink-500 to-rose-600',      gradient:'pink' },
  { id:'assets',     name:'Ativos',      icon:Wrench,     color:'from-blue-500 to-cyan-600',      gradient:'blue' },
  { id:'logistics',  name:'Logística',   icon:Truck,      color:'from-emerald-500 to-teal-600',   gradient:'emerald' },
  { id:'backoffice',   name:'Backoffice',   icon:Building,   color:'from-slate-600 to-slate-800',    gradient:'slate'  },
  { id:'assinaturas',  name:'Assinaturas',  icon:Repeat2,    color:'from-violet-500 to-purple-700',  gradient:'violet' },
  { id:'quality',      name:'Qualidade',    icon:ShieldCheck,color:'from-green-500 to-emerald-600',  gradient:'green'  },
  { id:'docs',       name:'Documentos',  icon:FolderOpen, color:'from-amber-500 to-orange-600',   gradient:'amber' },
  { id:'settings',   name:'Config',      icon:Settings,   color:'from-slate-500 to-slate-700',    gradient:'slate' },
  { id:'ia',         name:'IA',          icon:BrainCircuit, color:'from-violet-500 to-purple-800', gradient:'violet' },
];

const EMPTY_DATA: HubModuleData = {
  kpis: Array.from({ length: 6 }, (_, i) => ({ id: `k${i}`, label: '...', value: '—', change: '—', positive: true, spark: Array(8).fill(0) })),
  drill: [],
  chart: Array(8).fill(0).map((_, i) => ({ label: String(i), value: 0 })),
};

export default function ModuleHub() {
  const { activeModule, setActiveModule,
          activeIndicator, setActiveIndicator,
          biPanelOpen, setBiPanelOpen,
          biConfig } = useAppContext();
  const navigate = useNavigate();
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
  const [period, setPeriod] = useState('30d');
  const [hubData, setHubData] = useState<HubModuleData>(EMPTY_DATA);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchModuleHubData(activeModule).then(data => {
      if (!cancelled) { setHubData(data); setLoading(false); }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeModule]);

  const currentTab    = MODULE_TABS.find(t => t.id === activeModule) || MODULE_TABS[0];
  const currentKPIs   = hubData.kpis;
  const currentDrill  = hubData.drill;
  const currentChart  = hubData.chart;
  const primaryKPI    = currentKPIs.find(k => k.id === activeIndicator) || currentKPIs[0] || EMPTY_DATA.kpis[0];
  const maxChartValue = Math.max(...currentChart.map(b => b.value), 1);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden">

      {/* ── HEADER AZUL ── */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-4">
            <Activity className="w-8 h-8 text-indigo-500" /> {/* Ícone similar ao BrainCircuit */}
            <div className="flex items-center gap-1">
                <span className="text-xl font-bold text-white">ZIA</span>
                <span className="text-xl font-light text-slate-500">mind</span>
            </div>
            <div className="h-6 w-px bg-slate-800 mx-2"></div>
            <span className="text-sm text-slate-400">Dashboard › {currentTab.name}</span>
        </div>

        <div className="flex-1 max-w-md mx-8 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
                type="text"
                placeholder="Buscar em todos os módulos..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-1.5 pl-10 pr-4 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
            />
        </div>

        <div className="flex items-center gap-3">
            {loading && (
              <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
            )}
            <button className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                <Bell className="w-4 h-4" />
            </button>
            <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <option value="7d">7 dias</option>
                <option value="30d">30 dias</option>
                <option value="90d">90 dias</option>
                <option value="1y">1 ano</option>
            </select>
            {activeModule !== 'gestor' && (
              <button
                  onClick={() => navigate(`/app/${activeModule}`)}
                  className={`bg-gradient-to-r ${currentTab.color} text-white rounded-xl px-4 py-2 font-semibold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity`}
              >
                  Acessar Módulo <ArrowRight className="w-4 h-4" />
              </button>
            )}
        </div>
      </header>

      {/* ── ABAS ROXAS ── */}
      <nav className="h-12 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-1 overflow-x-auto shrink-0 custom-scrollbar">
        {MODULE_TABS.map(tab => (
          <button key={tab.id}
            onClick={() => { setActiveModule(tab.id); setActiveIndicator(''); }}
            className={tab.id === activeModule
              ? `bg-gradient-to-r ${tab.color} text-white px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg scale-105 shrink-0 transition-transform`
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 shrink-0 transition-all'
            }>
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </button>
        ))}
      </nav>

      {/* ── GESTOR: corpo 3 painéis ── */}
      {activeModule === 'gestor' && <GestorContent />}

      {/* ── LINHA 1: GRÁFICO + KPI PRINCIPAL ── */}
      {activeModule !== 'gestor' && <div className="grid grid-cols-[3fr_2fr] gap-4 p-4 shrink-0" style={{height:'280px'}}>

        {/* PAINEL ESQUERDO — Gráfico Principal */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 h-full flex flex-col">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-white font-bold text-base">Evolução — {currentTab.name}</h3>
                <span className="text-xs text-slate-500 font-mono">{period}</span>
            </div>

            <div className="flex items-end gap-2 h-full mt-2 pb-2">
                {currentChart.map((bar, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1 flex-1 h-full justify-end group cursor-pointer">
                        <div
                            className={`bg-gradient-to-t ${currentTab.color} rounded-t-sm w-full min-h-[4px] opacity-80 group-hover:opacity-100 transition-all`}
                            style={{height: `${(bar.value/maxChartValue)*100}%`}}
                        ></div>
                        <span className="text-[10px] text-slate-500 font-mono">{bar.label}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* PAINEL DIREITO — KPI Principal */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 h-full flex flex-col justify-between">
             <div className="flex justify-between items-start">
                <select
                    value={activeIndicator || currentKPIs[0].id}
                    onChange={(e) => setActiveIndicator(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 py-1 px-2 focus:outline-none"
                >
                    {currentKPIs.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                </select>
                <div className={`text-xs px-2 py-0.5 rounded-full ${primaryKPI.positive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {primaryKPI.positive ? '↑' : '↓'} {primaryKPI.change}
                </div>
             </div>

             <div className="flex flex-col items-center justify-center py-4">
                 <div className="text-5xl font-black text-white tracking-tight">{primaryKPI.value}</div>
                 <div className="text-sm text-slate-500 mt-1">Comparado ao período anterior</div>
             </div>

             <div className="w-full h-12 relative">
                 <svg width="100%" height="100%" viewBox="0 0 160 48" preserveAspectRatio="none" className="overflow-visible">
                     <polyline
                        points={primaryKPI.spark.map((v,i) => {
                            const min = Math.min(...primaryKPI.spark);
                            const max = Math.max(...primaryKPI.spark);
                            const x = (i / (primaryKPI.spark.length-1)) * 160;
                            const y = 48 - ((v-min)/(max-min||1)) * 40;
                            return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke={`url(#gradient-${activeModule})`} // Using generic stroke for now, inline style below
                        strokeWidth="2"
                        style={{stroke: activeModule === 'crm' ? '#8b5cf6' : activeModule === 'hr' ? '#ec4899' : activeModule === 'assets' ? '#3b82f6' : activeModule === 'logistics' ? '#10b981' : activeModule === 'assinaturas' ? '#7c3aed' : activeModule === 'quality' ? '#22c55e' : activeModule === 'docs' ? '#f59e0b' : activeModule === 'ia' ? '#7c3aed' : '#64748b'}}
                     />
                 </svg>
             </div>

             <div className="flex gap-4 border-t border-slate-800 pt-3 mt-1">
                 {currentKPIs.slice(1, 4).map(k => (
                     <div key={k.id} className="flex flex-col">
                         <span className="text-[10px] text-slate-500 uppercase">{k.label}</span>
                         <span className="text-xs font-bold text-slate-300">{k.value}</span>
                     </div>
                 ))}
             </div>
        </div>
      </div>}

      {/* ── LINHA 2: DRILL-DOWN + KPIs + BI ── */}
      {activeModule !== 'gestor' && <div className="flex flex-1 gap-4 px-4 pb-4 overflow-hidden">

        {/* COLUNA ESQUERDA — Drill-down */}
        <div className="w-[42%] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center gap-2">
                <List className="w-4 h-4 text-slate-400" />
                <h3 className="text-white font-bold text-sm">Detalhamento</h3>
                <span className="text-slate-500 text-xs">— {currentTab.name}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                {loading && currentDrill.length === 0 && (
                  <div className="space-y-2 p-2">
                    {Array(5).fill(0).map((_, i) => (
                      <div key={i} className="h-10 bg-slate-800/60 rounded-xl animate-pulse" />
                    ))}
                  </div>
                )}
                {!loading && currentDrill.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-600 text-sm gap-2">
                    <BarChart3 className="w-8 h-8 opacity-30" />
                    <span>Sem dados ainda</span>
                  </div>
                )}
                {currentDrill.map((item) => (
                    <div
                        key={item.rank}
                        className="flex items-center gap-3 py-2 border-b border-slate-800/50 hover:bg-slate-800/40 rounded-xl px-2 cursor-pointer group transition-colors"
                        onClick={() => setActiveIndicator(item.rank.toString())}
                    >
                        <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${currentTab.color} text-white text-xs font-black flex items-center justify-center shrink-0`}>
                            {item.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between mb-1">
                                <span className="text-slate-300 text-sm truncate">{item.name}</span>
                                <span className="text-white text-sm font-bold">{item.value}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full bg-gradient-to-r ${currentTab.color}`} style={{width: `${item.barWidth}%`}}></div>
                            </div>
                        </div>
                         <div className={`text-xs w-12 text-right ${item.positive ? 'text-green-400' : 'text-red-400'}`}>
                            {item.positive ? '↑' : '↓'} {item.change}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* COLUNA DIREITA */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">

            {/* ZONA LARANJA — KPI Cards */}
            <div className="grid grid-cols-3 gap-3 shrink-0">
                {loading && currentKPIs[0]?.value === '—' && Array(3).fill(0).map((_, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-3 animate-pulse">
                    <div className="h-3 bg-slate-700 rounded w-2/3 mb-2" />
                    <div className="h-6 bg-slate-700 rounded w-1/2 mb-2" />
                    <div className="h-7 bg-slate-800 rounded" />
                  </div>
                ))}
                {(!loading || currentKPIs[0]?.value !== '—') && currentKPIs.slice(0, 3).map(kpi => (
                    <div
                        key={kpi.id}
                        onClick={() => setActiveIndicator(kpi.id)}
                        className={`bg-slate-900 border rounded-xl p-3 cursor-pointer hover:border-slate-600 transition-all ${activeIndicator === kpi.id ? 'border-indigo-500 bg-slate-800/50' : 'border-slate-800'}`}
                    >
                        <div className="flex justify-between items-start mb-1">
                             <div className="flex items-center gap-1.5">
                                 <Activity className="w-3 h-3 text-slate-500" />
                                 <span className="text-[10px] text-slate-400 uppercase font-semibold">{kpi.label}</span>
                             </div>
                             <span className={`text-[10px] ${kpi.positive ? 'text-green-400' : 'text-red-400'}`}>
                                {kpi.positive ? '↑' : '↓'}
                             </span>
                        </div>
                        <div className="text-xl font-black text-white">{kpi.value}</div>

                        <div className="h-7 w-full mt-2">
                             <svg width="100%" height="100%" viewBox="0 0 80 28" preserveAspectRatio="none">
                                 <polyline
                                    points={kpi.spark.map((v,i) => {
                                        const min = Math.min(...kpi.spark);
                                        const max = Math.max(...kpi.spark);
                                        const x = (i / (kpi.spark.length-1)) * 80;
                                        const y = 28 - ((v-min)/(max-min||1)) * 20;
                                        return `${x},${y}`;
                                    }).join(' ')}
                                    fill="none"
                                    stroke={
                                        activeModule === 'crm' ? '#8b5cf6' :
                                        activeModule === 'hr' ? '#ec4899' :
                                        activeModule === 'assets' ? '#3b82f6' :
                                        activeModule === 'logistics' ? '#10b981' :
                                        activeModule === 'assinaturas' ? '#7c3aed' :
                                        activeModule === 'quality' ? '#22c55e' :
                                        activeModule === 'docs' ? '#f59e0b' :
                                        activeModule === 'ia' ? '#7c3aed' : '#64748b'
                                    }
                                    strokeWidth="1.5"
                                 />
                             </svg>
                        </div>
                    </div>
                ))}
            </div>

            {/* ZONA AMARELA — Painel BI */}
            <div className={`bg-slate-900 border border-amber-500/20 rounded-2xl flex flex-col flex-1 overflow-hidden transition-all duration-300 ${biPanelOpen ? 'flex-grow' : ''}`}>

                 {/* BI HEADER */}
                 <div
                    onClick={() => setBiPanelOpen(!biPanelOpen)}
                    className="h-11 px-4 flex items-center justify-between bg-amber-500/5 border-b border-amber-500/10 cursor-pointer hover:bg-amber-500/10 transition-colors"
                 >
                     <div className="flex items-center gap-3">
                         <BarChart3 className="w-4 h-4 text-amber-400" />
                         <span className="text-sm font-semibold text-white">Configurações de Análise</span>
                         <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-bold">BI</span>
                     </div>
                     <div className="flex items-center gap-2">
                         {!biPanelOpen && <span className="text-xs text-slate-500">Clique para configurar</span>}
                         {biPanelOpen ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronUp className="w-4 h-4 text-amber-400" />}
                     </div>
                 </div>

                 {/* BI BODY */}
                 {biPanelOpen && (
                     <div className="flex gap-0 h-full overflow-hidden">

                         {/* LISTA PAINÉIS */}
                         <div className="w-48 bg-slate-950 border-r border-slate-800 p-3 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                             <div className="text-[10px] uppercase text-amber-400 font-bold mb-2 px-2">Painéis</div>
                             {[
                                {id:'mainChart',  icon:BarChart3,  label:'Gráfico Principal', summary: biConfig.panels.mainChart.moduleId + ' › ' + biConfig.panels.mainChart.indicatorId },
                                {id:'kpiPrimary', icon:TrendingUp, label:'KPI Destaque',      summary: biConfig.panels.kpiPrimary.moduleId + ' › ' + biConfig.panels.kpiPrimary.indicatorId },
                                {id:'drilldown',  icon:List,       label:'Drill-down',        summary: biConfig.panels.drilldown.moduleId + ' › ' + biConfig.panels.drilldown.indicatorId },
                                ...biConfig.panels.kpiCards.map((c,i) => ({
                                    id:`kpi${i}`, icon:Grid2x2,
                                    label:`Card KPI ${i+1}`,
                                    summary: c.moduleId + ' › ' + c.indicatorId
                                }))
                             ].map((panel) => (
                                 <button
                                    key={panel.id}
                                    onClick={() => setSelectedPanel(panel.id)}
                                    className={`px-3 py-2 rounded-lg text-left flex flex-col gap-0.5 transition-colors ${selectedPanel === panel.id ? 'bg-slate-800 border-l-2 border-amber-500' : 'text-slate-400 hover:bg-slate-800/50'}`}
                                 >
                                     <div className="flex items-center gap-2">
                                         <panel.icon className="w-3 h-3" />
                                         <span className={`text-xs font-semibold ${selectedPanel === panel.id ? 'text-white' : ''}`}>{panel.label}</span>
                                     </div>
                                     <span className="text-[10px] text-slate-500 truncate pl-5">{panel.summary}</span>
                                 </button>
                             ))}

                             <button
                                className="mt-auto text-[10px] text-slate-600 hover:text-red-400 px-2 py-2 text-left transition-colors"
                                onClick={() => {/* Reset logic placeholder */}}
                             >
                                Resetar padrão
                             </button>
                         </div>

                         {/* CONFIGURADOR */}
                         <div className="flex-1 p-4 overflow-y-auto custom-scrollbar bg-slate-900/50">
                             {selectedPanel === null ? (
                                 <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                                     <BarChart3 className="w-8 h-8 text-slate-700 mb-2" />
                                     <p className="text-slate-600 text-sm">← Selecione um painel para configurar</p>
                                 </div>
                             ) : (
                                 <div>
                                     <div className="mb-4">
                                         <h4 className="text-white font-bold text-sm">Configurando: <span className="text-amber-400">{selectedPanel}</span></h4>
                                         <p className="text-[10px] text-amber-500/70">Alterações aplicadas em tempo real</p>
                                     </div>

                                     <div className="space-y-4">
                                         <div>
                                             <label className="text-[10px] uppercase text-amber-500 font-bold block mb-2">Fonte de Dados</label>
                                             <select className="w-full bg-slate-800 border border-slate-700 rounded-lg text-sm text-white p-2 mb-2 focus:border-amber-500 focus:outline-none">
                                                 <option>CRM - Vendas</option>
                                                 <option>RH - Pessoas</option>
                                                 <option>EAM - Ativos</option>
                                                 <option>SCM - Logística</option>
                                                 <option>ERP - Backoffice</option>
                                                 <option>QMS - Qualidade</option>
                                                 <option>DMS - Documentos</option>
                                             </select>
                                             <select className="w-full bg-slate-800 border border-slate-700 rounded-lg text-sm text-white p-2 mb-2 focus:border-amber-500 focus:outline-none">
                                                 <option>Receita</option>
                                                 <option>Leads</option>
                                                 <option>Conversão</option>
                                             </select>
                                             <select className="w-full bg-slate-800 border border-slate-700 rounded-lg text-sm text-white p-2 focus:border-amber-500 focus:outline-none">
                                                 <option>Todas as Entidades</option>
                                                 <option>Empresa A</option>
                                                 <option>Filial SP</option>
                                             </select>
                                         </div>

                                         <div>
                                             <label className="text-[10px] uppercase text-amber-500 font-bold block mb-2">Período</label>
                                             <div className="flex gap-1 flex-wrap mb-2">
                                                 {['Hoje','7d','30d','90d','6m','1a'].map(p => (
                                                     <button key={p} className={`text-[10px] px-2 py-1 rounded-lg ${p === '30d' ? 'bg-amber-500 text-black font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                                                         {p}
                                                     </button>
                                                 ))}
                                             </div>
                                             <select className="w-full bg-slate-800 border border-slate-700 rounded-lg text-sm text-white p-2 focus:border-amber-500 focus:outline-none">
                                                 <option>Período anterior</option>
                                                 <option>Ano passado</option>
                                                 <option>Meta</option>
                                             </select>
                                         </div>

                                         <div>
                                             <label className="text-[10px] uppercase text-amber-500 font-bold block mb-2">Visualização</label>
                                             <div className="grid grid-cols-3 gap-1 mb-3">
                                                 {['Barras','Linhas','Área','Rosca','Tabela','Gauge'].map(type => (
                                                     <button key={type} className="text-[10px] p-2 rounded-lg text-center border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                                                         {type}
                                                     </button>
                                                 ))}
                                             </div>
                                             <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                                                 <span className="text-xs text-slate-300">Mostrar metas</span>
                                                 <div className="w-8 h-4 rounded-full bg-amber-500 relative cursor-pointer"><div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"></div></div>
                                             </div>
                                             <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                                                 <span className="text-xs text-slate-300">Mostrar variação</span>
                                                  <div className="w-8 h-4 rounded-full bg-amber-500 relative cursor-pointer"><div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"></div></div>
                                             </div>
                                         </div>

                                         <div>
                                              <label className="text-[10px] uppercase text-amber-500 font-bold block mb-2">Aparência</label>
                                              <input type="text" placeholder="Título do painel" className="w-full bg-slate-800 border border-slate-700 rounded-lg text-sm text-white p-2 focus:border-amber-500 focus:outline-none mb-2" />
                                              <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                                                 <span className="text-xs text-slate-300">Visível no dashboard</span>
                                                 <div className="w-8 h-4 rounded-full bg-amber-500 relative cursor-pointer"><div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"></div></div>
                                             </div>
                                         </div>

                                         <div className="flex gap-2 pt-2">
                                             <button className="flex-1 bg-amber-500 text-black text-xs font-bold px-4 py-2 rounded-lg hover:bg-amber-400 transition-colors">Aplicar</button>
                                             <button
                                                onClick={() => setSelectedPanel(null)}
                                                className="bg-slate-800 text-slate-400 text-xs px-4 py-2 rounded-lg hover:text-white transition-colors"
                                             >
                                                 Cancelar
                                             </button>
                                         </div>
                                     </div>
                                 </div>
                             )}
                         </div>
                     </div>
                 )}
            </div>

        </div>

      </div>}

    </div>
  );
}

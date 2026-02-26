import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Users, Wrench, Truck, Building,
  ShieldCheck, FolderOpen, Settings, ArrowRight,
  BarChart3, TrendingUp, List, Grid2x2,
  ChevronDown, ChevronUp, Search, Bell,
  Activity, Download
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

// --- Types ---
interface ModuleTab {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
}

interface KPICard {
  id: string;
  label: string;
  value: string;
  change: string;
  positive: boolean;
  spark: number[];
}

interface DrillItem {
  rank: number;
  name: string;
  value: string;
  change: string;
  positive: boolean;
  barWidth: number;
}

interface ChartBar {
  label: string;
  value: number;
}

// --- Data Constants ---
const MODULE_TABS: ModuleTab[] = [
  { id:'crm',        name:'Vendas',      icon:Briefcase,  color:'from-purple-500 to-indigo-600',  gradient:'purple' },
  { id:'hr',         name:'Pessoas',     icon:Users,      color:'from-pink-500 to-rose-600',      gradient:'pink' },
  { id:'assets',     name:'Ativos',      icon:Wrench,     color:'from-blue-500 to-cyan-600',      gradient:'blue' },
  { id:'logistics',  name:'Logística',   icon:Truck,      color:'from-emerald-500 to-teal-600',   gradient:'emerald' },
  { id:'backoffice', name:'Financeiro',  icon:Building,   color:'from-slate-600 to-slate-800',    gradient:'slate' },
  { id:'quality',    name:'Qualidade',   icon:ShieldCheck,color:'from-green-500 to-emerald-600',  gradient:'green' },
  { id:'docs',       name:'Documentos',  icon:FolderOpen, color:'from-amber-500 to-orange-600',   gradient:'amber' },
  { id:'settings',   name:'Config',      icon:Settings,   color:'from-slate-500 to-slate-700',    gradient:'slate' },
];

const KPI_DATA: Record<string, KPICard[]> = {
  crm: [
    { id:'revenue',    label:'Receita',       value:'R$ 2.4M', change:'+18.2%', positive:true,  spark:[100,120,115,140,138,160,158,180] },
    { id:'leads',      label:'Leads',         value:'1.847',   change:'+24.1%', positive:true,  spark:[80,95,88,110,105,125,120,140] },
    { id:'conversion', label:'Conversão',     value:'34.2%',   change:'+2.1%',  positive:true,  spark:[28,30,29,32,31,33,34,34] },
    { id:'proposals',  label:'Propostas',     value:'312',     change:'+8.7%',  positive:true,  spark:[60,65,70,68,75,80,78,85] },
    { id:'cycle',      label:'Ciclo Médio',   value:'18 dias', change:'-2d',    positive:true,  spark:[22,21,20,20,19,19,18,18] },
    { id:'nps',        label:'NPS',           value:'72',      change:'+5',     positive:true,  spark:[60,62,65,63,67,68,70,72] },
  ],
  hr: [
    { id:'headcount',  label:'Headcount',     value:'847',     change:'+3.2%',  positive:true,  spark:[780,790,800,810,820,830,840,847] },
    { id:'turnover',   label:'Turnover',      value:'4.2%',    change:'-0.8%',  positive:true,  spark:[6,5.5,5.2,5,4.8,4.6,4.4,4.2] },
    { id:'absent',     label:'Absenteísmo',   value:'1.8%',    change:'-0.4%',  positive:true,  spark:[2.5,2.3,2.1,2,1.9,1.9,1.8,1.8] },
    { id:'satisfaction',label:'Satisfação',   value:'8.4',     change:'+0.3',   positive:true,  spark:[7.8,7.9,8,8.1,8.2,8.2,8.3,8.4] },
    { id:'vacancies',  label:'Vagas Abertas', value:'23',      change:'+8',     positive:false, spark:[10,12,15,18,20,22,22,23] },
    { id:'training',   label:'Treinamento',   value:'234h',    change:'+15%',   positive:true,  spark:[150,165,180,190,200,210,225,234] },
  ],
  assets: [
    { id:'uptime',     label:'Uptime',        value:'98.7%',   change:'+0.3%',  positive:true,  spark:[97,97.5,98,97.8,98.2,98.5,98.6,98.7] },
    { id:'os',         label:'OS Abertas',    value:'47',      change:'-12',    positive:true,  spark:[65,60,58,55,52,50,48,47] },
    { id:'cost',       label:'Custo Mnt.',    value:'R$ 84K',  change:'-8%',    positive:true,  spark:[100,95,92,90,88,87,85,84] },
    { id:'mttr',       label:'MTTR',          value:'4.2h',    change:'-0.8h',  positive:true,  spark:[6,5.5,5.2,5,4.8,4.6,4.4,4.2] },
    { id:'oee',        label:'OEE',           value:'87.3%',   change:'+2.1%',  positive:true,  spark:[82,83,84,85,85,86,87,87.3] },
    { id:'calib',      label:'Calibrações',   value:'2 venc.', change:'-3',     positive:true,  spark:[8,7,6,5,4,4,3,2] },
  ],
  logistics: [
    { id:'deliveries', label:'Entregas',      value:'2.847',   change:'+8.4%',  positive:true,  spark:[2200,2350,2400,2500,2600,2700,2800,2847] },
    { id:'ontime',     label:'On-Time',       value:'94.2%',   change:'+1.8%',  positive:true,  spark:[90,91,92,92,93,93,94,94.2] },
    { id:'costkm',     label:'Custo/Km',      value:'R$ 2.84', change:'-0.12',  positive:true,  spark:[3.2,3.1,3,2.96,2.92,2.9,2.86,2.84] },
    { id:'fuel',       label:'Combustível',   value:'12.840L', change:'-3.2%',  positive:true,  spark:[14000,13800,13500,13300,13100,13000,12900,12840] },
    { id:'returns',    label:'Devoluções',    value:'1.2%',    change:'-0.4%',  positive:true,  spark:[2,1.8,1.7,1.6,1.5,1.4,1.3,1.2] },
    { id:'routes',     label:'Rotas Ativas',  value:'34',      change:'+4',     positive:true,  spark:[28,29,30,31,32,33,33,34] },
  ],
  backoffice: [
    { id:'revenue',    label:'Receita',       value:'R$ 8.9M', change:'+11.5%', positive:true,  spark:[7,7.2,7.4,7.6,7.9,8.2,8.6,8.9] },
    { id:'expenses',   label:'Despesas',      value:'R$ 6.2M', change:'+4.2%',  positive:false, spark:[5.5,5.6,5.7,5.8,5.9,6,6.1,6.2] },
    { id:'ebitda',     label:'EBITDA',        value:'30.3%',   change:'+2.1%',  positive:true,  spark:[26,27,27.5,28,28.5,29,30,30.3] },
    { id:'default',    label:'Inadimplência', value:'2.8%',    change:'-0.4%',  positive:true,  spark:[3.5,3.3,3.2,3.1,3,2.9,2.9,2.8] },
    { id:'cash',       label:'Caixa Líq.',    value:'R$ 2.1M', change:'+18%',   positive:true,  spark:[1.5,1.6,1.7,1.8,1.9,2,2.05,2.1] },
    { id:'burn',       label:'Burn Rate',     value:'R$ 340K', change:'-5%',    positive:true,  spark:[400,390,380,370,365,360,350,340] },
  ],
  quality: [
    { id:'ncs',        label:'NCs Abertas',   value:'7',       change:'-30%',   positive:true,  spark:[15,12,10,9,8,8,7,7] },
    { id:'audits',     label:'Auditorias',    value:'3/mês',   change:'0',      positive:true,  spark:[3,3,3,3,3,3,3,3] },
    { id:'kpi_ok',     label:'Indicad. OK',   value:'84%',     change:'+6%',    positive:true,  spark:[72,74,76,78,80,82,83,84] },
    { id:'sac',        label:'SAC Abertos',   value:'12',      change:'-25%',   positive:true,  spark:[20,18,16,15,14,13,12,12] },
    { id:'goal',       label:'Meta Atingida', value:'91%',     change:'+4%',    positive:true,  spark:[82,84,86,87,88,89,90,91] },
    { id:'calib',      label:'Calibrações',   value:'2 venc.', change:'-3',     positive:true,  spark:[6,5,5,4,4,3,3,2] },
  ],
  docs: [
    { id:'active',     label:'Docs Ativos',   value:'284',     change:'+8.4%',  positive:true,  spark:[220,235,245,255,260,270,278,284] },
    { id:'approvals',  label:'Aprovações',    value:'8',       change:'+3',     positive:false, spark:[3,4,5,6,7,7,8,8] },
    { id:'expiring',   label:'Vencendo',      value:'5',       change:'+2',     positive:false, spark:[2,2,3,3,4,4,5,5] },
    { id:'forms',      label:'Formulários',   value:'47',      change:'+5',     positive:true,  spark:[38,40,42,43,44,45,46,47] },
    { id:'revisions',  label:'Revisões/mês',  value:'12',      change:'+4',     positive:true,  spark:[7,8,9,9,10,11,12,12] },
    { id:'categories', label:'Categorias',    value:'23',      change:'+1',     positive:true,  spark:[20,21,21,22,22,22,23,23] },
  ],
  settings: [
    { id:'users',      label:'Usuários',      value:'24',      change:'+2',     positive:true,  spark:[20,21,21,22,22,23,23,24] },
    { id:'modules',    label:'Módulos Ativos',value:'7',       change:'+2',     positive:true,  spark:[4,4,5,5,6,6,7,7] },
    { id:'integrations',label:'Integrações',  value:'12',      change:'+3',     positive:true,  spark:[7,8,9,10,10,11,12,12] },
    { id:'uptime',     label:'Uptime Sistema',value:'99.9%',   change:'+0.1%',  positive:true,  spark:[99.5,99.6,99.7,99.8,99.8,99.9,99.9,99.9] },
    { id:'storage',    label:'Armazenamento', value:'42GB',    change:'+8GB',   positive:false, spark:[28,30,32,34,36,38,40,42] },
    { id:'logs',       label:'Logs hoje',     value:'1.284',   change:'+12%',   positive:false, spark:[900,950,1000,1050,1100,1150,1200,1284] },
  ],
};

const DRILL_DATA: Record<string, DrillItem[]> = {
  crm: [
    { rank:1, name:'São Paulo',       value:'R$ 820K', change:'+22%', positive:true,  barWidth:100 },
    { rank:2, name:'Rio de Janeiro',  value:'R$ 640K', change:'+15%', positive:true,  barWidth:78  },
    { rank:3, name:'Belo Horizonte',  value:'R$ 480K', change:'+8%',  positive:true,  barWidth:58  },
    { rank:4, name:'Curitiba',        value:'R$ 390K', change:'+31%', positive:true,  barWidth:47  },
    { rank:5, name:'Porto Alegre',    value:'R$ 310K', change:'-4%',  positive:false, barWidth:38  },
    { rank:6, name:'Salvador',        value:'R$ 240K', change:'+18%', positive:true,  barWidth:29  },
    { rank:7, name:'Recife',          value:'R$ 180K', change:'+7%',  positive:true,  barWidth:22  },
    { rank:8, name:'Fortaleza',       value:'R$ 160K', change:'+12%', positive:true,  barWidth:19  },
  ],
  hr: [
    { rank:1, name:'Operações',  value:'234', change:'+5',  positive:true,  barWidth:100 },
    { rank:2, name:'Comercial',  value:'187', change:'+12', positive:true,  barWidth:80  },
    { rank:3, name:'TI',         value:'134', change:'+8',  positive:true,  barWidth:57  },
    { rank:4, name:'Financeiro', value:'98',  change:'0',   positive:true,  barWidth:42  },
    { rank:5, name:'RH',         value:'67',  change:'+2',  positive:true,  barWidth:29  },
    { rank:6, name:'Jurídico',   value:'28',  change:'-1',  positive:false, barWidth:12  },
  ],
  assets: [
    { rank:1, name:'Linha A',      value:'99.8%', change:'+0.1%', positive:true,  barWidth:100 },
    { rank:2, name:'Linha B',      value:'99.4%', change:'-0.2%', positive:false, barWidth:99  },
    { rank:3, name:'Compressores', value:'98.9%', change:'+0.4%', positive:true,  barWidth:98  },
    { rank:4, name:'Caldeiras',    value:'97.2%', change:'-1.1%', positive:false, barWidth:95  },
    { rank:5, name:'HVAC',         value:'96.8%', change:'+0.8%', positive:true,  barWidth:94  },
  ],
  logistics: [
    { rank:1, name:'Rota SP-RJ',   value:'445',   change:'+12%', positive:true,  barWidth:100 },
    { rank:2, name:'Rota SP-MG',   value:'389',   change:'+8%',  positive:true,  barWidth:87  },
    { rank:3, name:'Rota SP-PR',   value:'312',   change:'+5%',  positive:true,  barWidth:70  },
    { rank:4, name:'Rota SP-RS',   value:'287',   change:'-2%',  positive:false, barWidth:64  },
    { rank:5, name:'Rota SP-BA',   value:'198',   change:'+18%', positive:true,  barWidth:44  },
  ],
  backoffice: [
    { rank:1, name:'Produto A',  value:'R$ 320K', change:'+18%', positive:true,  barWidth:100 },
    { rank:2, name:'Produto B',  value:'R$ 245K', change:'+9%',  positive:true,  barWidth:76  },
    { rank:3, name:'Serviços',   value:'R$ 198K', change:'+24%', positive:true,  barWidth:62  },
    { rank:4, name:'Licenças',   value:'R$ 127K', change:'-3%',  positive:false, barWidth:40  },
    { rank:5, name:'Consultoria',value:'R$ 98K',  change:'+7%',  positive:true,  barWidth:31  },
  ],
  quality: [
    { rank:1, name:'Produção',    value:'3 NCs', change:'-40%', positive:true,  barWidth:100 },
    { rank:2, name:'Fornecedores',value:'2 NCs', change:'+100%',positive:false, barWidth:66  },
    { rank:3, name:'Logística',   value:'1 NC',  change:'-50%', positive:true,  barWidth:33  },
    { rank:4, name:'Qualidade',   value:'1 NC',  change:'0%',   positive:true,  barWidth:33  },
  ],
  docs: [
    { rank:1, name:'SGQ',        value:'89 docs', change:'+12%', positive:true,  barWidth:100 },
    { rank:2, name:'RH',         value:'67 docs', change:'+8%',  positive:true,  barWidth:75  },
    { rank:3, name:'TI',         value:'54 docs', change:'+15%', positive:true,  barWidth:61  },
    { rank:4, name:'Financeiro', value:'43 docs', change:'+5%',  positive:true,  barWidth:48  },
    { rank:5, name:'Operações',  value:'31 docs', change:'+3%',  positive:true,  barWidth:35  },
  ],
  settings: [
    { rank:1, name:'Admin',      value:'8 users', change:'+1', positive:true, barWidth:100 },
    { rank:2, name:'Gestores',   value:'6 users', change:'+1', positive:true, barWidth:75  },
    { rank:3, name:'Operadores', value:'10 users',change:'0',  positive:true, barWidth:100 },
  ],
};

const CHART_DATA: Record<string, ChartBar[]> = {
  crm:        [{label:'Ago',value:120},{label:'Set',value:145},{label:'Out',value:132},{label:'Nov',value:178},{label:'Dez',value:195},{label:'Jan',value:210},{label:'Fev',value:188},{label:'Mar',value:225}],
  hr:         [{label:'Ago',value:780},{label:'Set',value:790},{label:'Out',value:800},{label:'Nov',value:810},{label:'Dez',value:820},{label:'Jan',value:830},{label:'Fev',value:840},{label:'Mar',value:847}],
  assets:     [{label:'Ago',value:12},{label:'Set',value:8},{label:'Out',value:23},{label:'Nov',value:6},{label:'Dez',value:15},{label:'Jan',value:9},{label:'Fev',value:11},{label:'Mar',value:7}],
  logistics:  [{label:'Ago',value:340},{label:'Set',value:289},{label:'Out',value:412},{label:'Nov',value:378},{label:'Dez',value:445},{label:'Jan',value:390},{label:'Fev',value:420},{label:'Mar',value:460}],
  backoffice: [{label:'Ago',value:800},{label:'Set',value:920},{label:'Out',value:875},{label:'Nov',value:1050},{label:'Dez',value:990},{label:'Jan',value:1120},{label:'Fev',value:1080},{label:'Mar',value:1200}],
  quality:    [{label:'Ago',value:8},{label:'Set',value:12},{label:'Out',value:6},{label:'Nov',value:9},{label:'Dez',value:4},{label:'Jan',value:7},{label:'Fev',value:5},{label:'Mar',value:7}],
  docs:       [{label:'Ago',value:23},{label:'Set',value:18},{label:'Out',value:31},{label:'Nov',value:25},{label:'Dez',value:28},{label:'Jan',value:35},{label:'Fev',value:30},{label:'Mar',value:38}],
  settings:   [{label:'Ago',value:15},{label:'Set',value:16},{label:'Out',value:18},{label:'Nov',value:20},{label:'Dez',value:21},{label:'Jan',value:22},{label:'Fev',value:23},{label:'Mar',value:24}],
};

export default function ModuleHub() {
  const { activeModule, setActiveModule, activeEntity, setActiveEntity,
          activeIndicator, setActiveIndicator, biPanelOpen, setBiPanelOpen,
          biConfig, setBIConfig } = useAppContext();
  const navigate = useNavigate();
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
  const [period, setPeriod] = useState('30d');

  const currentTab    = MODULE_TABS.find(t => t.id === activeModule) || MODULE_TABS[0];
  const currentKPIs   = KPI_DATA[activeModule]   || KPI_DATA.crm;
  const currentDrill  = DRILL_DATA[activeModule] || DRILL_DATA.crm;
  const currentChart  = CHART_DATA[activeModule] || CHART_DATA.crm;
  const primaryKPI    = currentKPIs.find(k => k.id === activeIndicator) || currentKPIs[0];
  const maxChartValue = Math.max(...currentChart.map(b => b.value));

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
            <button
                onClick={() => navigate(`/app/module/${activeModule}`)}
                className={`bg-gradient-to-r ${currentTab.color} text-white rounded-xl px-4 py-2 font-semibold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity`}
            >
                Acessar Módulo <ArrowRight className="w-4 h-4" />
            </button>
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

      {/* ── LINHA 1: GRÁFICO + KPI PRINCIPAL ── */}
      <div className="grid grid-cols-[3fr_2fr] gap-4 p-4 shrink-0" style={{height:'280px'}}>

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
                        style={{stroke: activeModule === 'crm' ? '#8b5cf6' : activeModule === 'hr' ? '#ec4899' : activeModule === 'assets' ? '#3b82f6' : activeModule === 'logistics' ? '#10b981' : activeModule === 'quality' ? '#22c55e' : activeModule === 'docs' ? '#f59e0b' : '#64748b'}}
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
      </div>

      {/* ── LINHA 2: DRILL-DOWN + KPIs + BI ── */}
      <div className="flex flex-1 gap-4 px-4 pb-4 overflow-hidden">

        {/* COLUNA ESQUERDA — Drill-down */}
        <div className="w-[42%] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center gap-2">
                <List className="w-4 h-4 text-slate-400" />
                <h3 className="text-white font-bold text-sm">Detalhamento</h3>
                <span className="text-slate-500 text-xs">— {currentTab.name}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
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
                {currentKPIs.slice(0, 3).map(kpi => (
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
                                        activeModule === 'quality' ? '#22c55e' :
                                        activeModule === 'docs' ? '#f59e0b' : '#64748b'
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
                                                 <option>ERP - Financeiro</option>
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

      </div>

    </div>
  );
}

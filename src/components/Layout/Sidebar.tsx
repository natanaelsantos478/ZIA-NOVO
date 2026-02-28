import React, { useState } from 'react';
import {
  Mic, Users,
  BrainCircuit, Clock, Filter, ListTodo,
  Settings, ChevronDown, ChevronRight, PieChart, DollarSign,
  Package, Wallet, TrendingUp,
  Box, Target, ShieldCheck,
  Share2, FileSignature, Percent,
  Briefcase, Cpu, BookOpen, Layers, Landmark, Banknote,
  ShieldAlert, Barcode, Zap, CalendarDays,
  Award, Star, MessageCircle,
  MonitorSmartphone, Radio,
  RefreshCw, FileSearch, Calculator as CalcIcon,
  Tag, Map as MapIcon, Shield, Truck as TruckIcon, UserCheck, Gavel, FileCheck,
  LineChart, Layers as LayersIcon,
  UserPlus, HeartPulse, Smile, DoorOpen, Link, Thermometer, Plane, BoxSelect, Leaf,
  ScanFace, Gift, ShoppingCart, Car, ArrowRightLeft,
  Route, Navigation, Building, Wrench, MapPin, Truck, Factory, Calculator, Scale, Receipt,
  ArrowRight, Headset, CreditCard, Lock, Globe, BellRing, ClipboardCheck,
  Sparkles, Workflow, BarChart3, HardDrive,
  AlertTriangle, FolderOpen, FileText,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

// --- Static color map — prevents Tailwind from stripping dynamic classes in production ---
const COLOR_MAP: Record<string, {
  bg: string; text: string; lightText: string;
  logoGradient: string; btnGradient: string; btnGradientHover: string;
}> = {
  indigo: {
    bg: 'bg-indigo-600',
    text: 'text-indigo-600',
    lightText: 'text-indigo-400',
    logoGradient: 'from-indigo-500 to-purple-700',
    btnGradient: 'from-indigo-600 to-indigo-500',
    btnGradientHover: 'hover:from-indigo-500 hover:to-indigo-400',
  },
  purple: {
    bg: 'bg-purple-600',
    text: 'text-purple-600',
    lightText: 'text-purple-400',
    logoGradient: 'from-purple-500 to-indigo-700',
    btnGradient: 'from-purple-600 to-purple-500',
    btnGradientHover: 'hover:from-purple-500 hover:to-purple-400',
  },
  blue: {
    bg: 'bg-blue-600',
    text: 'text-blue-600',
    lightText: 'text-blue-400',
    logoGradient: 'from-blue-500 to-indigo-700',
    btnGradient: 'from-blue-600 to-blue-500',
    btnGradientHover: 'hover:from-blue-500 hover:to-blue-400',
  },
};

type ThemeClasses = (typeof COLOR_MAP)[string];

// --- SidebarItem and CollapsibleMenu MUST be defined outside Sidebar.
//     Defining them inside causes React to treat them as new component types on every render,
//     which resets CollapsibleMenu's useState and makes menus close unexpectedly. ---

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  id: string;
  currentView: string;
  theme: ThemeClasses;
  onSelect: (id: string) => void;
}

const SidebarItem = ({ icon: Icon, label, id, currentView, theme, onSelect }: SidebarItemProps) => (
  <button
    onClick={() => onSelect(id)}
    className={`flex items-center w-full px-4 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
      currentView === id
        ? theme.bg + ' text-white shadow-md transform scale-[1.02]'
        : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
    }`}
  >
    <Icon className={`w-4 h-4 mr-3 ${currentView === id ? 'text-white' : 'text-slate-500'}`} />
    <span className="truncate">{label}</span>
  </button>
);

interface CollapsibleMenuProps {
  icon: React.ElementType;
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  theme: ThemeClasses;
}

const CollapsibleMenu = ({ icon: Icon, label, defaultOpen = false, children, theme }: CollapsibleMenuProps) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center w-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-colors rounded-lg ${
          open ? theme.text : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <Icon className="w-4 h-4 mr-3 opacity-70" />
        <span className="flex-1 text-left">{label}</span>
        {open ? <ChevronDown className="w-3 h-3 opacity-50" /> : <ChevronRight className="w-3 h-3 opacity-50" />}
      </button>
      {open && (
        <div className="mt-1 space-y-1.5 border-l-2 border-slate-800/50 ml-6 pl-3 py-1">
          {children}
        </div>
      )}
    </div>
  );
};

export default function Sidebar({ activeModule }: { activeModule?: string }) {
  const { config, currentView, setCurrentView, handleStartMeeting } = useAppContext();
  const navigate = useNavigate();

  const theme = COLOR_MAP[config.primaryColor] ?? COLOR_MAP.indigo;
  const itemProps = { currentView, theme, onSelect: setCurrentView };

  return (
    <aside className="w-[320px] bg-slate-950 border-r border-slate-900 flex flex-col h-full shrink-0 z-30 transition-all shadow-2xl relative">
      <div className="h-24 flex items-center px-8 border-b border-slate-800/80 bg-slate-950 shrink-0">
        <button
          onClick={() => navigate('/')}
          className={`w-12 h-12 bg-gradient-to-br ${theme.logoGradient} rounded-[14px] flex items-center justify-center mr-4 shadow-[0_0_20px_rgba(99,102,241,0.3)] relative overflow-hidden group`}
        >
          <div className="absolute inset-0 bg-white/20 blur-sm transform -rotate-45 translate-x-4"></div>
          <BrainCircuit className="w-7 h-7 text-white relative z-10 group-hover:scale-110 transition-transform" />
        </button>
        <div className="flex flex-col">
          <span className="font-black text-white text-2xl tracking-tighter leading-none">
            {config.companyName.split(' ')[0]}
          </span>
          <span className={`${theme.lightText} font-black text-[10px] tracking-[0.3em] uppercase mt-1`}>
            {config.companyName.substring(config.companyName.indexOf(' ') + 1) || 'OMNISYSTEM'}
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-2 custom-scrollbar">

        <div className="space-y-2 mb-8 px-2">
          <button
            onClick={handleStartMeeting}
            className={`w-full bg-gradient-to-r ${theme.btnGradient} ${theme.btnGradientHover} text-white flex items-center px-5 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-[0_10px_20px_rgba(0,0,0,0.4)] hover:shadow-[0_10px_30px_rgba(99,102,241,0.5)] transform hover:-translate-y-0.5`}
          >
            <Mic className="w-5 h-5 mr-3 animate-pulse" /> Assistente de Voz IA
          </button>
        </div>

        {(!activeModule || activeModule === 'crm') && (
          <CollapsibleMenu icon={Target} label="1. Comercial (CRM)" defaultOpen={true} theme={theme}>
            <SidebarItem icon={Filter}          label="Funil Inteligente"         id="crm_funnel"    {...itemProps} />
            <SidebarItem icon={MessageCircle}   label="Omnichannel Inbox"         id="crm_inbox"     {...itemProps} />
            <SidebarItem icon={Sparkles}        label="Inteligência de Leads"     id="crm_leads"     {...itemProps} />
            <SidebarItem icon={Briefcase}       label="Gestão de Negociações"     id="crm_deals"     {...itemProps} />
            <SidebarItem icon={Award}           label="Metas e OKRs"              id="crm_okr"       {...itemProps} />
            <SidebarItem icon={Radio}           label="CRM Live (Real-Time)"      id="crm_live"      {...itemProps} />
            <SidebarItem icon={Clock}           label="Automação de Tarefas"      id="crm_tasks"     {...itemProps} />
            <SidebarItem icon={ListTodo}        label="Campos Personalizados"     id="crm_fields"    {...itemProps} />
            <SidebarItem icon={TrendingUp}      label="Multi-vendas e Upsell"     id="crm_upsell"    {...itemProps} />
            <SidebarItem icon={MapPin}          label="Equipes e Territórios"     id="crm_teams"     {...itemProps} />
            <SidebarItem icon={PieChart}        label="Relatórios Avançados"      id="crm_reports"   {...itemProps} />
            <SidebarItem icon={Globe}           label="Integrações Externas"      id="crm_hub"       {...itemProps} />
            <SidebarItem icon={Workflow}        label="Flow Builder (Marketing)"  id="crm_mkt_flow"  {...itemProps} />
            <SidebarItem icon={HeartPulse}      label="Customer Success (CS)"     id="crm_cs"        {...itemProps} />
            <SidebarItem icon={Share2}          label="Social Listening"          id="crm_social"    {...itemProps} />
            <SidebarItem icon={Link}            label="Portal de Parceiros"       id="crm_partners"  {...itemProps} />
          </CollapsibleMenu>
        )}

        {(!activeModule || activeModule === 'hr') && (
          <CollapsibleMenu icon={Users} label="2. Pessoal (HR Hub)" defaultOpen={true} theme={theme}>
            <SidebarItem icon={UserPlus}      label="Recrutamento (ATS)"      id="hr_ats"         {...itemProps} />
            <SidebarItem icon={FileSignature} label="Onboarding Digital"      id="hr_onboarding"  {...itemProps} />
            <SidebarItem icon={Star}          label="Gestão de Desempenho"    id="hr_performance" {...itemProps} />
            <SidebarItem icon={ScanFace}      label="Ponto e Frequência"      id="hr_time"        {...itemProps} />
            <SidebarItem icon={DollarSign}    label="Folha de Pagamento"      id="hr_payroll"     {...itemProps} />
            <SidebarItem icon={BookOpen}      label="Treinamento (LMS)"       id="hr_lms"         {...itemProps} />
            <SidebarItem icon={Gift}          label="Gestão de Benefícios"    id="hr_benefits"    {...itemProps} />
            <SidebarItem icon={Smile}         label="Clima Organizacional"    id="hr_climate"     {...itemProps} />
            <SidebarItem icon={ShieldCheck}   label="Saúde e Segurança (SST)" id="hr_sst"         {...itemProps} />
            <SidebarItem icon={DoorOpen}      label="Offboarding"             id="hr_offboarding" {...itemProps} />
            <SidebarItem icon={LineChart}     label="Sucessão e Carreiras"    id="hr_succession"  {...itemProps} />
            <SidebarItem icon={Smile}         label="Hub de Saúde Mental"     id="hr_health"      {...itemProps} />
            <SidebarItem icon={Briefcase}     label="Freelancers & Gig"       id="hr_gig"         {...itemProps} />
          </CollapsibleMenu>
        )}

        {config.features.enableEAM && (!activeModule || activeModule === 'eam') && (
          <CollapsibleMenu icon={Wrench} label="3. Ativos (EAM)" defaultOpen={true} theme={theme}>
            <SidebarItem icon={MapPin}        label="Rastreabilidade Global"      id="eam_tracking"   {...itemProps} />
            <SidebarItem icon={Barcode}       label="Controle de Inventário"      id="eam_inventory"  {...itemProps} />
            <SidebarItem icon={Cpu}           label="Manutenção Preditiva"        id="eam_predictive" {...itemProps} />
            <SidebarItem icon={CalendarDays}  label="Preventiva e Corretiva"      id="eam_preventive" {...itemProps} />
            <SidebarItem icon={RefreshCw}     label="Ciclo de Vida (TCO)"         id="eam_lifecycle"  {...itemProps} />
            <SidebarItem icon={ArrowRightLeft}label="Transferência / Check-in"    id="eam_transfer"   {...itemProps} />
            <SidebarItem icon={FileCheck}     label="Consignados e Alugados"      id="eam_rented"     {...itemProps} />
            <SidebarItem icon={ClipboardCheck}label="Auditoria e Fiscal"          id="eam_audit"      {...itemProps} />
            <SidebarItem icon={BellRing}      label="Central de Alarmes"          id="eam_alarms"     {...itemProps} />
            <SidebarItem icon={MapIcon}       label="Mapeamento (Floor Plan)"     id="eam_map"        {...itemProps} />
            <SidebarItem icon={LayersIcon}    label="Digital Twin (3D)"           id="eam_twin"       {...itemProps} />
            <SidebarItem icon={Zap}           label="Energia e Utilidades"        id="eam_energy"     {...itemProps} />
            <SidebarItem icon={ShieldAlert}   label="Automação de Garantias"      id="eam_warranty"   {...itemProps} />
          </CollapsibleMenu>
        )}

        {(!activeModule || activeModule === 'scm') && (
          <CollapsibleMenu icon={Truck} label="4. Logística (SCM)" defaultOpen={true} theme={theme}>
            <SidebarItem icon={Route}         label="Roteirização com IA"         id="log_routing"   {...itemProps} />
            <SidebarItem icon={TruckIcon}     label="Gestão de Frota"             id="log_fleet"     {...itemProps} />
            <SidebarItem icon={Package}       label="Gestão de Fretes (TMS)"      id="log_freight"   {...itemProps} />
            <SidebarItem icon={Navigation}    label="Rastreamento Last-Mile"       id="log_lastmile"  {...itemProps} />
            <SidebarItem icon={RefreshCw}     label="Logística Reversa"           id="log_reverse"   {...itemProps} />
            <SidebarItem icon={Building}      label="Gestão de Docas"             id="log_yard"      {...itemProps} />
            <SidebarItem icon={Box}           label="Embalagem e Packing"         id="log_packing"   {...itemProps} />
            <SidebarItem icon={ArrowRightLeft}label="Cross-Docking"               id="log_crossdock" {...itemProps} />
            <SidebarItem icon={FileSearch}    label="Auditoria de Fretes"         id="log_audit"     {...itemProps} />
            <SidebarItem icon={Leaf}          label="Sustentabilidade Verde"       id="log_green"     {...itemProps} />
            <SidebarItem icon={Thermometer}   label="Cadeia Fria (Cold Chain)"    id="log_cold"      {...itemProps} />
            <SidebarItem icon={BoxSelect}     label="Simulador 3D Cubagem"        id="log_3d"        {...itemProps} />
            <SidebarItem icon={Plane}         label="Integração Drones"           id="log_drone"     {...itemProps} />
          </CollapsibleMenu>
        )}

        {config.features.enableERP && (!activeModule || activeModule === 'erp') && (
          <CollapsibleMenu icon={Building} label="5. Backoffice (ERP)" defaultOpen={true} theme={theme}>
            <SidebarItem icon={Landmark}        label="Contabilidade Global"        id="erp_accounting"    {...itemProps} />
            <SidebarItem icon={Scale}           label="Fiscal e Tributária"         id="erp_taxes"         {...itemProps} />
            <SidebarItem icon={Receipt}         label="Faturamento"                 id="erp_invoicing"     {...itemProps} />
            <SidebarItem icon={ArrowRight}      label="Contas a Pagar"              id="erp_ap"            {...itemProps} />
            <SidebarItem icon={Wallet}          label="Contas a Receber"            id="erp_ar"            {...itemProps} />
            <SidebarItem icon={Layers}          label="Gestão de Estoque"           id="erp_inventory"     {...itemProps} />
            <SidebarItem icon={Calculator}      label="Custos de Produção"          id="erp_costs"         {...itemProps} />
            <SidebarItem icon={ShoppingCart}    label="Compras (Portal)"            id="erp_procurement"   {...itemProps} />
            <SidebarItem icon={Package}         label="Gestão Materiais (MRP)"      id="erp_mrp"           {...itemProps} />
            <SidebarItem icon={Globe}           label="Comex / Siscomex"            id="erp_comex"         {...itemProps} />
            <SidebarItem icon={BarChart3}       label="Controladoria e DRE"         id="erp_controller"    {...itemProps} />
            <SidebarItem icon={Banknote}        label="Tesouraria Multimoeda"       id="erp_treasury"      {...itemProps} />
            <SidebarItem icon={PieChart}        label="BI Interno e OLAP"           id="erp_bi"            {...itemProps} />
            <SidebarItem icon={FileSignature}   label="Gestão de Contratos"         id="erp_contracts"     {...itemProps} />
            <SidebarItem icon={Factory}         label="PCP (Produção)"              id="erp_pcp"           {...itemProps} />
            <SidebarItem icon={HardDrive}       label="Obras e Projetos"            id="erp_projects"      {...itemProps} />
            <SidebarItem icon={Shield}          label="Auditoria e Log Trail"       id="erp_audit"         {...itemProps} />
            <SidebarItem icon={Gavel}           label="Licitações (Editais)"        id="erp_bids"          {...itemProps} />
            <SidebarItem icon={Headset}         label="CSC (Serviços Internos)"     id="erp_csc"           {...itemProps} />
            <SidebarItem icon={Car}             label="Frota Comercial"             id="erp_fleet"         {...itemProps} />
            <SidebarItem icon={CreditCard}      label="CRM Fin (Limites)"           id="erp_crm_fin"       {...itemProps} />
            <SidebarItem icon={CalcIcon}        label="Planejamento Tributário"     id="erp_tax_plan"      {...itemProps} />
            <SidebarItem icon={Percent}         label="Verbas Cooperadas"           id="erp_coop"          {...itemProps} />
            <SidebarItem icon={MonitorSmartphone}label="Portal Self-Service"        id="erp_portal"        {...itemProps} />
            <SidebarItem icon={RefreshCw}       label="Assinaturas (Churn)"        id="erp_subscriptions" {...itemProps} />
            <SidebarItem icon={Building}        label="Imobiliária/Locações"        id="erp_realestate"    {...itemProps} />
            <SidebarItem icon={Leaf}            label="Relatórios ESG"              id="erp_esg"           {...itemProps} />
            <SidebarItem icon={ShieldAlert}     label="Risco e Compliance GRC"      id="erp_grc"           {...itemProps} />
            <SidebarItem icon={Tag}             label="Precificação Dinâmica"       id="erp_pricing"       {...itemProps} />
            <SidebarItem icon={Users}           label="Joint Ventures (JV)"         id="erp_jv"            {...itemProps} />
            <SidebarItem icon={LineChart}       label="Relações Investidores"       id="erp_ir"            {...itemProps} />
            <SidebarItem icon={Lock}            label="Ledger Blockchain"           id="erp_crypto"        {...itemProps} />
          </CollapsibleMenu>
        )}

        {(!activeModule || activeModule === 'quality') && (
          <CollapsibleMenu icon={ShieldCheck} label="7. Qualidade (SGQ)" defaultOpen={true} theme={theme}>
            <SidebarItem icon={AlertTriangle}  label="Não Conformidades" id="quality_ncs"         {...itemProps} />
            <SidebarItem icon={FileCheck}      label="Auditorias"        id="quality_audits"      {...itemProps} />
            <SidebarItem icon={BarChart3}      label="Indicadores"       id="quality_kpis"        {...itemProps} />
            <SidebarItem icon={UserCheck}      label="Fornecedores"      id="quality_suppliers"   {...itemProps} />
            <SidebarItem icon={ClipboardCheck} label="Calibração"        id="quality_calibration" {...itemProps} />
          </CollapsibleMenu>
        )}

        {(!activeModule || activeModule === 'docs') && (
          <CollapsibleMenu icon={FolderOpen} label="8. Documentos (GED)" defaultOpen={true} theme={theme}>
            <SidebarItem icon={FileText}       label="Documentos"  id="docs_list"       {...itemProps} />
            <SidebarItem icon={ClipboardCheck} label="Aprovações"  id="docs_approvals"  {...itemProps} />
            <SidebarItem icon={Tag}            label="Categorias"  id="docs_categories" {...itemProps} />
          </CollapsibleMenu>
        )}

        {(!activeModule || activeModule === 'settings') && (
          <CollapsibleMenu icon={Settings} label="6. Configurações" defaultOpen={true} theme={theme}>
            <SidebarItem icon={Settings} label="Preferências" id="settings" {...itemProps} />
          </CollapsibleMenu>
        )}

      </nav>

      <div className="p-6 bg-slate-950 border-t border-slate-900 shrink-0">
        <div className="flex items-center gap-4 mb-6 px-2">
          <div className={`w-10 h-10 rounded-full ${theme.bg} flex items-center justify-center text-white font-black shadow-md`}>AD</div>
          <div className="flex-1 overflow-hidden">
            <p className="font-bold text-white text-sm truncate">Admin Global</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black truncate">Acesso Irrestrito</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

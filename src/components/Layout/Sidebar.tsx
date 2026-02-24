import { useState } from 'react';
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
  Sparkles, Workflow, BarChart3, HardDrive
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function Sidebar({ activeModule }: { activeModule?: string }) {
  const { config, currentView, setCurrentView, handleStartMeeting } = useAppContext();
  const navigate = useNavigate();

  const th = {
      bg: `bg-${config.primaryColor}-600`,
      text: `text-${config.primaryColor}-600`,
      border: `border-${config.primaryColor}-600`,
      lightBg: `bg-${config.primaryColor}-50`,
      hover: `hover:bg-${config.primaryColor}-700`,
      ring: `focus:ring-${config.primaryColor}-500`,
      borderLight: `border-${config.primaryColor}-200`
  };

  const SidebarItem = ({ icon: Icon, label, id }: { icon: any, label: string, id: string }) => (
      <button onClick={()=>setCurrentView(id)} className={`flex items-center w-full px-4 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${currentView === id ? th.bg + ' text-white shadow-md transform scale-[1.02]' : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'}`}>
          <Icon className={`w-4 h-4 mr-3 ${currentView === id ? 'text-white' : 'text-slate-500'}`} />
          <span className="truncate">{label}</span>
      </button>
  );

  const CollapsibleMenu = ({ icon: Icon, label, defaultOpen = false, children }: any) => {
      const [open, setOpen] = useState(defaultOpen);
      return (
          <div className="mb-3">
              <button onClick={()=>setOpen(!open)} className={`flex items-center w-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-colors rounded-lg ${open ? th.text : 'text-slate-500 hover:text-slate-300'}`}>
                  <Icon className="w-4 h-4 mr-3 opacity-70" />
                  <span className="flex-1 text-left">{label}</span>
                  {open ? <ChevronDown className="w-3 h-3 opacity-50"/> : <ChevronRight className="w-3 h-3 opacity-50"/>}
              </button>
              {open && <div className="mt-1 space-y-1.5 border-l-2 border-slate-800/50 ml-6 pl-3 py-1">{children}</div>}
          </div>
      );
  };

  return (
        <aside className="w-[320px] bg-slate-950 border-r border-slate-900 flex flex-col h-full shrink-0 z-30 transition-all shadow-2xl relative">
          <div className="h-24 flex items-center px-8 border-b border-slate-800/80 bg-slate-950 shrink-0">
            <button onClick={() => navigate('/')} className={`w-12 h-12 bg-gradient-to-br from-${config.primaryColor}-500 to-purple-700 rounded-[14px] flex items-center justify-center mr-4 shadow-[0_0_20px_rgba(99,102,241,0.3)] relative overflow-hidden group`}>
                <div className="absolute inset-0 bg-white/20 blur-sm transform -rotate-45 translate-x-4"></div>
                <BrainCircuit className="w-7 h-7 text-white relative z-10 group-hover:scale-110 transition-transform" />
            </button>
            <div className="flex flex-col">
                <span className="font-black text-white text-2xl tracking-tighter leading-none">{config.companyName.split(' ')[0]}</span>
                <span className={`text-${config.primaryColor}-400 font-black text-[10px] tracking-[0.3em] uppercase mt-1`}>{config.companyName.substring(config.companyName.indexOf(' ')+1) || 'OMNISYSTEM'}</span>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-2 custom-scrollbar">

            <div className="space-y-2 mb-8 px-2">
              <button onClick={handleStartMeeting} className={`w-full bg-gradient-to-r from-${config.primaryColor}-600 to-${config.primaryColor}-500 hover:from-${config.primaryColor}-500 hover:to-${config.primaryColor}-400 text-white flex items-center px-5 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-[0_10px_20px_rgba(0,0,0,0.4)] hover:shadow-[0_10px_30px_rgba(99,102,241,0.5)] transform hover:-translate-y-0.5`}>
                <Mic className="w-5 h-5 mr-3 animate-pulse" /> Assistente de Voz IA
              </button>
            </div>

            {(!activeModule || activeModule === 'crm') && (
            <CollapsibleMenu icon={Target} label="1. Comercial (CRM)" defaultOpen={true}>
               <SidebarItem icon={Filter} label="Funil Inteligente" id="crm_funnel" />
               <SidebarItem icon={MessageCircle} label="Omnichannel Inbox" id="crm_inbox" />
               <SidebarItem icon={Sparkles} label="Inteligência de Leads" id="crm_leads" />
               <SidebarItem icon={Briefcase} label="Gestão de Negociações" id="crm_deals" />
               <SidebarItem icon={Award} label="Metas e OKRs" id="crm_okr" />
               <SidebarItem icon={Radio} label="CRM Live (Real-Time)" id="crm_live" />
               <SidebarItem icon={Clock} label="Automação de Tarefas" id="crm_tasks" />
               <SidebarItem icon={ListTodo} label="Campos Personalizados" id="crm_fields" />
               <SidebarItem icon={TrendingUp} label="Multi-vendas e Upsell" id="crm_upsell" />
               <SidebarItem icon={MapPin} label="Equipes e Territórios" id="crm_teams" />
               <SidebarItem icon={PieChart} label="Relatórios Avançados" id="crm_reports" />
               <SidebarItem icon={Globe} label="Integrações Externas" id="crm_hub" />
               <SidebarItem icon={Workflow} label="Flow Builder (Marketing)" id="crm_mkt_flow" />
               <SidebarItem icon={HeartPulse} label="Customer Success (CS)" id="crm_cs" />
               <SidebarItem icon={Share2} label="Social Listening" id="crm_social" />
               <SidebarItem icon={Link} label="Portal de Parceiros" id="crm_partners" />
            </CollapsibleMenu>
            )}

            {(!activeModule || activeModule === 'hr') && (
            <CollapsibleMenu icon={Users} label="2. Pessoal (HR Hub)" defaultOpen={true}>
               <SidebarItem icon={UserPlus} label="Recrutamento (ATS)" id="hr_ats" />
               <SidebarItem icon={FileSignature} label="Onboarding Digital" id="hr_onboarding" />
               <SidebarItem icon={Star} label="Gestão de Desempenho" id="hr_performance" />
               <SidebarItem icon={ScanFace || UserCheck} label="Ponto e Frequência" id="hr_time" />
               <SidebarItem icon={DollarSign} label="Folha de Pagamento" id="hr_payroll" />
               <SidebarItem icon={BookOpen} label="Treinamento (LMS)" id="hr_lms" />
               <SidebarItem icon={Gift || HeartPulse} label="Gestão de Benefícios" id="hr_benefits" />
               <SidebarItem icon={Smile} label="Clima Organizacional" id="hr_climate" />
               <SidebarItem icon={ShieldCheck} label="Saúde e Segurança (SST)" id="hr_sst" />
               <SidebarItem icon={DoorOpen} label="Offboarding" id="hr_offboarding" />
               <SidebarItem icon={LineChart} label="Sucessão e Carreiras" id="hr_succession" />
               <SidebarItem icon={Smile} label="Hub de Saúde Mental" id="hr_health" />
               <SidebarItem icon={Briefcase} label="Freelancers & Gig" id="hr_gig" />
            </CollapsibleMenu>
            )}

            {config.features.enableEAM && (!activeModule || activeModule === 'eam') && (
                <CollapsibleMenu icon={Wrench} label="3. Ativos (EAM)" defaultOpen={true}>
                   <SidebarItem icon={MapPin} label="Rastreabilidade Global" id="eam_tracking" />
                   <SidebarItem icon={Barcode} label="Controle de Inventário" id="eam_inventory" />
                   <SidebarItem icon={Cpu} label="Manutenção Preditiva" id="eam_predictive" />
                   <SidebarItem icon={CalendarDays} label="Preventiva e Corretiva" id="eam_preventive" />
                   <SidebarItem icon={RefreshCw} label="Ciclo de Vida (TCO)" id="eam_lifecycle" />
                   <SidebarItem icon={ArrowRightLeft} label="Transferência / Check-in" id="eam_transfer" />
                   <SidebarItem icon={FileCheck} label="Consignados e Alugados" id="eam_rented" />
                   <SidebarItem icon={ClipboardCheck} label="Auditoria e Fiscal" id="eam_audit" />
                   <SidebarItem icon={BellRing} label="Central de Alarmes" id="eam_alarms" />
                   <SidebarItem icon={MapIcon} label="Mapeamento (Floor Plan)" id="eam_map" />
                   <SidebarItem icon={LayersIcon} label="Digital Twin (3D)" id="eam_twin" />
                   <SidebarItem icon={Zap} label="Energia e Utilidades" id="eam_energy" />
                   <SidebarItem icon={ShieldAlert} label="Automação de Garantias" id="eam_warranty" />
                </CollapsibleMenu>
            )}

            {(!activeModule || activeModule === 'scm') && (
            <CollapsibleMenu icon={Truck} label="4. Logística (SCM)" defaultOpen={true}>
               <SidebarItem icon={Route} label="Roteirização com IA" id="log_routing" />
               <SidebarItem icon={TruckIcon} label="Gestão de Frota" id="log_fleet" />
               <SidebarItem icon={Package} label="Gestão de Fretes (TMS)" id="log_freight" />
               <SidebarItem icon={Navigation} label="Rastreamento Last-Mile" id="log_lastmile" />
               <SidebarItem icon={RefreshCw} label="Logística Reversa" id="log_reverse" />
               <SidebarItem icon={Building} label="Gestão de Docas" id="log_yard" />
               <SidebarItem icon={Box} label="Embalagem e Packing" id="log_packing" />
               <SidebarItem icon={ArrowRightLeft} label="Cross-Docking" id="log_crossdock" />
               <SidebarItem icon={FileSearch} label="Auditoria de Fretes" id="log_audit" />
               <SidebarItem icon={Leaf} label="Sustentabilidade Verde" id="log_green" />
               <SidebarItem icon={Thermometer} label="Cadeia Fria (Cold Chain)" id="log_cold" />
               <SidebarItem icon={BoxSelect} label="Simulador 3D Cubagem" id="log_3d" />
               <SidebarItem icon={Plane} label="Integração Drones" id="log_drone" />
            </CollapsibleMenu>
            )}

            {config.features.enableERP && (!activeModule || activeModule === 'erp') && (
                <CollapsibleMenu icon={Building} label="5. Backoffice (ERP)" defaultOpen={true}>
                   <SidebarItem icon={Landmark} label="Contabilidade Global" id="erp_accounting" />
                   <SidebarItem icon={Scale} label="Fiscal e Tributária" id="erp_taxes" />
                   <SidebarItem icon={Receipt} label="Faturamento" id="erp_invoicing" />
                   <SidebarItem icon={ArrowRight} label="Contas a Pagar" id="erp_ap" />
                   <SidebarItem icon={Wallet} label="Contas a Receber" id="erp_ar" />
                   <SidebarItem icon={Layers} label="Gestão de Estoque" id="erp_inventory" />
                   <SidebarItem icon={Calculator} label="Custos de Produção" id="erp_costs" />
                   <SidebarItem icon={ShoppingCart || Box} label="Compras (Portal)" id="erp_procurement" />
                   <SidebarItem icon={Package} label="Gestão Materiais (MRP)" id="erp_mrp" />
                   <SidebarItem icon={Globe} label="Comex / Siscomex" id="erp_comex" />
                   <SidebarItem icon={BarChart3} label="Controladoria e DRE" id="erp_controller" />
                   <SidebarItem icon={Banknote} label="Tesouraria Multimoeda" id="erp_treasury" />
                   <SidebarItem icon={PieChart} label="BI Interno e OLAP" id="erp_bi" />
                   <SidebarItem icon={FileSignature} label="Gestão de Contratos" id="erp_contracts" />
                   <SidebarItem icon={Factory} label="PCP (Produção)" id="erp_pcp" />
                   <SidebarItem icon={HardDrive} label="Obras e Projetos" id="erp_projects" />
                   <SidebarItem icon={Shield} label="Auditoria e Log Trail" id="erp_audit" />
                   <SidebarItem icon={Gavel} label="Licitações (Editais)" id="erp_bids" />
                   <SidebarItem icon={Headset} label="CSC (Serviços Internos)" id="erp_csc" />
                   <SidebarItem icon={Car || TruckIcon} label="Frota Comercial" id="erp_fleet" />
                   <SidebarItem icon={CreditCard} label="CRM Fin (Limites)" id="erp_crm_fin" />
                   <SidebarItem icon={CalcIcon} label="Planejamento Tributário" id="erp_tax_plan" />
                   <SidebarItem icon={Percent} label="Verbas Cooperadas" id="erp_coop" />
                   <SidebarItem icon={MonitorSmartphone} label="Portal Self-Service" id="erp_portal" />
                   <SidebarItem icon={RefreshCw} label="Assinaturas (Churn)" id="erp_subscriptions" />
                   <SidebarItem icon={Building} label="Imobiliária/Locações" id="erp_realestate" />
                   <SidebarItem icon={Leaf} label="Relatórios ESG" id="erp_esg" />
                   <SidebarItem icon={ShieldAlert} label="Risco e Compliance GRC" id="erp_grc" />
                   <SidebarItem icon={Tag} label="Precificação Dinâmica" id="erp_pricing" />
                   <SidebarItem icon={Users} label="Joint Ventures (JV)" id="erp_jv" />
                   <SidebarItem icon={LineChart} label="Relações Investidores" id="erp_ir" />
                   <SidebarItem icon={Lock} label="Ledger Blockchain" id="erp_crypto" />
                </CollapsibleMenu>
            )}

            {(!activeModule || activeModule === 'settings') && (
                 <CollapsibleMenu icon={Settings} label="6. Configurações" defaultOpen={true}>
                    <SidebarItem icon={Settings} label="Preferências" id="settings" />
                 </CollapsibleMenu>
            )}

          </nav>

          <div className="p-6 bg-slate-950 border-t border-slate-900 shrink-0">
              <div className="flex items-center gap-4 mb-6 px-2">
                  <div className={`w-10 h-10 rounded-full ${th.bg} flex items-center justify-center text-white font-black shadow-md`}>AD</div>
                  <div className="flex-1 overflow-hidden">
                      <p className="font-bold text-white text-sm truncate">Admin Global</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black truncate">Acesso Irrestrito</p>
                  </div>
              </div>
          </div>
        </aside>
  );
}

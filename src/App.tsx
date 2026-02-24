import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';

// Layouts
import GlobalHeader from './components/Layout/GlobalHeader';
import ModuleLayout from './components/Layout/ModuleLayout';

// Features
import ModuleHub from './features/Home/ModuleHub';
import Dashboard360 from './features/Dashboard/Dashboard360';
import Pipeline from './features/CRM/Pipeline';
import CustomerList from './features/CRM/CustomerList';
import CustomerDetail from './features/CRM/CustomerDetail';
import Finance from './features/ERP/Finance';
import Taxes from './features/ERP/Taxes';
import DashboardEAM from './features/EAM/Dashboard';
import RegisterEAM from './features/EAM/Register';
import RfidEAM from './features/EAM/Rfid';
import Settings from './features/Settings/Settings';
import FallbackView from './features/Common/FallbackView';
import Loader from './components/UI/Loader';
import Toast from './components/UI/Toast';
import TransactionModal from './components/Modals/TransactionModal';
import AuditModal from './components/Modals/AuditModal';

function AppContent() {
  const { currentView, config, handleFinishMeeting } = useAppContext();

  const th = {
    bg: `bg-${config.primaryColor}-600`,
    lightBg: `bg-${config.primaryColor}-50`,
  };

  return (
    <BrowserRouter>
      <div className={`flex flex-col h-screen w-screen bg-slate-50 text-slate-900 font-sans selection:${th.lightBg} overflow-hidden`}>
        <Loader />
        <Toast />
        <TransactionModal />
        <AuditModal />

        {/* Cabeçalho Global */}
        <GlobalHeader />

        {/* Rotas */}
        <Routes>
          {/* Tela Inicial - Hub de Módulos */}
          <Route path="/" element={<ModuleHub />} />

          {/* Layout de Módulo (Com Sidebar e Sub-abas) */}
          <Route path="/app/:module" element={<ModuleLayout />}>
             {/* Aqui dentro renderizamos o conteúdo baseado no currentView ou em sub-rotas */}
             {/* Por enquanto, mantemos a lógica original de currentView dentro do Outlet,
                 mas idealmente refatoraríamos para sub-rotas.
                 Como o ModuleLayout usa <Outlet />, precisamos definir as rotas filhas ou
                 um componente que gerencia o currentView.
             */}
             <Route index element={<FeatureManager />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Meeting Overlay - Mantido Global */}
        {currentView === 'meeting' && (
            <div className="absolute inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center h-full animate-in fade-in zoom-in-95 duration-500">
              <div className="relative">
                  <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></span>
                  <button onClick={handleFinishMeeting} className="relative bg-red-600 text-white w-32 h-32 rounded-full flex items-center justify-center shadow-2xl hover:bg-red-700 transition-colors z-10">
                      <div className="flex flex-col items-center">
                          <div className="w-8 h-8 bg-white rounded-md mb-2"></div>
                          <span className="font-black text-xs uppercase tracking-widest">Stop</span>
                      </div>
                  </button>
              </div>
              <p className="mt-8 font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Gravando Reunião...</p>
            </div>
        )}
      </div>
    </BrowserRouter>
  );
}

// Componente intermediário para gerenciar a renderização baseada em currentView dentro do layout
function FeatureManager() {
  const { currentView, config } = useAppContext();

  // Lista mestre de todas as views mapeadas no Omnisystem (87 módulos + views base)
  const OMNISYSTEM_VIEWS = [
    'dashboard_360', 'settings', 'meeting', 'detail',
    // CRM
    'crm_funnel', 'crm_inbox', 'crm_leads', 'crm_deals', 'crm_okr', 'crm_live', 'crm_tasks', 'crm_fields', 'crm_upsell', 'crm_teams', 'crm_reports', 'crm_hub', 'crm_mkt_flow', 'crm_cs', 'crm_social', 'crm_partners', 'crm_customer_detail', 'crm_customers',
    // HR Hub
    'hr_ats', 'hr_onboarding', 'hr_performance', 'hr_time', 'hr_payroll', 'hr_lms', 'hr_benefits', 'hr_climate', 'hr_sst', 'hr_offboarding', 'hr_succession', 'hr_health', 'hr_gig',
    // EAM
    'eam_dashboard', 'eam_register', 'eam_rfid', 'eam_tracking', 'eam_inventory', 'eam_predictive', 'eam_preventive', 'eam_lifecycle', 'eam_transfer', 'eam_rented', 'eam_audit', 'eam_alarms', 'eam_map', 'eam_twin', 'eam_energy', 'eam_warranty',
    // Logistica
    'log_routing', 'log_fleet', 'log_freight', 'log_lastmile', 'log_reverse', 'log_yard', 'log_packing', 'log_crossdock', 'log_audit', 'log_green', 'log_cold', 'log_3d', 'log_drone',
    // ERP
    'erp_finance', 'erp_taxes', 'erp_accounting', 'erp_invoicing', 'erp_ap', 'erp_ar', 'erp_inventory', 'erp_costs', 'erp_procurement', 'erp_mrp', 'erp_comex', 'erp_controller', 'erp_treasury', 'erp_bi', 'erp_contracts', 'erp_pcp', 'erp_projects', 'erp_audit', 'erp_bids', 'erp_csc', 'erp_fleet', 'erp_crm_fin', 'erp_tax_plan', 'erp_coop', 'erp_portal', 'erp_subscriptions', 'erp_realestate', 'erp_esg', 'erp_grc', 'erp_pricing', 'erp_jv', 'erp_ir', 'erp_crypto'
  ];

  const isReadyComponent = ['dashboard_360', 'crm_funnel', 'crm_customers', 'crm_customer_detail', 'detail', 'erp_finance', 'erp_taxes', 'eam_dashboard', 'eam_register', 'eam_rfid', 'settings', 'meeting'].includes(currentView);

  // Renderização Condicional
  if (currentView === 'dashboard_360') return <Dashboard360 />;
  if (currentView === 'crm_funnel') return <Pipeline />;
  if (currentView === 'crm_customers') return <CustomerList />;
  if (currentView === 'crm_customer_detail' || currentView === 'detail') return <CustomerDetail />;

  if (currentView === 'erp_finance' && config.features.enableERP) return <Finance />;
  if (currentView === 'erp_taxes' && config.features.enableERP) return <Taxes />;

  if (currentView === 'eam_dashboard' && config.features.enableEAM) return <DashboardEAM />;
  if (currentView === 'eam_register' && config.features.enableEAM) return <RegisterEAM />;
  if (currentView === 'eam_rfid' && config.features.enableRFID) return <RfidEAM />;

  if (currentView === 'settings') return <Settings />;

  if (!isReadyComponent && OMNISYSTEM_VIEWS.includes(currentView)) {
      return <FallbackView />;
  }

  return <FallbackView />;
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

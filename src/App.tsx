import { AppProvider, useAppContext } from './context/AppContext';
// Deploy Force
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Loader from './components/UI/Loader';
import Toast from './components/UI/Toast';
import TransactionModal from './components/Modals/TransactionModal';
import AuditModal from './components/Modals/AuditModal';

// Features (Existentes)
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

function AppContent() {
  const { currentView, config, handleFinishMeeting } = useAppContext();

  const th = {
    bg: `bg-${config.primaryColor}-600`,
    lightBg: `bg-${config.primaryColor}-50`,
  };

  const isReadyComponent = ['dashboard_360', 'crm_funnel', 'crm_customers', 'crm_customer_detail', 'detail', 'erp_finance', 'erp_taxes', 'eam_dashboard', 'eam_register', 'eam_rfid', 'settings', 'meeting'].includes(currentView);

  return (
    <div className={`flex h-screen w-screen bg-slate-50 text-slate-900 font-sans selection:${th.lightBg} overflow-hidden`}>
      <Loader />
      <Toast />
      <TransactionModal />
      <AuditModal />
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden relative bg-[#f8fafc]">
          <Header />

          <div className="flex-1 overflow-y-auto p-12 custom-scrollbar relative">
              {currentView === 'dashboard_360' && <Dashboard360 />}
              {currentView === 'crm_funnel' && <Pipeline />}
              {currentView === 'crm_customers' && <CustomerList />}
              {(currentView === 'crm_customer_detail' || currentView === 'detail') && <CustomerDetail />}

              {currentView === 'erp_finance' && config.features.enableERP && <Finance />}
              {currentView === 'erp_taxes' && config.features.enableERP && <Taxes />}

              {currentView === 'eam_dashboard' && config.features.enableEAM && <DashboardEAM />}
              {currentView === 'eam_register' && config.features.enableEAM && <RegisterEAM />}
              {currentView === 'eam_rfid' && config.features.enableRFID && <RfidEAM />}

              {currentView === 'settings' && <Settings />}

              {currentView === 'meeting' && (
                 <div className="flex flex-col items-center justify-center h-full animate-in fade-in zoom-in-95 duration-500">
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

              {!isReadyComponent && OMNISYSTEM_VIEWS.includes(currentView) && (
                  <FallbackView />
              )}
          </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 0.4); }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

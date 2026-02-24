import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';

// Layouts & Hub
import GlobalHeader from './components/layout/Header';
import ModuleHub from './features/hub/ModuleHub';
import ModuleLayout from './features/hub/ModuleLayout';

// Features
import LandingPage from './features/landing/LandingPage';
import CRMModule from './features/crm/CRMModule';
import ProposalDesigner from './features/ERP/ProposalDesigner';
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

        <Routes>
          {/* Rota Raiz agora é a Landing Page 3D */}
          <Route path="/" element={<LandingPage />} />

          {/* Rota da Plataforma (Dashboard Principal) */}
          <Route path="/platform" element={<><GlobalHeader /><ModuleHub /></>} />

          {/* Rota dedicada ao Designer de Orçamento */}
          <Route path="/erp/proposal-designer" element={<ProposalDesigner />} />

          {/* Layout de Módulo (Com Sidebar e Sub-abas) */}
          <Route path="/module/:moduleId" element={<ModuleLayout />}>
             <Route index element={<FeatureRouter />} />
             <Route path=":featureId" element={<FeatureRouter />} />
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

// Componente para rotear a feature interna com base no módulo e no estado (ou URL)
function FeatureRouter() {
  const { moduleId } = useParams<{ moduleId: string }>();

  if (moduleId === 'sales' || moduleId === 'crm') {
      return <CRMModule />;
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

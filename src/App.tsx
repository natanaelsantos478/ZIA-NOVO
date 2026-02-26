import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';

// Layouts & Hub
import ModuleHub from './features/hub/ModuleHub';
import ModuleLayout from './features/hub/ModuleLayout';

// Features
import FallbackView from './features/Common/FallbackView';

function FeatureRouter() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { moduleId } = useParams<{ moduleId: string }>();
  // Todos os módulos são direcionados ao motor dinâmico para garantir padronização da Sidebar
  return <FallbackView />;
}

function AppContent() {
  const { currentView, config, handleFinishMeeting } = useAppContext();

  const th = {
    bg: `bg-${config.primaryColor}-600`,
    lightBg: `bg-${config.primaryColor}-50`,
  };

  return (
    <BrowserRouter>
      <div className={`flex flex-col h-screen w-screen bg-slate-50 text-slate-900 font-sans selection:${th.lightBg} overflow-hidden`}>
        <Suspense fallback={
          <div className="flex items-center justify-center h-screen w-screen bg-slate-950">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          {/* Rotas */}
          <Routes>
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="/app" element={<ModuleHub />} />

            <Route path="/app/module/:moduleId" element={<ModuleLayout />}>
               <Route index element={<FeatureRouter />} />
               <Route path=":featureId" element={<FeatureRouter />} />
            </Route>

            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </Suspense>

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

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

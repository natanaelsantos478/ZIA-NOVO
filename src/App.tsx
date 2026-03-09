import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VacanciesProvider } from './context/VacanciesContext';

// Autenticação (não lazy — são as primeiras telas)
import LoginPage            from './features/auth/LoginPage';
import SelecionarEmpresaPage from './features/auth/SelecionarEmpresaPage';

// Hub central
import ModuleHub from './features/hub/ModuleHub';

// Páginas públicas (sem autenticação)
import CareersPage       from './features/careers/CareersPage';
import VacancyDetailPage from './features/careers/VacancyDetailPage';

// Módulos internos — lazy loaded
const CRMLayout      = lazy(() => import('./features/crm/CRMLayout'));
const QualityLayout  = lazy(() => import('./features/quality/QualityLayout'));
const DocsLayout     = lazy(() => import('./features/docs/DocsLayout'));
const HRLayout       = lazy(() => import('./features/hr/HRLayout'));
const EAMLayout      = lazy(() => import('./features/eam/EAMLayout'));
const SCMLayout      = lazy(() => import('./features/scm/SCMLayout'));
const ERPLayout      = lazy(() => import('./features/erp/ERPLayout'));
const SettingsLayout = lazy(() => import('./features/settings/SettingsLayout'));

const Spinner = () => (
  <div className="flex items-center justify-center h-screen w-screen bg-slate-950">
    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

// ── Auth guard usando padrão "layout route" do React Router ──────────────────
// Usa <Outlet /> em vez de <Routes> aninhado — evita conflito de path matching
function AuthGuard() {
  const { session, loading } = useAuth();
  const { currentView, handleFinishMeeting } = useAppContext();

  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/login" replace />;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-50 overflow-hidden">
      <Suspense fallback={<Spinner />}>
        <Outlet />
      </Suspense>

      {/* Overlay de reunião */}
      {currentView === 'meeting' && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center h-full animate-in fade-in zoom-in-95 duration-500">
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
            <button
              onClick={handleFinishMeeting}
              className="relative bg-red-600 text-white w-32 h-32 rounded-full flex items-center justify-center shadow-2xl hover:bg-red-700 transition-colors z-10"
            >
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-white rounded-md mb-2" />
                <span className="font-black text-xs uppercase tracking-widest">Stop</span>
              </div>
            </button>
          </div>
          <p className="mt-8 font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Gravando Reunião...</p>
        </div>
      )}
    </div>
  );
}

function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/vagas"       element={<CareersPage />} />
        <Route path="/vagas/:slug" element={<VacancyDetailPage />} />

        {/* Autenticação */}
        <Route path="/login"              element={<LoginPage />} />
        <Route path="/selecionar-empresa" element={<SelecionarEmpresaPage />} />

        {/* App protegido — AuthGuard como layout route (sem path) */}
        <Route element={<AuthGuard />}>
          <Route path="/"                 element={<Navigate to="/app" replace />} />
          <Route path="/app"              element={<ModuleHub />} />
          <Route path="/app/crm/*"        element={<CRMLayout />} />
          <Route path="/app/quality/*"    element={<QualityLayout />} />
          <Route path="/app/docs/*"       element={<DocsLayout />} />
          <Route path="/app/hr/*"         element={<HRLayout />} />
          <Route path="/app/assets/*"     element={<EAMLayout />} />
          <Route path="/app/logistics/*"  element={<SCMLayout />} />
          <Route path="/app/backoffice/*" element={<ERPLayout />} />
          <Route path="/app/settings/*"   element={<SettingsLayout />} />
          <Route path="*"                 element={<Navigate to="/app" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <VacanciesProvider>
          <AppContent />
        </VacanciesProvider>
      </AppProvider>
    </AuthProvider>
  );
}

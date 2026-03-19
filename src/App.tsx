import { lazy, Suspense, useEffect, Component, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', background: '#0f172a', color: '#f1f5f9', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <p style={{ color: '#f87171', fontWeight: 700, fontSize: 18 }}>Erro ao carregar módulo</p>
          <p style={{ color: '#94a3b8', background: '#1e293b', padding: '12px 20px', borderRadius: 8, maxWidth: 600, wordBreak: 'break-all' }}>
            {(this.state.error as Error).message}
          </p>
          <button onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{ padding: '8px 20px', borderRadius: 8, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { AppProvider, useAppContext } from './context/AppContext';
import ChatFlutuante from './components/ChatFlutuante';
import { VacanciesProvider } from './context/VacanciesContext';
import { ProfileProvider, useProfiles, MODULE_OPTIONS, SCOPE_IDS_KEY } from './context/ProfileContext';
import { CompaniesProvider, useCompanies, type CompanyType } from './context/CompaniesContext';
import { AlertProvider } from './context/AlertContext';
import { AIConfigProvider } from './context/AIConfigContext';
import ProfileSelector from './components/ProfileSelector';

// Hub central (carregado imediatamente — é a primeira tela)
import ModuleHub from './features/hub/ModuleHub';

// Páginas públicas (portal de vagas — acessíveis sem autenticação)
import CareersPage      from './features/careers/CareersPage';
import VacancyDetailPage from './features/careers/VacancyDetailPage';
import OAuthCallbackGoogle from './pages/OAuthCallbackGoogle';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

// Cada módulo é uma aplicação independente com seu próprio layout e sidebar
const CRMLayout      = lazy(() => import('./features/crm/CRMLayout'));
const QualityLayout  = lazy(() => import('./features/quality/QualityLayout'));
const DocsLayout     = lazy(() => import('./features/docs/DocsLayout'));
const HRLayout       = lazy(() => import('./features/hr/HRLayout'));
const EAMLayout      = lazy(() => import('./features/eam/EAMLayout'));
const SCMLayout      = lazy(() => import('./features/scm/SCMLayout'));
const ERPLayout            = lazy(() => import('./features/erp/ERPLayout'));
const AssinaturasLayout    = lazy(() => import('./features/assinaturas/AssinaturasLayout'));
const SettingsLayout       = lazy(() => import('./features/settings/SettingsLayout'));
const AdminPanel     = lazy(() => import('./features/admin/AdminPanel'));
const IALayout       = lazy(() => import('./features/ia/IALayout'));
const IAChatPage     = lazy(() => import('./pages/ia/IAPage'));

const Spinner = () => (
  <div className="flex items-center justify-center h-screen w-screen bg-slate-950">
    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

/**
 * Re-sincroniza os scope IDs no localStorage sempre que as empresas carregam ou mudam.
 * Corrige race condition (empresas ainda não carregadas no login) e reload de página.
 */
function ScopeSyncer() {
  const { activeProfile } = useProfiles();
  const { companies, loading, scopeIds } = useCompanies();

  useEffect(() => {
    if (loading || !activeProfile) return;
    const ids = scopeIds(activeProfile.entityType as CompanyType, activeProfile.entityId);
    const finalIds = ids.length > 0 ? ids : [activeProfile.entityId];
    localStorage.setItem(SCOPE_IDS_KEY, JSON.stringify(finalIds));
  }, [loading, activeProfile?.id, companies.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function AppRoutes() {
  const { currentView, handleFinishMeeting } = useAppContext();
  const { activeProfile, loading } = useProfiles();
  const { loading: companiesLoading } = useCompanies();

  // Aguarda perfis E empresas carregarem antes de qualquer decisão de rota
  if (loading || companiesLoading) return <Spinner />;

  // Se nenhum perfil está ativo → mostra seletor de perfil
  if (!activeProfile) {
    return (
      <Routes>
        {/* Rotas públicas sempre acessíveis */}
        <Route path="/vagas"           element={<CareersPage />} />
        <Route path="/vagas/:slug"     element={<VacancyDetailPage />} />
        <Route path="/privacidade"     element={<PrivacyPolicy />} />
        <Route path="/termos"          element={<TermsOfService />} />
        {/* Callback OAuth — popup sem autenticação */}
        <Route path="/oauth/google"    element={<OAuthCallbackGoogle />} />
        {/* Painel admin Zitasoftware — acessível sem login ZIA */}
        <Route path="/admin" element={<Suspense fallback={<Spinner />}><AdminPanel /></Suspense>} />
        {/* Tudo mais → seletor de perfil */}
        <Route path="*" element={<ProfileSelector />} />
      </Routes>
    );
  }

  // Nível 4 (Funcionário) → redireciona direto para o módulo do perfil
  const level4Route = (() => {
    if (activeProfile.level !== 4) return null;
    const mod = MODULE_OPTIONS.find(m => m.id === activeProfile.moduleAccess);
    return mod?.route ?? '/app';
  })();

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-50 overflow-hidden">
      <AppErrorBoundary>
      <Suspense fallback={<Spinner />}>
        <Routes>
          {/* ── Rotas públicas — portal de vagas (sem autenticação) ── */}
          <Route path="/vagas"       element={<CareersPage />} />
          <Route path="/vagas/:slug" element={<VacancyDetailPage />} />
          <Route path="/privacidade" element={<PrivacyPolicy />} />
          <Route path="/termos"      element={<TermsOfService />} />

          {/* Nível 4: redireciona para módulo específico */}
          {level4Route && (
            <Route path="/" element={<Navigate to={level4Route} replace />} />
          )}
          {level4Route && (
            <Route path="/app" element={<Navigate to={level4Route} replace />} />
          )}

          {/* ── Hub central — dashboard com visão geral de todos os módulos ── */}
          <Route path="/"    element={<Navigate to="/app" replace />} />
          <Route path="/app" element={<ModuleHub />} />

          {/* Callback OAuth — popup sem autenticação (também acessível logado) */}
          <Route path="/oauth/google" element={<OAuthCallbackGoogle />} />

          {/* ── Módulos internos — cada um com layout e sidebar independente ── */}
          <Route path="/app/crm/*"        element={<CRMLayout />} />
          <Route path="/app/quality/*"    element={<QualityLayout />} />
          <Route path="/app/docs/*"       element={<DocsLayout />} />
          <Route path="/app/hr/*"         element={<HRLayout />} />
          <Route path="/app/assets/*"     element={<EAMLayout />} />
          <Route path="/app/logistics/*"  element={<SCMLayout />} />
          <Route path="/app/backoffice/*"    element={<ERPLayout />} />
          <Route path="/app/assinaturas/*" element={<AssinaturasLayout />} />
          <Route path="/app/settings/*"    element={<SettingsLayout />} />
          <Route path="/app/ia/*"          element={<IALayout />} />
          <Route path="/ia"               element={<IAChatPage />} />
          <Route path="/ia/:conversaId"   element={<IAChatPage />} />

          {/* Painel admin — acessível mesmo logado */}
          <Route path="/admin" element={<AdminPanel />} />

          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </Suspense>
      </AppErrorBoundary>

      {/* Agente IA flutuante — visível em todas as telas autenticadas */}
      <ChatFlutuante />

      {/* Overlay de reunião — mantido global */}
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
    <AppProvider>
      <AIConfigProvider>
        <AlertProvider>
          <CompaniesProvider>
            <VacanciesProvider>
              <ScopeSyncer />
              <AppRoutes />
            </VacanciesProvider>
          </CompaniesProvider>
        </AlertProvider>
      </AIConfigProvider>
    </AppProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ProfileProvider>
        <AppContent />
      </ProfileProvider>
    </BrowserRouter>
  );
}

// SCM Module — roteador de seções com lazy loading e ErrorBoundary
import { lazy, Suspense, Component, type ReactNode, type ErrorInfo } from 'react';
import { Construction, AlertTriangle, RefreshCw } from 'lucide-react';
import Loader from '../../components/UI/Loader';
import ActivitiesPanel from '../../components/shared/ActivitiesPanel';

// ── ErrorBoundary ─────────────────────────────────────────────────────────────
interface EBProps { children: ReactNode; section: string }
interface EBState { hasError: boolean; message: string; section: string }

class SectionErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false, message: '', section: props.section };
  }

  static getDerivedStateFromProps(props: EBProps, state: EBState): Partial<EBState> | null {
    // Reset error state when section changes
    if (props.section !== state.section) {
      return { hasError: false, message: '', section: props.section };
    }
    return null;
  }

  static getDerivedStateFromError(error: Error): Partial<EBState> {
    return { hasError: true, message: error.message ?? String(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[SCM] Erro na seção:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px] p-8">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Erro ao carregar seção</h2>
            <p className="text-xs text-slate-500 mb-4 font-mono bg-slate-50 px-3 py-2 rounded-lg break-all">
              {this.state.message}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm mx-auto hover:bg-emerald-700"
            >
              <RefreshCw className="w-4 h-4" /> Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── ComingSoon ────────────────────────────────────────────────────────────────
function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Construction className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">{label}</h2>
        <p className="text-slate-400 text-sm max-w-xs">Em desenvolvimento. Em breve disponível.</p>
      </div>
    </div>
  );
}

// ── Lazy sections ─────────────────────────────────────────────────────────────
const Dashboard  = lazy(() => import('./sections/Dashboard'));
const Fleet      = lazy(() => import('./sections/Fleet'));
const Routing    = lazy(() => import('./sections/Routing'));
const TMS        = lazy(() => import('./sections/TMS'));
const LastMile   = lazy(() => import('./sections/LastMile'));
const WMS        = lazy(() => import('./sections/WMS'));
const Packing    = lazy(() => import('./sections/Packing'));
const CrossDock  = lazy(() => import('./sections/CrossDock'));
const Reverse    = lazy(() => import('./sections/Reverse'));
const AuditFretes = lazy(() => import('./sections/AuditFretes'));
const Green      = lazy(() => import('./sections/Green'));
const ColdChain  = lazy(() => import('./sections/ColdChain'));
const Drone      = lazy(() => import('./sections/Drone'));

// ── Roteador ──────────────────────────────────────────────────────────────────
interface SCMModuleProps { activeSection: string }

function Section({ activeSection }: SCMModuleProps) {
  switch (activeSection) {
    case 'dashboard':  return <Dashboard />;
    case 'routing':    return <Routing />;
    case 'fleet':      return <Fleet />;
    case 'tms':        return <TMS />;
    case 'lastmile':   return <LastMile />;
    case 'wms':        return <WMS />;
    case 'packing':    return <Packing />;
    case 'crossdock':  return <CrossDock />;
    case 'reverse':    return <Reverse />;
    case 'audit':      return <AuditFretes />;
    case 'green':      return <Green />;
    case 'cold':       return <ColdChain />;
    case 'drone':      return <Drone />;
    case 'automacoes': return <ActivitiesPanel defaultModule="LOGISTICA" />;
    default:           return <ComingSoon label={activeSection} />;
  }
}

export default function SCMModule({ activeSection }: SCMModuleProps) {
  return (
    <SectionErrorBoundary section={activeSection}>
      <Suspense fallback={<Loader />}>
        <Section key={activeSection} activeSection={activeSection} />
      </Suspense>
    </SectionErrorBoundary>
  );
}

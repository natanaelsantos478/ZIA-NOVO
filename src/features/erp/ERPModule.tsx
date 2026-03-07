// ERP Module — lazy loaded sections
import { lazy, Suspense } from 'react';
import Loader from '../../components/UI/Loader';
import { Construction } from 'lucide-react';

const FinanceDashboard   = lazy(() => import('./sections/FinanceDashboard'));
const AccountsReceivable = lazy(() => import('./sections/AccountsReceivable'));
const AccountsPayable    = lazy(() => import('./sections/AccountsPayable'));
const Treasury           = lazy(() => import('./sections/Treasury'));
const Invoicing          = lazy(() => import('./sections/Invoicing'));

interface ERPModuleProps {
  activeSection: string;
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Construction className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">{label}</h2>
        <p className="text-slate-400 text-sm max-w-xs">Módulo em desenvolvimento. Em breve disponível.</p>
      </div>
    </div>
  );
}

function Section({ activeSection }: ERPModuleProps) {
  switch (activeSection) {
    // Visão Geral
    case 'dashboard':    return <FinanceDashboard />;
    // Financeiro
    case 'ar':           return <AccountsReceivable />;
    case 'ap':           return <AccountsPayable />;
    case 'treasury':     return <Treasury />;
    case 'invoicing':    return <Invoicing />;
    // Em desenvolvimento
    case 'accounting':   return <ComingSoon label="Contabilidade Global" />;
    case 'taxes':        return <ComingSoon label="Fiscal e Tributária" />;
    case 'controller':   return <ComingSoon label="Controladoria e DRE" />;
    case 'audit':        return <ComingSoon label="Auditoria e Log Trail" />;
    case 'crypto':       return <ComingSoon label="Ledger Blockchain" />;
    case 'inventory':    return <ComingSoon label="Gestão de Estoque" />;
    case 'costs':        return <ComingSoon label="Custos de Produção" />;
    case 'procurement':  return <ComingSoon label="Compras (Portal)" />;
    case 'mrp':          return <ComingSoon label="MRP (Materiais)" />;
    case 'pcp':          return <ComingSoon label="PCP (Produção)" />;
    case 'contracts':    return <ComingSoon label="Gestão de Contratos" />;
    case 'projects':     return <ComingSoon label="Obras e Projetos" />;
    case 'bids':         return <ComingSoon label="Licitações (Editais)" />;
    case 'csc':          return <ComingSoon label="CSC (Serviços Internos)" />;
    default:             return <FinanceDashboard />;
  }
}

export default function ERPModule({ activeSection }: ERPModuleProps) {
  return (
    <Suspense fallback={<Loader />}>
      <Section activeSection={activeSection} />
    </Suspense>
  );
}

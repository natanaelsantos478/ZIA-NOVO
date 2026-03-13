// Assinaturas Module — lazy loaded sections
import { lazy, Suspense } from 'react';
import Loader from '../../components/UI/Loader';

const VisaoGeral         = lazy(() => import('./sections/VisaoGeral'));
const ClientesAssinatura = lazy(() => import('./sections/ClientesAssinatura'));
const Planos             = lazy(() => import('./sections/Planos'));
const Acessos            = lazy(() => import('./sections/Acessos'));
const Integracoes        = lazy(() => import('./sections/Integracoes'));
const Configuracoes      = lazy(() => import('./sections/Configuracoes'));

interface AssinaturasModuleProps {
  activeSection: string;
}

function Section({ activeSection }: AssinaturasModuleProps) {
  switch (activeSection) {
    case 'visao-geral':   return <VisaoGeral />;
    case 'clientes':      return <ClientesAssinatura />;
    case 'planos':        return <Planos />;
    case 'acessos':       return <Acessos />;
    case 'integracoes':   return <Integracoes />;
    case 'configuracoes': return <Configuracoes />;
    default:              return <VisaoGeral />;
  }
}

export default function AssinaturasModule({ activeSection }: AssinaturasModuleProps) {
  return (
    <Suspense fallback={<Loader />}>
      <Section activeSection={activeSection} />
    </Suspense>
  );
}

import { lazy, Suspense } from 'react';
import Loader from '../../components/UI/Loader';

const Dashboard    = lazy(() => import('./sections/Dashboard'));
const Fleet        = lazy(() => import('./sections/Fleet'));
const TMS          = lazy(() => import('./sections/TMS'));
const Routing      = lazy(() => import('./sections/Routing'));
const LastMile     = lazy(() => import('./sections/LastMile'));
const WMS          = lazy(() => import('./sections/WMS'));
const Packing      = lazy(() => import('./sections/Packing'));
const CrossDock    = lazy(() => import('./sections/CrossDock'));
const Reverse      = lazy(() => import('./sections/Reverse'));
const FreightAudit = lazy(() => import('./sections/FreightAudit'));
const Green        = lazy(() => import('./sections/Green'));
const ColdChain    = lazy(() => import('./sections/ColdChain'));
const Drone        = lazy(() => import('./sections/Drone'));

interface Props {
  section: string;
}

export default function SCMModule({ section }: Props) {
  return (
    <Suspense fallback={<Loader />}>
      {section === 'dashboard' && <Dashboard />}
      {section === 'fleet'     && <Fleet />}
      {section === 'tms'       && <TMS />}
      {section === 'routing'   && <Routing />}
      {section === 'lastmile'  && <LastMile />}
      {section === 'wms'       && <WMS />}
      {section === 'packing'   && <Packing />}
      {section === 'crossdock' && <CrossDock />}
      {section === 'reverse'   && <Reverse />}
      {section === 'audit'     && <FreightAudit />}
      {section === 'green'     && <Green />}
      {section === 'cold'      && <ColdChain />}
      {section === 'drone'     && <Drone />}
    </Suspense>
  );
}

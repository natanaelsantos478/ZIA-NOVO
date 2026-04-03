import { lazy, Suspense } from 'react';
import ActivitiesPanel from '../../components/shared/ActivitiesPanel';

const AssetsDashboard  = lazy(() => import('./sections/AssetsDashboard'));
const AssetsList       = lazy(() => import('./sections/AssetsList'));
const AssetTransfer    = lazy(() => import('./sections/AssetTransfer'));
const AssetMaintenance = lazy(() => import('./sections/AssetMaintenance'));
const AssetInventory   = lazy(() => import('./sections/AssetInventory'));
const AssetInsurance   = lazy(() => import('./sections/AssetInsurance'));
const AssetReports     = lazy(() => import('./sections/AssetReports'));
const AssetSettings    = lazy(() => import('./sections/AssetSettings'));

interface Props {
  activeSection: string;
  onNavigate: (id: string) => void;
}

function SectionLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function EAMModule({ activeSection, onNavigate }: Props) {
  return (
    <Suspense fallback={<SectionLoader />}>
      {activeSection === 'dashboard'   && <AssetsDashboard onNavigate={onNavigate} />}
      {activeSection === 'assets'      && <AssetsList />}
      {activeSection === 'transfers'   && <AssetTransfer />}
      {activeSection === 'maintenance' && <AssetMaintenance />}
      {activeSection === 'inventory'   && <AssetInventory />}
      {activeSection === 'insurance'   && <AssetInsurance />}
      {activeSection === 'reports'     && <AssetReports />}
      {activeSection === 'settings'    && <AssetSettings />}
      {activeSection === 'automacoes'  && <ActivitiesPanel defaultModule="INVENTARIO" />}
    </Suspense>
  );
}

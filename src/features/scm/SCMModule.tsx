import { Construction } from 'lucide-react';
import SCMDashboard from './sections/SCMDashboard';
import SCMRouting from './sections/SCMRouting';
import SCMFleet from './sections/SCMFleet';
import SCMDrivers from './sections/SCMDrivers';
import SCMTMS from './sections/SCMTMS';
import SCMLastMile from './sections/SCMLastMile';
import SCMWMS from './sections/SCMWMS';
import SCMPacking from './sections/SCMPacking';
import SCMCrossDock from './sections/SCMCrossDock';
import SCMReverse from './sections/SCMReverse';
import SCMAudit from './sections/SCMAudit';

const SECTION_LABELS: Record<string, string> = {
  green: 'Sustentabilidade (ESG)',
  cold:  'Cadeia Fria (Cold Chain)',
  drone: 'Integração Drones',
};

interface Props {
  section: string;
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-64">
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Construction className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{label}</h2>
        <p className="text-slate-500 max-w-sm">Módulo em desenvolvimento. Em breve disponível.</p>
      </div>
    </div>
  );
}

export default function SCMModule({ section }: Props) {
  switch (section) {
    case 'dashboard': return <SCMDashboard />;
    case 'routing':   return <SCMRouting />;
    case 'fleet':     return <SCMFleet />;
    case 'drivers':   return <SCMDrivers />;
    case 'tms':       return <SCMTMS />;
    case 'lastmile':  return <SCMLastMile />;
    case 'wms':       return <SCMWMS />;
    case 'packing':   return <SCMPacking />;
    case 'crossdock': return <SCMCrossDock />;
    case 'reverse':   return <SCMReverse />;
    case 'audit':     return <SCMAudit />;
    default:
      return <ComingSoon label={SECTION_LABELS[section] ?? section} />;
  }
}

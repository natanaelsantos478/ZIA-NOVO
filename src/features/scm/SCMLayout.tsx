import { useState } from 'react';
import {
  BarChart3, Route, Truck, Package, Navigation, RefreshCw,
  Building, Box, ArrowRightLeft, FileSearch, Leaf, Thermometer, Plane,
  Construction,
} from 'lucide-react';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';

const SECTION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  routing:   'Roteirização com IA',
  fleet:     'Gestão de Frota',
  tms:       'TMS (Fretes)',
  lastmile:  'Rastreamento Last-Mile',
  reverse:   'Logística Reversa',
  wms:       'Gestão de Docas (WMS)',
  packing:   'Embalagem e Packing',
  crossdock: 'Cross-Docking',
  audit:     'Auditoria de Fretes',
  green:     'Sustentabilidade (ESG)',
  cold:      'Cadeia Fria (Cold Chain)',
  drone:     'Integração Drones',
};

const NAV_GROUPS = [
  {
    label: 'Visão Geral',
    items: [
      { icon: BarChart3, label: 'Dashboard', id: 'dashboard' },
    ],
  },
  {
    label: 'Transporte e Frota',
    items: [
      { icon: Route,       label: 'Roteirização com IA',    id: 'routing'  },
      { icon: Truck,       label: 'Gestão de Frota',        id: 'fleet'    },
      { icon: Package,     label: 'TMS (Fretes)',           id: 'tms'      },
      { icon: Navigation,  label: 'Rastreamento Last-Mile', id: 'lastmile' },
    ],
  },
  {
    label: 'Armazém (WMS)',
    items: [
      { icon: Building,       label: 'Gestão de Docas (WMS)', id: 'wms'       },
      { icon: Box,            label: 'Embalagem e Packing',   id: 'packing'   },
      { icon: ArrowRightLeft, label: 'Cross-Docking',          id: 'crossdock' },
    ],
  },
  {
    label: 'Logística',
    items: [
      { icon: RefreshCw, label: 'Logística Reversa',  id: 'reverse' },
      { icon: FileSearch, label: 'Auditoria de Fretes', id: 'audit'  },
    ],
  },
  {
    label: 'Inovação',
    items: [
      { icon: Leaf,        label: 'Sustentabilidade (ESG)',   id: 'green' },
      { icon: Thermometer, label: 'Cadeia Fria (Cold Chain)', id: 'cold'  },
      { icon: Plane,       label: 'Integração Drones',        id: 'drone' },
    ],
  },
];

export default function SCMLayout() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const label = SECTION_LABELS[activeSection] ?? activeSection;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ModuleSidebar
          moduleTitle="Logística & Supply Chain"
          moduleCode="SCM"
          color="emerald"
          navGroups={NAV_GROUPS}
          activeId={activeSection}
          onNavigate={setActiveSection}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Construction className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{label}</h2>
            <p className="text-slate-500 max-w-sm">
              Módulo em desenvolvimento. Em breve: roteirização inteligente, TMS e rastreamento em tempo real.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

import { useState } from 'react';
import {
  BarChart3, Route, Truck, Package, Navigation, RefreshCw,
  Building, Box, ArrowRightLeft, FileSearch, Leaf, Thermometer, Plane, User,
} from 'lucide-react';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';
import SCMModule from './SCMModule';

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
      { icon: Route,      label: 'Roteirização com IA',    id: 'routing'  },
      { icon: Truck,      label: 'Gestão de Frota',        id: 'fleet'    },
      { icon: User,       label: 'Motoristas',             id: 'drivers'  },
      { icon: Package,    label: 'TMS (Fretes)',           id: 'tms'      },
      { icon: Navigation, label: 'Rastreamento Last-Mile', id: 'lastmile' },
    ],
  },
  {
    label: 'Armazém (WMS)',
    items: [
      { icon: Building,       label: 'Gestão de Docas (WMS)', id: 'wms'       },
      { icon: Box,            label: 'Embalagem e Packing',   id: 'packing'   },
      { icon: ArrowRightLeft, label: 'Cross-Docking',         id: 'crossdock' },
    ],
  },
  {
    label: 'Logística',
    items: [
      { icon: RefreshCw,  label: 'Logística Reversa',   id: 'reverse' },
      { icon: FileSearch, label: 'Auditoria de Fretes', id: 'audit'   },
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
        <main className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar">
          <SCMModule section={activeSection} />
        </main>
      </div>
    </div>
  );
}

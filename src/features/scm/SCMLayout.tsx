import { useState } from 'react';
import {
  BarChart3, Route, Truck, Package, Navigation, RefreshCw,
  Building, Box, ArrowRightLeft, FileSearch, Leaf, Thermometer, Plane,
} from 'lucide-react';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';

const NAV_ITEMS = [
  { icon: BarChart3,       label: 'Dashboard',               id: 'dashboard' },
  { icon: Route,           label: 'Roteirização com IA',     id: 'routing'   },
  { icon: Truck,           label: 'Gestão de Frota',         id: 'fleet'     },
  { icon: Package,         label: 'TMS (Fretes)',            id: 'tms'       },
  { icon: Navigation,      label: 'Rastreamento Last-Mile',  id: 'lastmile'  },
  { icon: RefreshCw,       label: 'Logística Reversa',       id: 'reverse'   },
  { icon: Building,        label: 'Gestão de Docas (WMS)',   id: 'wms'       },
  { icon: Box,             label: 'Embalagem e Packing',     id: 'packing'   },
  { icon: ArrowRightLeft,  label: 'Cross-Docking',           id: 'crossdock' },
  { icon: FileSearch,      label: 'Auditoria de Fretes',     id: 'audit'     },
  { icon: Leaf,            label: 'Sustentabilidade (ESG)',  id: 'green'     },
  { icon: Thermometer,     label: 'Cadeia Fria (Cold Chain)',id: 'cold'      },
  { icon: Plane,           label: 'Integração Drones',       id: 'drone'     },
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
          navItems={NAV_ITEMS}
          activeId={activeSection}
          onNavigate={setActiveSection}
        />
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Truck className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Logística & Supply Chain (SCM)</h2>
            <p className="text-slate-500 max-w-sm">
              Módulo em desenvolvimento. Em breve: roteirização inteligente, TMS e rastreamento em tempo real.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

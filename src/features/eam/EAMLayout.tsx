import { useState } from 'react';
import {
  BarChart3, MapPin, Barcode, Cpu, CalendarDays, RefreshCw,
  ArrowRightLeft, FileCheck, BellRing, Layers, Zap, ShieldAlert, Map,
} from 'lucide-react';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';

const NAV_ITEMS = [
  { icon: BarChart3,       label: 'Dashboard',               id: 'dashboard'  },
  { icon: MapPin,          label: 'Rastreabilidade Global',  id: 'tracking'   },
  { icon: Barcode,         label: 'Controle de Inventário',  id: 'inventory'  },
  { icon: Cpu,             label: 'Manutenção Preditiva',    id: 'predictive' },
  { icon: CalendarDays,    label: 'Preventiva e Corretiva',  id: 'preventive' },
  { icon: RefreshCw,       label: 'Ciclo de Vida (TCO)',     id: 'lifecycle'  },
  { icon: ArrowRightLeft,  label: 'Transferência / Check-in',id: 'transfer'   },
  { icon: FileCheck,       label: 'Consignados e Alugados',  id: 'rented'     },
  { icon: BellRing,        label: 'Central de Alarmes',      id: 'alarms'     },
  { icon: Map,             label: 'Mapeamento (Floor Plan)', id: 'map'        },
  { icon: Layers,          label: 'Digital Twin (3D)',        id: 'twin'       },
  { icon: Zap,             label: 'Energia e Utilidades',    id: 'energy'     },
  { icon: ShieldAlert,     label: 'Automação de Garantias',  id: 'warranty'   },
];

export default function EAMLayout() {
  const [activeSection, setActiveSection] = useState('dashboard');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ModuleSidebar
          moduleTitle="Gestão de Ativos"
          moduleCode="EAM"
          color="blue"
          navItems={NAV_ITEMS}
          activeId={activeSection}
          onNavigate={setActiveSection}
        />
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Cpu className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Gestão de Ativos (EAM)</h2>
            <p className="text-slate-500 max-w-sm">
              Módulo em desenvolvimento. Em breve: rastreabilidade, manutenção preditiva e digital twin.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

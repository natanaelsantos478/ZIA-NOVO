import { useState } from 'react';
import {
  BarChart3, MapPin, Barcode, Cpu, CalendarDays, RefreshCw,
  ArrowRightLeft, FileCheck, BellRing, Layers, Zap, ShieldAlert, Map,
  Construction,
} from 'lucide-react';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';

const SECTION_LABELS: Record<string, string> = {
  dashboard:  'Dashboard',
  tracking:   'Rastreabilidade Global',
  inventory:  'Controle de Inventário',
  predictive: 'Manutenção Preditiva',
  preventive: 'Preventiva e Corretiva',
  lifecycle:  'Ciclo de Vida (TCO)',
  transfer:   'Transferência / Check-in',
  rented:     'Consignados e Alugados',
  alarms:     'Central de Alarmes',
  map:        'Mapeamento (Floor Plan)',
  twin:       'Digital Twin (3D)',
  energy:     'Energia e Utilidades',
  warranty:   'Automação de Garantias',
};

const NAV_GROUPS = [
  {
    label: 'Visão Geral',
    items: [
      { icon: BarChart3, label: 'Dashboard', id: 'dashboard' },
    ],
  },
  {
    label: 'Ativos e Inventário',
    items: [
      { icon: MapPin,         label: 'Rastreabilidade Global', id: 'tracking'  },
      { icon: Barcode,        label: 'Controle de Inventário', id: 'inventory' },
      { icon: RefreshCw,      label: 'Ciclo de Vida (TCO)',    id: 'lifecycle' },
      { icon: FileCheck,      label: 'Consignados e Alugados', id: 'rented'    },
    ],
  },
  {
    label: 'Manutenção',
    items: [
      { icon: Cpu,         label: 'Manutenção Preditiva',   id: 'predictive' },
      { icon: CalendarDays,label: 'Preventiva e Corretiva', id: 'preventive' },
      { icon: ShieldAlert, label: 'Automação de Garantias', id: 'warranty'   },
    ],
  },
  {
    label: 'Operações',
    items: [
      { icon: ArrowRightLeft, label: 'Transferência / Check-in', id: 'transfer' },
      { icon: BellRing,       label: 'Central de Alarmes',       id: 'alarms'   },
    ],
  },
  {
    label: 'Tecnologia Avançada',
    items: [
      { icon: Map,    label: 'Mapeamento (Floor Plan)', id: 'map'    },
      { icon: Layers, label: 'Digital Twin (3D)',       id: 'twin'   },
      { icon: Zap,    label: 'Energia e Utilidades',   id: 'energy' },
    ],
  },
];

export default function EAMLayout() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const label = SECTION_LABELS[activeSection] ?? activeSection;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ModuleSidebar
          moduleTitle="Gestão de Ativos"
          moduleCode="EAM"
          color="blue"
          navGroups={NAV_GROUPS}
          activeId={activeSection}
          onNavigate={setActiveSection}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Construction className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{label}</h2>
            <p className="text-slate-500 max-w-sm">
              Módulo em desenvolvimento. Em breve: rastreabilidade, manutenção preditiva e digital twin.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

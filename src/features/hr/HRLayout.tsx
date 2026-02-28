import { useState } from 'react';
import {
  Users, UserPlus, FileSignature, Star, Clock, DollarSign,
  BookOpen, Gift, Smile, ShieldCheck, DoorOpen, LineChart,
} from 'lucide-react';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';
import HRModule from './HRModule';

const NAV_ITEMS = [
  { icon: Users,         label: 'Dashboard',            id: 'dashboard'   },
  { icon: UserPlus,      label: 'Recrutamento (ATS)',   id: 'ats'         },
  { icon: FileSignature, label: 'Onboarding Digital',   id: 'onboarding'  },
  { icon: Star,          label: 'Gestão de Desempenho', id: 'performance' },
  { icon: Clock,         label: 'Ponto e Frequência',   id: 'time'        },
  { icon: DollarSign,    label: 'Folha de Pagamento',   id: 'payroll'     },
  { icon: BookOpen,      label: 'Treinamento (LMS)',    id: 'lms'         },
  { icon: Gift,          label: 'Benefícios',           id: 'benefits'    },
  { icon: Smile,         label: 'Clima Organizacional', id: 'climate'     },
  { icon: ShieldCheck,   label: 'Saúde e Seg. (SST)',   id: 'sst'         },
  { icon: DoorOpen,      label: 'Offboarding',          id: 'offboarding' },
  { icon: LineChart,     label: 'Sucessão e Carreiras', id: 'succession'  },
];

export default function HRLayout() {
  const [activeSection, setActiveSection] = useState('dashboard');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ModuleSidebar
          moduleTitle="Recursos Humanos"
          moduleCode="RH"
          color="pink"
          navItems={NAV_ITEMS}
          activeId={activeSection}
          onNavigate={setActiveSection}
        />
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar">
          <HRModule />
        </main>
      </div>
    </div>
  );
}

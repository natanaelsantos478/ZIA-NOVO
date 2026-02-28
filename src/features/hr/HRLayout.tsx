import { useState } from 'react';
import {
  GitBranch, Briefcase, Users,
  FileSearch, UserCheck, ClipboardList, Building2,
} from 'lucide-react';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';
import HRModule from './HRModule';

const NAV_GROUPS = [
  {
    label: 'Estrutura Organizacional',
    items: [
      { icon: GitBranch,    label: 'Organograma',            id: 'org-chart'   },
      { icon: Briefcase,    label: 'Cargos e Salários',      id: 'positions'   },
      { icon: Users,        label: 'Grupos de Funcionários', id: 'groups'      },
    ],
  },
  {
    label: 'Recrutamento e Entrada',
    items: [
      { icon: FileSearch,    label: 'Vagas (ATS)',             id: 'vacancies'   },
      { icon: UserCheck,     label: 'Onboarding Digital',      id: 'onboarding'  },
      { icon: ClipboardList, label: 'Admissão de Funcionário', id: 'admission'   },
      { icon: Building2,     label: 'Gestão de Terceiros',     id: 'contractors' },
    ],
  },
];

export default function HRLayout() {
  const [activeSection, setActiveSection] = useState('org-chart');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ModuleSidebar
          moduleTitle="Recursos Humanos"
          moduleCode="RH"
          color="pink"
          navGroups={NAV_GROUPS}
          activeId={activeSection}
          onNavigate={setActiveSection}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar">
          <HRModule activeSection={activeSection} />
        </main>
      </div>
    </div>
  );
}

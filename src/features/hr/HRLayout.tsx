import { useState } from 'react';
import {
  GitBranch, Briefcase, Users,
  FileSearch, UserCheck, ClipboardList, Building2,
  CalendarDays, CalendarRange, Timer, Landmark,
  FilePen, UserX, Bell,
  DollarSign, Layers, Wallet, Umbrella, Heart,
  ListChecks, BarChart2, BookMarked,
  Award, Smartphone, Plane, Stethoscope,
  UserMinus, BellRing, Brain,
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
  {
    label: 'Jornada e Ponto',
    items: [
      { icon: CalendarDays,  label: 'Folha de Ponto',         id: 'timesheet'         },
      { icon: CalendarRange, label: 'Escalas',                id: 'schedules'         },
      { icon: Timer,         label: 'Horas Extras',           id: 'overtime'          },
      { icon: Landmark,      label: 'Banco de Horas',         id: 'hour-bank'         },
      { icon: FilePen,       label: 'Alterações de Ponto',    id: 'punch-corrections' },
      { icon: UserX,         label: 'Faltas e Ausências',     id: 'absences'          },
      { icon: Bell,          label: 'Alertas de Ponto',       id: 'point-alerts'      },
    ],
  },
  {
    label: 'Remuneração e Folha',
    items: [
      { icon: DollarSign, label: 'Central de Folha',       id: 'payroll'           },
      { icon: Layers,     label: 'Grupos de Folha',        id: 'payroll-groups'    },
      { icon: Wallet,     label: 'Detalhamento Individual', id: 'employee-payslip' },
      { icon: Umbrella,   label: 'Gestão de Férias',       id: 'vacations'         },
      { icon: Heart,      label: 'Benefícios',             id: 'benefits'          },
    ],
  },
  {
    label: 'Atividades e Produtividade',
    items: [
      { icon: ListChecks, label: 'Gestão de Atividades',      id: 'activities'   },
      { icon: BarChart2,  label: 'Produtividade',             id: 'productivity' },
      { icon: BookMarked, label: 'Anotações e Advertências',  id: 'notes'        },
    ],
  },
  {
    label: 'Desenvolvimento e Saúde',
    items: [
      { icon: Award,        label: 'Desempenho e Sucessão',   id: 'performance'         },
      { icon: Smartphone,   label: 'Portal do Colaborador',   id: 'employee-portal'     },
      { icon: Plane,        label: 'Viagens e Despesas',      id: 'travel-expenses'     },
      { icon: Stethoscope,  label: 'SST',                     id: 'occupational-health' },
    ],
  },
  {
    label: 'Desligamento e IA',
    items: [
      { icon: UserMinus, label: 'Offboarding e Rescisão',    id: 'offboarding'      },
      { icon: BellRing,  label: 'Alertas Transversais',      id: 'hr-alerts'        },
      { icon: Brain,     label: 'People Analytics ZIA',      id: 'people-analytics' },
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

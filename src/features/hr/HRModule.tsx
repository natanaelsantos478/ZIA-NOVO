// HR Module — lazy loaded sections
import { lazy, Suspense } from 'react';
import Loader from '@/components/UI/Loader';

const Employees         = lazy(() => import('./sections/Employees'));
const OrgChart          = lazy(() => import('./sections/OrgChart'));
const Positions         = lazy(() => import('./sections/Positions'));
const EmployeeGroups    = lazy(() => import('./sections/EmployeeGroups'));
const Vacancies         = lazy(() => import('./sections/Vacancies'));
const Onboarding        = lazy(() => import('./sections/Onboarding'));
const Admission         = lazy(() => import('./sections/Admission'));
const Contractors       = lazy(() => import('./sections/Contractors'));
const Timesheet         = lazy(() => import('./sections/Timesheet'));
const Schedules         = lazy(() => import('./sections/Schedules'));
const Overtime          = lazy(() => import('./sections/Overtime'));
const HourBank          = lazy(() => import('./sections/HourBank'));
const PunchCorrections  = lazy(() => import('./sections/PunchCorrections'));
const Absences          = lazy(() => import('./sections/Absences'));
const PointAlerts       = lazy(() => import('./sections/PointAlerts'));
const Payroll           = lazy(() => import('./sections/Payroll'));
const PayrollGroups     = lazy(() => import('./sections/PayrollGroups'));
const EmployeePayslip   = lazy(() => import('./sections/EmployeePayslip'));
const Vacations         = lazy(() => import('./sections/Vacations'));
const Benefits          = lazy(() => import('./sections/Benefits'));
const Activities        = lazy(() => import('./sections/Activities'));
const Productivity      = lazy(() => import('./sections/Productivity'));
const Notes             = lazy(() => import('./sections/Notes'));
const Performance       = lazy(() => import('./sections/Performance'));
const EmployeePortal    = lazy(() => import('./sections/EmployeePortal'));
const TravelExpenses    = lazy(() => import('./sections/TravelExpenses'));
const OccupationalHealth = lazy(() => import('./sections/OccupationalHealth'));
const Offboarding       = lazy(() => import('./sections/Offboarding'));
const HRAlerts          = lazy(() => import('./sections/HRAlerts'));
const PeopleAnalytics   = lazy(() => import('./sections/PeopleAnalytics'));

interface HRModuleProps {
  activeSection: string;
}

function Section({ activeSection }: HRModuleProps) {
  switch (activeSection) {
    // 1.1 Estrutura Organizacional
    case 'employees':         return <Employees />;
    case 'org-chart':         return <OrgChart />;
    case 'positions':         return <Positions />;
    case 'groups':            return <EmployeeGroups />;
    // 1.2 Recrutamento e Entrada
    case 'vacancies':         return <Vacancies />;
    case 'onboarding':        return <Onboarding />;
    case 'admission':         return <Admission />;
    case 'contractors':       return <Contractors />;
    // 1.3 Jornada e Ponto
    case 'timesheet':         return <Timesheet />;
    case 'schedules':         return <Schedules />;
    case 'overtime':          return <Overtime />;
    case 'hour-bank':         return <HourBank />;
    case 'punch-corrections': return <PunchCorrections />;
    case 'absences':          return <Absences />;
    case 'point-alerts':      return <PointAlerts />;
    // 1.4 Remuneração e Folha
    case 'payroll':           return <Payroll />;
    case 'payroll-groups':    return <PayrollGroups />;
    case 'employee-payslip':  return <EmployeePayslip />;
    case 'vacations':         return <Vacations />;
    case 'benefits':          return <Benefits />;
    // 1.5 Atividades e Produtividade
    case 'activities':        return <Activities />;
    case 'productivity':      return <Productivity />;
    case 'notes':             return <Notes />;
    // 1.6 Desenvolvimento e Saúde
    case 'performance':          return <Performance />;
    case 'employee-portal':      return <EmployeePortal />;
    case 'travel-expenses':      return <TravelExpenses />;
    case 'occupational-health':  return <OccupationalHealth />;
    // 1.7 Desligamento e IA
    case 'offboarding':       return <Offboarding />;
    case 'hr-alerts':         return <HRAlerts />;
    case 'people-analytics':  return <PeopleAnalytics />;
    default:                  return <OrgChart />;
  }
}

export default function HRModule({ activeSection }: HRModuleProps) {
  return (
    <Suspense fallback={<Loader />}>
      <Section activeSection={activeSection} />
    </Suspense>
  );
}

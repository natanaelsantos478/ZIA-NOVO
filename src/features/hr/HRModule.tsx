import OrgChart         from './sections/OrgChart';
import Positions        from './sections/Positions';
import EmployeeGroups   from './sections/EmployeeGroups';
import Vacancies        from './sections/Vacancies';
import Onboarding       from './sections/Onboarding';
import Admission        from './sections/Admission';
import Contractors      from './sections/Contractors';
import Timesheet        from './sections/Timesheet';
import Schedules        from './sections/Schedules';
import Overtime         from './sections/Overtime';
import HourBank         from './sections/HourBank';
import PunchCorrections from './sections/PunchCorrections';
import Absences         from './sections/Absences';
import PointAlerts      from './sections/PointAlerts';
import Payroll          from './sections/Payroll';
import PayrollGroups    from './sections/PayrollGroups';
import EmployeePayslip  from './sections/EmployeePayslip';
import Vacations        from './sections/Vacations';
import Benefits         from './sections/Benefits';

interface HRModuleProps {
  activeSection: string;
}

export default function HRModule({ activeSection }: HRModuleProps) {
  switch (activeSection) {
    // 1.1 Estrutura Organizacional
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
    default:                  return <OrgChart />;
  }
}

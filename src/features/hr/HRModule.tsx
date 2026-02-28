import OrgChart       from './sections/OrgChart';
import Positions      from './sections/Positions';
import EmployeeGroups from './sections/EmployeeGroups';
import Vacancies      from './sections/Vacancies';
import Onboarding     from './sections/Onboarding';
import Admission      from './sections/Admission';
import Contractors    from './sections/Contractors';

interface HRModuleProps {
  activeSection: string;
}

export default function HRModule({ activeSection }: HRModuleProps) {
  switch (activeSection) {
    case 'org-chart':    return <OrgChart />;
    case 'positions':    return <Positions />;
    case 'groups':       return <EmployeeGroups />;
    case 'vacancies':    return <Vacancies />;
    case 'onboarding':   return <Onboarding />;
    case 'admission':    return <Admission />;
    case 'contractors':  return <Contractors />;
    default:             return <OrgChart />;
  }
}

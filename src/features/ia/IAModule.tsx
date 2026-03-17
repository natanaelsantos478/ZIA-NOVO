// ─────────────────────────────────────────────────────────────────────────────
// IAModule — Switch de seções do módulo IA
// ─────────────────────────────────────────────────────────────────────────────
import Dashboard    from './sections/Dashboard';
import Agents       from './sections/Agents';
import AgentBuilder from './sections/AgentBuilder';
import Permissions  from './sections/Permissions';
import Requests     from './sections/Requests';
import Monitor      from './sections/Monitor';
import Models       from './sections/Models';

interface IAModuleProps {
  section: string;
  onNavigate: (id: string) => void;
}

export default function IAModule({ section, onNavigate }: IAModuleProps) {
  switch (section) {
    case 'dashboard':     return <Dashboard    onNavigate={onNavigate} />;
    case 'agents':        return <Agents       onNavigate={onNavigate} />;
    case 'agent-builder': return <AgentBuilder onNavigate={onNavigate} />;
    case 'permissions':   return <Permissions />;
    case 'requests':      return <Requests />;
    case 'monitor':       return <Monitor />;
    case 'models':        return <Models />;
    default:              return <Dashboard    onNavigate={onNavigate} />;
  }
}

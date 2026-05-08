// ─────────────────────────────────────────────────────────────────────────────
// IAModule — Switch de seções do Escritório de IA
// ─────────────────────────────────────────────────────────────────────────────
import Organograma        from './sections/Organograma';
import ConfiguracoesPainel from './sections/ConfiguracoesPainel';
import WaAgentChats       from './sections/WaAgentChats';

interface IAModuleProps {
  section: string;
  onNavigate: (id: string) => void;
}

export default function IAModule({ section, onNavigate }: IAModuleProps) {
  switch (section) {
    case 'organograma':   return <Organograma onNavigate={onNavigate} />;
    case 'wa-chats':      return <WaAgentChats />;
    case 'configuracoes': return <ConfiguracoesPainel />;
    default:              return <Organograma onNavigate={onNavigate} />;
  }
}

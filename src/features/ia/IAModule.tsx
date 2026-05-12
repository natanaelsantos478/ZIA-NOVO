// ─────────────────────────────────────────────────────────────────────────────
// IAModule — Switch de seções do Escritório de IA
// ─────────────────────────────────────────────────────────────────────────────
import Organograma        from './sections/Organograma';
import ConfiguracoesPainel from './sections/ConfiguracoesPainel';
import DocumentacaoAPI     from './sections/DocumentacaoAPI';

interface IAModuleProps {
  section: string;
  onNavigate: (id: string) => void;
}

export default function IAModule({ section, onNavigate }: IAModuleProps) {
  switch (section) {
    case 'organograma':   return <Organograma onNavigate={onNavigate} />;
    case 'configuracoes': return <ConfiguracoesPainel />;
    case 'docs-api':      return <DocumentacaoAPI />;
    default:              return <Organograma onNavigate={onNavigate} />;
  }
}

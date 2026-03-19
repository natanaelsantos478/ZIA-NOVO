// ─────────────────────────────────────────────────────────────────────────────
// ChatFlutuante — Atalho flutuante para o módulo IA principal (/ia)
// Aparece em todas as telas (exceto dentro do próprio /ia) como botão no canto
// inferior direito. Ao clicar, navega para a tela completa de IA.
// ─────────────────────────────────────────────────────────────────────────────
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useProfiles } from '../context/ProfileContext';

export default function ChatFlutuante() {
  const location      = useLocation();
  const navigate      = useNavigate();
  const { activeProfile } = useProfiles();

  // Não renderizar sem perfil ativo ou dentro da própria tela de IA
  if (!activeProfile) return null;
  if (location.pathname.startsWith('/ia') || location.pathname.startsWith('/app/ia')) return null;

  return (
    <button
      onClick={() => navigate('/ia')}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-full shadow-lg shadow-indigo-900/50 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      title="Abrir ZIA — Assistente IA"
      aria-label="Abrir ZIA — Assistente IA"
    >
      <Sparkles className="w-6 h-6 text-white" />
    </button>
  );
}

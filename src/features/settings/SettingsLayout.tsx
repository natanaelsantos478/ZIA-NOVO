/* eslint-disable react-hooks/set-state-in-effect */
import { lazy, Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Settings, Users, Link, Layers, Palette, Bell, Shield, Database,
  Construction, Building2, Brain, Webhook, KeyRound, FileText, Megaphone,
} from 'lucide-react';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';
import Loader from '../../components/UI/Loader';
import { useProfiles } from '../../context/ProfileContext';

// Seções implementadas
const Perfis          = lazy(() => import('./sections/Perfis'));
const Empresas        = lazy(() => import('./sections/Empresas'));
const AlterarSenha    = lazy(() => import('./sections/AlterarSenha'));
const ConfiguracaoIA  = lazy(() => import('./sections/ConfiguracaoIA'));
const APIIntegracoes  = lazy(() => import('./sections/APIIntegracoes'));
const Appearance      = lazy(() => import('./sections/Appearance'));
const Alertas         = lazy(() => import('./sections/Alertas'));
const ChavesServicos  = lazy(() => import('./sections/ChavesServicos'));
const ArquivosIA           = lazy(() => import('./sections/ArquivosIA'));
const NovidadesAtualizacoes = lazy(() => import('./sections/NovidadesAtualizacoes'));

const SECTION_LABELS: Record<string, string> = {
  preferences:   'Preferências',
  users:         'Perfis e Acessos',
  empresas:      'Empresas e Filiais',
  integrations:  'Integrações',
  modules:       'Módulos Ativos',
  appearance:    'Aparência',
  notifications: 'Alertas',
  security:      'Segurança',
  data:          'Backup e Dados',
  ai:            'Configuração da IA',
  api:           'API & IAs',
  service_keys:  'Chaves de Serviços',
  ia_arquivos:   'Arquivos da IA',
  novidades:     'Novidades e Atualizações',
};

export const NAV_GROUPS = [
  {
    label: 'Sistema',
    items: [
      { icon: Settings,   label: 'Preferências',          id: 'preferences' },
      { icon: Layers,     label: 'Módulos Ativos',         id: 'modules'     },
      { icon: Palette,    label: 'Aparência',              id: 'appearance'  },
      { icon: Megaphone,  label: 'Novidades e Atualizações', id: 'novidades' },
    ],
  },
  {
    label: 'Organização',
    items: [
      { icon: Building2, label: 'Empresas e Filiais', id: 'empresas' },
      { icon: Users,     label: 'Perfis e Acessos',   id: 'users'    },
      { icon: Shield,    label: 'Segurança',           id: 'security' },
    ],
  },
  {
    label: 'Dados e Integrações',
    items: [
      { icon: Link,     label: 'Integrações',         id: 'integrations' },
      { icon: KeyRound, label: 'Chaves de Serviços',  id: 'service_keys' },
      { icon: Database, label: 'Backup e Dados',      id: 'data'         },
    ],
  },
  {
    label: 'Alertas',
    items: [
      { icon: Bell, label: 'Alertas', id: 'notifications' },
    ],
  },
  {
    label: 'Inteligência Artificial',
    items: [
      { icon: Brain,    label: 'Configuração da IA', id: 'ai'         },
      { icon: Webhook,  label: 'API & IAs',           id: 'api'        },
      { icon: FileText, label: 'Arquivos da IA',      id: 'ia_arquivos'},
    ],
  },
];

function Section({ id }: { id: string }) {
  switch (id) {
    case 'users':         return <Perfis />;
    case 'empresas':      return <Empresas />;
    case 'security':      return <AlterarSenha />;
    case 'ai':            return <ConfiguracaoIA />;
    case 'api':
    case 'integrations':  return <APIIntegracoes />;
    case 'appearance':    return <Appearance />;
    case 'notifications': return <Alertas />;
    case 'service_keys':  return <ChavesServicos />;
    case 'ia_arquivos':   return <ArquivosIA />;
    case 'novidades':     return <NovidadesAtualizacoes />;
    default:
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Construction className="w-8 h-8 text-slate-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{SECTION_LABELS[id] ?? id}</h2>
            <p className="text-slate-500 max-w-sm">
              Painel em desenvolvimento. Em breve disponível.
            </p>
          </div>
        </div>
      );
  }
}

export default function SettingsLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState('empresas');
  const { activeProfile } = useProfiles();
  const isGestor = activeProfile?.level === 1;

  // Suporta ?s=users ou ?s=empresas vindo do Header
  useEffect(() => {
    const s = searchParams.get('s');
    if (s && SECTION_LABELS[s]) {
      setActiveSection(s);
      setSearchParams({}, { replace: true }); // limpa a query string
    }
  }, [searchParams, setSearchParams]);

  const navGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => item.id !== 'novidades' || isGestor),
  }));

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ModuleSidebar
          moduleTitle="Configurações"
          moduleCode="CFG"
          color="slate"
          navGroups={navGroups}
          activeId={activeSection}
          onNavigate={setActiveSection}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar mobile-main-pad">
          <Suspense fallback={<Loader />}>
            <Section id={activeSection} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

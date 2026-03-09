import { useState, lazy, Suspense } from 'react';
import {
  Settings, Users, Link, Layers, Palette, Bell, Shield, Database, Construction,
} from 'lucide-react';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';
import Loader from '../../components/UI/Loader';

const UsuariosPermissoes = lazy(() => import('./sections/UsuariosPermissoes'));

const SECTION_LABELS: Record<string, string> = {
  preferences:   'Preferências',
  users:         'Usuários e Permissões',
  integrations:  'Integrações',
  modules:       'Módulos Ativos',
  appearance:    'Aparência',
  notifications: 'Notificações',
  security:      'Segurança',
  data:          'Backup e Dados',
};

const NAV_GROUPS = [
  {
    label: 'Sistema',
    items: [
      { icon: Settings, label: 'Preferências',    id: 'preferences' },
      { icon: Layers,   label: 'Módulos Ativos',  id: 'modules'     },
      { icon: Palette,  label: 'Aparência',       id: 'appearance'  },
    ],
  },
  {
    label: 'Usuários',
    items: [
      { icon: Users,  label: 'Usuários e Permissões', id: 'users'    },
      { icon: Shield, label: 'Segurança',              id: 'security' },
    ],
  },
  {
    label: 'Dados e Integrações',
    items: [
      { icon: Link,     label: 'Integrações',   id: 'integrations' },
      { icon: Database, label: 'Backup e Dados', id: 'data'         },
    ],
  },
  {
    label: 'Alertas',
    items: [
      { icon: Bell, label: 'Notificações', id: 'notifications' },
    ],
  },
];

export default function SettingsLayout() {
  const [activeSection, setActiveSection] = useState('preferences');
  const label = SECTION_LABELS[activeSection] ?? activeSection;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ModuleSidebar
          moduleTitle="Configurações"
          moduleCode="CFG"
          color="slate"
          navGroups={NAV_GROUPS}
          activeId={activeSection}
          onNavigate={setActiveSection}
        />
        <main className="flex-1 overflow-hidden bg-slate-50">
          <Suspense fallback={<Loader />}>
            {activeSection === 'users' ? (
              <UsuariosPermissoes />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Construction className="w-8 h-8 text-slate-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">{label}</h2>
                  <p className="text-slate-500 max-w-sm">
                    Em desenvolvimento. Em breve disponível.
                  </p>
                </div>
              </div>
            )}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

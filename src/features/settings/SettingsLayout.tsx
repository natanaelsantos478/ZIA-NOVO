import { useState } from 'react';
import {
  Settings, Users, Link, Layers, Palette, Bell, Shield, Database,
} from 'lucide-react';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';

const NAV_ITEMS = [
  { icon: Settings, label: 'Preferências',           id: 'preferences' },
  { icon: Users,    label: 'Usuários e Permissões',  id: 'users'       },
  { icon: Link,     label: 'Integrações',            id: 'integrations'},
  { icon: Layers,   label: 'Módulos Ativos',         id: 'modules'     },
  { icon: Palette,  label: 'Aparência',              id: 'appearance'  },
  { icon: Bell,     label: 'Notificações',           id: 'notifications'},
  { icon: Shield,   label: 'Segurança',              id: 'security'    },
  { icon: Database, label: 'Backup e Dados',         id: 'data'        },
];

export default function SettingsLayout() {
  const [activeSection, setActiveSection] = useState('preferences');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ModuleSidebar
          moduleTitle="Configurações"
          moduleCode="CFG"
          color="slate"
          navItems={NAV_ITEMS}
          activeId={activeSection}
          onNavigate={setActiveSection}
        />
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-slate-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Configurações do Sistema</h2>
            <p className="text-slate-500 max-w-sm">
              Painel de configurações em desenvolvimento. Em breve: usuários, integrações e personalização.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

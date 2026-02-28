import { useState } from 'react';
import {
  BarChart3, Landmark, Scale, Receipt, ArrowRight, Wallet, Layers,
  Calculator, ShoppingCart, Package, PieChart, Banknote, FileSignature,
  Factory, HardDrive, Shield, Gavel, Headset, Lock,
} from 'lucide-react';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';

const NAV_ITEMS = [
  { icon: BarChart3,      label: 'Dashboard',               id: 'dashboard'   },
  { icon: Landmark,       label: 'Contabilidade Global',    id: 'accounting'  },
  { icon: Scale,          label: 'Fiscal e Tributária',     id: 'taxes'       },
  { icon: Receipt,        label: 'Faturamento',             id: 'invoicing'   },
  { icon: ArrowRight,     label: 'Contas a Pagar',          id: 'ap'          },
  { icon: Wallet,         label: 'Contas a Receber',        id: 'ar'          },
  { icon: Layers,         label: 'Gestão de Estoque',       id: 'inventory'   },
  { icon: Calculator,     label: 'Custos de Produção',      id: 'costs'       },
  { icon: ShoppingCart,   label: 'Compras (Portal)',        id: 'procurement' },
  { icon: Package,        label: 'MRP (Materiais)',         id: 'mrp'         },
  { icon: PieChart,       label: 'Controladoria e DRE',    id: 'controller'  },
  { icon: Banknote,       label: 'Tesouraria',             id: 'treasury'    },
  { icon: FileSignature,  label: 'Gestão de Contratos',    id: 'contracts'   },
  { icon: Factory,        label: 'PCP (Produção)',          id: 'pcp'         },
  { icon: HardDrive,      label: 'Obras e Projetos',       id: 'projects'    },
  { icon: Shield,         label: 'Auditoria e Log Trail',  id: 'audit'       },
  { icon: Gavel,          label: 'Licitações (Editais)',   id: 'bids'        },
  { icon: Headset,        label: 'CSC (Serviços Internos)',id: 'csc'         },
  { icon: Lock,           label: 'Ledger Blockchain',      id: 'crypto'      },
];

export default function ERPLayout() {
  const [activeSection, setActiveSection] = useState('dashboard');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ModuleSidebar
          moduleTitle="Backoffice & ERP"
          moduleCode="ERP"
          color="slate"
          navItems={NAV_ITEMS}
          activeId={activeSection}
          onNavigate={setActiveSection}
        />
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Landmark className="w-8 h-8 text-slate-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Backoffice & ERP</h2>
            <p className="text-slate-500 max-w-sm">
              Módulo em desenvolvimento. Em breve: contabilidade, fiscal, controladoria e tesouraria integrados.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

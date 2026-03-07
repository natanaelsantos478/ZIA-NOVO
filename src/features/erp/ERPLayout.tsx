import { useState } from 'react';
import {
  BarChart3, Landmark, Scale, Receipt, ArrowRight, Wallet, Layers,
  Calculator, ShoppingCart, Package, PieChart, Banknote, FileSignature,
  Factory, HardDrive, Shield, Gavel, Headset, Lock,
} from 'lucide-react';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';
import ERPModule from './ERPModule';


const NAV_GROUPS = [
  {
    label: 'Visão Geral',
    items: [
      { icon: BarChart3, label: 'Dashboard', id: 'dashboard' },
    ],
  },
  {
    label: 'Contabilidade e Fiscal',
    items: [
      { icon: Landmark,  label: 'Contabilidade Global',  id: 'accounting' },
      { icon: Scale,     label: 'Fiscal e Tributária',   id: 'taxes'      },
      { icon: PieChart,  label: 'Controladoria e DRE',   id: 'controller' },
      { icon: Shield,    label: 'Auditoria e Log Trail', id: 'audit'      },
      { icon: Lock,      label: 'Ledger Blockchain',     id: 'crypto'     },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { icon: Receipt,   label: 'Faturamento',       id: 'invoicing' },
      { icon: ArrowRight,label: 'Contas a Pagar',    id: 'ap'        },
      { icon: Wallet,    label: 'Contas a Receber',  id: 'ar'        },
      { icon: Banknote,  label: 'Tesouraria',        id: 'treasury'  },
    ],
  },
  {
    label: 'Suprimentos e Produção',
    items: [
      { icon: Layers,      label: 'Gestão de Estoque',   id: 'inventory'   },
      { icon: Calculator,  label: 'Custos de Produção',  id: 'costs'       },
      { icon: ShoppingCart,label: 'Compras (Portal)',    id: 'procurement' },
      { icon: Package,     label: 'MRP (Materiais)',     id: 'mrp'         },
      { icon: Factory,     label: 'PCP (Produção)',      id: 'pcp'         },
    ],
  },
  {
    label: 'Projetos e Contratos',
    items: [
      { icon: FileSignature, label: 'Gestão de Contratos', id: 'contracts' },
      { icon: HardDrive,     label: 'Obras e Projetos',    id: 'projects'  },
    ],
  },
  {
    label: 'Especializados',
    items: [
      { icon: Gavel,   label: 'Licitações (Editais)',    id: 'bids' },
      { icon: Headset, label: 'CSC (Serviços Internos)', id: 'csc'  },
    ],
  },
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
          navGroups={NAV_GROUPS}
          activeId={activeSection}
          onNavigate={setActiveSection}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar">
          <ERPModule activeSection={activeSection} />
        </main>
      </div>
    </div>
  );
}

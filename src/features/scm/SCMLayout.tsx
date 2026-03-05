import { useState } from 'react';
import {
  BarChart3, DollarSign, Package, Truck, Navigation,
  RefreshCw, Building2, Box, ArrowRightLeft, FileSearch,
  ShoppingCart, Clock, XCircle, MapPin, Smartphone,
  Car, Calendar, TrendingUp, Users, FileText,
  ClipboardList, Layers, Handshake, Star, FileSignature,
  UserCheck, ThumbsUp, Route, AlertTriangle, CheckSquare,
  Warehouse, BarChart2, PieChart, Zap, Globe,
  Receipt, CreditCard, BadgeDollarSign, FileCheck, Building,
} from 'lucide-react';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';
import SCMModule from './SCMModule';

const NAV_GROUPS = [
  {
    label: 'Visão Geral',
    items: [
      { icon: BarChart3, label: 'Torre de Controle', id: 'dashboard' },
    ],
  },
  {
    label: 'TMS — Transporte',
    items: [
      { icon: DollarSign,  label: 'Cotação de Fretes',   id: 'freight-quotes'    },
      { icon: FileText,    label: 'CT-e / NF-e',         id: 'cte-nfe'           },
      { icon: Package,     label: 'Embarques',            id: 'shipments'         },
      { icon: Route,       label: 'Roteirização',         id: 'routing'           },
      { icon: AlertTriangle, label: 'Ocorrências',        id: 'occurrences'       },
      { icon: RefreshCw,   label: 'Logística Reversa',   id: 'reverse-logistics' },
      { icon: FileSearch,  label: 'Auditoria de Fretes', id: 'freight-audit'     },
    ],
  },
  {
    label: 'WMS — Armazém',
    items: [
      { icon: ClipboardList, label: 'Recebimento',         id: 'receiving'         },
      { icon: Warehouse,     label: 'Endereçamento',       id: 'stock-addressing'  },
      { icon: CheckSquare,   label: 'Picking & Packing',   id: 'picking-packing'   },
      { icon: BarChart2,     label: 'Inventário',          id: 'inventory'         },
      { icon: Layers,        label: 'Lotes e Validades',   id: 'batch-control'     },
      { icon: Truck,         label: 'Expedição',           id: 'dispatch'          },
      { icon: ArrowRightLeft, label: 'Cross-Docking',      id: 'cross-docking'     },
    ],
  },
  {
    label: 'OMS — Pedidos',
    items: [
      { icon: ShoppingCart, label: 'Gestão de Pedidos',  id: 'orders'             },
      { icon: Clock,        label: 'SLA por Pedido',     id: 'order-sla'          },
      { icon: XCircle,      label: 'Cancelamentos',      id: 'order-cancellation' },
    ],
  },
  {
    label: 'Rastreamento',
    items: [
      { icon: MapPin,        label: 'Rastreio em Tempo Real', id: 'tracking'          },
      { icon: Globe,         label: 'Portal do Destinatário', id: 'recipient-portal'  },
      { icon: CheckSquare,   label: 'Prova de Entrega (POD)', id: 'pod'               },
      { icon: Zap,           label: 'Alertas de Exceção',     id: 'tracking-alerts'   },
    ],
  },
  {
    label: 'Última Milha',
    items: [
      { icon: Smartphone, label: 'App do Motorista',    id: 'driver-app'      },
      { icon: Car,        label: 'Gestão de Frota',     id: 'fleet-management'},
      { icon: Calendar,   label: 'Jornada do Motorista', id: 'driver-schedule' },
    ],
  },
  {
    label: 'Analytics & BI',
    items: [
      { icon: BarChart3,  label: 'Dashboard Executivo',    id: 'analytics-executive' },
      { icon: Star,       label: 'Transportadoras (BI)',   id: 'carrier-analytics'   },
      { icon: PieChart,   label: 'Análise de Custos',      id: 'cost-analytics'      },
      { icon: TrendingUp, label: 'Previsão de Demanda',    id: 'demand-forecast'     },
      { icon: FileText,   label: 'Relatórios',             id: 'custom-reports'      },
    ],
  },
  {
    label: 'Financeiro Logístico',
    items: [
      { icon: BadgeDollarSign, label: 'Tabelas de Frete',    id: 'freight-tables'           },
      { icon: Receipt,         label: 'Faturamento',         id: 'billing'                  },
      { icon: FileCheck,       label: 'Conciliação',         id: 'invoice-reconciliation'   },
      { icon: Handshake,       label: 'Acordos Comerciais',  id: 'commercial-agreements'    },
      { icon: Building,        label: 'Centro de Custo',     id: 'cost-center'              },
    ],
  },
  {
    label: 'Transportadoras',
    items: [
      { icon: Users,         label: 'Cadastro',       id: 'carriers'          },
      { icon: BarChart2,     label: 'Scorecard',      id: 'carrier-scorecard' },
      { icon: FileSignature, label: 'Contratos',      id: 'carrier-contracts' },
    ],
  },
  {
    label: 'Portal do Cliente',
    items: [
      { icon: UserCheck, label: 'Portal Embarcador',   id: 'client-portal'  },
      { icon: ThumbsUp,  label: 'NPS Pós-entrega',     id: 'nps-delivery'   },
    ],
  },
];

export default function SCMLayout() {
  const [activeSection, setActiveSection] = useState('dashboard');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ModuleSidebar
          moduleTitle="Logística & Supply Chain"
          moduleCode="SCM"
          color="emerald"
          navGroups={NAV_GROUPS}
          activeId={activeSection}
          onNavigate={setActiveSection}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar">
          <SCMModule activeSection={activeSection} />
        </main>
      </div>
    </div>
  );
}

// SCM Module — lazy loaded sections
import { lazy, Suspense } from 'react';
import Loader from '../../components/UI/Loader';

// Visão Geral
const ControlTower            = lazy(() => import('./sections/ControlTower'));

// TMS — Transporte
const FreightQuotes           = lazy(() => import('./sections/FreightQuotes'));
const CteNfe                  = lazy(() => import('./sections/CteNfe'));
const Shipments               = lazy(() => import('./sections/Shipments'));
const Routing                 = lazy(() => import('./sections/Routing'));
const Occurrences             = lazy(() => import('./sections/Occurrences'));
const ReverseLogistics        = lazy(() => import('./sections/ReverseLogistics'));
const FreightAudit            = lazy(() => import('./sections/FreightAudit'));

// WMS — Armazém
const Receiving               = lazy(() => import('./sections/Receiving'));
const StockAddressing         = lazy(() => import('./sections/StockAddressing'));
const PickingPacking          = lazy(() => import('./sections/PickingPacking'));
const Inventory               = lazy(() => import('./sections/Inventory'));
const BatchControl            = lazy(() => import('./sections/BatchControl'));
const Dispatch                = lazy(() => import('./sections/Dispatch'));
const CrossDocking            = lazy(() => import('./sections/CrossDocking'));

// OMS — Pedidos
const Orders                  = lazy(() => import('./sections/Orders'));
const OrderSLA                = lazy(() => import('./sections/OrderSLA'));
const OrderCancellation       = lazy(() => import('./sections/OrderCancellation'));

// Rastreamento
const Tracking                = lazy(() => import('./sections/Tracking'));
const RecipientPortal         = lazy(() => import('./sections/RecipientPortal'));
const POD                     = lazy(() => import('./sections/POD'));
const TrackingAlerts          = lazy(() => import('./sections/TrackingAlerts'));

// Última Milha
const DriverApp               = lazy(() => import('./sections/DriverApp'));
const FleetManagement         = lazy(() => import('./sections/FleetManagement'));
const DriverSchedule          = lazy(() => import('./sections/DriverSchedule'));

// Analytics & BI
const AnalyticsExecutive      = lazy(() => import('./sections/AnalyticsExecutive'));
const CarrierAnalytics        = lazy(() => import('./sections/CarrierAnalytics'));
const CostAnalytics           = lazy(() => import('./sections/CostAnalytics'));
const DemandForecast          = lazy(() => import('./sections/DemandForecast'));
const CustomReports           = lazy(() => import('./sections/CustomReports'));

// Financeiro Logístico
const FreightTables           = lazy(() => import('./sections/FreightTables'));
const Billing                 = lazy(() => import('./sections/Billing'));
const InvoiceReconciliation   = lazy(() => import('./sections/InvoiceReconciliation'));
const CommercialAgreements    = lazy(() => import('./sections/CommercialAgreements'));
const CostCenter              = lazy(() => import('./sections/CostCenter'));

// Transportadoras
const Carriers                = lazy(() => import('./sections/Carriers'));
const CarrierScorecard        = lazy(() => import('./sections/CarrierScorecard'));
const CarrierContracts        = lazy(() => import('./sections/CarrierContracts'));

// Portal do Cliente
const ClientPortal            = lazy(() => import('./sections/ClientPortal'));
const NpsDelivery             = lazy(() => import('./sections/NpsDelivery'));

interface SCMModuleProps {
  activeSection: string;
}

function Section({ activeSection }: SCMModuleProps) {
  switch (activeSection) {
    // Visão Geral
    case 'dashboard':              return <ControlTower />;

    // TMS
    case 'freight-quotes':         return <FreightQuotes />;
    case 'cte-nfe':                return <CteNfe />;
    case 'shipments':              return <Shipments />;
    case 'routing':                return <Routing />;
    case 'occurrences':            return <Occurrences />;
    case 'reverse-logistics':      return <ReverseLogistics />;
    case 'freight-audit':          return <FreightAudit />;

    // WMS
    case 'receiving':              return <Receiving />;
    case 'stock-addressing':       return <StockAddressing />;
    case 'picking-packing':        return <PickingPacking />;
    case 'inventory':              return <Inventory />;
    case 'batch-control':          return <BatchControl />;
    case 'dispatch':               return <Dispatch />;
    case 'cross-docking':          return <CrossDocking />;

    // OMS
    case 'orders':                 return <Orders />;
    case 'order-sla':              return <OrderSLA />;
    case 'order-cancellation':     return <OrderCancellation />;

    // Rastreamento
    case 'tracking':               return <Tracking />;
    case 'recipient-portal':       return <RecipientPortal />;
    case 'pod':                    return <POD />;
    case 'tracking-alerts':        return <TrackingAlerts />;

    // Última Milha
    case 'driver-app':             return <DriverApp />;
    case 'fleet-management':       return <FleetManagement />;
    case 'driver-schedule':        return <DriverSchedule />;

    // Analytics
    case 'analytics-executive':    return <AnalyticsExecutive />;
    case 'carrier-analytics':      return <CarrierAnalytics />;
    case 'cost-analytics':         return <CostAnalytics />;
    case 'demand-forecast':        return <DemandForecast />;
    case 'custom-reports':         return <CustomReports />;

    // Financeiro
    case 'freight-tables':         return <FreightTables />;
    case 'billing':                return <Billing />;
    case 'invoice-reconciliation': return <InvoiceReconciliation />;
    case 'commercial-agreements':  return <CommercialAgreements />;
    case 'cost-center':            return <CostCenter />;

    // Transportadoras
    case 'carriers':               return <Carriers />;
    case 'carrier-scorecard':      return <CarrierScorecard />;
    case 'carrier-contracts':      return <CarrierContracts />;

    // Portal do Cliente
    case 'client-portal':          return <ClientPortal />;
    case 'nps-delivery':           return <NpsDelivery />;

    default:                       return <ControlTower />;
  }
}

export default function SCMModule({ activeSection }: SCMModuleProps) {
  return (
    <Suspense fallback={<Loader />}>
      <Section activeSection={activeSection} />
    </Suspense>
  );
}

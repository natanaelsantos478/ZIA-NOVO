// ─────────────────────────────────────────────────────────────────────────────
// SCM Service Layer — todas as operações de dados do módulo Logística
// Lê/escreve direto no Supabase. Segue o mesmo padrão de src/lib/hr.ts
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Driver {
  id: string;
  name: string;
  cpf: string | null;
  cnh: string | null;
  cnh_category: string | null;
  cnh_expiry: string | null;
  phone: string | null;
  status: string;           // available | on_route | off_duty | inactive
  vehicle_id: string | null;
  created_at: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string | null;
  brand: string | null;
  type: string;             // truck | van | moto | car | semi
  capacity_kg: number | null;
  capacity_m3: number | null;
  status: string;           // available | in_transit | maintenance | inactive
  driver_id: string | null;
  fuel_type: string | null;
  year: number | null;
  mileage_km: number | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  notes: string | null;
  created_at: string;
  // join
  scm_drivers?: { name: string } | null;
}

export interface Route {
  id: string;
  name: string;
  origin: string | null;
  destination: string | null;
  stops: RouteStop[];
  vehicle_id: string | null;
  driver_id: string | null;
  distance_km: number | null;
  estimated_duration_min: number | null;
  status: string;           // planned | active | completed | cancelled
  scheduled_date: string | null;
  notes: string | null;
  created_at: string;
  // joins
  scm_vehicles?: { plate: string; model: string | null } | null;
  scm_drivers?: { name: string } | null;
}

export interface RouteStop {
  address: string;
  order: number;
  eta?: string;
}

export interface Shipment {
  id: string;
  code: string;
  origin: string | null;
  destination: string | null;
  carrier: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  route_id: string | null;
  status: string;           // pending | in_transit | delivered | cancelled | returned
  freight_value: number | null;
  weight_kg: number | null;
  volume_m3: number | null;
  type: string | null;      // ftl | ltl | express
  scheduled_date: string | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  tracking_code: string | null;
  notes: string | null;
  created_at: string;
  // joins
  scm_vehicles?: { plate: string } | null;
  scm_drivers?: { name: string } | null;
}

export interface Delivery {
  id: string;
  shipment_id: string | null;
  recipient_name: string | null;
  recipient_address: string | null;
  recipient_phone: string | null;
  status: string;           // pending | out_for_delivery | delivered | attempted | returned
  attempts: number;
  scheduled_date: string | null;
  delivered_at: string | null;
  proof_type: string | null;
  notes: string | null;
  created_at: string;
  // join
  scm_shipments?: { code: string } | null;
}

export interface DockSession {
  id: string;
  dock_number: number;
  vehicle_plate: string | null;
  carrier: string | null;
  type: string;             // inbound | outbound | crossdock
  status: string;           // scheduled | docking | unloading | loading | completed | cancelled
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  pallet_count: number | null;
  notes: string | null;
  created_at: string;
}

export interface PackingOrder {
  id: string;
  order_ref: string;
  shipment_id: string | null;
  status: string;           // pending | in_progress | packed | dispatched
  items_count: number | null;
  box_count: number | null;
  weight_kg: number | null;
  packer_name: string | null;
  packed_at: string | null;
  notes: string | null;
  created_at: string;
  // join
  scm_shipments?: { code: string } | null;
}

export interface ReverseLogistic {
  id: string;
  original_shipment_id: string | null;
  reason: string | null;    // damaged | wrong_item | refused | not_home | other
  customer_name: string | null;
  customer_phone: string | null;
  product_description: string | null;
  status: string;           // requested | collected | in_transit | received | processed
  value: number | null;
  refund_type: string | null; // refund | exchange | credit
  notes: string | null;
  created_at: string;
  // join
  scm_shipments?: { code: string } | null;
}

export interface FreightAudit {
  id: string;
  shipment_id: string | null;
  carrier: string | null;
  billed_value: number | null;
  agreed_value: number | null;
  discrepancy: number | null;
  status: string;           // pending | approved | disputed | resolved
  dispute_reason: string | null;
  resolved_at: string | null;
  notes: string | null;
  created_at: string;
  // join
  scm_shipments?: { code: string } | null;
}

// ── Dashboard KPIs ────────────────────────────────────────────────────────────

export interface ScmKpis {
  totalShipments: number;
  inTransit: number;
  delivered: number;
  pendingDeliveries: number;
  availableVehicles: number;
  totalVehicles: number;
  activeDrivers: number;
  pendingAudits: number;
  openReturns: number;
  freightSpend: number;
  auditDiscrepancy: number;
}

export async function getScmKpis(): Promise<ScmKpis> {
  const [
    shipmentsRes,
    deliveriesRes,
    vehiclesRes,
    driversRes,
    auditsRes,
    returnsRes,
    freightSpendRes,
    discrepancyRes,
  ] = await Promise.all([
    supabase.from('scm_shipments').select('status'),
    supabase.from('scm_deliveries').select('status'),
    supabase.from('scm_vehicles').select('status'),
    supabase.from('scm_drivers').select('status'),
    supabase.from('scm_freight_audits').select('status'),
    supabase.from('scm_reverse_logistics').select('status'),
    supabase.from('scm_shipments').select('freight_value').not('freight_value', 'is', null),
    supabase.from('scm_freight_audits').select('discrepancy').not('discrepancy', 'is', null),
  ]);

  const shipments   = shipmentsRes.data ?? [];
  const deliveries  = deliveriesRes.data ?? [];
  const vehicles    = vehiclesRes.data ?? [];
  const drivers     = driversRes.data ?? [];
  const audits      = auditsRes.data ?? [];
  const returns     = returnsRes.data ?? [];

  const freightSpend = (freightSpendRes.data ?? []).reduce(
    (sum, r) => sum + (r.freight_value ?? 0), 0
  );
  const auditDiscrepancy = (discrepancyRes.data ?? []).reduce(
    (sum, r) => sum + (r.discrepancy ?? 0), 0
  );

  return {
    totalShipments:    shipments.length,
    inTransit:         shipments.filter((s) => s.status === 'in_transit').length,
    delivered:         shipments.filter((s) => s.status === 'delivered').length,
    pendingDeliveries: deliveries.filter((d) => d.status === 'pending' || d.status === 'out_for_delivery').length,
    availableVehicles: vehicles.filter((v) => v.status === 'available').length,
    totalVehicles:     vehicles.length,
    activeDrivers:     drivers.filter((d) => d.status === 'available' || d.status === 'on_route').length,
    pendingAudits:     audits.filter((a) => a.status === 'pending' || a.status === 'disputed').length,
    openReturns:       returns.filter((r) => !['processed', 'received'].includes(r.status)).length,
    freightSpend,
    auditDiscrepancy,
  };
}

// ── Drivers ───────────────────────────────────────────────────────────────────

export async function getDrivers(): Promise<Driver[]> {
  const { data, error } = await supabase
    .from('scm_drivers')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data ?? []) as Driver[];
}

export async function createDriver(payload: Partial<Driver>): Promise<Driver> {
  const { data, error } = await supabase
    .from('scm_drivers')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Driver;
}

export async function updateDriver(id: string, payload: Partial<Driver>): Promise<void> {
  const { error } = await supabase.from('scm_drivers').update(payload).eq('id', id);
  if (error) throw error;
}

// ── Vehicles ──────────────────────────────────────────────────────────────────

export async function getVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('scm_vehicles')
    .select('*, scm_drivers(name)')
    .order('plate');
  if (error) throw error;
  return (data ?? []) as Vehicle[];
}

export async function createVehicle(payload: Partial<Vehicle>): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('scm_vehicles')
    .insert(payload)
    .select('*, scm_drivers(name)')
    .single();
  if (error) throw error;
  return data as Vehicle;
}

export async function updateVehicle(id: string, payload: Partial<Vehicle>): Promise<void> {
  const { error } = await supabase.from('scm_vehicles').update(payload).eq('id', id);
  if (error) throw error;
}

// ── Routes ────────────────────────────────────────────────────────────────────

export async function getRoutes(): Promise<Route[]> {
  const { data, error } = await supabase
    .from('scm_routes')
    .select('*, scm_vehicles(plate, model), scm_drivers(name)')
    .order('scheduled_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Route[];
}

export async function createRoute(payload: Omit<Route, 'id' | 'created_at' | 'scm_vehicles' | 'scm_drivers'>): Promise<Route> {
  const { data, error } = await supabase
    .from('scm_routes')
    .insert(payload)
    .select('*, scm_vehicles(plate, model), scm_drivers(name)')
    .single();
  if (error) throw error;
  return data as Route;
}

export async function updateRoute(id: string, payload: Partial<Route>): Promise<void> {
  const { error } = await supabase.from('scm_routes').update(payload).eq('id', id);
  if (error) throw error;
}

// ── Shipments ─────────────────────────────────────────────────────────────────

export async function getShipments(): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from('scm_shipments')
    .select('*, scm_vehicles(plate), scm_drivers(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Shipment[];
}

export async function createShipment(payload: Partial<Shipment>): Promise<Shipment> {
  const { data, error } = await supabase
    .from('scm_shipments')
    .insert(payload)
    .select('*, scm_vehicles(plate), scm_drivers(name)')
    .single();
  if (error) throw error;
  return data as Shipment;
}

export async function updateShipment(id: string, payload: Partial<Shipment>): Promise<void> {
  const { error } = await supabase.from('scm_shipments').update(payload).eq('id', id);
  if (error) throw error;
}

// ── Deliveries ────────────────────────────────────────────────────────────────

export async function getDeliveries(): Promise<Delivery[]> {
  const { data, error } = await supabase
    .from('scm_deliveries')
    .select('*, scm_shipments(code)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Delivery[];
}

export async function createDelivery(payload: Partial<Delivery>): Promise<Delivery> {
  const { data, error } = await supabase
    .from('scm_deliveries')
    .insert(payload)
    .select('*, scm_shipments(code)')
    .single();
  if (error) throw error;
  return data as Delivery;
}

export async function updateDelivery(id: string, payload: Partial<Delivery>): Promise<void> {
  const { error } = await supabase.from('scm_deliveries').update(payload).eq('id', id);
  if (error) throw error;
}

// ── Dock Sessions (WMS) ───────────────────────────────────────────────────────

export async function getDockSessions(): Promise<DockSession[]> {
  const { data, error } = await supabase
    .from('scm_dock_sessions')
    .select('*')
    .order('scheduled_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DockSession[];
}

export async function createDockSession(payload: Partial<DockSession>): Promise<DockSession> {
  const { data, error } = await supabase
    .from('scm_dock_sessions')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as DockSession;
}

export async function updateDockSession(id: string, payload: Partial<DockSession>): Promise<void> {
  const { error } = await supabase.from('scm_dock_sessions').update(payload).eq('id', id);
  if (error) throw error;
}

// ── Packing Orders ────────────────────────────────────────────────────────────

export async function getPackingOrders(): Promise<PackingOrder[]> {
  const { data, error } = await supabase
    .from('scm_packing_orders')
    .select('*, scm_shipments(code)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PackingOrder[];
}

export async function createPackingOrder(payload: Partial<PackingOrder>): Promise<PackingOrder> {
  const { data, error } = await supabase
    .from('scm_packing_orders')
    .insert(payload)
    .select('*, scm_shipments(code)')
    .single();
  if (error) throw error;
  return data as PackingOrder;
}

export async function updatePackingOrder(id: string, payload: Partial<PackingOrder>): Promise<void> {
  const { error } = await supabase.from('scm_packing_orders').update(payload).eq('id', id);
  if (error) throw error;
}

// ── Reverse Logistics ─────────────────────────────────────────────────────────

export async function getReverseLogistics(): Promise<ReverseLogistic[]> {
  const { data, error } = await supabase
    .from('scm_reverse_logistics')
    .select('*, scm_shipments(code)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReverseLogistic[];
}

export async function createReverseLogistic(payload: Partial<ReverseLogistic>): Promise<ReverseLogistic> {
  const { data, error } = await supabase
    .from('scm_reverse_logistics')
    .insert(payload)
    .select('*, scm_shipments(code)')
    .single();
  if (error) throw error;
  return data as ReverseLogistic;
}

export async function updateReverseLogistic(id: string, payload: Partial<ReverseLogistic>): Promise<void> {
  const { error } = await supabase.from('scm_reverse_logistics').update(payload).eq('id', id);
  if (error) throw error;
}

// ── Freight Audits ────────────────────────────────────────────────────────────

export async function getFreightAudits(): Promise<FreightAudit[]> {
  const { data, error } = await supabase
    .from('scm_freight_audits')
    .select('*, scm_shipments(code)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as FreightAudit[];
}

export async function createFreightAudit(payload: Partial<FreightAudit>): Promise<FreightAudit> {
  const { data, error } = await supabase
    .from('scm_freight_audits')
    .insert(payload)
    .select('*, scm_shipments(code)')
    .single();
  if (error) throw error;
  return data as FreightAudit;
}

export async function updateFreightAudit(id: string, payload: Partial<FreightAudit>): Promise<void> {
  const { error } = await supabase.from('scm_freight_audits').update(payload).eq('id', id);
  if (error) throw error;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function fmtCurrency(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

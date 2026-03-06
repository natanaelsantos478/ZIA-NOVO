import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SCMVehicle {
  id: string;
  plate: string;
  model: string | null;
  brand: string | null;
  type: string;
  capacity_kg: number | null;
  capacity_m3: number | null;
  status: string;
  fuel_type: string | null;
  year: number | null;
  mileage_km: number | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  notes: string | null;
  created_at: string;
}

export interface SCMDriver {
  id: string;
  name: string;
  cpf: string | null;
  cnh: string | null;
  cnh_category: string | null;
  cnh_expiry: string | null;
  phone: string | null;
  status: string;
  created_at: string;
}

export interface SCMRoute {
  id: string;
  name: string;
  origin: string | null;
  destination: string | null;
  stops: unknown;
  vehicle_id: string | null;
  driver_id: string | null;
  distance_km: number | null;
  estimated_duration_min: number | null;
  status: string;
  scheduled_date: string | null;
  notes: string | null;
  created_at: string;
  scm_vehicles?: SCMVehicle | null;
  scm_drivers?: SCMDriver | null;
}

export interface SCMShipment {
  id: string;
  code: string;
  origin: string | null;
  destination: string | null;
  carrier: string | null;
  vehicle_id: string | null;
  route_id: string | null;
  status: string;
  freight_value: number | null;
  weight_kg: number | null;
  volume_m3: number | null;
  type: string | null;
  scheduled_date: string | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  tracking_code: string | null;
  notes: string | null;
  created_at: string;
  scm_vehicles?: SCMVehicle | null;
  scm_routes?: SCMRoute | null;
}

export interface SCMDelivery {
  id: string;
  shipment_id: string;
  recipient_name: string | null;
  recipient_address: string | null;
  recipient_phone: string | null;
  status: string;
  attempts: number | null;
  scheduled_date: string | null;
  delivered_at: string | null;
  proof_type: string | null;
  notes: string | null;
  created_at: string;
  scm_shipments?: Pick<SCMShipment, 'id' | 'code' | 'origin' | 'destination'> | null;
}

export interface SCMDockSession {
  id: string;
  dock_number: number;
  vehicle_plate: string | null;
  carrier: string | null;
  type: string | null;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  pallet_count: number | null;
  notes: string | null;
  created_at: string;
}

export interface SCMPackingOrder {
  id: string;
  order_ref: string | null;
  shipment_id: string | null;
  status: string;
  items_count: number | null;
  box_count: number | null;
  weight_kg: number | null;
  packer_name: string | null;
  packed_at: string | null;
  notes: string | null;
  created_at: string;
  scm_shipments?: Pick<SCMShipment, 'id' | 'code'> | null;
}

export interface SCMReverseLogistic {
  id: string;
  original_shipment_id: string | null;
  reason: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  product_description: string | null;
  status: string;
  value: number | null;
  refund_type: string | null;
  notes: string | null;
  created_at: string;
  scm_shipments?: Pick<SCMShipment, 'id' | 'code'> | null;
}

export interface SCMFreightAudit {
  id: string;
  shipment_id: string | null;
  carrier: string | null;
  billed_value: number | null;
  agreed_value: number | null;
  discrepancy: number | null;
  status: string;
  dispute_reason: string | null;
  resolved_at: string | null;
  notes: string | null;
  created_at: string;
  scm_shipments?: Pick<SCMShipment, 'id' | 'code'> | null;
}

// ─── Query Functions ──────────────────────────────────────────────────────────

export async function fetchVehicles() {
  const { data, error } = await supabase
    .from('scm_vehicles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as SCMVehicle[];
}

export async function fetchDrivers() {
  const { data, error } = await supabase
    .from('scm_drivers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as SCMDriver[];
}

export async function fetchRoutes() {
  const { data, error } = await supabase
    .from('scm_routes')
    .select(`*, scm_vehicles!scm_routes_vehicle_id_fkey(*), scm_drivers!scm_routes_driver_id_fkey(*)`)
    .order('scheduled_date', { ascending: false });
  if (error) throw error;
  return data as SCMRoute[];
}

export async function fetchShipments() {
  const { data, error } = await supabase
    .from('scm_shipments')
    .select(`*, scm_vehicles!scm_shipments_vehicle_id_fkey(*), scm_routes!scm_shipments_route_id_fkey(*)`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as SCMShipment[];
}

export async function fetchDeliveries() {
  const { data, error } = await supabase
    .from('scm_deliveries')
    .select(`*, scm_shipments!scm_deliveries_shipment_id_fkey(id, code, origin, destination)`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as SCMDelivery[];
}

export async function fetchDockSessions() {
  const { data, error } = await supabase
    .from('scm_dock_sessions')
    .select('*')
    .order('scheduled_at', { ascending: false });
  if (error) throw error;
  return data as SCMDockSession[];
}

export async function fetchPackingOrders() {
  const { data, error } = await supabase
    .from('scm_packing_orders')
    .select(`*, scm_shipments!scm_packing_orders_shipment_id_fkey(id, code)`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as SCMPackingOrder[];
}

export async function fetchReverseLogistics() {
  const { data, error } = await supabase
    .from('scm_reverse_logistics')
    .select(`*, scm_shipments!scm_reverse_logistics_original_shipment_id_fkey(id, code)`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as SCMReverseLogistic[];
}

export async function fetchFreightAudits() {
  const { data, error } = await supabase
    .from('scm_freight_audits')
    .select(`*, scm_shipments!scm_freight_audits_shipment_id_fkey(id, code)`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as SCMFreightAudit[];
}

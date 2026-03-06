-- ─────────────────────────────────────────────────────────────────────────────
-- SCM (Logística & Supply Chain) — Schema de tabelas
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Motoristas ────────────────────────────────────────────────────────────────
create table if not exists scm_drivers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  cpf             text,
  cnh             text,
  cnh_category    text,             -- A, B, C, D, E
  cnh_expiry      date,
  phone           text,
  status          text not null default 'available',
                  -- available | on_route | off_duty | inactive
  vehicle_id      uuid,
  created_at      timestamptz not null default now()
);

-- ── Veículos (Frota) ──────────────────────────────────────────────────────────
create table if not exists scm_vehicles (
  id               uuid primary key default gen_random_uuid(),
  plate            text not null,
  model            text,
  brand            text,
  type             text not null default 'truck',
                   -- truck | van | moto | car | semi
  capacity_kg      numeric,
  capacity_m3      numeric,
  status           text not null default 'available',
                   -- available | in_transit | maintenance | inactive
  driver_id        uuid references scm_drivers(id),
  fuel_type        text,            -- diesel | gasoline | electric | flex
  year             int,
  mileage_km       numeric,
  last_maintenance date,
  next_maintenance date,
  notes            text,
  created_at       timestamptz not null default now()
);

-- add back-reference so drivers can optionally point to their vehicle
alter table scm_drivers add constraint fk_driver_vehicle
  foreign key (vehicle_id) references scm_vehicles(id) deferrable initially deferred;

-- ── Rotas ─────────────────────────────────────────────────────────────────────
create table if not exists scm_routes (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  origin                text,
  destination           text,
  stops                 jsonb not null default '[]',
  vehicle_id            uuid references scm_vehicles(id),
  driver_id             uuid references scm_drivers(id),
  distance_km           numeric,
  estimated_duration_min int,
  status                text not null default 'planned',
                        -- planned | active | completed | cancelled
  scheduled_date        date,
  notes                 text,
  created_at            timestamptz not null default now()
);

-- ── Embarques / Fretes (TMS) ──────────────────────────────────────────────────
create table if not exists scm_shipments (
  id                  uuid primary key default gen_random_uuid(),
  code                text unique not null,
  origin              text,
  destination         text,
  carrier             text,
  vehicle_id          uuid references scm_vehicles(id),
  driver_id           uuid references scm_drivers(id),
  route_id            uuid references scm_routes(id),
  status              text not null default 'pending',
                      -- pending | in_transit | delivered | cancelled | returned
  freight_value       numeric,
  weight_kg           numeric,
  volume_m3           numeric,
  type                text,         -- ftl | ltl | express
  scheduled_date      date,
  estimated_delivery  date,
  actual_delivery     date,
  tracking_code       text,
  notes               text,
  created_at          timestamptz not null default now()
);

-- ── Entregas Last-Mile ────────────────────────────────────────────────────────
create table if not exists scm_deliveries (
  id                uuid primary key default gen_random_uuid(),
  shipment_id       uuid references scm_shipments(id),
  recipient_name    text,
  recipient_address text,
  recipient_phone   text,
  status            text not null default 'pending',
                    -- pending | out_for_delivery | delivered | attempted | returned
  attempts          int not null default 0,
  scheduled_date    date,
  delivered_at      timestamptz,
  proof_type        text,           -- signature | photo | code
  notes             text,
  created_at        timestamptz not null default now()
);

-- ── WMS — Sessões de Doca ─────────────────────────────────────────────────────
create table if not exists scm_dock_sessions (
  id            uuid primary key default gen_random_uuid(),
  dock_number   int not null,
  vehicle_plate text,
  carrier       text,
  type          text not null default 'inbound',
                -- inbound | outbound | crossdock
  status        text not null default 'scheduled',
                -- scheduled | docking | unloading | loading | completed | cancelled
  scheduled_at  timestamptz,
  started_at    timestamptz,
  completed_at  timestamptz,
  pallet_count  int,
  notes         text,
  created_at    timestamptz not null default now()
);

-- ── Embalagem / Packing ───────────────────────────────────────────────────────
create table if not exists scm_packing_orders (
  id           uuid primary key default gen_random_uuid(),
  order_ref    text not null,
  shipment_id  uuid references scm_shipments(id),
  status       text not null default 'pending',
               -- pending | in_progress | packed | dispatched
  items_count  int,
  box_count    int,
  weight_kg    numeric,
  packer_name  text,
  packed_at    timestamptz,
  notes        text,
  created_at   timestamptz not null default now()
);

-- ── Logística Reversa ─────────────────────────────────────────────────────────
create table if not exists scm_reverse_logistics (
  id                   uuid primary key default gen_random_uuid(),
  original_shipment_id uuid references scm_shipments(id),
  reason               text,
                       -- damaged | wrong_item | refused | not_home | other
  customer_name        text,
  customer_phone       text,
  product_description  text,
  status               text not null default 'requested',
                       -- requested | collected | in_transit | received | processed
  value                numeric,
  refund_type          text,        -- refund | exchange | credit
  notes                text,
  created_at           timestamptz not null default now()
);

-- ── Auditoria de Fretes ───────────────────────────────────────────────────────
create table if not exists scm_freight_audits (
  id              uuid primary key default gen_random_uuid(),
  shipment_id     uuid references scm_shipments(id),
  carrier         text,
  billed_value    numeric,
  agreed_value    numeric,
  discrepancy     numeric generated always as (billed_value - agreed_value) stored,
  status          text not null default 'pending',
                  -- pending | approved | disputed | resolved
  dispute_reason  text,
  resolved_at     timestamptz,
  notes           text,
  created_at      timestamptz not null default now()
);

-- ── Índices úteis ─────────────────────────────────────────────────────────────
create index if not exists idx_scm_shipments_status     on scm_shipments(status);
create index if not exists idx_scm_shipments_created_at on scm_shipments(created_at desc);
create index if not exists idx_scm_deliveries_status    on scm_deliveries(status);
create index if not exists idx_scm_vehicles_status      on scm_vehicles(status);
create index if not exists idx_scm_drivers_status       on scm_drivers(status);
create index if not exists idx_scm_dock_sessions_status on scm_dock_sessions(status);
create index if not exists idx_scm_freight_audits_status on scm_freight_audits(status);

-- ── RLS: habilitar (configurar policies conforme autenticação do projeto) ──────
alter table scm_vehicles         enable row level security;
alter table scm_drivers          enable row level security;
alter table scm_routes           enable row level security;
alter table scm_shipments        enable row level security;
alter table scm_deliveries       enable row level security;
alter table scm_dock_sessions    enable row level security;
alter table scm_packing_orders   enable row level security;
alter table scm_reverse_logistics enable row level security;
alter table scm_freight_audits   enable row level security;

-- Policies temporárias: allow all (ajustar conforme auth do projeto)
create policy "allow all scm_vehicles"          on scm_vehicles          for all using (true) with check (true);
create policy "allow all scm_drivers"           on scm_drivers           for all using (true) with check (true);
create policy "allow all scm_routes"            on scm_routes            for all using (true) with check (true);
create policy "allow all scm_shipments"         on scm_shipments         for all using (true) with check (true);
create policy "allow all scm_deliveries"        on scm_deliveries        for all using (true) with check (true);
create policy "allow all scm_dock_sessions"     on scm_dock_sessions     for all using (true) with check (true);
create policy "allow all scm_packing_orders"    on scm_packing_orders    for all using (true) with check (true);
create policy "allow all scm_reverse_logistics" on scm_reverse_logistics for all using (true) with check (true);
create policy "allow all scm_freight_audits"    on scm_freight_audits    for all using (true) with check (true);

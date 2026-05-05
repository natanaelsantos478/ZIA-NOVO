-- Etapa SCM: criação das tabelas base do módulo de logística
-- Todas com RLS habilitado (política open — filtragem por tenant feita na aplicação)

-- ── scm_veiculos ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scm_veiculos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa           TEXT NOT NULL,
  modelo          TEXT NOT NULL,
  tipo            TEXT NOT NULL DEFAULT 'truck'
                  CHECK (tipo IN ('truck','van','moto','carro','outro')),
  capacidade_kg   NUMERIC NOT NULL DEFAULT 0,
  capacidade_m3   NUMERIC,
  status          TEXT NOT NULL DEFAULT 'disponivel'
                  CHECK (status IN ('disponivel','em_rota','manutencao','inativo')),
  motorista_nome  TEXT,
  motorista_cnh   TEXT,
  ano_fabricacao  INT,
  employee_id     UUID REFERENCES employees(id) ON DELETE SET NULL,
  tenant_id       TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE scm_veiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY scm_veiculos_tenant ON scm_veiculos FOR ALL USING (true) WITH CHECK (true);

-- ── scm_rotas ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scm_rotas (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                 TEXT NOT NULL,
  origem               TEXT NOT NULL,
  destino              TEXT NOT NULL,
  distancia_km         NUMERIC NOT NULL DEFAULT 0,
  tempo_estimado_min   INT NOT NULL DEFAULT 0,
  veiculo_id           UUID REFERENCES scm_veiculos(id) ON DELETE SET NULL,
  status               TEXT NOT NULL DEFAULT 'ativa'
                       CHECK (status IN ('ativa','inativa','em_andamento')),
  tenant_id            TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE scm_rotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY scm_rotas_tenant ON scm_rotas FOR ALL USING (true) WITH CHECK (true);

-- ── scm_embarques ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scm_embarques (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  numero            TEXT NOT NULL,
  origem            TEXT NOT NULL,
  destino           TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'aguardando'
                    CHECK (status IN ('aguardando','em_transito','entregue','devolvido','cancelado')),
  transportadora    TEXT,
  transportadora_id UUID REFERENCES erp_fornecedores(id) ON DELETE SET NULL,
  valor_frete       NUMERIC,
  peso_kg           NUMERIC,
  cubagem_m3        NUMERIC,
  data_saida        TEXT,
  data_prevista     TEXT,
  data_entrega      TEXT,
  rota_id           UUID REFERENCES scm_rotas(id) ON DELETE SET NULL,
  pedido_id         UUID REFERENCES erp_pedidos(id) ON DELETE SET NULL,
  cliente_id        UUID REFERENCES erp_clientes(id) ON DELETE SET NULL,
  tenant_id         TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE scm_embarques ENABLE ROW LEVEL SECURITY;
CREATE POLICY scm_embarques_tenant ON scm_embarques FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS scm_embarques_tenant_idx ON scm_embarques(tenant_id);
CREATE INDEX IF NOT EXISTS scm_embarques_status_idx ON scm_embarques(status);

-- ── scm_rastreamento ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scm_rastreamento (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embarque_id  TEXT NOT NULL REFERENCES scm_embarques(id) ON DELETE CASCADE,
  status       TEXT NOT NULL,
  latitude     NUMERIC,
  longitude    NUMERIC,
  descricao    TEXT NOT NULL DEFAULT '',
  tenant_id    TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE scm_rastreamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY scm_rastreamento_tenant ON scm_rastreamento FOR ALL USING (true) WITH CHECK (true);

-- ── scm_docas ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scm_docas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero              TEXT NOT NULL,
  tipo                TEXT NOT NULL DEFAULT 'recebimento'
                      CHECK (tipo IN ('recebimento','expedicao','misto')),
  status              TEXT NOT NULL DEFAULT 'livre'
                      CHECK (status IN ('livre','ocupada','manutencao')),
  capacidade_pallets  INT,
  tenant_id           TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE scm_docas ENABLE ROW LEVEL SECURITY;
CREATE POLICY scm_docas_tenant ON scm_docas FOR ALL USING (true) WITH CHECK (true);

-- ── scm_embalagens ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scm_embalagens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL,
  tipo            TEXT NOT NULL DEFAULT 'caixa'
                  CHECK (tipo IN ('caixa','pallet','envelope','saco','container')),
  comprimento_cm  NUMERIC NOT NULL DEFAULT 0,
  largura_cm      NUMERIC NOT NULL DEFAULT 0,
  altura_cm       NUMERIC NOT NULL DEFAULT 0,
  peso_tara_kg    NUMERIC NOT NULL DEFAULT 0,
  capacidade_kg   NUMERIC,
  tenant_id       TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE scm_embalagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY scm_embalagens_tenant ON scm_embalagens FOR ALL USING (true) WITH CHECK (true);

-- ── scm_crossdock ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scm_crossdock (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embarque_entrada_id  TEXT REFERENCES scm_embarques(id) ON DELETE SET NULL,
  embarque_saida_id    TEXT REFERENCES scm_embarques(id) ON DELETE SET NULL,
  doca_id              UUID REFERENCES scm_docas(id) ON DELETE SET NULL,
  status               TEXT NOT NULL DEFAULT 'aguardando'
                       CHECK (status IN ('aguardando','em_andamento','concluido','cancelado')),
  data_entrada         TEXT,
  data_saida_prevista  TEXT,
  tenant_id            TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE scm_crossdock ENABLE ROW LEVEL SECURITY;
CREATE POLICY scm_crossdock_tenant ON scm_crossdock FOR ALL USING (true) WITH CHECK (true);

-- ── scm_devolucoes ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scm_devolucoes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero                TEXT NOT NULL,
  embarque_origem_id    TEXT REFERENCES scm_embarques(id) ON DELETE SET NULL,
  motivo                TEXT NOT NULL,
  descricao             TEXT,
  status                TEXT NOT NULL DEFAULT 'solicitada'
                        CHECK (status IN ('solicitada','em_transito','recebida','cancelada')),
  transportadora        TEXT,
  valor_frete_retorno   NUMERIC,
  data_solicitacao      TEXT NOT NULL,
  data_prevista         TEXT,
  pedido_devolucao_id   UUID REFERENCES erp_pedidos(id) ON DELETE SET NULL,
  tenant_id             TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE scm_devolucoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY scm_devolucoes_tenant ON scm_devolucoes FOR ALL USING (true) WITH CHECK (true);

-- ── scm_auditoria_fretes ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scm_auditoria_fretes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embarque_id         TEXT REFERENCES scm_embarques(id) ON DELETE SET NULL,
  transportadora      TEXT NOT NULL,
  valor_cobrado       NUMERIC NOT NULL DEFAULT 0,
  valor_auditado      NUMERIC,
  divergencia         NUMERIC,
  status              TEXT NOT NULL DEFAULT 'pendente'
                      CHECK (status IN ('pendente','aprovado','em_disputa','resolvido')),
  motivo_divergencia  TEXT,
  tenant_id           TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE scm_auditoria_fretes ENABLE ROW LEVEL SECURITY;
CREATE POLICY scm_auditoria_fretes_tenant ON scm_auditoria_fretes FOR ALL USING (true) WITH CHECK (true);

-- ── scm_esg_metricas ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scm_esg_metricas (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo                TEXT NOT NULL,
  emissao_co2_kg         NUMERIC NOT NULL DEFAULT 0,
  km_percorridos         NUMERIC NOT NULL DEFAULT 0,
  carga_transportada_kg  NUMERIC NOT NULL DEFAULT 0,
  fretes_realizados      INT NOT NULL DEFAULT 0,
  combustivel_litros     NUMERIC,
  tenant_id              TEXT NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE scm_esg_metricas ENABLE ROW LEVEL SECURITY;
CREATE POLICY scm_esg_metricas_tenant ON scm_esg_metricas FOR ALL USING (true) WITH CHECK (true);

-- ── scm_cold_chain ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scm_cold_chain (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embarque_id      TEXT REFERENCES scm_embarques(id) ON DELETE SET NULL,
  temperatura_atual  NUMERIC NOT NULL,
  temperatura_min    NUMERIC NOT NULL,
  temperatura_max    NUMERIC NOT NULL,
  umidade_pct        NUMERIC,
  status             TEXT NOT NULL DEFAULT 'normal'
                     CHECK (status IN ('normal','alerta','critico')),
  sensor_id          TEXT,
  observacao         TEXT,
  tenant_id          TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE scm_cold_chain ENABLE ROW LEVEL SECURITY;
CREATE POLICY scm_cold_chain_tenant ON scm_cold_chain FOR ALL USING (true) WITH CHECK (true);

-- ── scm_drones ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scm_drones (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                TEXT NOT NULL,
  modelo              TEXT NOT NULL,
  numero_serie        TEXT,
  status              TEXT NOT NULL DEFAULT 'disponivel'
                      CHECK (status IN ('disponivel','em_voo','manutencao','inativo')),
  bateria_pct         NUMERIC,
  alcance_km          NUMERIC,
  carga_max_kg        NUMERIC,
  ultima_manutencao   TEXT,
  tenant_id           TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE scm_drones ENABLE ROW LEVEL SECURITY;
CREATE POLICY scm_drones_tenant ON scm_drones FOR ALL USING (true) WITH CHECK (true);

-- ── scm_embarque_itens ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scm_embarque_itens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embarque_id  TEXT NOT NULL REFERENCES scm_embarques(id) ON DELETE CASCADE,
  produto_id   UUID,
  descricao    TEXT NOT NULL,
  quantidade   NUMERIC NOT NULL DEFAULT 1,
  unidade      TEXT NOT NULL DEFAULT 'un',
  peso_kg      NUMERIC,
  volume_m3    NUMERIC,
  observacao   TEXT,
  tenant_id    TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE scm_embarque_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY scm_embarque_itens_tenant ON scm_embarque_itens FOR ALL USING (true) WITH CHECK (true);

-- ── is_transportadora em erp_fornecedores (se não existir) ───────────────────
ALTER TABLE erp_fornecedores ADD COLUMN IF NOT EXISTS is_transportadora BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE erp_fornecedores ADD COLUMN IF NOT EXISTS prazo_entrega_dias INT;

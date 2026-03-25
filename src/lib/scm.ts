// ─────────────────────────────────────────────────────────────────────────────
// SCM Service Layer — Logística & Supply Chain
// Todas as operações de dados do módulo SCM via Supabase
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase';

// ── Tenant helpers ─────────────────────────────────────────────────────────────
const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';

function getTenantId(): string {
  const v = localStorage.getItem('zia_active_entity_id_v1');
  return v && v.trim().length > 0 ? v : DEFAULT_TENANT;
}

function getTenantIds(): string[] {
  const raw = localStorage.getItem('zia_scope_ids_v1');
  if (raw) {
    try {
      const ids = (JSON.parse(raw) as string[]).filter(
        (id) => typeof id === 'string' && id.trim().length > 0,
      );
      if (Array.isArray(ids) && ids.length > 0) return ids;
    } catch { /* ignore */ }
  }
  return [getTenantId()];
}

// ── Cache em memória (TTL 60s) ────────────────────────────────────────────────
const _cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 60_000;

function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return Promise.resolve(hit.data as T);
  return fetcher().then((data) => { _cache.set(key, { data, ts: Date.now() }); return data; });
}

export function invalidateScmCache(key?: string) {
  if (key) _cache.delete(key);
  else _cache.clear();
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ScmVeiculo {
  id: string;
  placa: string;
  modelo: string;
  tipo: 'truck' | 'van' | 'moto' | 'carro' | 'outro';
  capacidade_kg: number;
  capacidade_m3: number | null;
  status: 'disponivel' | 'em_rota' | 'manutencao' | 'inativo';
  motorista_nome: string | null;
  motorista_cnh: string | null;
  ano_fabricacao: number | null;
  tenant_id: string;
  created_at: string;
}

export interface ScmRota {
  id: string;
  nome: string;
  origem: string;
  destino: string;
  distancia_km: number;
  tempo_estimado_min: number;
  veiculo_id: string | null;
  status: 'ativa' | 'inativa' | 'em_andamento';
  tenant_id: string;
  created_at: string;
  scm_veiculos?: { placa: string; modelo: string } | null;
}

export interface ScmEmbarque {
  id: string;
  numero: string;
  origem: string;
  destino: string;
  status: 'aguardando' | 'em_transito' | 'entregue' | 'devolvido' | 'cancelado';
  transportadora: string | null;
  valor_frete: number | null;
  peso_kg: number | null;
  cubagem_m3: number | null;
  data_saida: string | null;
  data_prevista: string | null;
  data_entrega: string | null;
  rota_id: string | null;
  tenant_id: string;
  created_at: string;
  scm_rotas?: { nome: string } | null;
}

export interface ScmRastreamento {
  id: string;
  embarque_id: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  descricao: string;
  created_at: string;
  scm_embarques?: { numero: string; destino: string; status: string } | null;
}

export interface ScmDoca {
  id: string;
  numero: string;
  tipo: 'recebimento' | 'expedicao' | 'misto';
  status: 'livre' | 'ocupada' | 'manutencao';
  capacidade_pallets: number | null;
  tenant_id: string;
  created_at: string;
}

export interface ScmEmbalagem {
  id: string;
  nome: string;
  tipo: 'caixa' | 'pallet' | 'envelope' | 'saco' | 'container';
  comprimento_cm: number;
  largura_cm: number;
  altura_cm: number;
  peso_tara_kg: number;
  capacidade_kg: number | null;
  tenant_id: string;
  created_at: string;
}

export interface ScmCrossDock {
  id: string;
  embarque_entrada_id: string | null;
  embarque_saida_id: string | null;
  doca_id: string | null;
  status: 'aguardando' | 'em_andamento' | 'concluido' | 'cancelado';
  data_entrada: string | null;
  data_saida_prevista: string | null;
  tenant_id: string;
  created_at: string;
  entrada?: { numero: string } | null;
  saida?: { numero: string } | null;
  doca?: { numero: string } | null;
}

export interface ScmDevolucao {
  id: string;
  numero: string;
  embarque_origem_id: string | null;
  motivo: string;
  descricao: string | null;
  status: 'solicitada' | 'em_transito' | 'recebida' | 'cancelada';
  transportadora: string | null;
  valor_frete_retorno: number | null;
  data_solicitacao: string;
  data_prevista: string | null;
  tenant_id: string;
  created_at: string;
  scm_embarques?: { numero: string; origem: string } | null;
}

export interface ScmAuditoriaFrete {
  id: string;
  embarque_id: string | null;
  transportadora: string;
  valor_cobrado: number;
  valor_auditado: number | null;
  divergencia: number | null;
  status: 'pendente' | 'aprovado' | 'em_disputa' | 'resolvido';
  motivo_divergencia: string | null;
  tenant_id: string;
  created_at: string;
  scm_embarques?: { numero: string } | null;
}

export interface ScmEsgMetrica {
  id: string;
  periodo: string;
  emissao_co2_kg: number;
  km_percorridos: number;
  carga_transportada_kg: number;
  fretes_realizados: number;
  combustivel_litros: number | null;
  tenant_id: string;
  created_at: string;
}

export interface ScmColdChain {
  id: string;
  embarque_id: string | null;
  temperatura_atual: number;
  temperatura_min: number;
  temperatura_max: number;
  umidade_pct: number | null;
  status: 'normal' | 'alerta' | 'critico';
  sensor_id: string | null;
  observacao: string | null;
  created_at: string;
  scm_embarques?: { numero: string; destino: string } | null;
}

export interface ScmDrone {
  id: string;
  nome: string;
  modelo: string;
  numero_serie: string | null;
  status: 'disponivel' | 'em_voo' | 'manutencao' | 'inativo';
  bateria_pct: number | null;
  alcance_km: number | null;
  carga_max_kg: number | null;
  ultima_manutencao: string | null;
  tenant_id: string;
  created_at: string;
}

export interface ScmDashboard {
  veiculos_total: number;
  veiculos_em_rota: number;
  embarques_em_transito: number;
  embarques_entregues_mes: number;
  rotas_ativas: number;
  docas_livres: number;
  devolucoes_pendentes: number;
  auditorias_pendentes: number;
  alertas_cold_chain: number;
  drones_em_voo: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

export async function getScmDashboard(): Promise<ScmDashboard> {
  const tids = getTenantIds();

  const [veiculos, embarques, rotas, docas, devolucoes, auditorias, coldChain, drones] =
    await Promise.allSettled([
      supabase.from('scm_veiculos').select('status').in('tenant_id', tids),
      supabase.from('scm_embarques').select('status, data_entrega').in('tenant_id', tids),
      supabase.from('scm_rotas').select('status').in('tenant_id', tids),
      supabase.from('scm_docas').select('status').in('tenant_id', tids),
      supabase.from('scm_devolucoes').select('status').in('tenant_id', tids),
      supabase.from('scm_auditoria_fretes').select('status').in('tenant_id', tids),
      supabase.from('scm_cold_chain').select('status'),
      supabase.from('scm_drones').select('status').in('tenant_id', tids),
    ]);

  const mesAtual = new Date().toISOString().slice(0, 7);

  const veiculosData = veiculos.status === 'fulfilled' ? (veiculos.value.data ?? []) : [];
  const embarquesData = embarques.status === 'fulfilled' ? (embarques.value.data ?? []) : [];
  const rotasData = rotas.status === 'fulfilled' ? (rotas.value.data ?? []) : [];
  const docasData = docas.status === 'fulfilled' ? (docas.value.data ?? []) : [];
  const devolucoesData = devolucoes.status === 'fulfilled' ? (devolucoes.value.data ?? []) : [];
  const auditoriasData = auditorias.status === 'fulfilled' ? (auditorias.value.data ?? []) : [];
  const coldData = coldChain.status === 'fulfilled' ? (coldChain.value.data ?? []) : [];
  const dronesData = drones.status === 'fulfilled' ? (drones.value.data ?? []) : [];

  return {
    veiculos_total: veiculosData.length,
    veiculos_em_rota: veiculosData.filter((v) => v.status === 'em_rota').length,
    embarques_em_transito: embarquesData.filter((e) => e.status === 'em_transito').length,
    embarques_entregues_mes: embarquesData.filter(
      (e) => e.status === 'entregue' && e.data_entrega?.startsWith(mesAtual),
    ).length,
    rotas_ativas: rotasData.filter((r) => r.status === 'ativa' || r.status === 'em_andamento').length,
    docas_livres: docasData.filter((d) => d.status === 'livre').length,
    devolucoes_pendentes: devolucoesData.filter(
      (d) => d.status === 'solicitada' || d.status === 'em_transito',
    ).length,
    auditorias_pendentes: auditoriasData.filter((a) => a.status === 'pendente').length,
    alertas_cold_chain: coldData.filter((c) => c.status === 'alerta' || c.status === 'critico').length,
    drones_em_voo: dronesData.filter((d) => d.status === 'em_voo').length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VEÍCULOS (Frota)
// ─────────────────────────────────────────────────────────────────────────────

export async function getVeiculos(search = ''): Promise<ScmVeiculo[]> {
  const tids = getTenantIds();
  return cached(`${tids.join(',')}:veiculos:${search}`, async () => {
    let q = supabase.from('scm_veiculos').select('*').in('tenant_id', tids).order('placa');
    if (search) q = q.or(`placa.ilike.%${search}%,modelo.ilike.%${search}%,motorista_nome.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  });
}

export async function createVeiculo(payload: Omit<ScmVeiculo, 'id' | 'created_at' | 'tenant_id'>): Promise<ScmVeiculo> {
  const { data, error } = await supabase
    .from('scm_veiculos')
    .insert({ ...payload, tenant_id: getTenantId() })
    .select()
    .single();
  if (error) throw error;
  invalidateScmCache();
  return data;
}

export async function updateVeiculo(id: string, payload: Partial<Omit<ScmVeiculo, 'id' | 'tenant_id' | 'created_at'>>): Promise<ScmVeiculo> {
  const { data, error } = await supabase
    .from('scm_veiculos')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  invalidateScmCache();
  return data;
}

export async function deleteVeiculo(id: string): Promise<void> {
  const { error } = await supabase.from('scm_veiculos').delete().eq('id', id);
  if (error) throw error;
  invalidateScmCache();
}

// ─────────────────────────────────────────────────────────────────────────────
// ROTAS
// ─────────────────────────────────────────────────────────────────────────────

export async function getRotas(search = ''): Promise<ScmRota[]> {
  const tids = getTenantIds();
  return cached(`${tids.join(',')}:rotas:${search}`, async () => {
    let q = supabase
      .from('scm_rotas')
      .select('*, scm_veiculos(placa, modelo)')
      .in('tenant_id', tids)
      .order('nome');
    if (search) q = q.or(`nome.ilike.%${search}%,origem.ilike.%${search}%,destino.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  });
}

export async function createRota(payload: Omit<ScmRota, 'id' | 'created_at' | 'tenant_id' | 'scm_veiculos'>): Promise<ScmRota> {
  const { data, error } = await supabase
    .from('scm_rotas')
    .insert({ ...payload, tenant_id: getTenantId() })
    .select('*, scm_veiculos(placa, modelo)')
    .single();
  if (error) throw error;
  invalidateScmCache();
  return data;
}

export async function updateRota(id: string, payload: Partial<Omit<ScmRota, 'id' | 'tenant_id' | 'created_at' | 'scm_veiculos'>>): Promise<ScmRota> {
  const { data, error } = await supabase
    .from('scm_rotas')
    .update(payload)
    .eq('id', id)
    .select('*, scm_veiculos(placa, modelo)')
    .single();
  if (error) throw error;
  invalidateScmCache();
  return data;
}

export async function deleteRota(id: string): Promise<void> {
  const { error } = await supabase.from('scm_rotas').delete().eq('id', id);
  if (error) throw error;
  invalidateScmCache();
}

// ─────────────────────────────────────────────────────────────────────────────
// EMBARQUES (TMS)
// ─────────────────────────────────────────────────────────────────────────────

export async function getEmbarques(search = '', status?: string): Promise<ScmEmbarque[]> {
  const tids = getTenantIds();
  return cached(`${tids.join(',')}:embarques:${search}:${status ?? ''}`, async () => {
    let q = supabase
      .from('scm_embarques')
      .select('*, scm_rotas(nome)')
      .in('tenant_id', tids)
      .order('created_at', { ascending: false });
    if (search) q = q.or(`numero.ilike.%${search}%,origem.ilike.%${search}%,destino.ilike.%${search}%,transportadora.ilike.%${search}%`);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  });
}

export async function createEmbarque(payload: Omit<ScmEmbarque, 'id' | 'created_at' | 'tenant_id' | 'scm_rotas'>): Promise<ScmEmbarque> {
  const { data, error } = await supabase
    .from('scm_embarques')
    .insert({ ...payload, tenant_id: getTenantId() })
    .select('*, scm_rotas(nome)')
    .single();
  if (error) throw error;
  invalidateScmCache();
  return data;
}

export async function updateEmbarque(id: string, payload: Partial<Omit<ScmEmbarque, 'id' | 'tenant_id' | 'created_at' | 'scm_rotas'>>): Promise<ScmEmbarque> {
  const { data, error } = await supabase
    .from('scm_embarques')
    .update(payload)
    .eq('id', id)
    .select('*, scm_rotas(nome)')
    .single();
  if (error) throw error;
  invalidateScmCache();
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// RASTREAMENTO (Last-Mile)
// ─────────────────────────────────────────────────────────────────────────────

export async function getRastreamentos(embarqueId?: string): Promise<ScmRastreamento[]> {
  const tids = getTenantIds();
  const cacheKey = `${tids.join(',')}:rastreamento:${embarqueId ?? 'all'}`;
  return cached(cacheKey, async () => {
    let q = supabase
      .from('scm_rastreamento')
      .select('*, scm_embarques(numero, destino, status, tenant_id)')
      .order('created_at', { ascending: false });
    if (embarqueId) {
      q = q.eq('embarque_id', embarqueId);
    } else {
      // filtrar por tenant via join
      q = q.in('scm_embarques.tenant_id', tids);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).filter((r) => r.scm_embarques !== null);
  });
}

export async function createRastreamento(payload: Omit<ScmRastreamento, 'id' | 'created_at' | 'scm_embarques'>): Promise<ScmRastreamento> {
  const { data, error } = await supabase
    .from('scm_rastreamento')
    .insert(payload)
    .select('*, scm_embarques(numero, destino, status)')
    .single();
  if (error) throw error;
  invalidateScmCache('rastreamento');
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCAS (WMS)
// ─────────────────────────────────────────────────────────────────────────────

export async function getDocas(): Promise<ScmDoca[]> {
  const tids = getTenantIds();
  return cached(`${tids.join(',')}:docas`, async () => {
    const { data, error } = await supabase
      .from('scm_docas')
      .select('*')
      .in('tenant_id', tids)
      .order('numero');
    if (error) throw error;
    return data ?? [];
  });
}

export async function createDoca(payload: Omit<ScmDoca, 'id' | 'created_at' | 'tenant_id'>): Promise<ScmDoca> {
  const { data, error } = await supabase
    .from('scm_docas')
    .insert({ ...payload, tenant_id: getTenantId() })
    .select()
    .single();
  if (error) throw error;
  invalidateScmCache();
  return data;
}

export async function updateDoca(id: string, payload: Partial<Omit<ScmDoca, 'id' | 'tenant_id' | 'created_at'>>): Promise<ScmDoca> {
  const { data, error } = await supabase
    .from('scm_docas')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  invalidateScmCache();
  return data;
}

export async function deleteDoca(id: string): Promise<void> {
  const { error } = await supabase.from('scm_docas').delete().eq('id', id);
  if (error) throw error;
  invalidateScmCache();
}

// ─────────────────────────────────────────────────────────────────────────────
// EMBALAGENS
// ─────────────────────────────────────────────────────────────────────────────

export async function getEmbalagens(): Promise<ScmEmbalagem[]> {
  const tids = getTenantIds();
  return cached(`${tids.join(',')}:embalagens`, async () => {
    const { data, error } = await supabase
      .from('scm_embalagens')
      .select('*')
      .in('tenant_id', tids)
      .order('nome');
    if (error) throw error;
    return data ?? [];
  });
}

export async function createEmbalagem(payload: Omit<ScmEmbalagem, 'id' | 'created_at' | 'tenant_id'>): Promise<ScmEmbalagem> {
  const { data, error } = await supabase
    .from('scm_embalagens')
    .insert({ ...payload, tenant_id: getTenantId() })
    .select()
    .single();
  if (error) throw error;
  invalidateScmCache();
  return data;
}

export async function updateEmbalagem(id: string, payload: Partial<Omit<ScmEmbalagem, 'id' | 'tenant_id' | 'created_at'>>): Promise<ScmEmbalagem> {
  const { data, error } = await supabase
    .from('scm_embalagens')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  invalidateScmCache();
  return data;
}

export async function deleteEmbalagem(id: string): Promise<void> {
  const { error } = await supabase.from('scm_embalagens').delete().eq('id', id);
  if (error) throw error;
  invalidateScmCache();
}

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-DOCKING
// ─────────────────────────────────────────────────────────────────────────────

export async function getCrossDocks(): Promise<ScmCrossDock[]> {
  const tids = getTenantIds();
  return cached(`${tids.join(',')}:crossdock`, async () => {
    const { data, error } = await supabase
      .from('scm_crossdock')
      .select(`
        *,
        entrada:scm_embarques!embarque_entrada_id(numero),
        saida:scm_embarques!embarque_saida_id(numero),
        doca:scm_docas!doca_id(numero)
      `)
      .in('tenant_id', tids)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  });
}

export async function createCrossDock(payload: Omit<ScmCrossDock, 'id' | 'created_at' | 'tenant_id' | 'entrada' | 'saida' | 'doca'>): Promise<ScmCrossDock> {
  const { data, error } = await supabase
    .from('scm_crossdock')
    .insert({ ...payload, tenant_id: getTenantId() })
    .select('*')
    .single();
  if (error) throw error;
  invalidateScmCache();
  return data;
}

export async function updateCrossDock(id: string, payload: Partial<Omit<ScmCrossDock, 'id' | 'tenant_id' | 'created_at' | 'entrada' | 'saida' | 'doca'>>): Promise<void> {
  const { error } = await supabase.from('scm_crossdock').update(payload).eq('id', id);
  if (error) throw error;
  invalidateScmCache();
}

// ─────────────────────────────────────────────────────────────────────────────
// DEVOLUÇÕES (Logística Reversa)
// ─────────────────────────────────────────────────────────────────────────────

export async function getDevolucoes(search = ''): Promise<ScmDevolucao[]> {
  const tids = getTenantIds();
  return cached(`${tids.join(',')}:devolucoes:${search}`, async () => {
    let q = supabase
      .from('scm_devolucoes')
      .select('*, scm_embarques(numero, origem)')
      .in('tenant_id', tids)
      .order('created_at', { ascending: false });
    if (search) q = q.or(`numero.ilike.%${search}%,motivo.ilike.%${search}%,transportadora.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  });
}

export async function createDevolucao(payload: Omit<ScmDevolucao, 'id' | 'created_at' | 'tenant_id' | 'scm_embarques'>): Promise<ScmDevolucao> {
  const { data, error } = await supabase
    .from('scm_devolucoes')
    .insert({ ...payload, tenant_id: getTenantId() })
    .select('*, scm_embarques(numero, origem)')
    .single();
  if (error) throw error;
  invalidateScmCache();
  return data;
}

export async function updateDevolucao(id: string, payload: Partial<Omit<ScmDevolucao, 'id' | 'tenant_id' | 'created_at' | 'scm_embarques'>>): Promise<void> {
  const { error } = await supabase.from('scm_devolucoes').update(payload).eq('id', id);
  if (error) throw error;
  invalidateScmCache();
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDITORIA DE FRETES
// ─────────────────────────────────────────────────────────────────────────────

export async function getAuditoriaFretes(search = ''): Promise<ScmAuditoriaFrete[]> {
  const tids = getTenantIds();
  return cached(`${tids.join(',')}:auditoria_fretes:${search}`, async () => {
    let q = supabase
      .from('scm_auditoria_fretes')
      .select('*, scm_embarques(numero)')
      .in('tenant_id', tids)
      .order('created_at', { ascending: false });
    if (search) q = q.ilike('transportadora', `%${search}%`);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  });
}

export async function createAuditoriaFrete(payload: Omit<ScmAuditoriaFrete, 'id' | 'created_at' | 'tenant_id' | 'scm_embarques' | 'divergencia'>): Promise<ScmAuditoriaFrete> {
  const divergencia = payload.valor_auditado != null
    ? payload.valor_cobrado - payload.valor_auditado
    : null;
  const { data, error } = await supabase
    .from('scm_auditoria_fretes')
    .insert({ ...payload, divergencia, tenant_id: getTenantId() })
    .select('*, scm_embarques(numero)')
    .single();
  if (error) throw error;
  invalidateScmCache();
  return data;
}

export async function updateAuditoriaFrete(id: string, payload: Partial<Omit<ScmAuditoriaFrete, 'id' | 'tenant_id' | 'created_at' | 'scm_embarques'>>): Promise<void> {
  const update = { ...payload };
  if (payload.valor_cobrado != null || payload.valor_auditado != null) {
    // recalcular divergência se ambos presentes no payload
  }
  const { error } = await supabase.from('scm_auditoria_fretes').update(update).eq('id', id);
  if (error) throw error;
  invalidateScmCache();
}

// ─────────────────────────────────────────────────────────────────────────────
// ESG / SUSTENTABILIDADE
// ─────────────────────────────────────────────────────────────────────────────

export async function getEsgMetricas(): Promise<ScmEsgMetrica[]> {
  const tids = getTenantIds();
  return cached(`${tids.join(',')}:esg`, async () => {
    const { data, error } = await supabase
      .from('scm_esg_metricas')
      .select('*')
      .in('tenant_id', tids)
      .order('periodo', { ascending: false });
    if (error) throw error;
    return data ?? [];
  });
}

export async function createEsgMetrica(payload: Omit<ScmEsgMetrica, 'id' | 'created_at' | 'tenant_id'>): Promise<ScmEsgMetrica> {
  const { data, error } = await supabase
    .from('scm_esg_metricas')
    .insert({ ...payload, tenant_id: getTenantId() })
    .select()
    .single();
  if (error) throw error;
  invalidateScmCache();
  return data;
}

export async function updateEsgMetrica(id: string, payload: Partial<Omit<ScmEsgMetrica, 'id' | 'tenant_id' | 'created_at'>>): Promise<void> {
  const { error } = await supabase.from('scm_esg_metricas').update(payload).eq('id', id);
  if (error) throw error;
  invalidateScmCache();
}

// ─────────────────────────────────────────────────────────────────────────────
// COLD CHAIN
// ─────────────────────────────────────────────────────────────────────────────

export async function getColdChainEvents(): Promise<ScmColdChain[]> {
  return cached('cold_chain:all', async () => {
    const { data, error } = await supabase
      .from('scm_cold_chain')
      .select('*, scm_embarques(numero, destino)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  });
}

export async function createColdChainEvent(payload: Omit<ScmColdChain, 'id' | 'created_at' | 'scm_embarques'>): Promise<ScmColdChain> {
  const { data, error } = await supabase
    .from('scm_cold_chain')
    .insert(payload)
    .select('*, scm_embarques(numero, destino)')
    .single();
  if (error) throw error;
  invalidateScmCache('cold_chain:all');
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// DRONES
// ─────────────────────────────────────────────────────────────────────────────

export async function getDrones(): Promise<ScmDrone[]> {
  const tids = getTenantIds();
  return cached(`${tids.join(',')}:drones`, async () => {
    const { data, error } = await supabase
      .from('scm_drones')
      .select('*')
      .in('tenant_id', tids)
      .order('nome');
    if (error) throw error;
    return data ?? [];
  });
}

export async function createDrone(payload: Omit<ScmDrone, 'id' | 'created_at' | 'tenant_id'>): Promise<ScmDrone> {
  const { data, error } = await supabase
    .from('scm_drones')
    .insert({ ...payload, tenant_id: getTenantId() })
    .select()
    .single();
  if (error) throw error;
  invalidateScmCache();
  return data;
}

export async function updateDrone(id: string, payload: Partial<Omit<ScmDrone, 'id' | 'tenant_id' | 'created_at'>>): Promise<ScmDrone> {
  const { data, error } = await supabase
    .from('scm_drones')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  invalidateScmCache();
  return data;
}

export async function deleteDrone(id: string): Promise<void> {
  const { error } = await supabase.from('scm_drones').delete().eq('id', id);
  if (error) throw error;
  invalidateScmCache();
}

// ─────────────────────────────────────────────────────────────────────────────
// Assinaturas Service Layer — módulo independente de assinaturas
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase';
import { invalidateCacheAll } from './erp';
import type {
  ErpAssinatura, ErpAssinaturaHistorico, ErpAssinaturaCobranca,
  ErpProduto, AssinaturaStatus,
} from './erp';

// Re-export types used across the module
export type {
  ErpAssinatura, ErpAssinaturaHistorico, ErpAssinaturaCobranca,
  ErpProduto, AssinaturaStatus,
};

// ── Local cache ───────────────────────────────────────────────────────────────
const _cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 30_000;

function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.ts < TTL) return Promise.resolve(hit.data as T);
  return fn().then(d => { _cache.set(key, { data: d, ts: Date.now() }); return d; });
}

export function invalidateAssCache() { _cache.clear(); invalidateCacheAll(); }

import { getTenantId as getTid, getTenantIds as getTids } from './auth';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AssinaturaAcesso {
  id: string;
  tenant_id: string;
  assinatura_id: string;
  nome_usuario: string;
  email: string;
  nivel: string;
  valor_diferenciado: number | null;
  status: 'ativo' | 'suspenso' | 'cancelado';
  ultimo_acesso: string | null;
  externo_id: string | null;
  created_at: string;
  erp_assinaturas?: {
    erp_clientes?: { nome: string } | null;
    erp_produtos?:  { nome: string } | null;
  } | null;
}

export interface AssinaturaIntegracao {
  id: string;
  tenant_id: string;
  tipo: string;
  api_key_enc: string | null;
  webhook_url: string | null;
  ativo: boolean;
  ultimo_sync: string | null;
  ultimo_erro: string | null;
  config_json: Record<string, unknown>;
  created_at: string;
}

export interface AssinaturaIntegracaoMapeamento {
  id: string;
  tenant_id: string;
  integracao_id: string;
  produto_local_id: string;
  produto_externo_id: string;
  produto_externo_nome: string | null;
  erp_produtos?: { nome: string } | null;
}

export interface AssinaturaPlanoFaixa {
  id: string;
  tenant_id: string;
  plano_id: string;
  faixa_min: number;
  faixa_max: number | null;
  preco: number;
  created_at: string;
}

export interface AssinaturaPlanoMetrica {
  id: string;
  tenant_id: string;
  plano_id: string;
  nome: string;
  limite: number | null;
  acao_limite: 'bloquear' | 'notificar' | 'cobrar_excedente';
  preco_excedente: number;
  created_at: string;
}

export interface AssinaturaPlanoRegra {
  id: string;
  tenant_id: string;
  plano_origem_id: string;
  plano_destino_id: string;
  tipo: 'upgrade' | 'downgrade';
  cobranca: 'imediata' | 'proximo_ciclo';
  plano_destino?: { nome: string } | null;
}

export interface AssinaturaConfig {
  id: string;
  tenant_id: string;
  allow_trial: boolean;
  trial_dias_padrao: number;
  churn_alerta_dias: number;
  notificar_inadimplente_dias: number;
  is_internal_license_mode: boolean;
  created_at: string;
}

// Plano = ErpProduto with is_subscription=true, plus extended data
export interface AssinaturaPlano extends ErpProduto {
  plano_status: 'ativo' | 'inativo' | 'arquivado' | null;
  faixas?: AssinaturaPlanoFaixa[];
  metricas?: AssinaturaPlanoMetrica[];
  regras?: AssinaturaPlanoRegra[];
}

// Dashboard KPIs
export interface AssinaturasKPIs {
  total_ativas: number;
  total_trial: number;
  total_inadimplentes: number;
  total_pausadas: number;
  total_canceladas_mes: number;
  mrr: number;
  arr: number;
  ticket_medio: number;
}

// ── Assinaturas ───────────────────────────────────────────────────────────────

export async function getAssinaturas(filters?: {
  status?: AssinaturaStatus;
  plano_id?: string;
  vendedor_id?: string;
  search?: string;
}): Promise<ErpAssinatura[]> {
  const tids = getTids();
  const key = `${tids.join(',')}:assinaturas:${JSON.stringify(filters ?? {})}`;
  return cached(key, async () => {
    let q = supabase
      .from('erp_assinaturas')
      .select('*, erp_clientes(nome,telefone), erp_produtos(nome)')
      .in('tenant_id', tids)
      .order('created_at', { ascending: false });
    if (filters?.status) q = q.eq('status', filters.status);
    if (filters?.plano_id) q = q.eq('produto_id', filters.plano_id);
    if (filters?.vendedor_id) q = q.eq('vendedor_id', filters.vendedor_id);
    if (filters?.search) q = q.ilike('erp_clientes.nome', `%${filters.search}%`);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  });
}

export async function createAssinatura(
  payload: Omit<ErpAssinatura, 'id' | 'tenant_id' | 'created_at' | 'erp_clientes' | 'erp_produtos'>
): Promise<ErpAssinatura> {
  const tenant_id = getTid();
  const { data, error } = await supabase
    .from('erp_assinaturas')
    .insert({ ...payload, tenant_id })
    .select('*, erp_clientes(nome,telefone), erp_produtos(nome)')
    .single();
  if (error) throw error;
  invalidateAssCache();
  return data;
}

export async function updateAssinatura(
  id: string, payload: Partial<ErpAssinatura>
): Promise<ErpAssinatura> {
  const { data, error } = await supabase
    .from('erp_assinaturas')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', getTid())
    .select('*, erp_clientes(nome,telefone), erp_produtos(nome)')
    .single();
  if (error) throw error;
  invalidateAssCache();
  return data;
}

export async function deleteAssinatura(id: string): Promise<void> {
  const { error } = await supabase.from('erp_assinaturas').delete().eq('id', id).eq('tenant_id', getTid());
  if (error) throw error;
  invalidateAssCache();
}

// ── Histórico ─────────────────────────────────────────────────────────────────

export async function getAssinaturaHistorico(assinaturaId: string): Promise<ErpAssinaturaHistorico[]> {
  const { data, error } = await supabase
    .from('erp_assinaturas_historico')
    .select('*')
    .eq('assinatura_id', assinaturaId)
    .in('tenant_id', getTids())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addAssinaturaHistorico(
  assinaturaId: string,
  entry: Omit<ErpAssinaturaHistorico, 'id' | 'tenant_id' | 'assinatura_id' | 'created_at'>
): Promise<void> {
  const tenant_id = getTid();
  const { error } = await supabase
    .from('erp_assinaturas_historico')
    .insert({ ...entry, assinatura_id: assinaturaId, tenant_id });
  if (error) throw error;
}

// ── Cobranças ─────────────────────────────────────────────────────────────────

export async function getAssinaturaCobrancas(assinaturaId: string): Promise<ErpAssinaturaCobranca[]> {
  const { data, error } = await supabase
    .from('erp_assinaturas_cobrancas')
    .select('*')
    .eq('assinatura_id', assinaturaId)
    .in('tenant_id', getTids())
    .order('vencimento', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ── Acessos ───────────────────────────────────────────────────────────────────

export async function getAcessos(assinaturaId?: string): Promise<AssinaturaAcesso[]> {
  const tids = getTids();
  const key = `${tids.join(',')}:acessos:${assinaturaId ?? 'all'}`;
  return cached(key, async () => {
    let q = supabase
      .from('assinaturas_acessos')
      .select('*, erp_assinaturas(erp_clientes(nome), erp_produtos(nome))')
      .in('tenant_id', tids)
      .order('created_at', { ascending: false });
    if (assinaturaId) q = q.eq('assinatura_id', assinaturaId);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  });
}

export async function createAcesso(
  payload: Omit<AssinaturaAcesso, 'id' | 'tenant_id' | 'created_at' | 'erp_assinaturas'>
): Promise<AssinaturaAcesso> {
  const tenant_id = getTid();
  const { data, error } = await supabase
    .from('assinaturas_acessos')
    .insert({ ...payload, tenant_id })
    .select()
    .single();
  if (error) throw error;
  invalidateAssCache();
  return data;
}

export async function updateAcesso(
  id: string, payload: Partial<AssinaturaAcesso>
): Promise<AssinaturaAcesso> {
  const { data, error } = await supabase
    .from('assinaturas_acessos')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', getTid())
    .select()
    .single();
  if (error) throw error;
  invalidateAssCache();
  return data;
}

export async function deleteAcesso(id: string): Promise<void> {
  const { error } = await supabase.from('assinaturas_acessos').delete().eq('id', id).eq('tenant_id', getTid());
  if (error) throw error;
  invalidateAssCache();
}

// ── Planos ────────────────────────────────────────────────────────────────────

export async function getPlanos(): Promise<AssinaturaPlano[]> {
  const tids = getTids();
  return cached(`${tids.join(',')}:planos`, async () => {
    const { data, error } = await supabase
      .from('erp_produtos')
      .select('*, erp_grupo_produtos(nome)')
      .in('tenant_id', tids)
      .eq('is_subscription', true)
      .order('nome');
    if (error) throw error;
    return (data ?? []) as AssinaturaPlano[];
  });
}

export async function getPlanoById(id: string): Promise<AssinaturaPlano | null> {
  const tids = getTids();
  const [prodRes, faixasRes, metricasRes, regrasRes] = await Promise.all([
    supabase.from('erp_produtos').select('*').eq('id', id).in('tenant_id', tids).single(),
    supabase.from('assinaturas_plano_faixas').select('*').eq('plano_id', id).in('tenant_id', tids).order('faixa_min'),
    supabase.from('assinaturas_plano_metricas').select('*').eq('plano_id', id).in('tenant_id', tids),
    supabase.from('assinaturas_plano_regras').select('*, plano_destino:erp_produtos!plano_destino_id(nome)').eq('plano_origem_id', id).in('tenant_id', tids),
  ]);
  if (prodRes.error) throw prodRes.error;
  if (!prodRes.data) return null;
  return {
    ...(prodRes.data as AssinaturaPlano),
    faixas:   faixasRes.data ?? [],
    metricas: metricasRes.data ?? [],
    regras:   regrasRes.data ?? [],
  };
}

export async function createPlano(
  payload: Omit<AssinaturaPlano, 'id' | 'tenant_id' | 'created_at' | 'erp_grupo_produtos' | 'faixas' | 'metricas' | 'regras'>
): Promise<AssinaturaPlano> {
  const tenant_id = getTid();
  const { faixas: _f, metricas: _m, regras: _r, ...rest } = payload as AssinaturaPlano & { faixas?: unknown; metricas?: unknown; regras?: unknown };
  const { data, error } = await supabase
    .from('erp_produtos')
    .insert({ ...rest, tenant_id, is_subscription: true })
    .select()
    .single();
  if (error) throw error;
  invalidateAssCache();
  return data as AssinaturaPlano;
}

export async function updatePlano(
  id: string, payload: Partial<AssinaturaPlano>
): Promise<AssinaturaPlano> {
  const { faixas: _f, metricas: _m, regras: _r, erp_grupo_produtos: _g, ...rest } = payload as Record<string, unknown>;
  const { data, error } = await supabase
    .from('erp_produtos')
    .update(rest)
    .eq('id', id)
    .eq('tenant_id', getTid())
    .select()
    .single();
  if (error) throw error;
  invalidateAssCache();
  return data as AssinaturaPlano;
}

// ── Faixas ─────────────────────────────────────────────────────────────────────

export async function savePlanoFaixas(planoId: string, faixas: Omit<AssinaturaPlanoFaixa, 'id' | 'tenant_id' | 'created_at'>[]): Promise<void> {
  const tenant_id = getTid();
  await supabase.from('assinaturas_plano_faixas').delete().eq('plano_id', planoId).eq('tenant_id', tenant_id);
  if (faixas.length > 0) {
    const { error } = await supabase.from('assinaturas_plano_faixas')
      .insert(faixas.map(f => ({ ...f, plano_id: planoId, tenant_id })));
    if (error) throw error;
  }
  invalidateAssCache();
}

// ── Métricas ──────────────────────────────────────────────────────────────────

export async function savePlanoMetricas(planoId: string, metricas: Omit<AssinaturaPlanoMetrica, 'id' | 'tenant_id' | 'created_at'>[]): Promise<void> {
  const tenant_id = getTid();
  await supabase.from('assinaturas_plano_metricas').delete().eq('plano_id', planoId).eq('tenant_id', tenant_id);
  if (metricas.length > 0) {
    const { error } = await supabase.from('assinaturas_plano_metricas')
      .insert(metricas.map(m => ({ ...m, plano_id: planoId, tenant_id })));
    if (error) throw error;
  }
  invalidateAssCache();
}

// ── Regras ─────────────────────────────────────────────────────────────────────

export async function savePlanoRegras(planoId: string, regras: Omit<AssinaturaPlanoRegra, 'id' | 'tenant_id' | 'plano_destino'>[]): Promise<void> {
  const tenant_id = getTid();
  await supabase.from('assinaturas_plano_regras').delete().eq('plano_origem_id', planoId).eq('tenant_id', tenant_id);
  if (regras.length > 0) {
    const { error } = await supabase.from('assinaturas_plano_regras')
      .insert(regras.map(r => ({ ...r, plano_origem_id: planoId, tenant_id })));
    if (error) throw error;
  }
  invalidateAssCache();
}

// ── Integrações ───────────────────────────────────────────────────────────────

export async function getIntegracoes(): Promise<AssinaturaIntegracao[]> {
  const tids = getTids();
  return cached(`${tids.join(',')}:integracoes`, async () => {
    const { data, error } = await supabase
      .from('assinaturas_integracoes')
      .select('*')
      .in('tenant_id', tids)
      .order('tipo');
    if (error) throw error;
    return data ?? [];
  });
}

export async function upsertIntegracao(
  tipo: string, payload: Partial<AssinaturaIntegracao>
): Promise<AssinaturaIntegracao> {
  const tenant_id = getTid();
  const { data, error } = await supabase
    .from('assinaturas_integracoes')
    .upsert({ ...payload, tipo, tenant_id }, { onConflict: 'tenant_id,tipo' })
    .select()
    .single();
  if (error) throw error;
  invalidateAssCache();
  return data;
}

export async function getMapeamentos(integracaoId: string): Promise<AssinaturaIntegracaoMapeamento[]> {
  const { data, error } = await supabase
    .from('assinaturas_integracoes_mapeamentos')
    .select('*, erp_produtos(nome)')
    .eq('integracao_id', integracaoId)
    .in('tenant_id', getTids());
  if (error) throw error;
  return data ?? [];
}

export async function saveMapeamentos(
  integracaoId: string,
  mapeamentos: Omit<AssinaturaIntegracaoMapeamento, 'id' | 'tenant_id' | 'erp_produtos'>[]
): Promise<void> {
  const tenant_id = getTid();
  await supabase.from('assinaturas_integracoes_mapeamentos').delete().eq('integracao_id', integracaoId).eq('tenant_id', tenant_id);
  if (mapeamentos.length > 0) {
    const { error } = await supabase.from('assinaturas_integracoes_mapeamentos')
      .insert(mapeamentos.map(m => ({ ...m, integracao_id: integracaoId, tenant_id })));
    if (error) throw error;
  }
  invalidateAssCache();
}

// ── Config ────────────────────────────────────────────────────────────────────

export async function getAssConfig(): Promise<AssinaturaConfig | null> {
  const tid = getTid();
  const { data } = await supabase
    .from('assinaturas_config')
    .select('*')
    .eq('tenant_id', tid)
    .maybeSingle();
  return data ?? null;
}

export async function saveAssConfig(payload: Partial<AssinaturaConfig>): Promise<AssinaturaConfig> {
  const tenant_id = getTid();
  const { data, error } = await supabase
    .from('assinaturas_config')
    .upsert({ ...payload, tenant_id }, { onConflict: 'tenant_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── KPIs (calculado no cliente) ───────────────────────────────────────────────

export function calcKPIs(assinaturas: ErpAssinatura[]): AssinaturasKPIs {
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  const ativas = assinaturas.filter(a => a.status === 'ativa');
  const trial  = assinaturas.filter(a => a.status === 'em_trial');
  const inadim = assinaturas.filter(a => a.status === 'inadimplente');
  const pausadas = assinaturas.filter(a => a.status === 'pausada');
  const canceladasMes = assinaturas.filter(a => {
    if (a.status !== 'cancelada') return false;
    const d = new Date(a.created_at);
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });

  const liquido = (a: ErpAssinatura) => a.valor_mensal * (1 - (a.desconto_pct ?? 0) / 100);
  const mrr = [...ativas, ...trial].reduce((s, a) => s + liquido(a), 0);
  const totalAtivas = ativas.length + trial.length;
  const ticketMedio = totalAtivas > 0 ? mrr / totalAtivas : 0;

  return {
    total_ativas: ativas.length,
    total_trial: trial.length,
    total_inadimplentes: inadim.length,
    total_pausadas: pausadas.length,
    total_canceladas_mes: canceladasMes.length,
    mrr,
    arr: mrr * 12,
    ticket_medio: ticketMedio,
  };
}

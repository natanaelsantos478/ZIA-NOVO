// ─────────────────────────────────────────────────────────────────────────────
// ZIA PDV — Serviço de Caixa e Terminal de Pagamento
//
// Arquitetura:
//   erp_terminal_configs   → configurações dos terminais (Stone, Cielo, etc.)
//   erp_caixa_sessoes      → sessões de caixa (abertura/fechamento)
//   erp_caixa_transacoes   → cada pagamento realizado (acessível por todos módulos)
//
// Outros módulos (RH, Logística, etc.) podem consultar erp_caixa_transacoes
// filtrando por filial_id, modulo_origem, data, etc.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type TerminalProvider =
  | 'stone'
  | 'cielo'
  | 'rede'
  | 'getnet'
  | 'sumup'
  | 'pagseguro'
  | 'manual';

export type FormaPagamentoPDV =
  | 'dinheiro'
  | 'credito'
  | 'debito'
  | 'pix'
  | 'voucher_alimentacao'
  | 'voucher_refeicao'
  | 'voucher_combustivel';

export type StatusTransacao = 'APROVADO' | 'RECUSADO' | 'CANCELADO' | 'PENDENTE';

export const PROVIDER_LABELS: Record<TerminalProvider, string> = {
  stone:      'Stone',
  cielo:      'Cielo',
  rede:       'Rede (Itaú)',
  getnet:     'GetNet (Santander)',
  sumup:      'SumUp',
  pagseguro:  'PagSeguro',
  manual:     'Manual (sem maquininha)',
};

export const PROVIDER_COLORS: Record<TerminalProvider, string> = {
  stone:      'bg-green-100 text-green-700',
  cielo:      'bg-blue-100 text-blue-700',
  rede:       'bg-orange-100 text-orange-700',
  getnet:     'bg-red-100 text-red-700',
  sumup:      'bg-violet-100 text-violet-700',
  pagseguro:  'bg-yellow-100 text-yellow-700',
  manual:     'bg-slate-100 text-slate-700',
};

export const FORMA_LABELS: Record<FormaPagamentoPDV, string> = {
  dinheiro:            'Dinheiro',
  credito:             'Crédito',
  debito:              'Débito',
  pix:                 'PIX',
  voucher_alimentacao: 'Voucher Alimentação',
  voucher_refeicao:    'Voucher Refeição',
  voucher_combustivel: 'Voucher Combustível',
};

export const FORMA_ICONS: Record<FormaPagamentoPDV, string> = {
  dinheiro:            '💵',
  credito:             '💳',
  debito:              '💳',
  pix:                 '⚡',
  voucher_alimentacao: '🍽️',
  voucher_refeicao:    '🍽️',
  voucher_combustivel: '⛽',
};

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface TerminalConfig {
  id: string;
  nome: string;           // 'Caixa 1', 'Terminal Principal'
  provider: TerminalProvider;
  stone_code: string | null;     // Stone: código do ponto de venda
  merchant_id: string | null;    // Cielo/Rede/GetNet: ID do estabelecimento
  terminal_id: string | null;    // ID do terminal físico
  api_key: string | null;        // Chave de API do provider
  sandbox: boolean;              // true = ambiente de teste/homologação
  ativo: boolean;
  tenant_id: string;
  created_at: string;
}

export interface CaixaSessao {
  id: string;
  numero_sessao?: number;
  operador_codigo: string;
  operador_nome: string;
  terminal_config_id: string | null;
  data_abertura: string;
  data_fechamento: string | null;
  valor_abertura: number;
  valor_fechamento: number | null;
  total_dinheiro: number;
  total_credito: number;
  total_debito: number;
  total_pix: number;
  total_voucher: number;
  total_vendas: number;
  qtd_vendas: number;
  status: 'ABERTA' | 'FECHADA';
  filial_id: string | null;
  tenant_id: string;
  created_at: string;
}

export interface TransacaoPDV {
  id: string;
  sessao_caixa_id: string;
  pedido_id: string | null;
  terminal_config_id: string | null;
  forma_pagamento: FormaPagamentoPDV;
  valor: number;
  parcelas: number;
  bandeira: string | null;          // visa, mastercard, elo, hipercard, amex
  nsu: string | null;               // Número Sequencial Único da maquininha
  codigo_autorizacao: string | null;
  status: StatusTransacao;
  motivo_recusa: string | null;
  payload_provider: Record<string, unknown> | null;  // resposta raw do provider
  operador_codigo: string;
  filial_id: string | null;
  modulo_origem: string;            // 'erp', 'hr', 'logistics', etc.
  tenant_id: string;
  created_at: string;
}

// ── Terminal Configs ───────────────────────────────────────────────────────────

export async function getTerminalConfigs(): Promise<TerminalConfig[]> {
  const { data, error } = await supabase
    .from('erp_terminal_configs')
    .select('*')
    .eq('ativo', true)
    .order('nome');
  if (error) throw error;
  return (data ?? []) as TerminalConfig[];
}

export async function createTerminalConfig(
  payload: Omit<TerminalConfig, 'id' | 'tenant_id' | 'created_at'>
): Promise<TerminalConfig> {
  const { data: { user } } = await supabase.auth.getUser();
  const tenant_id = user?.id ?? '00000000-0000-0000-0000-000000000001';
  const { data, error } = await supabase
    .from('erp_terminal_configs')
    .insert({ ...payload, tenant_id })
    .select()
    .single();
  if (error) throw error;
  return data as TerminalConfig;
}

export async function updateTerminalConfig(
  id: string,
  payload: Partial<TerminalConfig>
): Promise<TerminalConfig> {
  const { data, error } = await supabase
    .from('erp_terminal_configs')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as TerminalConfig;
}

// ── Sessão de Caixa ────────────────────────────────────────────────────────────

export async function getSessaoAberta(filial_id?: string): Promise<CaixaSessao | null> {
  let q = supabase
    .from('erp_caixa_sessoes')
    .select('*')
    .eq('status', 'ABERTA');
  if (filial_id) q = q.eq('filial_id', filial_id);
  const { data } = await q.limit(1).maybeSingle();
  return (data ?? null) as CaixaSessao | null;
}

export async function abrirSessao(payload: {
  operador_codigo: string;
  operador_nome: string;
  valor_abertura: number;
  terminal_config_id?: string | null;
  filial_id?: string | null;
}): Promise<CaixaSessao> {
  const { data: { user } } = await supabase.auth.getUser();
  const tenant_id = user?.id ?? '00000000-0000-0000-0000-000000000001';

  const { data, error } = await supabase
    .from('erp_caixa_sessoes')
    .insert({
      operador_codigo: payload.operador_codigo,
      operador_nome:   payload.operador_nome,
      terminal_config_id: payload.terminal_config_id ?? null,
      valor_abertura:  payload.valor_abertura,
      data_abertura:   new Date().toISOString(),
      total_dinheiro:  0,
      total_credito:   0,
      total_debito:    0,
      total_pix:       0,
      total_voucher:   0,
      total_vendas:    0,
      qtd_vendas:      0,
      status:          'ABERTA',
      filial_id:       payload.filial_id ?? null,
      tenant_id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CaixaSessao;
}

export async function fecharSessao(
  id: string,
  valor_fechamento: number
): Promise<CaixaSessao> {
  const { data, error } = await supabase
    .from('erp_caixa_sessoes')
    .update({
      status:          'FECHADA',
      data_fechamento: new Date().toISOString(),
      valor_fechamento,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as CaixaSessao;
}

export async function atualizarTotaisSessao(
  id: string,
  totais: Partial<Pick<CaixaSessao,
    'total_dinheiro' | 'total_credito' | 'total_debito' |
    'total_pix' | 'total_voucher' | 'total_vendas' | 'qtd_vendas'
  >>
): Promise<void> {
  const { error } = await supabase
    .from('erp_caixa_sessoes')
    .update(totais)
    .eq('id', id);
  if (error) throw error;
}

// ── Transações PDV ─────────────────────────────────────────────────────────────

/**
 * Consulta transações do caixa — disponível para todos os módulos.
 * Filtros: sessao_id, filial_id, data_inicio, data_fim, forma, status, modulo_origem
 */
export async function getTransacoes(filters?: {
  sessao_id?:       string;
  filial_id?:       string;
  data_inicio?:     string;
  data_fim?:        string;
  forma_pagamento?: FormaPagamentoPDV;
  status?:          StatusTransacao;
  modulo_origem?:   string;
  limit?:           number;
}): Promise<TransacaoPDV[]> {
  let q = supabase
    .from('erp_caixa_transacoes')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.sessao_id)       q = q.eq('sessao_caixa_id', filters.sessao_id);
  if (filters?.filial_id)       q = q.eq('filial_id', filters.filial_id);
  if (filters?.forma_pagamento) q = q.eq('forma_pagamento', filters.forma_pagamento);
  if (filters?.status)          q = q.eq('status', filters.status);
  if (filters?.modulo_origem)   q = q.eq('modulo_origem', filters.modulo_origem);
  if (filters?.data_inicio)     q = q.gte('created_at', filters.data_inicio);
  if (filters?.data_fim)        q = q.lte('created_at', filters.data_fim);
  if (filters?.limit)           q = q.limit(filters.limit);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TransacaoPDV[];
}

export async function registrarTransacao(
  payload: Omit<TransacaoPDV, 'id' | 'tenant_id' | 'created_at'>
): Promise<TransacaoPDV> {
  const { data: { user } } = await supabase.auth.getUser();
  const tenant_id = user?.id ?? '00000000-0000-0000-0000-000000000001';

  const { data, error } = await supabase
    .from('erp_caixa_transacoes')
    .insert({ ...payload, tenant_id })
    .select()
    .single();

  if (error) throw error;
  return data as TransacaoPDV;
}

// ── TEF — Integração com maquininhas ──────────────────────────────────────────

export interface TefRequest {
  provider:  TerminalProvider;
  forma:     FormaPagamentoPDV;
  valor:     number;
  parcelas?: number;
  config:    TerminalConfig;
}

export interface TefResponse {
  aprovado:           boolean;
  nsu?:               string;
  codigo_autorizacao?: string;
  bandeira?:          string;
  motivo_recusa?:     string;
  payload_raw?:       Record<string, unknown>;
}

/**
 * Processa um pagamento via TEF.
 * Em sandbox: simula aprovação com delay.
 * Em produção: chama o SDK do provider escolhido.
 */
export async function processarTef(req: TefRequest): Promise<TefResponse> {
  // Modo manual — aprovado automaticamente sem terminal
  if (req.provider === 'manual' || req.forma === 'dinheiro' || req.forma === 'pix') {
    return {
      aprovado: true,
      nsu: String(Date.now()).slice(-8),
      payload_raw: { manual: true, forma: req.forma, valor: req.valor },
    };
  }

  if (req.config.sandbox) {
    // Simulação — sempre aprova em ambiente sandbox
    await new Promise(r => setTimeout(r, 1200));
    const bandeiras = ['VISA', 'MASTERCARD', 'ELO', 'HIPERCARD', 'AMEX'];
    return {
      aprovado: true,
      nsu: String(Date.now()).slice(-8),
      codigo_autorizacao: Math.random().toString(36).slice(2, 8).toUpperCase(),
      bandeira: bandeiras[Math.floor(Math.random() * bandeiras.length)],
      payload_raw: { sandbox: true, provider: req.provider, valor: req.valor },
    };
  }

  // Produção — implementar SDK específico de cada provider
  // Substitua cada stub pela importação e chamada do SDK oficial
  switch (req.provider) {
    case 'stone':
      return processarStone(req);
    case 'cielo':
      return processarCielo(req);
    case 'rede':
      return processarRede(req);
    case 'getnet':
      return processarGetNet(req);
    case 'sumup':
      return processarSumUp(req);
    case 'pagseguro':
      return processarPagSeguro(req);
    default:
      return { aprovado: false, motivo_recusa: 'Provider não reconhecido' };
  }
}

// ── Stubs por provider ─────────────────────────────────────────────────────────
// Implemente cada função quando o contrato com o provider for ativado.
// Documentações:
//   Stone:     https://sdks.stone.com.br/
//   Cielo:     https://developercielo.github.io/
//   Rede:      https://developer.userede.com.br/
//   GetNet:    https://developers.getnet.com.br/
//   SumUp:     https://developer.sumup.com/
//   PagSeguro: https://dev.pagbank.uol.com.br/

async function processarStone(_req: TefRequest): Promise<TefResponse> {
  // TODO: instalar @stone-payments/pos-javascript e configurar stone_code
  return { aprovado: false, motivo_recusa: 'Stone: configure stone_code em Configurações > Terminais.' };
}

async function processarCielo(_req: TefRequest): Promise<TefResponse> {
  // TODO: usar API Cielo eCommerce com merchant_id + api_key
  return { aprovado: false, motivo_recusa: 'Cielo: configure merchant_id em Configurações > Terminais.' };
}

async function processarRede(_req: TefRequest): Promise<TefResponse> {
  // TODO: usar API e.Rede com merchant_id + api_key
  return { aprovado: false, motivo_recusa: 'Rede: configure merchant_id em Configurações > Terminais.' };
}

async function processarGetNet(_req: TefRequest): Promise<TefResponse> {
  // TODO: usar API GetNet com merchant_id + api_key
  return { aprovado: false, motivo_recusa: 'GetNet: configure merchant_id em Configurações > Terminais.' };
}

async function processarSumUp(_req: TefRequest): Promise<TefResponse> {
  // TODO: usar SumUp In-Store API com api_key
  return { aprovado: false, motivo_recusa: 'SumUp: configure api_key em Configurações > Terminais.' };
}

async function processarPagSeguro(_req: TefRequest): Promise<TefResponse> {
  // TODO: usar PagBank InStore API com merchant_id + api_key
  return { aprovado: false, motivo_recusa: 'PagSeguro: configure merchant_id em Configurações > Terminais.' };
}

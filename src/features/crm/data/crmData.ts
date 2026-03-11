// ─────────────────────────────────────────────────────────────────────────────
// CRM Data Layer — Supabase backend
// Compartilhado entre Negociações, Agenda e Escuta Inteligente
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from '../../../lib/supabase';

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export type NegociacaoStatus = 'aberta' | 'ganha' | 'perdida' | 'suspensa';
export type NegociacaoEtapa  = 'prospeccao' | 'qualificacao' | 'proposta' | 'negociacao' | 'fechamento';
export type CompromissoTipo  = 'reuniao' | 'ligacao' | 'visita' | 'followup' | 'outro';
export type OrcamentoStatus  = 'rascunho' | 'enviado' | 'aprovado' | 'recusado';

export interface Negociacao {
  id: string;
  clienteId?: string;
  clienteNome: string;
  clienteCnpj?: string;
  clienteEmail?: string;
  clienteTelefone?: string;
  clienteEndereco?: string;
  descricao?: string;
  status: NegociacaoStatus;
  etapa: NegociacaoEtapa;
  valor_estimado?: number;
  probabilidade?: number;
  responsavel: string;
  origem?: string;
  dataCriacao: string;
  dataFechamentoPrev?: string;
  notas?: string;
}

export interface TranscriptLine { ts: number; text: string; }

export interface AnaliseAtendimento {
  perfil: string;
  temperatura: string;
  resumo: string;
  necessidades: string[];
  produtos_mencionados: string[];
  objecoes: string[];
  probabilidade_fechamento: number;
  sentimento: string;
  observacoes: string;
}

export interface Atendimento {
  id: string;
  negociacaoId: string;
  clienteNome: string;
  data: string;
  hora: string;
  duracao: number; // segundos
  transcricao: TranscriptLine[];
  analise?: AnaliseAtendimento;
}

export interface ItemOrcamento {
  id: string;
  produto_id?: string;
  produto_nome: string;
  codigo: string;
  unidade: string;
  quantidade: number;
  preco_unitario: number;
  desconto_pct: number;
  total: number;
}

export interface Orcamento {
  id: string;
  numero?: string;
  status: OrcamentoStatus;
  condicao_pagamento: string;
  desconto_global_pct: number;
  frete: number;
  itens: ItemOrcamento[];
  total: number;
  dataCriacao: string;
  criado_por: 'usuario' | 'ia';
  validade?: string;
  prazo_entrega?: string;
  forma_entrega?: string;
  local_entrega?: string;
  vendedor?: string;
  condicoes_comerciais?: string;
  observacoes?: string;
}

export interface Compromisso {
  id: string;
  negociacaoId?: string;
  clienteNome: string;
  titulo: string;
  data: string;
  hora: string;
  duracao: number; // minutos
  tipo: CompromissoTipo;
  notas: string;
  criado_por: 'usuario' | 'ia';
  concluido: boolean;
}

export interface NegociacaoData {
  negociacao: Negociacao;
  atendimentos: Atendimento[];
  compromissos: Compromisso[];
  orcamento?: Orcamento;
}

// ── Helpers de tenant ──────────────────────────────────────────────────────────

function getTenantId(): string {
  return localStorage.getItem('zia_active_entity_id_v1') ?? '00000000-0000-0000-0000-000000000001';
}

function getTenantIds(): string[] {
  const raw = localStorage.getItem('zia_scope_ids_v1');
  if (raw) {
    try {
      const ids = JSON.parse(raw) as string[];
      if (Array.isArray(ids) && ids.length > 0) return ids;
    } catch { /* ignore */ }
  }
  return [getTenantId()];
}

// ── Row mappers ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToNeg(r: any): Negociacao {
  return {
    id:               r.id,
    clienteId:        r.cliente_id        ?? undefined,
    clienteNome:      r.cliente_nome,
    clienteCnpj:      r.cliente_cnpj      ?? undefined,
    clienteEmail:     r.cliente_email     ?? undefined,
    clienteTelefone:  r.cliente_telefone  ?? undefined,
    clienteEndereco:  r.cliente_endereco  ?? undefined,
    descricao:        r.descricao         ?? undefined,
    status:           r.status,
    etapa:            r.etapa,
    valor_estimado:   r.valor_estimado    != null ? Number(r.valor_estimado) : undefined,
    probabilidade:    r.probabilidade     != null ? Number(r.probabilidade)  : undefined,
    responsavel:      r.responsavel       ?? '',
    origem:           r.origem            ?? undefined,
    dataCriacao:      (r.created_at as string)?.split('T')[0] ?? '',
    dataFechamentoPrev: r.data_fechamento_prev ?? undefined,
    notas:            r.notas             ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAt(r: any): Atendimento {
  return {
    id:           r.id,
    negociacaoId: r.negociacao_id,
    clienteNome:  r.cliente_nome ?? '',
    data:         r.data,
    hora:         r.hora,
    duracao:      Number(r.duracao),
    transcricao:  Array.isArray(r.transcricao) ? r.transcricao : [],
    analise:      r.analise ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToComp(r: any): Compromisso {
  return {
    id:           r.id,
    negociacaoId: r.negociacao_id ?? undefined,
    clienteNome:  r.cliente_nome  ?? '',
    titulo:       r.titulo,
    data:         r.data,
    hora:         r.hora,
    duracao:      Number(r.duracao),
    tipo:         r.tipo,
    notas:        r.notas ?? '',
    criado_por:   r.criado_por,
    concluido:    Boolean(r.concluido),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToOrc(r: any): Orcamento {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itens: ItemOrcamento[] = (r.crm_orcamento_itens ?? []).map((item: any) => ({
    id:             item.id,
    produto_id:     item.produto_id    ?? undefined,
    produto_nome:   item.produto_nome,
    codigo:         item.codigo        ?? '',
    unidade:        item.unidade       ?? 'UN',
    quantidade:     Number(item.quantidade),
    preco_unitario: Number(item.preco_unitario),
    desconto_pct:   Number(item.desconto_pct),
    total:          Number(item.total),
  }));
  return {
    id:                   r.id,
    numero:               r.numero             ?? undefined,
    status:               r.status,
    condicao_pagamento:   r.condicao_pagamento ?? '',
    desconto_global_pct:  Number(r.desconto_global_pct ?? 0),
    frete:                Number(r.frete ?? 0),
    itens,
    total:                Number(r.total ?? 0),
    dataCriacao:          (r.created_at as string)?.split('T')[0] ?? '',
    criado_por:           r.criado_por ?? 'usuario',
    validade:             r.validade           ?? undefined,
    prazo_entrega:        r.prazo_entrega      ?? undefined,
    forma_entrega:        r.forma_entrega      ?? undefined,
    local_entrega:        r.local_entrega      ?? undefined,
    vendedor:             r.vendedor           ?? undefined,
    condicoes_comerciais: r.condicoes_comerciais ?? undefined,
    observacoes:          r.observacoes        ?? undefined,
  };
}

// ── API assíncrona ─────────────────────────────────────────────────────────────

export async function getAllNegociacoes(): Promise<NegociacaoData[]> {
  const tids = getTenantIds();
  const [{ data: negs }, { data: atts }, { data: comps }, { data: orcs }] = await Promise.all([
    supabase.from('crm_negociacoes').select('*').in('tenant_id', tids).order('created_at', { ascending: false }),
    supabase.from('crm_atendimentos').select('*').in('tenant_id', tids).order('created_at', { ascending: true }),
    supabase.from('crm_compromissos').select('*').in('tenant_id', tids).order('data', { ascending: true }),
    supabase.from('crm_orcamentos').select('*, crm_orcamento_itens(*)').in('tenant_id', tids),
  ]);
  if (!negs) return [];
  return negs.map(neg => ({
    negociacao:   rowToNeg(neg),
    atendimentos: (atts  ?? []).filter(a => a.negociacao_id === neg.id).map(rowToAt),
    compromissos: (comps ?? []).filter(c => c.negociacao_id === neg.id).map(rowToComp),
    orcamento:    (orcs  ?? []).find(o => o.negociacao_id === neg.id) ? rowToOrc((orcs ?? []).find(o => o.negociacao_id === neg.id)!) : undefined,
  }));
}

export async function getNegociacao(id: string): Promise<NegociacaoData | undefined> {
  const [{ data: neg }, { data: atts }, { data: comps }, { data: orc }] = await Promise.all([
    supabase.from('crm_negociacoes').select('*').eq('id', id).maybeSingle(),
    supabase.from('crm_atendimentos').select('*').eq('negociacao_id', id).order('created_at', { ascending: true }),
    supabase.from('crm_compromissos').select('*').eq('negociacao_id', id).order('data', { ascending: true }),
    supabase.from('crm_orcamentos').select('*, crm_orcamento_itens(*)').eq('negociacao_id', id).maybeSingle(),
  ]);
  if (!neg) return undefined;
  return {
    negociacao:   rowToNeg(neg),
    atendimentos: (atts ?? []).map(rowToAt),
    compromissos: (comps ?? []).map(rowToComp),
    orcamento:    orc ? rowToOrc(orc) : undefined,
  };
}

export async function createNegociacao(neg: Omit<Negociacao, 'id' | 'dataCriacao'>): Promise<NegociacaoData> {
  const tid = getTenantId();
  const { data, error } = await supabase.from('crm_negociacoes').insert({
    tenant_id:           tid,
    cliente_id:          neg.clienteId          ?? null,
    cliente_nome:        neg.clienteNome,
    cliente_cnpj:        neg.clienteCnpj        ?? null,
    cliente_email:       neg.clienteEmail       ?? null,
    cliente_telefone:    neg.clienteTelefone    ?? null,
    cliente_endereco:    neg.clienteEndereco    ?? null,
    descricao:           neg.descricao          ?? null,
    status:              neg.status,
    etapa:               neg.etapa,
    valor_estimado:      neg.valor_estimado     ?? null,
    probabilidade:       neg.probabilidade      ?? 50,
    responsavel:         neg.responsavel        ?? '',
    origem:              neg.origem             ?? null,
    data_fechamento_prev: neg.dataFechamentoPrev ?? null,
    notas:               neg.notas              ?? null,
  }).select().single();
  if (error) throw error;
  return { negociacao: rowToNeg(data), atendimentos: [], compromissos: [] };
}

export async function updateNegociacao(id: string, updates: Partial<Negociacao>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.clienteNome      !== undefined) patch.cliente_nome           = updates.clienteNome;
  if (updates.clienteId        !== undefined) patch.cliente_id             = updates.clienteId;
  if (updates.clienteCnpj      !== undefined) patch.cliente_cnpj           = updates.clienteCnpj;
  if (updates.clienteEmail     !== undefined) patch.cliente_email          = updates.clienteEmail;
  if (updates.clienteTelefone  !== undefined) patch.cliente_telefone       = updates.clienteTelefone;
  if (updates.clienteEndereco  !== undefined) patch.cliente_endereco       = updates.clienteEndereco;
  if (updates.descricao        !== undefined) patch.descricao              = updates.descricao;
  if (updates.status           !== undefined) patch.status                 = updates.status;
  if (updates.etapa            !== undefined) patch.etapa                  = updates.etapa;
  if (updates.valor_estimado   !== undefined) patch.valor_estimado         = updates.valor_estimado;
  if (updates.probabilidade    !== undefined) patch.probabilidade          = updates.probabilidade;
  if (updates.responsavel      !== undefined) patch.responsavel            = updates.responsavel;
  if (updates.origem           !== undefined) patch.origem                 = updates.origem;
  if (updates.dataFechamentoPrev !== undefined) patch.data_fechamento_prev = updates.dataFechamentoPrev;
  if (updates.notas            !== undefined) patch.notas                  = updates.notas;
  await supabase.from('crm_negociacoes').update(patch).eq('id', id);
}

export async function addAtendimento(
  negId: string,
  at: Omit<Atendimento, 'id' | 'negociacaoId'>,
): Promise<Atendimento> {
  const tid = getTenantId();
  const { data, error } = await supabase.from('crm_atendimentos').insert({
    negociacao_id: negId,
    tenant_id:     tid,
    cliente_nome:  at.clienteNome,
    data:          at.data,
    hora:          at.hora,
    duracao:       at.duracao,
    transcricao:   at.transcricao,
    analise:       at.analise ?? null,
  }).select().single();
  if (error) throw error;
  return rowToAt(data);
}

export async function addCompromisso(
  negId: string | undefined,
  comp: Omit<Compromisso, 'id' | 'negociacaoId'>,
): Promise<Compromisso> {
  const tid = getTenantId();
  const { data, error } = await supabase.from('crm_compromissos').insert({
    negociacao_id: negId ?? null,
    tenant_id:     tid,
    cliente_nome:  comp.clienteNome,
    titulo:        comp.titulo,
    data:          comp.data,
    hora:          comp.hora,
    duracao:       comp.duracao,
    tipo:          comp.tipo,
    notas:         comp.notas,
    criado_por:    comp.criado_por,
    concluido:     comp.concluido,
  }).select().single();
  if (error) throw error;
  return rowToComp(data);
}

export async function setOrcamento(
  negId: string,
  orc: Omit<Orcamento, 'id'>,
): Promise<Orcamento> {
  const tid = getTenantId();

  // Verifica se já existe orçamento para esta negociação
  const { data: existing } = await supabase
    .from('crm_orcamentos')
    .select('id')
    .eq('negociacao_id', negId)
    .maybeSingle();

  let orcId: string;

  const orcPatch = {
    status:               orc.status,
    condicao_pagamento:   orc.condicao_pagamento,
    desconto_global_pct:  orc.desconto_global_pct,
    frete:                orc.frete,
    total:                orc.total,
    validade:             orc.validade             ?? null,
    prazo_entrega:        orc.prazo_entrega        ?? null,
    forma_entrega:        orc.forma_entrega        ?? null,
    local_entrega:        orc.local_entrega        ?? null,
    vendedor:             orc.vendedor             ?? null,
    condicoes_comerciais: orc.condicoes_comerciais ?? null,
    observacoes:          orc.observacoes          ?? null,
    numero:               orc.numero               ?? null,
  };

  if (existing) {
    await supabase.from('crm_orcamentos').update(orcPatch).eq('id', existing.id);
    orcId = existing.id;
  } else {
    const { data: newOrc, error } = await supabase.from('crm_orcamentos').insert({
      negociacao_id: negId,
      tenant_id:     tid,
      criado_por:    orc.criado_por,
      ...orcPatch,
    }).select('id').single();
    if (error) throw error;
    orcId = newOrc.id;
  }

  // Substitui todos os itens
  await supabase.from('crm_orcamento_itens').delete().eq('orcamento_id', orcId);

  if (orc.itens.length > 0) {
    await supabase.from('crm_orcamento_itens').insert(
      orc.itens.map(item => ({
        orcamento_id:   orcId,
        tenant_id:      tid,
        produto_id:     item.produto_id  ?? null,
        produto_nome:   item.produto_nome,
        codigo:         item.codigo,
        unidade:        item.unidade,
        quantidade:     item.quantidade,
        preco_unitario: item.preco_unitario,
        desconto_pct:   item.desconto_pct,
        total:          item.total,
      })),
    );
  }

  return { ...orc, id: orcId };
}

export async function toggleCompromissoConcluido(id: string): Promise<void> {
  const { data } = await supabase
    .from('crm_compromissos')
    .select('concluido')
    .eq('id', id)
    .single();
  if (data) {
    await supabase
      .from('crm_compromissos')
      .update({ concluido: !data.concluido })
      .eq('id', id);
  }
}

export async function getAllCompromissos(): Promise<Compromisso[]> {
  const tids = getTenantIds();
  const { data } = await supabase
    .from('crm_compromissos')
    .select('*')
    .in('tenant_id', tids)
    .order('data', { ascending: true })
    .order('hora', { ascending: true });
  return (data ?? []).map(rowToComp);
}

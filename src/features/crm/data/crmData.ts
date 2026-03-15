// ─────────────────────────────────────────────────────────────────────────────
// CRM Data Layer — Supabase backend
// Compartilhado entre Negociações, Agenda e Escuta Inteligente
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from '../../../lib/supabase';

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export type NegociacaoStatus = 'aberta' | 'ganha' | 'perdida' | 'suspensa';
// Etapas obrigatórias (não podem ser removidas dos funis)
export type NegociacaoEtapaObrigatoria =
  'prospeccao' | 'projeto_em_analise' | 'proposta_enviada' |
  'proposta_aceita' | 'venda_realizada' | 'venda_cancelada';
// Etapas legadas (compatibilidade retroativa com registros antigos no banco)
export type NegociacaoEtapa =
  NegociacaoEtapaObrigatoria |
  'qualificacao' | 'proposta' | 'negociacao' | 'fechamento';

// Constante exportada com as 6 etapas obrigatórias de todo funil
export const ETAPAS_OBRIGATORIAS: ReadonlyArray<{
  tipo: NegociacaoEtapaObrigatoria;
  defaultNome: string;
  cor: string;
  ordem: number;
}> = [
  { tipo: 'prospeccao',          defaultNome: 'Prospecção',        cor: '#64748b', ordem: 0 },
  { tipo: 'projeto_em_analise',  defaultNome: 'Projeto em Análise', cor: '#8b5cf6', ordem: 1 },
  { tipo: 'proposta_enviada',    defaultNome: 'Proposta Enviada',  cor: '#3b82f6', ordem: 2 },
  { tipo: 'proposta_aceita',     defaultNome: 'Proposta Aceita',   cor: '#f59e0b', ordem: 3 },
  { tipo: 'venda_realizada',     defaultNome: 'Venda Realizada',   cor: '#10b981', ordem: 4 },
  { tipo: 'venda_cancelada',     defaultNome: 'Venda Cancelada',   cor: '#ef4444', ordem: 5 },
] as const;

export type CompromissoTipo  = 'reuniao' | 'ligacao' | 'visita' | 'followup' | 'outro';
export type OrcamentoStatus  = 'rascunho' | 'enviado' | 'aprovado' | 'recusado';
export type AnotacaoTipo     = 'anotacao' | 'tarefa';

export interface Anotacao {
  id: string;
  negociacaoId: string;
  tipo: AnotacaoTipo;
  conteudo: string;
  concluida: boolean;
  dataPrazo?: string;  // YYYY-MM-DD
  criadoPor: string;
  criadoEm: string;    // ISO
}

export interface EtapaFunil {
  id: string;
  funilId: string;
  nome: string;
  cor: string;
  ordem: number;
  metaDias?: number;
  /** Vincula esta etapa a um tipo obrigatório — não pode ser excluída se definido */
  tipo?: NegociacaoEtapaObrigatoria;
}

export interface FunilVenda {
  id: string;
  nome: string;
  descricao?: string;
  padrao: boolean;
  ordem: number;
  etapas: EtapaFunil[];
}

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
  anotacoes: Anotacao[];
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
function rowToAnot(r: any): Anotacao {
  return {
    id:           r.id,
    negociacaoId: r.negociacao_id,
    tipo:         r.tipo,
    conteudo:     r.conteudo ?? '',
    concluida:    Boolean(r.concluida),
    dataPrazo:    r.data_prazo ?? undefined,
    criadoPor:    r.criado_por ?? 'usuario',
    criadoEm:     r.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEtapa(r: any): EtapaFunil {
  return {
    id:       r.id,
    funilId:  r.funil_id,
    nome:     r.nome,
    cor:      r.cor ?? '#6366f1',
    ordem:    Number(r.ordem ?? 0),
    metaDias: r.meta_dias != null ? Number(r.meta_dias) : undefined,
    tipo:     r.tipo ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToFunil(r: any): FunilVenda {
  return {
    id:        r.id,
    nome:      r.nome,
    descricao: r.descricao ?? undefined,
    padrao:    Boolean(r.padrao),
    ordem:     Number(r.ordem ?? 0),
    etapas:    (r.crm_funil_etapas ?? []).map(rowToEtapa),
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
  const [{ data: negs }, { data: atts }, { data: comps }, { data: orcs }, { data: anots }] = await Promise.all([
    supabase.from('crm_negociacoes').select('*').in('tenant_id', tids).order('created_at', { ascending: false }),
    supabase.from('crm_atendimentos').select('*').in('tenant_id', tids).order('created_at', { ascending: true }),
    supabase.from('crm_compromissos').select('*').in('tenant_id', tids).order('data', { ascending: true }),
    supabase.from('crm_orcamentos').select('*, crm_orcamento_itens(*)').in('tenant_id', tids),
    supabase.from('crm_anotacoes').select('*').in('tenant_id', tids).order('created_at', { ascending: false }),
  ]);
  if (!negs) return [];
  return negs.map(neg => ({
    negociacao:   rowToNeg(neg),
    atendimentos: (atts  ?? []).filter(a => a.negociacao_id === neg.id).map(rowToAt),
    compromissos: (comps ?? []).filter(c => c.negociacao_id === neg.id).map(rowToComp),
    anotacoes:    (anots ?? []).filter(a => a.negociacao_id === neg.id).map(rowToAnot),
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
    anotacoes:    [],
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
  return { negociacao: rowToNeg(data), atendimentos: [], compromissos: [], anotacoes: [] };
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

// ── Anotações ─────────────────────────────────────────────────────────────────

export async function addAnotacao(
  negId: string,
  a: Omit<Anotacao, 'id' | 'negociacaoId' | 'criadoEm'>,
): Promise<Anotacao> {
  const tid = getTenantId();
  const { data, error } = await supabase.from('crm_anotacoes').insert({
    negociacao_id: negId,
    tenant_id:     tid,
    tipo:          a.tipo,
    conteudo:      a.conteudo,
    concluida:     a.concluida,
    data_prazo:    a.dataPrazo ?? null,
    criado_por:    a.criadoPor,
  }).select().single();
  if (error) throw error;
  return rowToAnot(data);
}

export async function updateAnotacao(id: string, patch: Partial<Pick<Anotacao, 'conteudo' | 'concluida' | 'dataPrazo' | 'tipo'>>): Promise<void> {
  const upd: Record<string, unknown> = {};
  if (patch.conteudo  !== undefined) upd.conteudo   = patch.conteudo;
  if (patch.concluida !== undefined) upd.concluida  = patch.concluida;
  if (patch.dataPrazo !== undefined) upd.data_prazo = patch.dataPrazo ?? null;
  if (patch.tipo      !== undefined) upd.tipo       = patch.tipo;
  await supabase.from('crm_anotacoes').update(upd).eq('id', id);
}

export async function deleteAnotacao(id: string): Promise<void> {
  await supabase.from('crm_anotacoes').delete().eq('id', id);
}

export async function toggleAnotacaoConcluida(id: string): Promise<void> {
  const { data } = await supabase.from('crm_anotacoes').select('concluida').eq('id', id).single();
  if (data) await supabase.from('crm_anotacoes').update({ concluida: !data.concluida }).eq('id', id);
}

// ── Funis de Venda ────────────────────────────────────────────────────────────

export async function getFunis(): Promise<FunilVenda[]> {
  const tids = getTenantIds();
  const { data } = await supabase
    .from('crm_funis_venda')
    .select('*, crm_funil_etapas(*)')
    .in('tenant_id', tids)
    .order('ordem', { ascending: true });
  return (data ?? []).map(rowToFunil);
}

export async function createFunil(nome: string, descricao?: string): Promise<FunilVenda> {
  const tid = getTenantId();
  const { data: existing } = await supabase.from('crm_funis_venda').select('ordem').in('tenant_id', [tid]).order('ordem', { ascending: false }).limit(1).maybeSingle();
  const ordem = existing ? Number(existing.ordem) + 1 : 0;
  const { data, error } = await supabase.from('crm_funis_venda').insert({
    tenant_id: tid, nome, descricao: descricao ?? null, padrao: false, ordem,
  }).select('*, crm_funil_etapas(*)').single();
  if (error) throw error;
  return rowToFunil(data);
}

export async function updateFunil(id: string, patch: Partial<Pick<FunilVenda, 'nome' | 'descricao' | 'padrao' | 'ordem'>>): Promise<void> {
  const upd: Record<string, unknown> = {};
  if (patch.nome      !== undefined) upd.nome      = patch.nome;
  if (patch.descricao !== undefined) upd.descricao = patch.descricao ?? null;
  if (patch.padrao    !== undefined) upd.padrao     = patch.padrao;
  if (patch.ordem     !== undefined) upd.ordem      = patch.ordem;
  await supabase.from('crm_funis_venda').update(upd).eq('id', id);
}

export async function deleteFunil(id: string): Promise<void> {
  await supabase.from('crm_funis_venda').delete().eq('id', id);
}

export async function upsertEtapaFunil(etapa: Omit<EtapaFunil, 'id'> & { id?: string }): Promise<EtapaFunil> {
  const tid = getTenantId();
  const payload = {
    funil_id:  etapa.funilId,
    tenant_id: tid,
    nome:      etapa.nome,
    cor:       etapa.cor,
    ordem:     etapa.ordem,
    meta_dias: etapa.metaDias ?? null,
    tipo:      etapa.tipo ?? null,
  };
  if (etapa.id) {
    const { data, error } = await supabase.from('crm_funil_etapas').update(payload).eq('id', etapa.id).select().single();
    if (error) throw error;
    return rowToEtapa(data);
  }
  const { data, error } = await supabase.from('crm_funil_etapas').insert(payload).select().single();
  if (error) throw error;
  return rowToEtapa(data);
}

export async function deleteEtapa(id: string): Promise<void> {
  await supabase.from('crm_funil_etapas').delete().eq('id', id);
}

// ── CRM Atividades ────────────────────────────────────────────────────────────

export interface CrmAtividade {
  id: string;
  tenant_id: string;
  tipo: 'ligacao' | 'reuniao' | 'email' | 'whatsapp' | 'proposta' | 'followup' | 'outro';
  titulo: string;
  descricao: string | null;
  responsavel_id: string | null;
  cliente_id: string | null;
  negociacao_id: string | null;
  data_prazo: string | null;
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  criado_por: 'manual' | 'ia';
  created_at: string;
}

export async function getCrmAtividades(filters?: {
  negociacao_id?: string;
  cliente_id?: string;
  responsavel_id?: string;
}): Promise<CrmAtividade[]> {
  const tids = getTenantIds();
  let q = supabase
    .from('crm_atividades')
    .select('*')
    .in('tenant_id', tids)
    .order('data_prazo', { ascending: true, nullsFirst: false });
  if (filters?.negociacao_id) q = q.eq('negociacao_id', filters.negociacao_id);
  if (filters?.cliente_id) q = q.eq('cliente_id', filters.cliente_id);
  if (filters?.responsavel_id) q = q.eq('responsavel_id', filters.responsavel_id);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as CrmAtividade[];
}

export async function createCrmAtividade(
  payload: Omit<CrmAtividade, 'id' | 'tenant_id' | 'created_at'>
): Promise<CrmAtividade> {
  const tenant_id = getTenantId();
  const { data, error } = await supabase
    .from('crm_atividades')
    .insert({ ...payload, tenant_id })
    .select()
    .single();
  if (error) throw error;
  return data as CrmAtividade;
}

export async function updateCrmAtividade(
  id: string,
  payload: Partial<CrmAtividade>
): Promise<CrmAtividade> {
  const { data, error } = await supabase
    .from('crm_atividades')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as CrmAtividade;
}

export async function deleteCrmAtividade(id: string): Promise<void> {
  const { error } = await supabase.from('crm_atividades').delete().eq('id', id);
  if (error) throw error;
}

// ── WhatsApp helper ───────────────────────────────────────────────────────────

export function getWhatsAppUrl(telefone: string, mensagem = ''): string {
  const digits = telefone.replace(/\D/g, '');
  const number = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${number}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''}`;
}

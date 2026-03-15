// ─────────────────────────────────────────────────────────────────────────────
// orcamentoData.ts — Funções de acesso ao Supabase para o módulo de Orçamentos
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';
import type { OrcConfig, Apresentacao, PaginaCanvas, LayoutTemplate } from './types';
import { ORC_CONFIG_PADRAO } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function getTenantId(): string {
  return "";
}

// ── Orçamento Config global ───────────────────────────────────────────────────
export async function getOrcConfig(): Promise<OrcConfig> {
  const { data, error } = await supabase
    .from('crm_orcamento_config')
    .select('*')
    .maybeSingle();
  if (error || !data) return ORC_CONFIG_PADRAO;
  const rawTemplates = (data.templates ?? []) as LayoutTemplate[];
  return {
    id: data.id,
    logo_url: data.logo_url ?? '',
    logo_storage_path: data.logo_storage_path ?? undefined,
    cor_primaria: data.cor_primaria ?? '#7c3aed',
    cor_secundaria: data.cor_secundaria ?? '#f3f4f6',
    cor_texto: data.cor_texto ?? '#111827',
    fonte_padrao: data.fonte_padrao ?? 'Inter',
    texto_validade: data.texto_validade ?? ORC_CONFIG_PADRAO.texto_validade,
    texto_condicoes: data.texto_condicoes ?? '',
    texto_rodape: data.texto_rodape ?? '',
    assinatura_url: data.assinatura_url ?? undefined,
    mostrar_codigo_produto: data.mostrar_codigo_produto ?? true,
    mostrar_ncm: data.mostrar_ncm ?? false,
    mostrar_estoque: data.mostrar_estoque ?? false,
    mostrar_desconto_por_item: data.mostrar_desconto_por_item ?? true,
    mostrar_imagens_produto: data.mostrar_imagens_produto ?? true,
    max_imagens_por_produto: data.max_imagens_por_produto ?? 3,
    prefixo_numero: data.prefixo_numero ?? 'ORC',
    proximo_numero: data.proximo_numero ?? 1,
    empresa: data.empresa ?? 'Minha Empresa',
    template_paginas: data.template_paginas ?? [],
    templates: rawTemplates,
  };
}

export async function salvarOrcConfig(config: OrcConfig): Promise<void> {
  const patch = {
    logo_url: config.logo_url,
    cor_primaria: config.cor_primaria,
    cor_secundaria: config.cor_secundaria,
    cor_texto: config.cor_texto,
    fonte_padrao: config.fonte_padrao,
    texto_validade: config.texto_validade,
    texto_condicoes: config.texto_condicoes,
    texto_rodape: config.texto_rodape,
    mostrar_codigo_produto: config.mostrar_codigo_produto,
    mostrar_ncm: config.mostrar_ncm,
    mostrar_estoque: config.mostrar_estoque,
    mostrar_desconto_por_item: config.mostrar_desconto_por_item,
    mostrar_imagens_produto: config.mostrar_imagens_produto,
    max_imagens_por_produto: config.max_imagens_por_produto,
    prefixo_numero: config.prefixo_numero,
    proximo_numero: config.proximo_numero,
    empresa: config.empresa,
    templates: config.templates ?? [],
    updated_at: new Date().toISOString(),
  };
  if (config.id) {
    await supabase.from('crm_orcamento_config').update(patch).eq('id', config.id);
  } else {
    await supabase.from('crm_orcamento_config').insert(patch);
  }
}

// ── Apresentação ──────────────────────────────────────────────────────────────
export async function getApresentacao(orcamentoId: string): Promise<Apresentacao | null> {
  const { data } = await supabase
    .from('crm_orcamento_apresentacoes')
    .select('*')
    .eq('orcamento_id', orcamentoId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    orcamento_id: data.orcamento_id,
    nome: data.nome ?? 'Apresentação',
    orientacao: data.orientacao ?? 'portrait',
    tamanho_pagina: data.tamanho_pagina ?? 'A4',
    formato: (data.formato ?? 'A4') as import('./types').PageFormato,
    paginas: (data.paginas as PaginaCanvas[]) ?? [],
    thumbnail_url: data.thumbnail_url ?? undefined,
  };
}

export async function salvarApresentacao(
  orcamentoId: string,
  apres: Omit<Apresentacao, 'id' | 'orcamento_id'>,
  thumbnailUrl?: string,
): Promise<Apresentacao> {
  const patch = {
    orcamento_id: orcamentoId,
    nome: apres.nome,
    orientacao: apres.orientacao,
    tamanho_pagina: apres.tamanho_pagina,
    paginas: apres.paginas,
    thumbnail_url: thumbnailUrl ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data: existing } = await supabase
    .from('crm_orcamento_apresentacoes')
    .select('id')
    .eq('orcamento_id', orcamentoId)
    .maybeSingle();
  if (existing) {
    const { data, error } = await supabase
      .from('crm_orcamento_apresentacoes')
      .update(patch)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return { ...apres, id: data.id, orcamento_id: orcamentoId };
  } else {
    const { data, error } = await supabase
      .from('crm_orcamento_apresentacoes')
      .insert(patch)
      .select()
      .single();
    if (error) throw error;
    return { ...apres, id: data.id, orcamento_id: orcamentoId };
  }
}

// ── Upload de imagem de produto ───────────────────────────────────────────────
export async function uploadImagemProduto(
  produtoId: string,
  file: File,
  isPrincipal = false,
  ordem = 0,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${produtoId}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('produto-imagens')
    .upload(path, file, { upsert: false });
  if (upErr) throw upErr;
  const { data: { publicUrl } } = supabase.storage
    .from('produto-imagens')
    .getPublicUrl(path);
  await supabase.from('erp_produto_imagens').insert({
    produto_id: produtoId,
    url: publicUrl,
    storage_path: path,
    is_principal: isPrincipal,
    ordem,
  });
  return publicUrl;
}

export async function getImagensProduto(produtoId: string): Promise<Array<{ url: string; ordem: number; is_principal: boolean }>> {
  // Try new table first
  const { data: novo } = await supabase
    .from('erp_produto_imagens')
    .select('url, ordem, is_principal')
    .eq('produto_id', produtoId)
    .order('ordem');
  if (novo && novo.length > 0) return novo;
  // Fallback to erp_produto_fotos (existing table)
  const { data: old } = await supabase
    .from('erp_produto_fotos')
    .select('url, ordem, is_cover')
    .eq('produto_id', produtoId)
    .order('ordem');
  return (old ?? []).map(f => ({ url: f.url, ordem: f.ordem, is_principal: f.is_cover }));
}

// ── Upload imagem para uso no canvas ──────────────────────────────────────────
export async function uploadImagemCanvas(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `canvas/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from('orcamento-assets')
    .upload(path, file, { upsert: false });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage
    .from('orcamento-assets')
    .getPublicUrl(path);
  return publicUrl;
}

// ── Upload logo config ────────────────────────────────────────────────────────
export async function uploadLogoConfig(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'png';
  const path = `logos/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('orcamento-assets')
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage
    .from('orcamento-assets')
    .getPublicUrl(path);
  return publicUrl;
}

// Keep getTenantId available if needed
export { getTenantId };

// ─────────────────────────────────────────────────────────────────────────────
// useCompromissos — CRUD completo de compromissos no Supabase
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import type {
  CompromissoFull, CompromissoParticipante, CompromissoArquivo,
  ZiaProfile,
} from '../../types/compromisso';

function getTenantId(): string {
  return localStorage.getItem('zia_active_entity_id_v1') ?? '00000000-0000-0000-0000-000000000001';
}

export interface CompromissoFiltros {
  cliente_id?: string;
  negociacao_id?: string;
  orcamento_id?: string;
  profissional_id?: string;
  produto_id?: string;
  status?: string;
  data_inicio?: string;
  data_fim?: string;
}

export function useCompromissos() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);

  const tenantId = getTenantId();

  // ── Buscar ────────────────────────────────────────────────────────────────
  const fetchCompromissos = useCallback(async (filtros?: CompromissoFiltros): Promise<CompromissoFull[]> => {
    setLoading(true);
    try {
      let query = supabase
        .from('crm_compromissos')
        .select(`
          *,
          participantes:crm_compromisso_participantes(*),
          arquivos:crm_compromisso_arquivos(*)
        `)
        .eq('tenant_id', tenantId)
        .order('data', { ascending: true })
        .order('hora', { ascending: true });

      if (filtros?.cliente_id)      query = query.eq('cliente_id', filtros.cliente_id);
      if (filtros?.negociacao_id)   query = query.eq('negociacao_id', filtros.negociacao_id);
      if (filtros?.orcamento_id)    query = query.eq('orcamento_id', filtros.orcamento_id);
      if (filtros?.profissional_id) query = query.eq('profissional_id', filtros.profissional_id);
      if (filtros?.produto_id)      query = query.eq('produto_id', filtros.produto_id);
      if (filtros?.status)          query = query.eq('status', filtros.status);
      if (filtros?.data_inicio)     query = query.gte('data', filtros.data_inicio);
      if (filtros?.data_fim)        query = query.lte('data', filtros.data_fim);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as CompromissoFull[];
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // ── Criar ─────────────────────────────────────────────────────────────────
  const createCompromisso = useCallback(async (
    payload: Omit<CompromissoFull, 'id' | 'tenant_id' | 'created_at' | 'participantes' | 'arquivos'>,
    participantes?: { profissional_id: string; profissional_nome: string; profissional_email?: string }[],
  ): Promise<CompromissoFull> => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('crm_compromissos')
        .insert({ ...payload, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;

      if (participantes?.length) {
        await supabase.from('crm_compromisso_participantes').insert(
          participantes.map(p => ({
            compromisso_id: data.id,
            tenant_id: tenantId,
            profissional_id: p.profissional_id,
            profissional_nome: p.profissional_nome,
            profissional_email: p.profissional_email ?? null,
            confirmado: false,
          })),
        );
      }
      return data as CompromissoFull;
    } finally {
      setSaving(false);
    }
  }, [tenantId]);

  // ── Atualizar ─────────────────────────────────────────────────────────────
  const updateCompromisso = useCallback(async (
    id: string,
    payload: Partial<CompromissoFull>,
  ): Promise<void> => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('crm_compromissos')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
    } finally {
      setSaving(false);
    }
  }, [tenantId]);

  // ── Deletar ───────────────────────────────────────────────────────────────
  const deleteCompromisso = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('crm_compromissos')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (error) throw error;
  }, [tenantId]);

  // ── Participantes ─────────────────────────────────────────────────────────
  const addParticipante = useCallback(async (
    compromisso_id: string,
    p: { profissional_id: string; profissional_nome: string; profissional_email?: string },
  ): Promise<CompromissoParticipante> => {
    const { data, error } = await supabase
      .from('crm_compromisso_participantes')
      .insert({ compromisso_id, tenant_id: tenantId, ...p, confirmado: false })
      .select()
      .single();
    if (error) throw error;
    return data as CompromissoParticipante;
  }, [tenantId]);

  const removeParticipante = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase.from('crm_compromisso_participantes').delete().eq('id', id);
    if (error) throw error;
  }, []);

  const toggleConfirmado = useCallback(async (id: string, confirmado: boolean): Promise<void> => {
    const { error } = await supabase
      .from('crm_compromisso_participantes')
      .update({ confirmado })
      .eq('id', id);
    if (error) throw error;
  }, []);

  // ── Arquivos ──────────────────────────────────────────────────────────────
  const uploadArquivo = useCallback(async (
    compromisso_id: string,
    file: File,
    criado_por = 'usuario',
  ): Promise<CompromissoArquivo> => {
    const ext  = file.name.split('.').pop() ?? 'bin';
    const path = `compromissos/${compromisso_id}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage.from('ia-arquivos').upload(path, file);
    if (upErr) throw upErr;

    const { data, error } = await supabase
      .from('crm_compromisso_arquivos')
      .insert({
        compromisso_id,
        tenant_id: tenantId,
        nome_original: file.name,
        storage_path: path,
        mime_type: file.type,
        tamanho_bytes: file.size,
        criado_por,
      })
      .select()
      .single();
    if (error) throw error;
    return data as CompromissoArquivo;
  }, [tenantId]);

  const removeArquivo = useCallback(async (id: string, storage_path: string): Promise<void> => {
    await supabase.storage.from('ia-arquivos').remove([storage_path]);
    const { error } = await supabase.from('crm_compromisso_arquivos').delete().eq('id', id);
    if (error) throw error;
  }, []);

  const getArquivoUrl = useCallback((storage_path: string): string => {
    const { data } = supabase.storage.from('ia-arquivos').getPublicUrl(storage_path);
    return data.publicUrl;
  }, []);

  // ── Profiles (participantes disponíveis) ──────────────────────────────────
  const fetchProfiles = useCallback(async (): Promise<ZiaProfile[]> => {
    const { data } = await supabase
      .from('zia_operator_profiles')
      .select('id, code, name, level, entity_name, active')
      .eq('active', true)
      .order('name');
    return (data ?? []) as ZiaProfile[];
  }, []);

  return {
    loading, saving,
    fetchCompromissos,
    createCompromisso,
    updateCompromisso,
    deleteCompromisso,
    addParticipante,
    removeParticipante,
    toggleConfirmado,
    uploadArquivo,
    removeArquivo,
    getArquivoUrl,
    fetchProfiles,
  };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

export interface CRMContextoItem {
  id: string;
  modulo: 'ia_crm' | 'escuta' | 'leads';
  negociacao_id: string | null;
  titulo: string;
  resumo: string;
  dados: Record<string, unknown>;
  created_at: string;
}

const MODULO_LABEL: Record<CRMContextoItem['modulo'], string> = {
  ia_crm: 'IA CRM',
  escuta: 'Escuta Inteligente',
  leads: 'Inteligência de Leads',
};

export function useCRMContexto(tenantId: string | undefined) {
  const [contexto, setContexto] = useState<CRMContextoItem[]>([]);

  const carregar = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from('ia_crm_contexto')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20);
    setContexto((data ?? []) as CRMContextoItem[]);
  }, [tenantId]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = useCallback(async (
    modulo: CRMContextoItem['modulo'],
    titulo: string,
    resumo: string,
    dados: Record<string, unknown> = {},
    negociacaoId?: string,
  ) => {
    if (!tenantId) return;
    const { data } = await supabase
      .from('ia_crm_contexto')
      .insert({
        tenant_id: tenantId,
        modulo,
        titulo,
        resumo: resumo.slice(0, 500),
        dados,
        negociacao_id: negociacaoId ?? null,
      })
      .select()
      .single();
    if (data) setContexto(prev => [data as CRMContextoItem, ...prev.slice(0, 19)]);
  }, [tenantId]);

  // Retorna bloco de texto pronto para injetar no prompt de qualquer módulo
  const paraPrompt = useCallback((): string => {
    if (contexto.length === 0) return '';
    const linhas = contexto.slice(0, 10).map(c => {
      const data = new Date(c.created_at).toLocaleDateString('pt-BR');
      return `[${MODULO_LABEL[c.modulo]} — ${data}] ${c.titulo}: ${c.resumo}`;
    });
    return `\n\nCONTEXTO RECENTE DAS FERRAMENTAS DE IA DO CRM (use como referência, não repita literalmente):\n${linhas.join('\n')}`;
  }, [contexto]);

  return { contexto, salvar, paraPrompt, carregar };
}

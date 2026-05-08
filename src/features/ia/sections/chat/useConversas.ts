import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../../lib/supabase'
import type { Conversa } from './types'

export function useConversas(tenantId: string) {
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchConversas = useCallback(async () => {
    if (!tenantId) { setIsLoading(false); return; }
    setIsLoading(true)
    const { data } = await supabase
      .from('ia_conversas')
      .select('*, agente:ia_agentes(id,nome,avatar_emoji,cor)')
      .eq('tenant_id', tenantId)
      .eq('ativa', true)
      .order('updated_at', { ascending: false })
      .limit(50)
    setConversas((data as Conversa[]) ?? [])
    setIsLoading(false)
  }, [tenantId])

  useEffect(() => {
    fetchConversas()
  }, [fetchConversas])

  const criarConversa = useCallback(async (agente_id: string): Promise<string> => {
    const { data, error } = await supabase
      .from('ia_conversas')
      .insert({ tenant_id: tenantId, usuario_id: 'usuario', agente_id, titulo: 'Nova conversa', canal: 'chat' })
      .select()
      .single()
    if (error) throw new Error(error.message)
    await fetchConversas()
    return data.id
  }, [tenantId, fetchConversas])

  const deletarConversa = useCallback(async (id: string) => {
    await supabase
      .from('ia_conversas')
      .update({ ativa: false })
      .eq('id', id)
      .eq('tenant_id', tenantId)
    setConversas(prev => prev.filter(c => c.id !== id))
  }, [tenantId])

  const atualizarTitulo = useCallback(async (id: string, titulo: string) => {
    await supabase
      .from('ia_conversas')
      .update({ titulo })
      .eq('id', id)
      .eq('tenant_id', tenantId)
    setConversas(prev => prev.map(c => c.id === id ? { ...c, titulo } : c))
  }, [tenantId])

  return { conversas, isLoading, criarConversa, deletarConversa, atualizarTitulo, refetch: fetchConversas }
}

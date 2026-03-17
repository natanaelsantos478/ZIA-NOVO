import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Conversa } from '../types'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

export function useConversas() {
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchConversas = useCallback(async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from('ia_conversas')
      .select('*, agente:ia_agentes(id,nome,avatar_emoji,cor)')
      .eq('tenant_id', TENANT_ID)
      .eq('ativa', true)
      .order('updated_at', { ascending: false })
      .limit(50)
    setConversas((data as Conversa[]) ?? [])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchConversas()
  }, [fetchConversas])

  const criarConversa = useCallback(async (agente_id: string): Promise<string> => {
    const { data, error } = await supabase
      .from('ia_conversas')
      .insert({ tenant_id: TENANT_ID, usuario_id: 'usuario', agente_id, titulo: 'Nova conversa', canal: 'chat' })
      .select()
      .single()
    if (error) throw new Error(error.message)
    await fetchConversas()
    return data.id
  }, [fetchConversas])

  const deletarConversa = useCallback(async (id: string) => {
    await supabase
      .from('ia_conversas')
      .update({ ativa: false })
      .eq('id', id)
      .eq('tenant_id', TENANT_ID)
    setConversas(prev => prev.filter(c => c.id !== id))
  }, [])

  const atualizarTitulo = useCallback(async (id: string, titulo: string) => {
    await supabase
      .from('ia_conversas')
      .update({ titulo })
      .eq('id', id)
      .eq('tenant_id', TENANT_ID)
    setConversas(prev => prev.map(c => c.id === id ? { ...c, titulo } : c))
  }, [])

  return { conversas, isLoading, criarConversa, deletarConversa, atualizarTitulo, refetch: fetchConversas }
}

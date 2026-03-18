import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Mensagem, SSEEvent, ArquivoVisual } from '../types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://tgeomsnxfcqwrxijjvek.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const TENANT_ID = '00000000-0000-0000-0000-000000000001'

interface UseChatProps {
  conversaId: string | null
  agenteId: string
  tenantId?: string
  usuarioId?: string
}

export function useChat({ conversaId, agenteId, tenantId = TENANT_ID, usuarioId = 'usuario' }: UseChatProps) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [toolAtivo, setToolAtivo] = useState<string | null>(null)
  const [conversaIdAtual, setConversaIdAtual] = useState<string | null>(conversaId)

  const carregarHistorico = useCallback(async (convId: string) => {
    setIsLoading(true)
    const { data } = await supabase
      .from('ia_mensagens')
      .select('*')
      .eq('conversa_id', convId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .limit(50)

    setMensagens((data as Mensagem[]) ?? [])
    setConversaIdAtual(convId)
    setIsLoading(false)
  }, [tenantId])

  const enviarMensagem = useCallback(async (texto: string, arquivo_ids: string[] = [], arquivos_visuais: ArquivoVisual[] = []) => {
    const tmpUserId = `tmp_${Date.now()}`
    const tmpAiId = 'tmp_ai'
    const now = new Date().toISOString()

    // Adicionar mensagem otimista do usuário
    setMensagens(prev => [...prev, {
      id: tmpUserId,
      conversa_id: conversaIdAtual ?? '',
      role: 'user',
      conteudo: texto,
      agente_id: null,
      ferramentas_usadas: [],
      tokens_usados: null,
      created_at: now,
      arquivos_visuais: arquivos_visuais.length > 0 ? arquivos_visuais : undefined,
    }])

    // Placeholder da IA
    setMensagens(prev => [...prev, {
      id: tmpAiId,
      conversa_id: conversaIdAtual ?? '',
      role: 'assistant',
      conteudo: '',
      agente_id: agenteId,
      ferramentas_usadas: [],
      tokens_usados: null,
      created_at: now,
      isStreaming: true,
    }])
    setIsStreaming(true)

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ia-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          mensagem: texto,
          conversa_id: conversaIdAtual,
          agente_id: agenteId,
          tenant_id: tenantId,
          usuario_id: usuarioId,
          arquivo_ids,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error ?? `HTTP ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let textoAcumulado = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const linhas = buffer.split('\n')
        buffer = linhas.pop() ?? ''

        for (const linha of linhas) {
          if (!linha.startsWith('data: ')) continue
          const rawJson = linha.slice(6).trim()
          if (!rawJson) continue

          let evento: SSEEvent
          try {
            evento = JSON.parse(rawJson)
          } catch {
            continue
          }

          switch (evento.type) {
            case 'conversa_id':
              setConversaIdAtual(evento.id!)
              setMensagens(prev => prev.map(m =>
                m.id === tmpUserId ? { ...m, conversa_id: evento.id! } :
                m.id === tmpAiId ? { ...m, conversa_id: evento.id! } : m
              ))
              break
            case 'tool_start':
              setToolAtivo(evento.tool!)
              break
            case 'tool_end':
              setToolAtivo(null)
              break
            case 'text':
              textoAcumulado += evento.delta ?? ''
              setMensagens(prev => prev.map(m =>
                m.id === tmpAiId ? { ...m, conteudo: textoAcumulado } : m
              ))
              break
            case 'done':
              setMensagens(prev => prev.map(m =>
                m.id === tmpAiId
                  ? { ...m, id: evento.mensagem_id!, isStreaming: false, tokens_usados: evento.tokens ?? null }
                  : m
              ))
              setIsStreaming(false)
              break
            case 'error':
              setMensagens(prev => prev.map(m =>
                m.id === tmpAiId
                  ? { ...m, conteudo: `❌ Erro: ${evento.message}`, isStreaming: false }
                  : m
              ))
              setIsStreaming(false)
              break
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setMensagens(prev => prev.map(m =>
        m.id === tmpAiId
          ? { ...m, conteudo: `❌ Erro: ${msg}`, isStreaming: false }
          : m
      ))
      setIsStreaming(false)
    }
  }, [conversaIdAtual, agenteId, tenantId, usuarioId])

  const pararGeracao = useCallback(() => {
    setIsStreaming(false)
    setToolAtivo(null)
    setMensagens(prev => prev.map(m =>
      m.isStreaming ? { ...m, isStreaming: false, conteudo: m.conteudo + '\n\n*[geração interrompida]*' } : m
    ))
  }, [])

  const limparMensagens = useCallback(() => {
    setMensagens([])
    setConversaIdAtual(null)
  }, [])

  return {
    mensagens,
    isLoading,
    isStreaming,
    toolAtivo,
    conversaIdAtual,
    enviarMensagem,
    pararGeracao,
    carregarHistorico,
    limparMensagens,
  }
}

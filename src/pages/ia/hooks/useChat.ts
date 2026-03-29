// ─────────────────────────────────────────────────────────────────────────────
// useChat — chama Gemini via ai-proxy (chave nunca exposta no bundle)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react'
import type { Mensagem, ArquivoVisual } from '../types'
import { supabase } from '../../../lib/supabase'

const SYSTEM_DEFAULT = `Você é ZIA, assistente inteligente do ZIA Omnisystem — plataforma modular de gestão empresarial (ERP, CRM, RH, Logística, Qualidade, Ativos e Docs) para PMEs brasileiras.
Responda sempre em português brasileiro, de forma direta, clara e objetiva. Evite respostas longas e genéricas.
Quando precisar de informações atuais, use a ferramenta de pesquisa na internet. Nunca invente notícias ou dados — se não tiver certeza, pesquise ou informe que não sabe.`


interface UseChatProps {
  conversaId: string | null
  agenteId: string
  tenantId?: string
  usuarioId?: string
  googleAccessToken?: string | null
  sistemaPrompt?: string
}

export function useChat({ conversaId, agenteId, sistemaPrompt }: UseChatProps) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [toolAtivo] = useState<string | null>(null)
  const [conversaIdAtual, setConversaIdAtual] = useState<string | null>(conversaId)

  // Histórico em memória — sem backend por enquanto
  const carregarHistorico = useCallback(async (convId: string) => {
    setIsLoading(true)
    setConversaIdAtual(convId)
    setMensagens([])
    setIsLoading(false)
  }, [])

  const enviarMensagem = useCallback(async (texto: string, _arquivo_ids: string[] = [], arquivos_visuais: ArquivoVisual[] = []) => {
    if (!texto.trim()) return

    const tmpUserId = `tmp_${Date.now()}`
    const tmpAiId   = `tmp_ai_${Date.now()}`
    const now       = new Date().toISOString()

    // Mensagem otimista do usuário
    setMensagens(prev => [...prev, {
      id: tmpUserId,
      conversa_id: conversaIdAtual ?? 'local',
      role: 'user',
      conteudo: texto,
      agente_id: null,
      ferramentas_usadas: [],
      tokens_usados: null,
      created_at: now,
      arquivos_visuais: arquivos_visuais.length > 0 ? arquivos_visuais : undefined,
    }])

    // Placeholder da IA com "digitando..."
    setMensagens(prev => [...prev, {
      id: tmpAiId,
      conversa_id: conversaIdAtual ?? 'local',
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
      // Monta histórico da conversa atual (exclui o placeholder da IA)
      const history = mensagens
        .filter(m => (m.role === 'user' || m.role === 'assistant') && !m.isStreaming && m.conteudo)
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.conteudo }],
        }))

      // Adiciona a mensagem atual
      history.push({ role: 'user', parts: [{ text: texto }] })

      // Escolhe Pro para histórico longo, Flash para conversas novas
      const usePro = history.length > 3

      const { data, error: proxyErr } = await supabase.functions.invoke('ai-proxy', {
        body: {
          type: 'gemini-chat',
          system: sistemaPrompt || SYSTEM_DEFAULT,
          contents: history,
          usePro,
          tools: [{ google_search: {} }],
        },
      })

      if (proxyErr) throw new Error(proxyErr.message ?? 'Erro no ai-proxy')

      if (!data.candidates?.length) {
        const msg = data.error?.message
        throw new Error(msg ?? 'Gemini não retornou resposta')
      }

      const resposta = data.candidates[0]?.content?.parts?.[0]?.text ?? '*(sem resposta)*'
      const tokens   = (data as Record<string, unknown> & { usageMetadata?: { totalTokenCount?: number } })
        .usageMetadata?.totalTokenCount ?? null

      setMensagens(prev => prev.map(m =>
        m.id === tmpAiId
          ? { ...m, id: `ai_${Date.now()}`, conteudo: resposta, isStreaming: false, tokens_usados: tokens }
          : m
      ))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setMensagens(prev => prev.map(m =>
        m.id === tmpAiId
          ? { ...m, conteudo: `❌ ${msg}`, isStreaming: false }
          : m
      ))
    } finally {
      setIsStreaming(false)
    }
  }, [conversaIdAtual, agenteId, mensagens, sistemaPrompt])

  const pararGeracao = useCallback(() => {
    setIsStreaming(false)
    setMensagens(prev => prev.map(m =>
      m.isStreaming ? { ...m, isStreaming: false, conteudo: m.conteudo + '\n\n*[interrompido]*' } : m
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

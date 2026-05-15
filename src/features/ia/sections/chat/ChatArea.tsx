import { useRef, useEffect, useState, useCallback } from 'react'
import { Send, Paperclip, StopCircle, Cpu } from 'lucide-react'
import { useChat } from './useChat'
import { useFileUpload } from './useFileUpload'
import { useGoogleAuth } from '../../../../hooks/useGoogleAuth'
import { useAIConfig } from '../../../../context/AIConfigContext'
import MessageBubble from './MessageBubble'
import ToolCallIndicator from './ToolCallIndicator'
import FileUploadZone from './FileUploadZone'
import WelcomeScreen from './WelcomeScreen'
import AgenteSelector from './AgenteSelector'
import GoogleConnectButton from '../../../../components/GoogleConnectButton'
import type { Agente } from './types'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

interface ChatAreaProps {
  conversaId: string | null
  agente: Agente
  agentes: Agente[]
  onAgenteChange: (agente: Agente) => void
  tenantId?: string
  usuarioId?: string
  onNovaConversa: (id: string) => void
}

export default function ChatArea({
  conversaId,
  agente,
  agentes,
  onAgenteChange,
  tenantId = TENANT_ID,
  usuarioId = 'usuario',
  onNovaConversa,
}: ChatAreaProps) {
  const [texto, setTexto] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { isConnected, email, isConnecting, error: googleError, connect, disconnect, accessToken: googleToken } = useGoogleAuth()
  const { systemContext } = useAIConfig()

  // Mescla o contexto da empresa com o system prompt do agente
  const mergedSystemPrompt = [systemContext, agente.funcao].filter(Boolean).join('\n\n') || undefined

  const {
    mensagens, isStreaming, toolAtivo, conversaIdAtual,
    enviarMensagem, pararGeracao, carregarHistorico, limparMensagens,
  } = useChat({ conversaId, agenteId: agente.id, tenantId, usuarioId, googleAccessToken: googleToken, sistemaPrompt: mergedSystemPrompt })

  const { arquivosPendentes, adicionarArquivos, removerArquivo, uploadTodos, limparSemRevogar: limparArquivos } = useFileUpload()

  // Carregar histórico quando a conversa mudar — nunca durante streaming
  // (criar nova conversa dispara conversaId change, mas o stream ainda está ativo)
  useEffect(() => {
    if (isStreaming) return
    if (conversaId) {
      carregarHistorico(conversaId)
    } else {
      limparMensagens()
    }
  }, [conversaId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, toolAtivo])

  // Notificar nova conversa criada
  useEffect(() => {
    if (conversaIdAtual && conversaIdAtual !== conversaId) {
      onNovaConversa(conversaIdAtual)
    }
  }, [conversaIdAtual]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-resize textarea
  const handleTextoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTexto(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 150) + 'px'
  }

  const handleEnviar = useCallback(async () => {
    const msg = texto.trim()
    if ((!msg && arquivosPendentes.length === 0) || isStreaming) return

    setTexto('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    let arquivo_ids: string[] = []
    let arquivos_visuais: { nome: string; preview?: string; mime_type: string }[] = []
    if (arquivosPendentes.length > 0) {
      const convId = conversaIdAtual ?? ''
      // Captura previews ANTES de limpar (os objectURLs ainda são válidos aqui)
      arquivos_visuais = arquivosPendentes.map(a => ({
        nome: a.file.name,
        preview: a.preview,
        mime_type: a.file.type,
      }))
      arquivo_ids = await uploadTodos(convId, tenantId)
      limparArquivos() // limparSemRevogar — preserva os objectURLs usados nas mensagens
    }

    await enviarMensagem(msg, arquivo_ids, arquivos_visuais)
  }, [texto, arquivosPendentes, isStreaming, conversaIdAtual, tenantId, uploadTodos, limparArquivos, enviarMensagem])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) adicionarArquivos(files)
    e.target.value = ''
  }

  const canSend = (texto.trim().length > 0 || arquivosPendentes.length > 0) && !isStreaming

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0 gap-3 bg-white">
        <AgenteSelector agentes={agentes} agenteAtivo={agente} onChange={onAgenteChange} />
        {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
          <GoogleConnectButton
            isConnected={isConnected}
            email={email}
            isConnecting={isConnecting}
            error={googleError}
            onConnect={connect}
            onDisconnect={disconnect}
          />
        )}
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-4 bg-white">
        {mensagens.length === 0 ? (
          <WelcomeScreen agente={agente} onSugestao={msg => { setTexto(msg); textareaRef.current?.focus() }} />
        ) : (
          <>
            {mensagens.map(m => (
              <MessageBubble key={m.id} mensagem={m} agente={agente} />
            ))}
            <ToolCallIndicator toolName={toolAtivo} />
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Upload zone */}
      <FileUploadZone
        onFilesAdded={adicionarArquivos}
        arquivosPendentes={arquivosPendentes}
        onRemover={removerArquivo}
      />

      {/* Input */}
      <div
        className="px-4 py-3 border-t border-gray-200 flex-shrink-0 bg-white"
        onDrop={e => {
          e.preventDefault()
          adicionarArquivos(Array.from(e.dataTransfer.files))
        }}
        onDragOver={e => e.preventDefault()}
      >
        <div className="flex items-end gap-2 bg-gray-100 rounded-2xl px-4 py-3 border border-gray-200">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-400 hover:text-violet-600 transition-colors flex-shrink-0 mb-0.5"
            title="Anexar arquivo"
            type="button"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.xlsx,.xls,.docx,.doc,.csv,.txt,.json,.jpg,.jpeg,.png,.gif,.webp"
            onChange={handleFileSelect}
          />
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={handleTextoChange}
            onKeyDown={handleKeyDown}
            placeholder={`Mensagem para ${agente.nome}... (Enter para enviar, Shift+Enter para nova linha)`}
            rows={1}
            className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 text-sm resize-none focus:outline-none leading-relaxed"
            style={{ minHeight: '24px', maxHeight: '150px' }}
          />
          {isStreaming ? (
            <button
              onClick={pararGeracao}
              className="flex-shrink-0 p-1.5 rounded-xl bg-red-600 hover:bg-red-500 transition-colors"
              title="Parar geração"
              type="button"
            >
              <StopCircle className="w-4 h-4 text-white" />
            </button>
          ) : (
            <button
              onClick={handleEnviar}
              disabled={!canSend}
              className={`flex-shrink-0 p-1.5 rounded-xl transition-colors ${
                canSend
                  ? 'bg-violet-600 hover:bg-violet-500 text-white'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
              title="Enviar"
              type="button"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-400">
            IA pode cometer erros. Verifique informações importantes.
          </p>
          {(() => {
            const total = mensagens.reduce((acc, m) => acc + (m.tokens_usados ?? 0), 0)
            return total > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                <Cpu className="w-3 h-3" />
                {total.toLocaleString('pt-BR')} tokens
              </span>
            ) : null
          })()}</div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Check, Globe, Database, FileText, Edit3, Building2, Calendar, Sheet, Mail, BookOpen, GalleryHorizontalEnd, Eye, Users, Map, Paperclip, Cpu } from 'lucide-react'
import type { Mensagem, Agente } from './types'

interface MessageBubbleProps {
  mensagem: Mensagem
  agente?: Agente
}

const TOOL_CHIPS: Record<string, { icon: React.ElementType; label: string }> = {
  buscar_dados: { icon: Database, label: 'ERP' },
  criar_registro: { icon: Edit3, label: 'Criar' },
  atualizar_registro: { icon: Edit3, label: 'Atualizar' },
  consultar_cnpj: { icon: Building2, label: 'CNPJ' },
  analisar_arquivo: { icon: FileText, label: 'Arquivo' },
  google_calendar: { icon: Calendar, label: 'Calendar' },
  google_sheets: { icon: Sheet, label: 'Sheets' },
  gmail: { icon: Mail, label: 'Gmail' },
  google_docs: { icon: BookOpen, label: 'Docs' },
  google_slides: { icon: GalleryHorizontalEnd, label: 'Slides' },
  cloud_vision: { icon: Eye, label: 'Vision' },
  google_people: { icon: Users, label: 'Contatos' },
  google_maps: { icon: Map, label: 'Maps' },
  pesquisar_internet: { icon: Globe, label: 'Web' },
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
      title="Copiar"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  return `${Math.floor(hrs / 24)}d atrás`
}

export default function MessageBubble({ mensagem, agente }: MessageBubbleProps) {
  const [showCopy, setShowCopy] = useState(false)
  const isUser = mensagem.role === 'user'

  if (isUser) {
    const imagens = (mensagem.arquivos_visuais ?? []).filter(a => a.mime_type.startsWith('image/') && a.preview)
    const outrosArquivos = (mensagem.arquivos_visuais ?? []).filter(a => !a.mime_type.startsWith('image/'))

    return (
      <div className="flex justify-end px-4 py-1 group">
        <div className="max-w-[75%] flex flex-col items-end gap-1">
          {imagens.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-end">
              {imagens.map((arq, i) => (
                <img
                  key={i}
                  src={arq.preview}
                  alt={arq.nome}
                  className="max-w-[220px] max-h-[220px] rounded-xl object-cover border border-violet-200"
                />
              ))}
            </div>
          )}
          {outrosArquivos.map((arq, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-white bg-violet-600"
            >
              <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate max-w-[200px]">{arq.nome}</span>
            </div>
          ))}
          {mensagem.conteudo && (
            <div className="rounded-2xl rounded-tr-sm px-4 py-3 text-white text-sm leading-relaxed bg-violet-600">
              {mensagem.conteudo}
            </div>
          )}
          <p className="text-xs text-gray-400 text-right pr-1" title={mensagem.created_at}>
            {timeAgo(mensagem.created_at)}
          </p>
        </div>
      </div>
    )
  }

  const tools = mensagem.ferramentas_usadas ?? []

  return (
    <div
      className="flex items-start gap-3 px-4 py-1 group"
      onMouseEnter={() => setShowCopy(true)}
      onMouseLeave={() => setShowCopy(false)}
    >
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5 bg-violet-100">
        {agente?.avatar_emoji ?? '🤖'}
      </div>

      <div className="flex-1 min-w-0">
        {/* Balão IA — fundo cinza claro, texto preto */}
        <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 relative border border-gray-200">
          {mensagem.isStreaming && mensagem.conteudo === '' ? (
            <div className="flex gap-1 py-1">
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
            </div>
          ) : (
            <div className="prose prose-sm max-w-none prose-gray">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const isBlock = className?.includes('language-')
                    if (isBlock) {
                      return (
                        <div className="relative group/code">
                          <code className={`${className} bg-gray-200 rounded text-gray-800`} {...props}>{children}</code>
                          <div className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity">
                            <CopyButton text={String(children)} />
                          </div>
                        </div>
                      )
                    }
                    return <code className={`${className ?? ''} bg-gray-200 text-gray-800 px-1 rounded text-xs`} {...props}>{children}</code>
                  },
                }}
              >
                {mensagem.conteudo}
              </ReactMarkdown>
              {mensagem.isStreaming && (
                <span className="inline-block w-0.5 h-4 bg-gray-500 animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          )}

          {showCopy && mensagem.conteudo && !mensagem.isStreaming && (
            <div className="absolute -top-2 -right-2">
              <CopyButton text={mensagem.conteudo} />
            </div>
          )}
        </div>

        {/* Tool chips */}
        {tools.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tools.map((t, i) => {
              const chip = TOOL_CHIPS[t.tool]
              if (!chip) return null
              const Icon = chip.icon
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 text-xs"
                >
                  <Icon className="w-3 h-3" />
                  {chip.label}
                </span>
              )
            })}
          </div>
        )}

        <div className="flex items-center gap-3 mt-1 pl-1">
          <p className="text-xs text-gray-400" title={mensagem.created_at}>
            {timeAgo(mensagem.created_at)}
          </p>
          {mensagem.tokens_usados != null && mensagem.tokens_usados > 0 && !mensagem.isStreaming && (
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
              <Cpu className="w-2.5 h-2.5" />
              {mensagem.tokens_usados.toLocaleString('pt-BR')} tokens
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

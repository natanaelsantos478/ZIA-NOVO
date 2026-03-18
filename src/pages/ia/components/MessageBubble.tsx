import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Check, Globe, Database, FileText, Edit3, Building2, Calendar, Sheet, Mail, BookOpen, GalleryHorizontalEnd, Eye, Users, Map, Paperclip } from 'lucide-react'
import type { Mensagem, Agente } from '../types'

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
  // google_search é nativo — o Gemini pode citar fontes no texto
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
      className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
      title="Copiar"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
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
  const agentColor = agente?.cor ?? '#7c3aed'

  if (isUser) {
    const imagens = (mensagem.arquivos_visuais ?? []).filter(a => a.mime_type.startsWith('image/') && a.preview)
    const outrosArquivos = (mensagem.arquivos_visuais ?? []).filter(a => !a.mime_type.startsWith('image/'))

    return (
      <div className="flex justify-end px-4 py-1 group">
        <div className="max-w-[75%] flex flex-col items-end gap-1">
          {/* Miniaturas de imagens */}
          {imagens.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-end">
              {imagens.map((arq, i) => (
                <img
                  key={i}
                  src={arq.preview}
                  alt={arq.nome}
                  className="max-w-[220px] max-h-[220px] rounded-xl object-cover border border-white/10"
                />
              ))}
            </div>
          )}
          {/* Chips de arquivos não-imagem */}
          {outrosArquivos.map((arq, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-white"
              style={{ backgroundColor: agentColor }}
            >
              <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate max-w-[200px]">{arq.nome}</span>
            </div>
          ))}
          {/* Texto (só mostra se houver conteúdo) */}
          {mensagem.conteudo && (
            <div
              className="rounded-2xl rounded-tr-sm px-4 py-3 text-white text-sm leading-relaxed"
              style={{ backgroundColor: agentColor }}
            >
              {mensagem.conteudo}
            </div>
          )}
          <p className="text-xs text-slate-600 text-right pr-1" title={mensagem.created_at}>
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
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
        style={{ backgroundColor: agentColor + '33' }}
      >
        {agente?.avatar_emoji ?? '🤖'}
      </div>

      <div className="flex-1 min-w-0">
        {/* Balão */}
        <div className="bg-slate-800/60 rounded-2xl rounded-tl-sm px-4 py-3 relative">
          {mensagem.isStreaming && mensagem.conteudo === '' ? (
            <div className="flex gap-1 py-1">
              <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce [animation-delay:300ms]" />
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const isBlock = className?.includes('language-')
                    if (isBlock) {
                      return (
                        <div className="relative group/code">
                          <code className={className} {...props}>{children}</code>
                          <div className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity">
                            <CopyButton text={String(children)} />
                          </div>
                        </div>
                      )
                    }
                    return <code className={className} {...props}>{children}</code>
                  },
                }}
              >
                {mensagem.conteudo}
              </ReactMarkdown>
              {mensagem.isStreaming && (
                <span className="inline-block w-0.5 h-4 bg-slate-400 animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          )}

          {/* Botão copiar resposta */}
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
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs"
                >
                  <Icon className="w-3 h-3" />
                  {chip.label}
                </span>
              )
            })}
          </div>
        )}

        <p className="text-xs text-slate-600 mt-1 pl-1" title={mensagem.created_at}>
          {timeAgo(mensagem.created_at)}
          {mensagem.tokens_usados ? ` · ${mensagem.tokens_usados} tokens` : ''}
        </p>
      </div>
    </div>
  )
}

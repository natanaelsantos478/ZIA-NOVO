interface ToolCallIndicatorProps {
  toolName: string | null
}

const TOOL_LABELS: Record<string, string> = {
  buscar_dados: '📊 Consultando o banco de dados...',
  criar_registro: '✏️ Criando registro...',
  atualizar_registro: '📝 Atualizando registro...',
  consultar_cnpj: '🏢 Consultando Receita Federal...',
  analisar_arquivo: '📄 Analisando arquivo...',
  google_calendar: '📅 Acessando Google Calendar...',
  google_sheets: '📊 Lendo Google Sheets...',
  gmail: '✉️ Acessando Gmail...',
}

export default function ToolCallIndicator({ toolName }: ToolCallIndicatorProps) {
  if (!toolName) return null

  const label = TOOL_LABELS[toolName] ?? `⚙️ Executando: ${toolName}...`

  return (
    <div className="flex items-center gap-3 px-4 py-2 mx-4 my-1 rounded-xl bg-violet-950/40 border border-violet-700/30 w-fit">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-sm text-violet-300 font-medium">{label}</span>
    </div>
  )
}

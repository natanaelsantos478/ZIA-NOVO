interface ToolCallIndicatorProps {
  toolName: string | null
}

const TOOL_LABELS: Record<string, string> = {
  buscar_dados: '📊 Consultando o banco de dados...',
  criar_registro: '✏️ Criando registro...',
  atualizar_registro: '📝 Atualizando registro...',
  consultar_cnpj: '🏢 Consultando Receita Federal...',
  analisar_arquivo: '📄 Analisando arquivo...',
  google_calendar: '📅 Acessando Google Agenda...',
  google_sheets: '📊 Acessando Google Planilhas...',
  gmail: '📧 Acessando Gmail...',
  google_docs: '📝 Acessando Google Docs...',
  google_slides: '🖼️ Acessando Google Slides...',
  cloud_vision: '👁️ Analisando imagem com Vision AI...',
  google_people: '👤 Buscando contatos...',
  google_maps: '🗺️ Calculando rota no Maps...',
}

export default function ToolCallIndicator({ toolName }: ToolCallIndicatorProps) {
  if (!toolName) return null

  const label = TOOL_LABELS[toolName] ?? `⚙️ Executando: ${toolName}...`

  return (
    <div className="flex items-center gap-3 px-4 py-2 mx-4 my-1 rounded-xl bg-violet-50 border border-violet-200 w-fit">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-sm text-violet-700 font-medium">{label}</span>
    </div>
  )
}

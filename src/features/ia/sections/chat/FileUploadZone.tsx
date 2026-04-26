import { useCallback } from 'react'
import { X, FileText, Table2, FileImage, Paperclip, CheckCircle2 } from 'lucide-react'
import type { ArquivoPendente } from './types'

interface FileUploadZoneProps {
  onFilesAdded: (files: File[]) => void
  arquivosPendentes: ArquivoPendente[]
  onRemover: (index: number) => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ mime, preview }: { mime: string; preview?: string }) {
  if (mime.startsWith('image/') && preview) {
    return <img src={preview} alt="preview" className="w-8 h-8 rounded object-cover flex-shrink-0" />
  }
  if (mime === 'application/pdf') return <FileText className="w-5 h-5 text-red-400 flex-shrink-0" />
  if (mime.includes('sheet') || mime.includes('excel') || mime === 'text/csv') {
    return <Table2 className="w-5 h-5 text-green-400 flex-shrink-0" />
  }
  if (mime.includes('word') || mime.includes('document')) {
    return <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
  }
  if (mime.startsWith('image/')) return <FileImage className="w-5 h-5 text-violet-400 flex-shrink-0" />
  return <Paperclip className="w-5 h-5 text-slate-400 flex-shrink-0" />
}

export default function FileUploadZone({ onFilesAdded, arquivosPendentes, onRemover }: FileUploadZoneProps) {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) onFilesAdded(files)
  }, [onFilesAdded])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  return (
    <div onDrop={handleDrop} onDragOver={handleDragOver}>
      {arquivosPendentes.length > 0 && (
        <div className="flex flex-col gap-1 px-4 py-2 border-t border-slate-800">
          {arquivosPendentes.map((item, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-3 py-2">
              <FileIcon mime={item.file.type} preview={item.preview} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-200 truncate">{item.file.name}</span>
                  <span className="text-xs text-slate-500 flex-shrink-0">{formatBytes(item.file.size)}</span>
                </div>
                {item.erro ? (
                  <p className="text-xs text-red-400">{item.erro}</p>
                ) : item.arquivo_id ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-400">Enviado</span>
                  </div>
                ) : item.progresso > 0 ? (
                  <div className="h-1 bg-slate-700 rounded-full mt-1">
                    <div
                      className="h-1 bg-violet-500 rounded-full transition-all duration-300"
                      style={{ width: `${item.progresso}%` }}
                    />
                  </div>
                ) : null}
              </div>
              <button
                onClick={() => onRemover(i)}
                className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState, useCallback } from 'react'
import type { ArquivoPendente } from '../types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://tgeomsnxfcqwrxijjvek.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export function useFileUpload() {
  const [arquivosPendentes, setArquivosPendentes] = useState<ArquivoPendente[]>([])

  const adicionarArquivos = useCallback((files: File[]) => {
    const novos: ArquivoPendente[] = files.map(file => ({
      file,
      progresso: 0,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }))
    setArquivosPendentes(prev => [...prev, ...novos])
  }, [])

  const removerArquivo = useCallback((index: number) => {
    setArquivosPendentes(prev => {
      const item = prev[index]
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const uploadTodos = useCallback(async (conversa_id: string, tenant_id: string): Promise<string[]> => {
    const ids: string[] = []

    for (let i = 0; i < arquivosPendentes.length; i++) {
      const item = arquivosPendentes[i]
      if (item.arquivo_id) {
        ids.push(item.arquivo_id)
        continue
      }

      setArquivosPendentes(prev => prev.map((a, idx) => idx === i ? { ...a, progresso: 30 } : a))

      try {
        const formData = new FormData()
        formData.append('file', item.file)
        formData.append('tenant_id', tenant_id)
        formData.append('conversa_id', conversa_id)

        const res = await fetch(`${SUPABASE_URL}/functions/v1/ia-upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
          body: formData,
        })

        setArquivosPendentes(prev => prev.map((a, idx) => idx === i ? { ...a, progresso: 80 } : a))

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? 'Erro no upload')
        }

        const data = await res.json()
        ids.push(data.arquivo_id)

        setArquivosPendentes(prev => prev.map((a, idx) =>
          idx === i ? { ...a, progresso: 100, arquivo_id: data.arquivo_id } : a
        ))
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro no upload'
        setArquivosPendentes(prev => prev.map((a, idx) =>
          idx === i ? { ...a, erro: msg } : a
        ))
      }
    }

    return ids
  }, [arquivosPendentes])

  const limpar = useCallback(() => {
    setArquivosPendentes(prev => {
      prev.forEach(a => { if (a.preview) URL.revokeObjectURL(a.preview) })
      return []
    })
  }, [])

  return { arquivosPendentes, adicionarArquivos, removerArquivo, uploadTodos, limpar }
}

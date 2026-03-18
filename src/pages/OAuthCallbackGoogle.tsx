import { useEffect } from 'react'

/**
 * Página de callback OAuth do Google.
 * Abre como popup — lê o ?code= da URL e envia via postMessage para a janela pai.
 */
export default function OAuthCallbackGoogle() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code   = params.get('code')
    const error  = params.get('error')

    if (!window.opener) return // não é popup — apenas exibe a mensagem de loading

    if (code) {
      window.opener.postMessage({ type: 'GOOGLE_OAUTH_CODE', code }, window.location.origin)
    } else {
      window.opener.postMessage(
        { type: 'GOOGLE_OAUTH_CODE', error: error ?? 'Acesso negado' },
        window.location.origin,
      )
    }

    window.close()
  }, [])

  return (
    <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-400 text-sm gap-3">
      <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      Autenticando com Google...
    </div>
  )
}

import { useState, useCallback, useRef } from 'react'
import {
  getGoogleAccessToken,
  setGoogleToken,
  clearGoogleToken,
  getGoogleUserEmail,
  buildAuthUrl,
  exchangeCode,
} from '../lib/googleAuth'

export function useGoogleAuth() {
  const [isConnected,  setIsConnected]  = useState(() => !!getGoogleAccessToken())
  const [email,        setEmail]        = useState(() => getGoogleUserEmail())
  const [isConnecting, setIsConnecting] = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const pendingVerifier = useRef<string | null>(null)

  const redirectUri = `${window.location.origin}/oauth/google`

  const connect = useCallback(async () => {
    setIsConnecting(true)
    setError(null)

    try {
      const { url, verifier } = await buildAuthUrl(redirectUri)
      pendingVerifier.current = verifier

      const popup = window.open(url, 'google_oauth', 'width=520,height=660,left=200,top=80')
      if (!popup) throw new Error('Popup bloqueado. Permita pop-ups para este site.')

      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        if (event.data?.type !== 'GOOGLE_OAUTH_CODE') return

        window.removeEventListener('message', handleMessage)
        clearInterval(checkClosed)

        if (event.data.error) {
          setError(event.data.error)
          setIsConnecting(false)
          return
        }

        try {
          const result = await exchangeCode(event.data.code, pendingVerifier.current!, redirectUri)
          setGoogleToken(result.access_token, result.expires_in, result.email)
          setIsConnected(true)
          setEmail(result.email ?? null)
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Erro ao obter token')
        } finally {
          setIsConnecting(false)
          pendingVerifier.current = null
        }
      }

      window.addEventListener('message', handleMessage)

      // Cancela se o popup for fechado antes de autenticar
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', handleMessage)
          if (pendingVerifier.current) {
            setIsConnecting(false)
            pendingVerifier.current = null
          }
        }
      }, 600)

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar autenticação')
      setIsConnecting(false)
    }
  }, [redirectUri])

  const disconnect = useCallback(() => {
    clearGoogleToken()
    setIsConnected(false)
    setEmail(null)
    setError(null)
  }, [])

  const accessToken = isConnected ? getGoogleAccessToken() : null

  return { isConnected, email, isConnecting, error, connect, disconnect, accessToken }
}

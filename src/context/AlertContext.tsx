// ─────────────────────────────────────────────────────────────────────────────
// AlertContext — Alertas de Nível 1 para o perfil Gestor
//
// Disparado pela EscutaInteligente quando a IA detecta uma negociação com alta
// probabilidade de fechamento sendo perdida (sentimento negativo).
// Persiste em localStorage — sobrevive a refresh de página.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export interface Level1Alert {
  id: string
  createdAt: string
  dealName: string       // nome do cliente / negociação
  clientName: string     // nome extraído pelo agente 3
  probability: number    // probabilidade de fechamento (era alta, deal sendo perdido)
  observacoes: string    // observações da análise final
  negociacaoId?: string  // ID da negociação CRM vinculada (se houver)
  read: boolean
}

interface AlertContextValue {
  alerts: Level1Alert[]
  unreadCount: number
  addLevel1Alert: (alert: Omit<Level1Alert, 'id' | 'createdAt' | 'read'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  clearAll: () => void
}

const STORAGE_KEY = 'zia_level1_alerts_v1'

function load(): Level1Alert[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') }
  catch { return [] }
}

function save(alerts: Level1Alert[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts.slice(0, 100)))
}

const AlertContext = createContext<AlertContextValue | null>(null)

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Level1Alert[]>(load)

  const addLevel1Alert = useCallback((data: Omit<Level1Alert, 'id' | 'createdAt' | 'read'>) => {
    setAlerts(prev => {
      const next = [
        { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString(), read: false },
        ...prev,
      ]
      save(next)
      return next
    })
  }, [])

  const markRead = useCallback((id: string) => {
    setAlerts(prev => {
      const next = prev.map(a => a.id === id ? { ...a, read: true } : a)
      save(next)
      return next
    })
  }, [])

  const markAllRead = useCallback(() => {
    setAlerts(prev => {
      const next = prev.map(a => ({ ...a, read: true }))
      save(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setAlerts([])
  }, [])

  const unreadCount = alerts.filter(a => !a.read).length

  return (
    <AlertContext.Provider value={{ alerts, unreadCount, addLevel1Alert, markRead, markAllRead, clearAll }}>
      {children}
    </AlertContext.Provider>
  )
}

export function useAlerts() {
  const ctx = useContext(AlertContext)
  if (!ctx) throw new Error('useAlerts deve ser usado dentro de AlertProvider')
  return ctx
}

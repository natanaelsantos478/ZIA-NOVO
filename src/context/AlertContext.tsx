// ─────────────────────────────────────────────────────────────────────────────
// AlertContext — Sistema global de alertas da ZIA
//
// • Mantém compatibilidade com Level1Alert (IA de CRM)
// • AlertType: tipos criados em Configurações > Alertas
// • SystemAlert: alertas disparados por atividades/automações/IA
//   - canal 'notification' → sininho no Header
//   - canal 'banner'       → faixa inline no topo do módulo ativo
//   - canal 'fullscreen'   → modal que bloqueia a tela (requiresAck)
// ─────────────────────────────────────────────────────────────────────────────
import {
  createContext, useContext, useState, useCallback, useEffect,
  type ReactNode,
} from 'react'

// ── Level 1 alert (CRM IA) ────────────────────────────────────────────────────

export interface Level1Alert {
  id: string
  createdAt: string
  dealName: string
  clientName: string
  probability: number
  observacoes: string
  negociacaoId?: string
  read: boolean
}

// ── Alert types (configurados em Settings > Alertas) ──────────────────────────

export type AlertChannel = 'notification' | 'banner' | 'fullscreen'
export type AlertColor   = 'red' | 'amber' | 'blue' | 'green' | 'purple' | 'slate' | 'rose' | 'indigo'
export type AlertIcon    = 'alert-circle' | 'bell' | 'zap' | 'shield' | 'info' | 'alert-triangle' | 'x-circle'

export interface AlertType {
  id: string
  name: string
  description: string
  color: AlertColor
  icon: AlertIcon
  channel: AlertChannel
  visibleToLevels: number[]   // perfil levels que veem — [1,2,3,4]
  requiresAck: boolean        // fullscreen exige clique em "Ciente"
  playSound: boolean
  createdAt: string
}

// ── System alerts (disparados por atividades/IA) ───────────────────────────────

export interface SystemAlert {
  id: string
  typeId: string
  typeName: string
  channel: AlertChannel
  color: AlertColor
  title: string
  message: string
  sourceModule: string   // 'RH' | 'CRM' | 'SCM' | 'ERP' | 'EAM' | 'QUALIDADE' | 'DOCS' | 'IA'
  activityId?: string
  createdAt: string
  read: boolean
  acknowledged: boolean  // só relevante para fullscreen
}

// ── AI alert rule (regras da IA em Settings > Alertas) ───────────────────────

export interface AIAlertRule {
  id: string
  name: string
  condition: string       // descrição em linguagem natural
  sourceModule: string
  alertTypeId: string
  active: boolean
  createdAt: string
}

// ── Context value ─────────────────────────────────────────────────────────────

interface AlertContextValue {
  // Level1 (legado CRM IA)
  alerts: Level1Alert[]
  unreadCount: number
  addLevel1Alert: (a: Omit<Level1Alert, 'id' | 'createdAt' | 'read'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  clearAll: () => void

  // Alert types
  alertTypes: AlertType[]
  addAlertType: (t: Omit<AlertType, 'id' | 'createdAt'>) => void
  updateAlertType: (id: string, patch: Partial<AlertType>) => void
  removeAlertType: (id: string) => void

  // System alerts
  systemAlerts: SystemAlert[]
  systemUnread: number
  dispatchSystemAlert: (a: Omit<SystemAlert, 'id' | 'createdAt' | 'read' | 'acknowledged'>) => void
  markSystemRead: (id: string) => void
  acknowledgeSystem: (id: string) => void
  clearSystemAlerts: () => void
  pendingFullscreen: SystemAlert | null   // o alerta fullscreen atual (se houver)

  // AI rules
  aiRules: AIAlertRule[]
  addAIRule: (r: Omit<AIAlertRule, 'id' | 'createdAt'>) => void
  updateAIRule: (id: string, patch: Partial<AIAlertRule>) => void
  removeAIRule: (id: string) => void
}

// ── Storage helpers ───────────────────────────────────────────────────────────

const KEYS = {
  level1:  'zia_level1_alerts_v1',
  types:   'zia_alert_types_v2',
  system:  'zia_system_alerts_v1',
  aiRules: 'zia_ai_alert_rules_v1',
} as const

function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback }
  catch { return fallback }
}
function persist(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val))
}

// ── Default alert types ───────────────────────────────────────────────────────

const DEFAULT_TYPES: AlertType[] = [
  { id: 'at-001', name: 'Informativo',     description: 'Avisos gerais sem urgência',          color: 'blue',   icon: 'info',           channel: 'notification', visibleToLevels: [1,2,3,4], requiresAck: false, playSound: false, createdAt: new Date().toISOString() },
  { id: 'at-002', name: 'Atenção',         description: 'Requer ação em breve',                color: 'amber',  icon: 'alert-triangle', channel: 'banner',       visibleToLevels: [1,2,3],   requiresAck: false, playSound: false, createdAt: new Date().toISOString() },
  { id: 'at-003', name: 'Crítico',         description: 'Ação imediata necessária',            color: 'red',    icon: 'alert-circle',   channel: 'fullscreen',   visibleToLevels: [1,2],     requiresAck: true,  playSound: true,  createdAt: new Date().toISOString() },
  { id: 'at-004', name: 'Operacional',     description: 'Notificações de fluxo operacional',   color: 'green',  icon: 'bell',           channel: 'notification', visibleToLevels: [1,2,3,4], requiresAck: false, playSound: false, createdAt: new Date().toISOString() },
  { id: 'at-005', name: 'Segurança',       description: 'Alertas de acesso e integridade',     color: 'purple', icon: 'shield',         channel: 'fullscreen',   visibleToLevels: [1],       requiresAck: true,  playSound: true,  createdAt: new Date().toISOString() },
  { id: 'at-006', name: 'Lembrete de IA',  description: 'Gerado automaticamente pela IA ZIA',  color: 'indigo', icon: 'zap',            channel: 'banner',       visibleToLevels: [1,2,3,4], requiresAck: false, playSound: false, createdAt: new Date().toISOString() },
]

// ── Context ───────────────────────────────────────────────────────────────────

const AlertContext = createContext<AlertContextValue | null>(null)

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts,      setAlerts]      = useState<Level1Alert[]>(() => load(KEYS.level1, []))
  const [alertTypes,  setAlertTypes]  = useState<AlertType[]>  (() => load(KEYS.types,   DEFAULT_TYPES))
  const [systemAlerts,setSystemAlerts]= useState<SystemAlert[]>(() => load(KEYS.system,  []))
  const [aiRules,     setAiRules]     = useState<AIAlertRule[]>(() => load(KEYS.aiRules, []))

  // Persist on change
  useEffect(() => { persist(KEYS.level1,  alerts)       }, [alerts])
  useEffect(() => { persist(KEYS.types,   alertTypes)   }, [alertTypes])
  useEffect(() => { persist(KEYS.system,  systemAlerts) }, [systemAlerts])
  useEffect(() => { persist(KEYS.aiRules, aiRules)      }, [aiRules])

  // ── Level1 ─────────────────────────────────────────────────────────────────
  const addLevel1Alert = useCallback((data: Omit<Level1Alert, 'id' | 'createdAt' | 'read'>) => {
    setAlerts(prev => [{ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString(), read: false }, ...prev].slice(0, 100))
  }, [])

  const markRead    = useCallback((id: string) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a)), [])
  const markAllRead = useCallback(() => setAlerts(prev => prev.map(a => ({ ...a, read: true }))), [])
  const clearAll    = useCallback(() => { localStorage.removeItem(KEYS.level1); setAlerts([]) }, [])

  // ── Alert types ────────────────────────────────────────────────────────────
  const addAlertType = useCallback((t: Omit<AlertType, 'id' | 'createdAt'>) => {
    setAlertTypes(prev => [...prev, { ...t, id: crypto.randomUUID(), createdAt: new Date().toISOString() }])
  }, [])

  const updateAlertType = useCallback((id: string, patch: Partial<AlertType>) => {
    setAlertTypes(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }, [])

  const removeAlertType = useCallback((id: string) => {
    setAlertTypes(prev => prev.filter(t => t.id !== id))
  }, [])

  // ── System alerts ──────────────────────────────────────────────────────────
  const dispatchSystemAlert = useCallback((a: Omit<SystemAlert, 'id' | 'createdAt' | 'read' | 'acknowledged'>) => {
    setSystemAlerts(prev =>
      [{ ...a, id: crypto.randomUUID(), createdAt: new Date().toISOString(), read: false, acknowledged: false }, ...prev].slice(0, 200)
    )
  }, [])

  const markSystemRead   = useCallback((id: string) => setSystemAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a)), [])
  const acknowledgeSystem = useCallback((id: string) => setSystemAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true, read: true } : a)), [])
  const clearSystemAlerts = useCallback(() => { localStorage.removeItem(KEYS.system); setSystemAlerts([]) }, [])

  const pendingFullscreen = systemAlerts.find(a => a.channel === 'fullscreen' && !a.acknowledged) ?? null

  // ── AI rules ───────────────────────────────────────────────────────────────
  const addAIRule = useCallback((r: Omit<AIAlertRule, 'id' | 'createdAt'>) => {
    setAiRules(prev => [...prev, { ...r, id: crypto.randomUUID(), createdAt: new Date().toISOString() }])
  }, [])

  const updateAIRule = useCallback((id: string, patch: Partial<AIAlertRule>) => {
    setAiRules(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }, [])

  const removeAIRule = useCallback((id: string) => {
    setAiRules(prev => prev.filter(r => r.id !== id))
  }, [])

  const unreadCount   = alerts.filter(a => !a.read).length
  const systemUnread  = systemAlerts.filter(a => !a.read).length

  return (
    <AlertContext.Provider value={{
      alerts, unreadCount, addLevel1Alert, markRead, markAllRead, clearAll,
      alertTypes, addAlertType, updateAlertType, removeAlertType,
      systemAlerts, systemUnread, dispatchSystemAlert, markSystemRead, acknowledgeSystem, clearSystemAlerts, pendingFullscreen,
      aiRules, addAIRule, updateAIRule, removeAIRule,
    }}>
      {children}
    </AlertContext.Provider>
  )
}

export function useAlerts() {
  const ctx = useContext(AlertContext)
  if (!ctx) throw new Error('useAlerts deve ser usado dentro de AlertProvider')
  return ctx
}

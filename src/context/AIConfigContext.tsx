// ─────────────────────────────────────────────────────────────────────────────
// AIConfigContext — Configuração global da IA para toda a empresa
//
// Armazena identidade, contexto, links e preferências da IA.
// Disponível em QUALQUER parte do app via useAIConfig().
// Persiste em localStorage.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export interface AILink {
  id: string
  label: string       // ex: "Tabela de preços"
  url: string         // ex: "https://empresa.com/tabela.pdf"
  description: string // ex: "Tabela de preços atualizada 2025"
}

export interface AIConfig {
  // Identidade
  aiName: string
  aiPersona: string
  // Empresa
  companyName: string
  sector: string
  companyDescription: string
  // Links e fontes de referência
  links: AILink[]
  // Comportamento
  extraInstructions: string
  responseLanguage: 'pt-BR' | 'en-US' | 'es-ES'
  // Busca de imagens
  searchImages: boolean
  googleCseId: string
  googleCseKey: string
  // Alerta de leads quentes — transfere lead para número quando probabilidade >= limiar
  leadAlertEnabled: boolean
  leadAlertThreshold: number   // 0-100 (%)
  leadAlertPhone: string       // número destino ex: "5511999999999"
}

export const AI_CONFIG_DEFAULT: AIConfig = {
  aiName: 'ZIA',
  aiPersona: '',
  companyName: '',
  sector: '',
  companyDescription: '',
  links: [],
  extraInstructions: '',
  responseLanguage: 'pt-BR',
  searchImages: false,
  googleCseId: '',
  googleCseKey: '',
  leadAlertEnabled: false,
  leadAlertThreshold: 70,
  leadAlertPhone: '',
}

const STORAGE_KEY = 'zia_ai_config_v1'

function load(): AIConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return AI_CONFIG_DEFAULT
    return { ...AI_CONFIG_DEFAULT, ...JSON.parse(raw) }
  } catch { return AI_CONFIG_DEFAULT }
}

function save(cfg: AIConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

// ── Utilitário: monta o prefixo de sistema a ser injetado nos prompts ─────────
export function buildSystemContext(cfg: AIConfig): string {
  if (!cfg.companyName && !cfg.aiPersona && !cfg.links.length && !cfg.extraInstructions) return ''

  const parts: string[] = []

  if (cfg.aiPersona) {
    parts.push(cfg.aiPersona)
  } else if (cfg.aiName || cfg.companyName) {
    const who = cfg.aiName ? `Você é ${cfg.aiName}` : 'Você é um assistente'
    const where = cfg.companyName ? `, assistente da empresa ${cfg.companyName}` : ''
    const sector = cfg.sector ? ` (${cfg.sector})` : ''
    parts.push(`${who}${where}${sector}.`)
  }

  if (cfg.companyDescription) {
    parts.push(`Sobre a empresa: ${cfg.companyDescription}`)
  }

  if (cfg.links.length > 0) {
    const linkList = cfg.links.map(l => `- ${l.label}: ${l.url}${l.description ? ` (${l.description})` : ''}`).join('\n')
    parts.push(`Links e fontes de referência da empresa (use para fundamentar respostas):\n${linkList}`)
  }

  if (cfg.extraInstructions) {
    parts.push(`Instruções adicionais: ${cfg.extraInstructions}`)
  }

  return parts.join('\n\n')
}

// ── Busca imagem na web (Google Custom Search API) ────────────────────────────
export async function searchWebImage(query: string, cfg: AIConfig): Promise<string | null> {
  if (!cfg.searchImages) return null

  // Tenta Google Custom Search se configurado
  if (cfg.googleCseKey && cfg.googleCseId) {
    try {
      const params = new URLSearchParams({
        key: cfg.googleCseKey,
        cx: cfg.googleCseId,
        q: query,
        searchType: 'image',
        num: '1',
        safe: 'active',
        imgType: 'photo',
      })
      const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`)
      if (res.ok) {
        const data = await res.json()
        const url: string | undefined = data?.items?.[0]?.link
        if (url) return url
      }
    } catch { /* fallback */ }
  }

  return null
}

// ── Context ───────────────────────────────────────────────────────────────────
interface AIConfigContextValue {
  config: AIConfig
  updateConfig: (partial: Partial<AIConfig>) => void
  saveConfig: (cfg: AIConfig) => void
  systemContext: string  // buildSystemContext(config) pré-calculado
}

const AIConfigContext = createContext<AIConfigContextValue | null>(null)

export function AIConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AIConfig>(load)

  const systemContext = buildSystemContext(config)

  const updateConfig = useCallback((partial: Partial<AIConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...partial }
      save(next)
      return next
    })
  }, [])

  const saveConfig = useCallback((cfg: AIConfig) => {
    save(cfg)
    setConfig(cfg)
  }, [])

  return (
    <AIConfigContext.Provider value={{ config, updateConfig, saveConfig, systemContext }}>
      {children}
    </AIConfigContext.Provider>
  )
}

export function useAIConfig() {
  const ctx = useContext(AIConfigContext)
  if (!ctx) throw new Error('useAIConfig deve ser usado dentro de AIConfigProvider')
  return ctx
}

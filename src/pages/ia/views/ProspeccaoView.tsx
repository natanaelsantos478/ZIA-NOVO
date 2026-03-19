import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Building2, Plus, Loader2, CheckCircle, Circle, AlertCircle,
  Phone, Globe, Copy, ChevronDown, ChevronUp, X, ArrowRight,
  Trash2, Play, BarChart3, MapPin, Users,
  Calendar, TrendingUp, ClipboardList, Cpu, Shield, ExternalLink
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'

// ── Constantes ───────────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://tgeomsnxfcqwrxijjvek.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const TENANT_ID = '00000000-0000-0000-0000-000000000001'

const ETAPAS_NOMES = [
  'Descoberta via Google Search',
  'Localização e Telefone (Maps)',
  'Validação CNPJ (Receita Federal)',
  'Filtro de Capital Social',
  'Estimativa de Funcionários',
  'Análise de Sócios (LinkedIn)',
  'Saúde Financeira (Serasa)',
  'Detecção de SaaS Utilizados',
  'Score Final e Classificação',
]

// ── Types ─────────────────────────────────────────────────────────────────────
interface Campanha {
  id: string
  tenant_id: string
  nome: string
  segmentos: string[]
  regioes: string[]
  capital_min: number
  meta_empresas: number
  status: 'rascunho' | 'ativo' | 'executando' | 'concluido'
  created_at: string
  total_encontradas?: number
  total_qualificadas?: number
}

interface EmpresaResultado {
  nome?: string
  razao_social: string
  cnpj?: string
  score: number
  classificacao: 'HOT' | 'WARM' | 'COLD' | 'DESCARTADO'
  telefone?: string
  municipio?: string
  uf?: string
  capital_social?: number
  funcionarios?: string
  socios?: string
  saas?: string
  serasa?: string
  website?: string
  motivos?: string[]
  data_abertura?: string
  cnae?: string
  porte?: string
  tem_socio_ligado_ti?: boolean
}

interface EtapaStatus {
  numero: number
  nome: string
  status: 'aguardando' | 'executando' | 'concluido' | 'erro'
  resultado?: string
  iniciadoEm?: number   // timestamp ms — para detectar timeout
}

interface ResumoProspeccao {
  total_pesquisadas: number
  hot: number
  warm: number
  cold: number
  descartados: number
  com_telefone: number
}

// ── Toast inline ──────────────────────────────────────────────────────────────
interface ToastMsg { id: number; type: 'success' | 'error'; text: string }

function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const counter = useRef(0)

  const toast = useCallback((type: 'success' | 'error', text: string) => {
    const id = ++counter.current
    setToasts(p => [...p, { id, type, text }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }, [])

  const ToastContainer = () => (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium shadow-lg pointer-events-auto transition-all ${
            t.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {t.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {t.text}
        </div>
      ))}
    </div>
  )

  return { toast, ToastContainer }
}

// ── Badges ────────────────────────────────────────────────────────────────────
function ClassificacaoBadge({ c }: { c: EmpresaResultado['classificacao'] }) {
  const map = {
    HOT:       { label: '🔥 HOT',       cls: 'bg-red-900/60 text-red-300 border-red-700' },
    WARM:      { label: '⚡ WARM',      cls: 'bg-amber-900/60 text-amber-300 border-amber-700' },
    COLD:      { label: '❄️ COLD',      cls: 'bg-blue-900/60 text-blue-300 border-blue-700' },
    DESCARTADO:{ label: '❌ Descart.',  cls: 'bg-slate-800 text-slate-500 border-slate-700' },
  }
  const { label, cls } = map[c]
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>
}

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 75 ? 'text-red-400' : score >= 55 ? 'text-amber-400' : score >= 35 ? 'text-blue-400' : 'text-slate-500'
  return <span className={`font-bold text-sm ${cls}`}>{score}/100</span>
}

function SerasaBadge({ serasa }: { serasa?: string }) {
  if (!serasa) return null
  const upper = serasa.toUpperCase()
  if (upper.includes('LIMPO') || upper.includes('CLEAN'))
    return <span className="text-[10px] font-semibold bg-emerald-900/50 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full">✅ Limpo</span>
  if (upper.includes('NEGAT'))
    return <span className="text-[10px] font-semibold bg-red-900/50 text-red-300 border border-red-700 px-2 py-0.5 rounded-full">❌ Negativado</span>
  return <span className="text-[10px] font-semibold bg-amber-900/50 text-amber-300 border border-amber-700 px-2 py-0.5 rounded-full">⚠️ Pendências</span>
}

// ── Drawer de detalhes ────────────────────────────────────────────────────────
function DrawerDetalhes({
  empresa,
  onClose,
  onEnviarCRM,
}: {
  empresa: EmpresaResultado
  onClose: () => void
  onEnviarCRM: (e: EmpresaResultado) => void
}) {
  const [aba, setAba] = useState<'resumo' | 'cnpj' | 'socios' | 'saas' | 'score'>('resumo')

  const nome = empresa.nome || empresa.razao_social

  const anosNoMercado = empresa.data_abertura
    ? Math.floor((Date.now() - new Date(empresa.data_abertura).getTime()) / (1000 * 60 * 60 * 24 * 365))
    : null

  const saasLista = empresa.saas ? empresa.saas.split(',').map(s => s.trim()).filter(Boolean) : []

  const motivos = empresa.motivos || []

  const abas = [
    { id: 'resumo', label: '📋 Resumo' },
    { id: 'cnpj',   label: '🏢 CNPJ' },
    { id: 'socios', label: '👥 Sócios' },
    { id: 'saas',   label: '💻 SaaS' },
    { id: 'score',  label: '📊 Score' },
  ] as const

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div
        className="bg-slate-900 border-l border-slate-700 w-full max-w-md h-full flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-800">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <ClassificacaoBadge c={empresa.classificacao} />
              <ScoreBadge score={empresa.score} />
            </div>
            <h2 className="text-white font-bold text-base truncate">{nome}</h2>
            {empresa.municipio && (
              <p className="text-slate-400 text-xs mt-0.5">{empresa.municipio}/{empresa.uf}</p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 ml-3 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-800 overflow-x-auto custom-scrollbar">
          {abas.map(a => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                aba === a.id
                  ? 'text-violet-400 border-violet-500'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {aba === 'resumo' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 rounded-xl p-4 text-center">
                <p className={`text-5xl font-black mb-1 ${empresa.score >= 75 ? 'text-red-400' : empresa.score >= 55 ? 'text-amber-400' : empresa.score >= 35 ? 'text-blue-400' : 'text-slate-500'}`}>
                  {empresa.score}
                </p>
                <p className="text-slate-400 text-xs">pontos de 100</p>
              </div>
              <div className="space-y-2.5">
                {[
                  { icon: Building2, label: 'Razão Social', value: empresa.razao_social },
                  { icon: ClipboardList, label: 'CNPJ', value: empresa.cnpj, mono: true },
                  { icon: Phone, label: 'Telefone', value: empresa.telefone, copy: true },
                  { icon: Globe, label: 'Website', value: empresa.website },
                  { icon: MapPin, label: 'Endereço', value: empresa.municipio ? `${empresa.municipio}/${empresa.uf}` : undefined },
                ].filter(r => r.value).map(row => (
                  <div key={row.label} className="flex items-start gap-3">
                    <row.icon className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-500 text-[10px]">{row.label}</p>
                      <div className="flex items-center gap-1">
                        <p className={`text-slate-200 text-sm ${row.mono ? 'font-mono' : ''} truncate`}>{row.value}</p>
                        {row.copy && row.value && (
                          <button
                            onClick={() => navigator.clipboard.writeText(row.value!)}
                            className="text-slate-600 hover:text-violet-400 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {empresa.serasa && (
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <div>
                      <p className="text-slate-500 text-[10px]">Serasa</p>
                      <SerasaBadge serasa={empresa.serasa} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {aba === 'cnpj' && (
            <div className="space-y-3">
              {[
                { label: 'Situação', value: 'ATIVA' },
                { label: 'Capital Social', value: empresa.capital_social ? `R$ ${empresa.capital_social.toLocaleString('pt-BR')}` : undefined },
                { label: 'Data de Abertura', value: empresa.data_abertura ? new Date(empresa.data_abertura).toLocaleDateString('pt-BR') : undefined },
                { label: 'Tempo no Mercado', value: anosNoMercado !== null ? `${anosNoMercado} anos no mercado` : undefined },
                { label: 'CNAE', value: empresa.cnae },
                { label: 'Porte', value: empresa.porte },
                { label: 'UF', value: empresa.uf },
              ].filter(r => r.value).map(row => (
                <div key={row.label} className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-slate-500 text-[10px] mb-0.5">{row.label}</p>
                  <p className="text-slate-200 text-sm">{row.value}</p>
                </div>
              ))}
            </div>
          )}

          {aba === 'socios' && (
            <div className="space-y-3">
              {empresa.socios ? (
                empresa.socios.split(',').map(s => s.trim()).filter(Boolean).map((socio, i) => (
                  <div key={i} className="bg-slate-800/50 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-slate-200 text-sm">{socio}</p>
                      <p className="text-slate-500 text-xs mt-0.5">Sócio</p>
                    </div>
                    {empresa.tem_socio_ligado_ti && i === 0 && (
                      <span className="text-[10px] font-semibold bg-violet-900/50 text-violet-300 border border-violet-700 px-2 py-0.5 rounded-full">
                        Ligado a TI
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-sm">Nenhum sócio identificado</p>
              )}
            </div>
          )}

          {aba === 'saas' && (
            <div className="space-y-3">
              <div className="mb-3">
                <SerasaBadge serasa={empresa.serasa} />
              </div>
              {saasLista.length > 0 ? (
                saasLista.map((s, i) => {
                  const erp = s.toLowerCase().includes('totvs') || s.toLowerCase().includes('sap') || s.toLowerCase().includes('erp')
                  return (
                    <div key={i} className={`rounded-lg p-3 flex items-center gap-2 ${erp ? 'bg-red-900/20 border border-red-800/50' : 'bg-slate-800/50'}`}>
                      <Cpu className={`w-4 h-4 flex-shrink-0 ${erp ? 'text-red-400' : 'text-violet-400'}`} />
                      <span className={`text-sm ${erp ? 'text-red-300' : 'text-slate-200'}`}>{s}</span>
                      {erp && <span className="text-[10px] text-red-400 ml-auto">concorrente</span>}
                    </div>
                  )
                })
              ) : (
                <p className="text-slate-500 text-sm">Nenhum SaaS detectado</p>
              )}
            </div>
          )}

          {aba === 'score' && (
            <div className="space-y-3">
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-400 text-xs">Pontuação Total</span>
                  <ScoreBadge score={empresa.score} />
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${empresa.score >= 75 ? 'bg-red-500' : empresa.score >= 55 ? 'bg-amber-500' : empresa.score >= 35 ? 'bg-blue-500' : 'bg-slate-600'}`}
                    style={{ width: `${empresa.score}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                {motivos.length > 0 ? motivos.map((m, i) => (
                  <div key={i} className="flex items-start gap-2 bg-slate-800/50 rounded-lg p-2.5">
                    <TrendingUp className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300 text-xs">{m}</span>
                  </div>
                )) : (
                  <p className="text-slate-500 text-sm">Detalhamento não disponível</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="p-4 border-t border-slate-800 flex gap-2">
          <button
            onClick={() => onEnviarCRM(empresa)}
            className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            <ArrowRight className="w-4 h-4" /> Enviar para CRM
          </button>
          {empresa.telefone && (
            <button
              onClick={() => navigator.clipboard.writeText(empresa.telefone!)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm px-3 py-2.5 rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Links de auditoria por etapa ──────────────────────────────────────────────
function getAuditLinks(nr: number, segmento: string, regiao: string) {
  const q = (s: string) => encodeURIComponent(s)
  const links: Record<number, { label: string; url: string }[]> = {
    1: [
      { label: 'Google Search',    url: `https://www.google.com/search?q=${q(`"${segmento}" "${regiao}" empresa CNPJ`)}` },
      { label: 'Receita Federal',  url: `https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp` },
    ],
    2: [
      { label: 'Google Maps',      url: `https://www.google.com/maps/search/${q(`${segmento} ${regiao}`)}` },
      { label: 'Telefones Google', url: `https://www.google.com/search?q=${q(`${segmento} telefone ${regiao}`)}` },
    ],
    3: [
      { label: 'Consulta CNPJ RF', url: `https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp` },
      { label: 'CNPJ.info',        url: `https://www.cnpj.info.br/` },
    ],
    4: [
      { label: 'Capital Social',   url: `https://www.google.com/search?q=${q(`capital social ${segmento} ${regiao}`)}` },
    ],
    5: [
      { label: 'LinkedIn Empresas',url: `https://www.linkedin.com/search/results/companies/?keywords=${q(`${segmento} ${regiao}`)}` },
      { label: 'Funcionários',     url: `https://www.google.com/search?q=${q(`"${segmento}" "${regiao}" número de funcionários`)}` },
    ],
    6: [
      { label: 'LinkedIn Pessoas', url: `https://www.linkedin.com/search/results/people/?keywords=${q(`sócios ${segmento} ${regiao}`)}` },
    ],
    7: [
      { label: 'Serasa Experian',  url: `https://www.serasaexperian.com.br/` },
      { label: 'SPC Brasil',       url: `https://www.spcbrasil.org.br/` },
    ],
    8: [
      { label: 'SaaS usados',      url: `https://www.google.com/search?q=${q(`${segmento} software sistema ERP ${regiao}`)}` },
    ],
    9: [],
  }
  return links[nr] || []
}

// ── PipelineProgress ──────────────────────────────────────────────────────────
const TIMEOUT_WARN_MS = 90_000  // 90 segundos

function PipelineProgress({
  etapas,
  logs,
  segmento,
  regiao,
  empresas,
  etapasDados,
}: {
  etapas: EtapaStatus[]
  logs: string[]
  segmento: string
  regiao: string
  empresas: EmpresaResultado[]
  etapasDados: Record<number, Partial<EmpresaResultado>[]>
}) {
  const logsRef = useRef<HTMLDivElement>(null)
  const [agora, setAgora] = useState(Date.now())

  // Atualiza "agora" a cada 5s para detecção de timeout
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight
  }, [logs])

  return (
    <div className="flex gap-4 h-full">
      {/* Etapas */}
      <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar">
        {etapas.map(e => {
          const travado = e.status === 'executando' && e.iniciadoEm !== undefined && (agora - e.iniciadoEm) > TIMEOUT_WARN_MS
          const auditLinks = getAuditLinks(e.numero, segmento, regiao)

          return (
            <div
              key={e.numero}
              className={`rounded-lg border transition-all ${
                travado                   ? 'bg-amber-950/30 border-amber-700/60' :
                e.status === 'executando' ? 'bg-violet-900/30 border-violet-700/50' :
                e.status === 'concluido'  ? 'bg-slate-800/40 border-slate-700/40' :
                e.status === 'erro'       ? 'bg-red-900/20 border-red-800/50' :
                'bg-slate-800/20 border-transparent'
              }`}
            >
              {/* Linha principal */}
              <div className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                  {e.status === 'aguardando'  && <Circle      className="w-4 h-4 text-slate-600" />}
                  {e.status === 'executando'  && !travado && <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />}
                  {e.status === 'executando'  && travado  && <AlertCircle className="w-4 h-4 text-amber-400" />}
                  {e.status === 'concluido'   && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                  {e.status === 'erro'        && <AlertCircle className="w-4 h-4 text-red-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-medium ${
                      travado                   ? 'text-amber-300' :
                      e.status === 'executando' ? 'text-violet-300' :
                      e.status === 'concluido'  ? 'text-slate-300' :
                      e.status === 'erro'       ? 'text-red-400'   : 'text-slate-600'
                    }`}>
                      {e.numero}. {e.nome}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {e.resultado && (
                        <span className="text-[10px] text-emerald-400">{e.resultado}</span>
                      )}
                      {travado && (
                        <span className="text-[10px] text-amber-400 animate-pulse">⏱ Demorando...</span>
                      )}
                    </div>
                  </div>
                  {travado && (
                    <p className="text-[10px] text-amber-500 mt-0.5">
                      Etapa parada há {Math.round((agora - e.iniciadoEm!) / 1000)}s — provável timeout na API externa
                    </p>
                  )}
                </div>

              </div>

              {/* Relatório de auditoria — abre automaticamente ao concluir */}
              {e.status === 'concluido' && (
                <div className="px-3 pb-3 border-t border-slate-700/40 pt-2.5">
                  <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-2">
                    🔍 Auditoria — Etapa {e.numero}
                  </p>

                  {/* Links de verificação da etapa */}
                  {auditLinks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {auditLinks.map(link => (
                        <a
                          key={link.label}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] bg-slate-700/60 hover:bg-violet-900/40 text-slate-300 hover:text-violet-300 border border-slate-600/50 hover:border-violet-700/50 px-2 py-1 rounded-full transition-colors"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          {link.label}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Dados por empresa — usa etapasDados (tempo real) */}
                  {(() => {
                    const dadosEtapa = etapasDados[e.numero]
                    const dadosFinais = e.numero === 9
                      ? empresas
                      : (dadosEtapa?.length ? dadosEtapa : empresas.map(emp => emp as Partial<EmpresaResultado>))
                    const listaEmpresasAtiva = dadosEtapa?.length ? dadosEtapa : dadosFinais
                    if (!listaEmpresasAtiva.length) return null
                    return (
                    <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                      {/* Etapa 2 — foco nos telefones coletados */}
                      {e.numero === 2 && (
                        <>
                          <p className="text-slate-500 text-[10px] mb-1.5">📞 Telefones coletados:</p>
                          {listaEmpresasAtiva
                            .filter(emp => emp.telefone)
                            .map((emp, i) => {
                              const nome = emp.nome || emp.razao_social || ''
                              const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(`${nome} ${emp.municipio || regiao}`)}`
                              return (
                                <div key={i} className="flex items-center gap-2 bg-slate-800/60 px-2 py-1.5 rounded">
                                  <Phone className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                  <span className="text-slate-300 text-[10px] truncate flex-1">{nome}</span>
                                  <span className="text-emerald-400 text-[10px] font-mono flex-shrink-0">{emp.telefone}</span>
                                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-violet-400 flex-shrink-0">
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                              )
                            })}
                          {listaEmpresasAtiva.filter(emp => emp.telefone).length === 0 && (
                            <p className="text-slate-600 text-[10px] italic">Nenhum telefone coletado ainda</p>
                          )}
                        </>
                      )}

                      {/* Etapa 3 — CNPJ com link para Receita Federal */}
                      {e.numero === 3 && (
                        <>
                          <p className="text-slate-500 text-[10px] mb-1.5">🏢 CNPJs validados:</p>
                          {listaEmpresasAtiva.map((emp, i) => {
                            const nome = emp.nome || emp.razao_social || ''
                            const receitaUrl = emp.cnpj
                              ? `https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp`
                              : `https://www.google.com/search?q=${encodeURIComponent(`CNPJ "${nome}"`)}`
                            return (
                              <a key={i} href={receitaUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-slate-800/60 hover:bg-slate-700/60 px-2 py-1.5 rounded group">
                                <span className="text-slate-400 text-[10px] truncate flex-1">{nome}</span>
                                {emp.cnpj && <span className="text-slate-500 text-[10px] font-mono flex-shrink-0">{emp.cnpj}</span>}
                                <ExternalLink className="w-2.5 h-2.5 text-slate-600 group-hover:text-violet-400 flex-shrink-0" />
                              </a>
                            )
                          })}
                        </>
                      )}

                      {/* Etapa 4 — Capital social */}
                      {e.numero === 4 && (
                        <>
                          <p className="text-slate-500 text-[10px] mb-1.5">💰 Capital social das empresas ativas:</p>
                          {listaEmpresasAtiva.map((emp, i) => {
                            const nome = emp.nome || emp.razao_social || ''
                            const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(`"${nome}" capital social CNPJ`)}`
                            return (
                              <a key={i} href={googleUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-slate-800/60 hover:bg-slate-700/60 px-2 py-1.5 rounded group">
                                <span className="text-slate-400 text-[10px] truncate flex-1">{nome}</span>
                                {emp.capital_social && (
                                  <span className="text-emerald-400 text-[10px] flex-shrink-0">
                                    R$ {emp.capital_social.toLocaleString('pt-BR')}
                                  </span>
                                )}
                                <ExternalLink className="w-2.5 h-2.5 text-slate-600 group-hover:text-violet-400 flex-shrink-0" />
                              </a>
                            )
                          })}
                        </>
                      )}

                      {/* Etapas 1, 5-8: lista geral com Google link */}
                      {(e.numero === 1 || (e.numero >= 5 && e.numero <= 8)) && (
                        <>
                          <p className="text-slate-500 text-[10px] mb-1.5">
                            {e.numero === 1 && '🔎 Empresas descobertas:'}
                            {e.numero === 5 && '👥 Estimativa de funcionários:'}
                            {e.numero === 6 && '🤝 Sócios identificados:'}
                            {e.numero === 7 && '🛡 Situação Serasa:'}
                            {e.numero === 8 && '💻 SaaS detectados:'}
                          </p>
                          {listaEmpresasAtiva.map((emp, i) => {
                            const nome = emp.nome || emp.razao_social || ''
                            const googleUrl = emp.cnpj
                              ? `https://www.google.com/search?q=${encodeURIComponent(`"${emp.cnpj}"`)}`
                              : `https://www.google.com/search?q=${encodeURIComponent(`"${nome}" ${regiao}`)}`
                            const detalhe =
                              e.numero === 5 ? emp.funcionarios :
                              e.numero === 6 ? emp.socios?.split(',')[0]?.trim() :
                              e.numero === 7 ? emp.serasa :
                              e.numero === 8 ? emp.saas?.split(',')[0]?.trim() :
                              undefined
                            return (
                              <a key={i} href={googleUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-slate-800/60 hover:bg-slate-700/60 px-2 py-1.5 rounded group">
                                <span className="text-slate-300 text-[10px] truncate flex-1">{nome}</span>
                                {detalhe && <span className="text-slate-500 text-[10px] truncate max-w-[120px] flex-shrink-0">{detalhe}</span>}
                                {emp.website && e.numero === 1 && (
                                  <span className="text-violet-500 text-[10px] truncate max-w-[100px] flex-shrink-0">{emp.website.replace(/^https?:\/\//, '')}</span>
                                )}
                                <ExternalLink className="w-2.5 h-2.5 text-slate-600 group-hover:text-violet-400 flex-shrink-0" />
                              </a>
                            )
                          })}
                        </>
                      )}

                      {/* Etapa 9 — score final com badge de classificação */}
                      {e.numero === 9 && (
                        <>
                          <p className="text-slate-500 text-[10px] mb-1.5">🏆 Score final das empresas qualificadas:</p>
                          {(listaEmpresasAtiva as EmpresaResultado[])
                            .filter(emp => emp.classificacao !== 'DESCARTADO')
                            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                            .map((emp, i) => {
                              const nome = emp.nome || emp.razao_social || ''
                              const googleUrl = emp.cnpj
                                ? `https://www.google.com/search?q=${encodeURIComponent(`"${emp.cnpj}"`)}`
                                : `https://www.google.com/search?q=${encodeURIComponent(`"${nome}" ${regiao}`)}`
                              return (
                                <a key={i} href={googleUrl} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 bg-slate-800/60 hover:bg-slate-700/60 px-2 py-1.5 rounded group">
                                  <span className="text-slate-300 text-[10px] truncate flex-1">{nome}</span>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <ClassificacaoBadge c={emp.classificacao} />
                                    <span className="text-slate-500 text-[10px]">{emp.score}/100</span>
                                    <ExternalLink className="w-2.5 h-2.5 text-slate-600 group-hover:text-violet-400" />
                                  </div>
                                </a>
                              )
                            })}
                        </>
                      )}
                    </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Logs */}
      <div className="w-72 flex-shrink-0 bg-slate-950 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
        <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider px-3 pt-3 pb-1.5">Log em tempo real</p>
        <div ref={logsRef} className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 custom-scrollbar">
          {logs.length === 0 && <p className="text-slate-600 text-xs italic">Aguardando...</p>}
          {logs.map((log, i) => (
            <p key={i} className="text-slate-400 text-[11px] leading-relaxed">{log}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Kanban card ───────────────────────────────────────────────────────────────
function KanbanCard({
  empresa,
  onDetalhes,
  onCRM,
}: {
  empresa: EmpresaResultado
  onDetalhes: () => void
  onCRM: () => void
}) {
  const nome = empresa.nome || empresa.razao_social
  const socios = empresa.socios
    ? empresa.socios.split(',').map(s => s.trim()).filter(Boolean).slice(0, 2)
    : []
  const saasLista = empresa.saas
    ? empresa.saas.split(',').map(s => s.trim()).filter(Boolean).slice(0, 3)
    : []

  return (
    <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-3 hover:border-slate-600 transition-all group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-xs leading-tight truncate">{nome}</p>
          {empresa.municipio && (
            <p className="text-slate-500 text-[10px] mt-0.5">{empresa.municipio}/{empresa.uf}</p>
          )}
        </div>
        <ScoreBadge score={empresa.score} />
      </div>

      {empresa.telefone && (
        <div className="flex items-center gap-1.5 mb-2">
          <Phone className="w-3 h-3 text-slate-500" />
          <span className="text-slate-300 text-[11px] font-mono flex-1 truncate">{empresa.telefone}</span>
          <button
            onClick={() => navigator.clipboard.writeText(empresa.telefone!)}
            className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-violet-400 transition-all"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
      )}

      {socios.length > 0 && (
        <div className="flex items-center gap-1 mb-2">
          <Users className="w-3 h-3 text-slate-500 flex-shrink-0" />
          <p className="text-slate-400 text-[10px] truncate">{socios.join(', ')}</p>
        </div>
      )}

      {saasLista.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {saasLista.map((s, i) => (
            <span key={i} className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">{s}</span>
          ))}
        </div>
      )}

      {empresa.serasa && <div className="mb-2"><SerasaBadge serasa={empresa.serasa} /></div>}

      <div className="flex gap-1.5 mt-2">
        <button
          onClick={onDetalhes}
          className="flex-1 text-[10px] text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded py-1 transition-colors"
        >
          Ver detalhes
        </button>
        <button
          onClick={onCRM}
          className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-white bg-violet-900/30 hover:bg-violet-700 rounded px-2 py-1 transition-colors"
        >
          <ArrowRight className="w-3 h-3" /> CRM
        </button>
      </div>
    </div>
  )
}

// ── Aba Empresas (Kanban) ─────────────────────────────────────────────────────
function AbaEmpresas({
  empresas,
  onDetalhes,
  onCRM,
}: {
  empresas: EmpresaResultado[]
  onDetalhes: (e: EmpresaResultado) => void
  onCRM: (e: EmpresaResultado) => void
}) {
  const [descartadosAbertos, setDescartadosAbertos] = useState(false)

  const hot = empresas.filter(e => e.classificacao === 'HOT')
  const warm = empresas.filter(e => e.classificacao === 'WARM')
  const cold = empresas.filter(e => e.classificacao === 'COLD')
  const descartados = empresas.filter(e => e.classificacao === 'DESCARTADO')

  if (empresas.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Nenhuma empresa ainda</p>
          <p className="text-slate-600 text-xs mt-1">Execute uma campanha para ver os resultados aqui</p>
        </div>
      </div>
    )
  }

  const colunas = [
    { titulo: '🔥 HOT', subtitulo: `${hot.length} empresas`, lista: hot, bg: 'bg-red-950/30', border: 'border-red-900/50' },
    { titulo: '⚡ WARM', subtitulo: `${warm.length} empresas`, lista: warm, bg: 'bg-amber-950/30', border: 'border-amber-900/50' },
    { titulo: '❄️ COLD', subtitulo: `${cold.length} empresas`, lista: cold, bg: 'bg-blue-950/30', border: 'border-blue-900/50' },
  ]

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
      {/* Colunas */}
      <div className="flex gap-3 flex-1 overflow-hidden">
        {colunas.map(col => (
          <div key={col.titulo} className={`flex-1 flex flex-col rounded-xl ${col.bg} border ${col.border} overflow-hidden min-w-0`}>
            <div className="px-3 py-2.5 border-b border-slate-800/50">
              <p className="text-white font-bold text-sm">{col.titulo}</p>
              <p className="text-slate-500 text-[10px]">{col.subtitulo}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {col.lista.length === 0 ? (
                <p className="text-slate-700 text-xs text-center py-4">Nenhuma</p>
              ) : col.lista.map((e, i) => (
                <KanbanCard
                  key={e.cnpj || i}
                  empresa={e}
                  onDetalhes={() => onDetalhes(e)}
                  onCRM={() => onCRM(e)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Descartados colapsável */}
      {descartados.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex-shrink-0">
          <button
            onClick={() => setDescartadosAbertos(p => !p)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-medium">🗑 Descartados ({descartados.length})</span>
            </div>
            {descartadosAbertos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {descartadosAbertos && (
            <div className="px-3 pb-3 grid grid-cols-4 gap-2">
              {descartados.map((e, i) => (
                <KanbanCard
                  key={e.cnpj || i}
                  empresa={e}
                  onDetalhes={() => onDetalhes(e)}
                  onCRM={() => onCRM(e)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Formulário nova campanha ───────────────────────────────────────────────────
function FormNovaCampanha({
  onClose,
  onCriada,
  toast,
}: {
  onClose: () => void
  onCriada: (c: Campanha) => void
  toast: (type: 'success' | 'error', text: string) => void
}) {
  const [nome, setNome] = useState('')
  const [segmentos, setSegmentos] = useState('')
  const [regioes, setRegioes] = useState('')
  const [capitalMin, setCapitalMin] = useState('30000')
  const [meta, setMeta] = useState('20')
  const [salvando, setSalvando] = useState(false)

  const handleSalvar = async () => {
    if (!nome.trim() || !segmentos.trim() || !regioes.trim()) return
    setSalvando(true)
    try {
      const { data, error } = await supabase
        .from('prosp_campanhas')
        .insert({
          tenant_id: TENANT_ID,
          nome: nome.trim(),
          segmentos: segmentos.split(',').map(s => s.trim()).filter(Boolean),
          regioes: regioes.split(',').map(s => s.trim()).filter(Boolean),
          capital_min: Number(capitalMin) || 30000,
          meta_empresas: Number(meta) || 20,
          status: 'rascunho',
        })
        .select()
        .single()

      if (error) throw error
      toast('success', 'Campanha criada!')
      onCriada(data as Campanha)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast('error', `Erro ao criar campanha: ${msg}`)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-5">
      <h3 className="text-white font-semibold text-sm mb-4">Nova Campanha</h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="col-span-2">
          <label className="text-slate-400 text-xs mb-1 block">Nome da Campanha *</label>
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Ex: Construção Civil SP — Mar/2026"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="text-slate-400 text-xs mb-1 block">Segmentos * <span className="text-slate-600">(separar por vírgula)</span></label>
          <input
            value={segmentos}
            onChange={e => setSegmentos(e.target.value)}
            placeholder="Ex: construção civil, construtoras"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="text-slate-400 text-xs mb-1 block">Regiões * <span className="text-slate-600">(separar por vírgula)</span></label>
          <input
            value={regioes}
            onChange={e => setRegioes(e.target.value)}
            placeholder="Ex: São Paulo SP, ABC Paulista"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="text-slate-400 text-xs mb-1 block">Capital mínimo (R$)</label>
          <input
            type="number"
            value={capitalMin}
            onChange={e => setCapitalMin(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="text-slate-400 text-xs mb-1 block">Meta de empresas</label>
          <input
            type="number"
            value={meta}
            onChange={e => setMeta(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSalvar}
          disabled={!nome.trim() || !segmentos.trim() || !regioes.trim() || salvando}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {salvando ? 'Salvando...' : 'Criar Campanha'}
        </button>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ── ProspeccaoView ─────────────────────────────────────────────────────────────
export default function ProspeccaoView() {
  const { toast, ToastContainer } = useToast()

  // Abas
  const [aba, setAba] = useState<'campanhas' | 'execucao' | 'empresas'>('campanhas')

  // Campanhas
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [loadingCampanhas, setLoadingCampanhas] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Execução
  const [campanhaExecutando, setCampanhaExecutando] = useState<Campanha | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [etapas, setEtapas] = useState<EtapaStatus[]>(
    ETAPAS_NOMES.map((nome, i) => ({ numero: i + 1, nome, status: 'aguardando' }))
  )
  const [logs, setLogs] = useState<string[]>([])
  const [resumo, setResumo] = useState<ResumoProspeccao | null>(null)

  // Empresas
  const [empresas, setEmpresas] = useState<EmpresaResultado[]>([])
  const [empresaDrawer, setEmpresaDrawer] = useState<EmpresaResultado | null>(null)
  // Dados por etapa — preenchidos em tempo real conforme cada etapa emite empresas
  const [etapasDados, setEtapasDados] = useState<Record<number, Partial<EmpresaResultado>[]>>({})

  // Carregar campanhas
  const carregarCampanhas = useCallback(async () => {
    setLoadingCampanhas(true)
    const { data, error } = await supabase
      .from('prosp_campanhas')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false })

    if (error) {
      toast('error', `Erro ao carregar campanhas: ${error.message}`)
    } else {
      setCampanhas((data as Campanha[]) || [])
    }
    setLoadingCampanhas(false)
  }, [toast])

  useEffect(() => { carregarCampanhas() }, [carregarCampanhas])

  // Carregar empresas de uma campanha já executada
  const carregarEmpresasDaCampanha = useCallback(async (campanhaId: string) => {
    const { data, error } = await supabase
      .from('prosp_empresas')
      .select('*')
      .eq('campanha_id', campanhaId)
      .order('score_total', { ascending: false })

    if (!error && data && data.length > 0) {
      const mapped: EmpresaResultado[] = data.map((r: Record<string, unknown>) => ({
        nome: r.nome_fantasia as string,
        razao_social: (r.razao_social as string) || (r.nome as string) || '',
        cnpj: r.cnpj as string,
        score: (r.score_total as number) || 0,
        classificacao: (r.classificacao as EmpresaResultado['classificacao']) || 'COLD',
        telefone: r.telefone as string,
        municipio: r.municipio as string,
        uf: r.uf as string,
        capital_social: r.capital_social as number,
        funcionarios: r.funcionarios as string,
        socios: r.socios as string,
        saas: r.saas as string,
        serasa: r.serasa as string,
        website: r.website as string,
        motivos: (r.motivos as string[]) || [],
        data_abertura: r.data_abertura as string,
        cnae: r.cnae as string,
        porte: r.porte as string,
        tem_socio_ligado_ti: r.tem_socio_ligado_ti as boolean,
      }))
      setEmpresas(mapped)
    }
  }, [])

  // Executar prospecção via SSE
  const executarProspeccao = useCallback(async (campanha: Campanha) => {
    setCampanhaExecutando(campanha)
    setIsRunning(true)
    setEtapas(ETAPAS_NOMES.map((nome, i) => ({ numero: i + 1, nome, status: 'aguardando' })))
    setLogs([])
    setEmpresas([])
    setEtapasDados({})
    setResumo(null)
    setAba('execucao')

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ia-prospeccao`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          segmento: campanha.segmentos[0],
          regiao: campanha.regioes[0],
          meta: campanha.meta_empresas,
          capital_min: campanha.capital_min,
          tenant_id: TENANT_ID,
          campanha_id: campanha.id,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const linhas = buffer.split('\n')
        buffer = linhas.pop() || ''

        for (const linha of linhas) {
          if (!linha.startsWith('data: ')) continue
          try {
            const evento = JSON.parse(linha.slice(6))

            switch (evento.type) {
              case 'etapa':
                setEtapas(prev => prev.map(e =>
                  e.numero === evento.numero
                    ? {
                        ...e,
                        status: evento.status === 'iniciando' ? 'executando' : 'concluido',
                        resultado: evento.resultado,
                        iniciadoEm: evento.status === 'iniciando' ? Date.now() : e.iniciadoEm,
                      }
                    : e
                ))
                // Captura dados de empresas emitidos por etapa em tempo real
                if (evento.status === 'concluido' && Array.isArray(evento.empresas) && evento.empresas.length > 0) {
                  setEtapasDados(prev => ({ ...prev, [evento.numero]: evento.empresas }))
                }
                break
              case 'progresso':
                setLogs(prev => [...prev.slice(-19), evento.mensagem])
                break
              case 'relatorio':
                setEmpresas(evento.empresas || [])
                setResumo(evento.resumo || null)
                break
              case 'done':
                setIsRunning(false)
                setAba('empresas')
                toast('success', `Prospecção concluída! ${evento.qualificados} empresas qualificadas.`)
                carregarCampanhas()
                break
              case 'error':
                setIsRunning(false)
                toast('error', `Erro na prospecção: ${evento.message}`)
                break
            }
          } catch {
            // linha incompleta, ignorar
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast('error', `Erro ao executar prospecção: ${msg}`)
      setIsRunning(false)
    }
  }, [toast, carregarCampanhas])

  // Enviar para CRM
  const enviarParaCRM = useCallback(async (empresa: EmpresaResultado) => {
    const { data: funis, error: funiErr } = await supabase
      .from('crm_funis')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .limit(1)

    if (funiErr || !funis?.length) {
      toast('error', 'Nenhum funil CRM configurado')
      return
    }

    const funilId = funis[0].id

    const { data: etapasData } = await supabase
      .from('crm_funil_etapas')
      .select('id')
      .eq('funil_id', funilId)
      .order('ordem', { ascending: true })
      .limit(1)

    const { error } = await supabase
      .from('crm_negociacoes')
      .insert({
        tenant_id: TENANT_ID,
        funil_id: funilId,
        etapa_id: etapasData?.[0]?.id,
        titulo: `[ZIA] ${empresa.nome || empresa.razao_social}`,
        empresa: empresa.razao_social,
        cnpj: empresa.cnpj,
        telefone: empresa.telefone,
        cidade: empresa.municipio,
        estado: empresa.uf,
        observacoes: `🤖 Lead gerado pela ZIA Pesquisa\nScore: ${empresa.score}/100 (${empresa.classificacao})\nCapital: R$ ${empresa.capital_social?.toLocaleString('pt-BR') || 'N/A'}\nFuncionários: ${empresa.funcionarios || 'N/A'}\nSócios: ${empresa.socios || 'N/A'}\nSaaS detectados: ${empresa.saas || 'Nenhum'}\nSerasa: ${empresa.serasa || 'Não consultado'}`,
        origem: 'ZIA_PROSPECCAO',
      })

    if (error) {
      toast('error', `Erro ao enviar para CRM: ${error.message}`)
    } else {
      toast('success', 'Lead enviado para o CRM!')
    }
  }, [toast])

  // Ao clicar em uma campanha concluída → carregar empresas
  const abrirCampanha = useCallback((campanha: Campanha) => {
    setCampanhaExecutando(campanha)
    if (campanha.status === 'concluido') {
      carregarEmpresasDaCampanha(campanha.id)
      setAba('empresas')
    }
  }, [carregarEmpresasDaCampanha])

  const abas = [
    { id: 'campanhas', label: 'Campanhas', icon: Search },
    { id: 'execucao',  label: isRunning ? 'Executando...' : 'Execução', icon: isRunning ? Loader2 : Play },
    { id: 'empresas',  label: `Empresas${empresas.length ? ` (${empresas.length})` : ''}`, icon: Building2 },
  ] as const

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
      <ToastContainer />

      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-0 border-b border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-white font-bold text-xl">Prospecção de Leads</h1>
            {campanhaExecutando && (
              <p className="text-slate-500 text-xs mt-0.5">
                Campanha: <span className="text-violet-400">{campanhaExecutando.nome}</span>
              </p>
            )}
          </div>
          {resumo && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-red-400 font-semibold">🔥 {resumo.hot} HOT</span>
              <span className="text-amber-400 font-semibold">⚡ {resumo.warm} WARM</span>
              <span className="text-blue-400 font-semibold">❄️ {resumo.cold} COLD</span>
              <span className="text-slate-500">📞 {resumo.com_telefone} c/ tel.</span>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {abas.map(a => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
                aba === a.id
                  ? 'text-violet-400 border-violet-500 bg-slate-800/50'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <a.icon className={`w-4 h-4 ${a.id === 'execucao' && isRunning ? 'animate-spin' : ''}`} />
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {/* ABA: Campanhas */}
        {aba === 'campanhas' && (
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-white font-bold text-base">Campanhas de Prospecção</h2>
                <p className="text-slate-500 text-xs mt-0.5">Crie e gerencie campanhas de captação de leads com IA</p>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> Nova Campanha
              </button>
            </div>

            {showForm && (
              <FormNovaCampanha
                onClose={() => setShowForm(false)}
                onCriada={c => setCampanhas(prev => [c, ...prev])}
                toast={toast}
              />
            )}

            {loadingCampanhas ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
              </div>
            ) : campanhas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="w-10 h-10 text-slate-700 mb-3" />
                <p className="text-slate-500 text-sm">Nenhuma campanha ainda</p>
                <p className="text-slate-600 text-xs mt-1">Crie sua primeira campanha para começar a prospectar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {campanhas.map(c => {
                  const pct = c.total_qualificadas && c.meta_empresas
                    ? Math.min(Math.round((c.total_qualificadas / c.meta_empresas) * 100), 100)
                    : 0
                  const statusMap: Record<string, { label: string; cls: string }> = {
                    rascunho:   { label: 'Rascunho',   cls: 'bg-slate-700/50 text-slate-400 border-slate-600' },
                    ativo:      { label: 'Ativo',      cls: 'bg-emerald-900/50 text-emerald-300 border-emerald-700' },
                    executando: { label: 'Executando', cls: 'bg-violet-900/50 text-violet-300 border-violet-700' },
                    concluido:  { label: 'Concluído',  cls: 'bg-slate-700/50 text-slate-400 border-slate-600' },
                  }
                  const st = statusMap[c.status] || statusMap.rascunho

                  return (
                    <div
                      key={c.id}
                      className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-white font-semibold text-sm">{c.nome}</h3>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Search className="w-3 h-3" />
                              {c.segmentos?.join(', ')}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {c.regioes?.join(', ')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(c.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-3 flex-shrink-0">
                          {c.status === 'concluido' && (
                            <button
                              onClick={() => abrirCampanha(c)}
                              className="text-xs text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Ver resultados
                            </button>
                          )}
                          {(c.status === 'rascunho' || c.status === 'ativo') && !isRunning && (
                            <button
                              onClick={() => executarProspeccao(c)}
                              className="flex items-center gap-1.5 text-xs text-white bg-violet-600 hover:bg-violet-700 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <Play className="w-3.5 h-3.5" /> Executar
                            </button>
                          )}
                          {isRunning && campanhaExecutando?.id === c.id && (
                            <button
                              onClick={() => setAba('execucao')}
                              className="flex items-center gap-1.5 text-xs text-violet-300 bg-violet-900/50 border border-violet-700 px-3 py-1.5 rounded-lg"
                            >
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Ver progresso
                            </button>
                          )}
                        </div>
                      </div>
                      {c.total_qualificadas !== undefined && (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                            <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[11px] text-slate-400 whitespace-nowrap">
                            {c.total_qualificadas}/{c.meta_empresas} empresas ({pct}%)
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ABA: Execução */}
        {aba === 'execucao' && (
          <div className="flex-1 overflow-hidden flex flex-col p-4 gap-3">
            <div className="flex items-center gap-3 flex-shrink-0">
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                  <span className="text-violet-300 text-sm font-medium">Prospecção em andamento...</span>
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 text-sm font-medium">Prospecção concluída</span>
                  {resumo && (
                    <span className="text-slate-400 text-xs">
                      — {resumo.total_pesquisadas} pesquisadas, {resumo.hot + resumo.warm + resumo.cold} qualificadas
                    </span>
                  )}
                </>
              )}
            </div>

            {campanhaExecutando ? (
              <div className="flex-1 overflow-hidden">
                <PipelineProgress
                  etapas={etapas}
                  logs={logs}
                  segmento={campanhaExecutando.segmentos?.[0] || ''}
                  regiao={campanhaExecutando.regioes?.[0] || ''}
                  empresas={empresas}
                  etapasDados={etapasDados}
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Play className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Nenhuma campanha em execução</p>
                  <p className="text-slate-600 text-xs mt-1">Vá em Campanhas e clique em Executar</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA: Empresas */}
        {aba === 'empresas' && (
          <AbaEmpresas
            empresas={empresas}
            onDetalhes={setEmpresaDrawer}
            onCRM={enviarParaCRM}
          />
        )}
      </div>

      {/* Drawer */}
      {empresaDrawer && (
        <DrawerDetalhes
          empresa={empresaDrawer}
          onClose={() => setEmpresaDrawer(null)}
          onEnviarCRM={async (e) => {
            await enviarParaCRM(e)
            setEmpresaDrawer(null)
          }}
        />
      )}
    </div>
  )
}

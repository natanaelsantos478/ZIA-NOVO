import { useState } from 'react'
import { Search, Building2, BarChart3, Plus, ExternalLink, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'

type Aba = 'campanhas' | 'empresas' | 'relatorio'

interface Campanha {
  id: string
  nome: string
  status: 'ativa' | 'pausada' | 'concluida'
  setor: string
  empresasAlvo: number
  empresasContadas: number
  criadaEm: string
}

interface Empresa {
  id: string
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  setor: string
  municipio: string
  uf: string
  situacao: 'ATIVA' | 'INAPTA' | 'BAIXADA'
  adicionadaEm: string
  campanha: string
}

const CAMPANHAS_MOCK: Campanha[] = [
  { id: '1', nome: 'Indústrias SP — Fev/2026', status: 'ativa', setor: 'Indústria', empresasAlvo: 120, empresasContadas: 47, criadaEm: '2026-02-10' },
  { id: '2', nome: 'Tech Startups — Jan/2026', status: 'concluida', setor: 'Tecnologia', empresasAlvo: 60, empresasContadas: 60, criadaEm: '2026-01-05' },
  { id: '3', nome: 'Varejo RJ — Mar/2026', status: 'pausada', setor: 'Varejo', empresasAlvo: 80, empresasContadas: 12, criadaEm: '2026-03-01' },
]

const EMPRESAS_MOCK: Empresa[] = [
  { id: '1', razaoSocial: 'ACME Indústria Ltda', nomeFantasia: 'ACME', cnpj: '12.345.678/0001-90', setor: 'Indústria', municipio: 'São Paulo', uf: 'SP', situacao: 'ATIVA', adicionadaEm: '2026-02-11', campanha: 'Indústrias SP — Fev/2026' },
  { id: '2', razaoSocial: 'Beta Tecnologia S.A.', nomeFantasia: 'Beta Tech', cnpj: '98.765.432/0001-10', setor: 'Tecnologia', municipio: 'Campinas', uf: 'SP', situacao: 'ATIVA', adicionadaEm: '2026-01-06', campanha: 'Tech Startups — Jan/2026' },
  { id: '3', razaoSocial: 'Gamma Comércio ME', nomeFantasia: 'Gamma', cnpj: '11.222.333/0001-44', setor: 'Varejo', municipio: 'Rio de Janeiro', uf: 'RJ', situacao: 'ATIVA', adicionadaEm: '2026-03-02', campanha: 'Varejo RJ — Mar/2026' },
  { id: '4', razaoSocial: 'Delta Serviços Eireli', nomeFantasia: 'Delta', cnpj: '55.666.777/0001-88', setor: 'Serviços', municipio: 'Belo Horizonte', uf: 'MG', situacao: 'INAPTA', adicionadaEm: '2026-02-15', campanha: 'Indústrias SP — Fev/2026' },
]

// ── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Campanha['status'] }) {
  const map = {
    ativa:     { label: 'Ativa',     className: 'bg-emerald-900/50 text-emerald-300 border border-emerald-700' },
    pausada:   { label: 'Pausada',   className: 'bg-amber-900/50 text-amber-300 border border-amber-700' },
    concluida: { label: 'Concluída', className: 'bg-slate-700/50 text-slate-400 border border-slate-600' },
  }
  const { label, className } = map[status]
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${className}`}>{label}</span>
}

function SituacaoBadge({ situacao }: { situacao: Empresa['situacao'] }) {
  const map = {
    ATIVA:   'bg-emerald-900/50 text-emerald-300 border border-emerald-700',
    INAPTA:  'bg-red-900/50 text-red-300 border border-red-700',
    BAIXADA: 'bg-slate-700/50 text-slate-400 border border-slate-600',
  }
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[situacao]}`}>{situacao}</span>
}

// ── Aba Campanhas ────────────────────────────────────────────────────────────
function AbaCampanhas() {
  const [showForm, setShowForm] = useState(false)
  const [nome, setNome] = useState('')
  const [setor, setSetor] = useState('')
  const [criando, setCriando] = useState(false)

  const handleCriar = async () => {
    if (!nome.trim()) return
    setCriando(true)
    await new Promise(r => setTimeout(r, 800))
    setCriando(false)
    setShowForm(false)
    setNome('')
    setSetor('')
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white font-bold text-lg">Campanhas de Prospecção</h2>
          <p className="text-slate-400 text-sm mt-0.5">Organize e acompanhe suas campanhas de captação de leads</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova Campanha
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
          <h3 className="text-white font-semibold text-sm mb-4">Nova Campanha</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Nome da Campanha</label>
              <input
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Indústrias SP — Mar/2026"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Setor-alvo</label>
              <input
                value={setor}
                onChange={e => setSetor(e.target.value)}
                placeholder="Ex: Indústria, Varejo, Saúde..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCriar}
              disabled={!nome.trim() || criando}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              {criando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {criando ? 'Criando...' : 'Criar'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-3">
        {CAMPANHAS_MOCK.map(c => {
          const pct = Math.round((c.empresasContadas / c.empresasAlvo) * 100)
          return (
            <div key={c.id} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold text-sm">{c.nome}</h3>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-slate-400 text-xs">Setor: {c.setor} · Criada em {new Date(c.criadaEm).toLocaleDateString('pt-BR')}</p>
                </div>
                <button className="text-slate-500 hover:text-slate-300 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                  <div
                    className="bg-violet-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {c.empresasContadas} / {c.empresasAlvo} empresas ({pct}%)
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Aba Empresas ─────────────────────────────────────────────────────────────
function AbaEmpresas() {
  const [busca, setBusca] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState<'todos' | 'ATIVA' | 'INAPTA'>('todos')

  const filtradas = EMPRESAS_MOCK.filter(e => {
    const matchBusca = !busca || e.razaoSocial.toLowerCase().includes(busca.toLowerCase()) || e.cnpj.includes(busca)
    const matchSituacao = filtroSituacao === 'todos' || e.situacao === filtroSituacao
    return matchBusca && matchSituacao
  })

  return (
    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white font-bold text-lg">Empresas Prospectadas</h2>
          <p className="text-slate-400 text-sm mt-0.5">{EMPRESAS_MOCK.length} empresas no total</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou CNPJ..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
          />
        </div>
        <select
          value={filtroSituacao}
          onChange={e => setFiltroSituacao(e.target.value as typeof filtroSituacao)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-violet-500"
        >
          <option value="todos">Todas</option>
          <option value="ATIVA">Ativas</option>
          <option value="INAPTA">Inaptas</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/80">
              <th className="text-left text-xs text-slate-400 font-semibold px-4 py-3">Empresa</th>
              <th className="text-left text-xs text-slate-400 font-semibold px-4 py-3">CNPJ</th>
              <th className="text-left text-xs text-slate-400 font-semibold px-4 py-3 hidden md:table-cell">Cidade</th>
              <th className="text-left text-xs text-slate-400 font-semibold px-4 py-3 hidden lg:table-cell">Campanha</th>
              <th className="text-left text-xs text-slate-400 font-semibold px-4 py-3">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {filtradas.map(e => (
              <tr key={e.id} className="hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-white font-medium text-sm">{e.nomeFantasia || e.razaoSocial}</p>
                  <p className="text-slate-400 text-xs">{e.razaoSocial}</p>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs font-mono">{e.cnpj}</td>
                <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">{e.municipio}/{e.uf}</td>
                <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell truncate max-w-[180px]">{e.campanha}</td>
                <td className="px-4 py-3"><SituacaoBadge situacao={e.situacao} /></td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-sm">Nenhuma empresa encontrada</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Aba Relatório ────────────────────────────────────────────────────────────
function AbaRelatorio() {
  const ativas = EMPRESAS_MOCK.filter(e => e.situacao === 'ATIVA').length
  const inaptas = EMPRESAS_MOCK.filter(e => e.situacao === 'INAPTA').length
  const total = EMPRESAS_MOCK.length

  const porSetor = EMPRESAS_MOCK.reduce<Record<string, number>>((acc, e) => {
    acc[e.setor] = (acc[e.setor] || 0) + 1
    return acc
  }, {})

  return (
    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
      <div className="mb-6">
        <h2 className="text-white font-bold text-lg">Relatório de Prospecção</h2>
        <p className="text-slate-400 text-sm mt-0.5">Resumo consolidado de todas as campanhas</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Campanhas Ativas', value: CAMPANHAS_MOCK.filter(c => c.status === 'ativa').length, icon: Clock, color: 'text-violet-400' },
          { label: 'Total de Empresas', value: total, icon: Building2, color: 'text-blue-400' },
          { label: 'Empresas Ativas', value: ativas, icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Empresas Inaptas', value: inaptas, icon: AlertCircle, color: 'text-red-400' },
        ].map(k => (
          <div key={k.label} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <k.icon className={`w-5 h-5 ${k.color} mb-2`} />
            <p className="text-2xl font-bold text-white">{k.value}</p>
            <p className="text-slate-400 text-xs mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Por setor */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-4">Distribuição por Setor</h3>
        <div className="space-y-3">
          {Object.entries(porSetor).sort((a, b) => b[1] - a[1]).map(([setor, qtd]) => {
            const pct = Math.round((qtd / total) * 100)
            return (
              <div key={setor} className="flex items-center gap-3">
                <span className="text-slate-300 text-sm w-28 flex-shrink-0">{setor}</span>
                <div className="flex-1 bg-slate-700 rounded-full h-2">
                  <div className="bg-violet-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-slate-400 text-xs w-14 text-right">{qtd} ({pct}%)</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── ProspeccaoView ────────────────────────────────────────────────────────────
export default function ProspeccaoView() {
  const [aba, setAba] = useState<Aba>('campanhas')

  const abas: { id: Aba; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'campanhas', label: 'Campanhas', icon: Search },
    { id: 'empresas',  label: 'Empresas',  icon: Building2 },
    { id: 'relatorio', label: 'Relatório', icon: BarChart3 },
  ]

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-0 border-b border-slate-800">
        <h1 className="text-white font-bold text-xl mb-4">Prospecção de Leads</h1>
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
              <a.icon className="w-4 h-4" />
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {aba === 'campanhas' && <AbaCampanhas />}
        {aba === 'empresas'  && <AbaEmpresas />}
        {aba === 'relatorio' && <AbaRelatorio />}
      </div>
    </div>
  )
}

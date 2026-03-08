// ─────────────────────────────────────────────────────────────────────────────
// Todos os Registros — Planilha completa de atendimentos (exportável)
// Esta view serve como "planilha externa" pesquisável por outros módulos.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Search, Download, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { MOCK_ATENDIMENTOS, exportAtendimentosCSV } from '../mockData';
import type { Atendimento } from '../types';

interface Props { onNovo: () => void; }

type SortKey = keyof Pick<Atendimento, 'numero' | 'tipo' | 'status' | 'prioridade' | 'data_abertura'>;

const STATUS_BADGE: Record<string, string> = {
  AGUARDANDO:          'bg-slate-100 text-slate-600',
  EM_ATENDIMENTO:      'bg-amber-100 text-amber-700',
  AGUARDANDO_CLIENTE:  'bg-purple-100 text-purple-700',
  AGUARDANDO_TERCEIRO: 'bg-indigo-100 text-indigo-700',
  EM_ANALISE:          'bg-blue-100 text-blue-700',
  RESOLVIDO:           'bg-green-100 text-green-700',
  FECHADO:             'bg-slate-100 text-slate-500',
  CANCELADO:           'bg-red-100 text-red-600',
};

const PRIO_COLOR: Record<string, string> = {
  BAIXA: 'text-slate-500', MEDIA: 'text-blue-600',
  ALTA: 'text-amber-600', CRITICA: 'text-red-600', URGENTE: 'text-red-700',
};

const PAG_COLOR: Record<string, string> = {
  PENDENTE: 'bg-amber-50 text-amber-700', PARCIAL: 'bg-orange-50 text-orange-700',
  PAGO: 'bg-green-50 text-green-700', ISENTO: 'bg-slate-100 text-slate-500', CONVENIO: 'bg-blue-50 text-blue-700',
};

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronUp className="w-3 h-3 text-slate-300" />;
  return dir === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600" />;
}

export default function TodosRegistros({ onNovo }: Props) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('TODOS');
  const [filterTipo, setFilterTipo] = useState('TODOS');
  const [filterPrio, setFilterPrio] = useState('TODOS');
  const [sortKey, setSortKey] = useState<SortKey>('data_abertura');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  const tipos = [...new Set(MOCK_ATENDIMENTOS.map(a => a.tipo))];

  const filtered = MOCK_ATENDIMENTOS.filter(a => {
    const ms = [a.numero, a.titulo, a.solicitante_nome, a.solicitante_cpf_cnpj ?? '', a.setor ?? '', a.responsavel_nome ?? '']
      .some(v => v.toLowerCase().includes(search.toLowerCase()));
    const mst = filterStatus === 'TODOS' || a.status === filterStatus;
    const mt = filterTipo === 'TODOS' || a.tipo === filterTipo;
    const mp = filterPrio === 'TODOS' || a.prioridade === filterPrio;
    return ms && mst && mt && mp;
  }).sort((a, b) => {
    const va = a[sortKey] as string ?? '';
    const vb = b[sortKey] as string ?? '';
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  function handleSort(k: SortKey) {
    if (k === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
    setPage(1);
  }

  function handleExport() {
    const csv = exportAtendimentosCSV(filtered);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `atendimentos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  function Th({ label, sk }: { label: string; sk?: SortKey }) {
    return (
      <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
        {sk ? (
          <button onClick={() => handleSort(sk)} className="flex items-center gap-1 hover:text-slate-800 transition-colors">
            {label} <SortIcon active={sortKey === sk} dir={sortDir} />
          </button>
        ) : label}
      </th>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Todos os Registros</h1>
          <p className="text-sm text-slate-500">{filtered.length} atendimentos encontrados</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport}
            className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <button onClick={onNovo}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Novo
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar em todos os campos..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="TODOS">Todos os status</option>
          {['AGUARDANDO','EM_ATENDIMENTO','AGUARDANDO_CLIENTE','EM_ANALISE','RESOLVIDO','FECHADO','CANCELADO'].map(s =>
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          )}
        </select>
        <select value={filterTipo} onChange={e => { setFilterTipo(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="TODOS">Todos os tipos</option>
          {tipos.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={filterPrio} onChange={e => { setFilterPrio(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="TODOS">Todas as prioridades</option>
          {['BAIXA','MEDIA','ALTA','CRITICA','URGENTE'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-max">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <Th label="Número" sk="numero" />
                <Th label="Título" />
                <Th label="Solicitante" />
                <Th label="Tipo" sk="tipo" />
                <Th label="Canal" />
                <Th label="Prioridade" sk="prioridade" />
                <Th label="Status" sk="status" />
                <Th label="Setor" />
                <Th label="Responsável" />
                <Th label="SLA" />
                <Th label="Pag." />
                <Th label="Valor" />
                <Th label="Abertura" sk="data_abertura" />
                <Th label="Fechamento" />
              </tr>
            </thead>
            <tbody>
              {paginated.map(a => (
                <tr key={a.id} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors">
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-400 whitespace-nowrap">{a.numero}</td>
                  <td className="px-3 py-2.5 max-w-[200px]">
                    <div className="font-medium text-slate-800 truncate">{a.titulo}</div>
                    {a.tags.length > 0 && (
                      <div className="flex gap-1 mt-0.5">
                        {a.tags.slice(0, 2).map(t => <span key={t} className="text-[10px] bg-slate-100 px-1 rounded text-slate-500">{t}</span>)}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                    <div>{a.solicitante_nome}</div>
                    {a.solicitante_cpf_cnpj && <div className="text-xs text-slate-400">{a.solicitante_cpf_cnpj}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{a.tipo.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{a.canal}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={`text-xs font-bold ${PRIO_COLOR[a.prioridade]}`}>{a.prioridade}</span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[a.status]}`}>
                      {a.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{a.setor ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{a.responsavel_nome ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                    {a.sla_horas}h
                    {a.sla_cumprido === true && <span className="ml-1 text-green-500">✓</span>}
                    {a.sla_cumprido === false && <span className="ml-1 text-red-500">✗</span>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {a.status_pagamento ? (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PAG_COLOR[a.status_pagamento]}`}>
                        {a.status_pagamento}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap text-right">
                    {a.valor_estimado != null ? `R$ ${a.valor_estimado.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(a.data_abertura).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                    {a.data_fechamento ? new Date(a.data_fechamento).toLocaleDateString('pt-BR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-500">
              Página {page} de {totalPages} · {filtered.length} registros
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 text-xs border border-slate-200 rounded hover:bg-white disabled:opacity-40 transition-colors">
                Anterior
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`px-3 py-1 text-xs rounded border transition-colors ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:bg-white'}`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1 text-xs border border-slate-200 rounded hover:bg-white disabled:opacity-40 transition-colors">
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

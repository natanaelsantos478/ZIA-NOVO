// ─────────────────────────────────────────────────────────────────────────────
// Em Andamento — Atendimentos com status EM_ATENDIMENTO e AGUARDANDO
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Search, Clock, AlertTriangle, CheckCircle2, User, MapPin, Tag } from 'lucide-react';
import { MOCK_ATENDIMENTOS } from '../mockData';
import type { Atendimento } from '../types';

const STATUS_BADGE: Record<string, string> = {
  AGUARDANDO:          'bg-slate-100 text-slate-600',
  EM_ATENDIMENTO:      'bg-amber-100 text-amber-700',
  AGUARDANDO_CLIENTE:  'bg-purple-100 text-purple-700',
  AGUARDANDO_TERCEIRO: 'bg-indigo-100 text-indigo-700',
  EM_ANALISE:          'bg-blue-100 text-blue-700',
};

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO:          'Aguardando',
  EM_ATENDIMENTO:      'Em Atendimento',
  AGUARDANDO_CLIENTE:  'Ag. Cliente',
  AGUARDANDO_TERCEIRO: 'Ag. Terceiro',
  EM_ANALISE:          'Em Análise',
};

const PRIO_COLOR: Record<string, string> = {
  BAIXA: 'text-slate-500', MEDIA: 'text-blue-600',
  ALTA: 'text-amber-600', CRITICA: 'text-red-600', URGENTE: 'text-red-700 font-black',
};

const PRIO_BORDER: Record<string, string> = {
  BAIXA: 'border-l-slate-300', MEDIA: 'border-l-blue-400',
  ALTA: 'border-l-amber-400', CRITICA: 'border-l-red-500', URGENTE: 'border-l-red-700',
};

function tempoDecorrido(data: string): string {
  const diff = Date.now() - new Date(data).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function AtendimentoCard({ a, onStatusChange }: { a: Atendimento; onStatusChange: (id: string, s: Atendimento['status']) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`bg-white rounded-xl border border-slate-200 border-l-4 ${PRIO_BORDER[a.prioridade]} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono text-slate-400">{a.numero}</span>
              <span className={`text-xs font-bold ${PRIO_COLOR[a.prioridade]}`}>{a.prioridade}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[a.status]}`}>
                {STATUS_LABEL[a.status]}
              </span>
              {a.risco_triagem && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                  a.risco_triagem === 'VERMELHO' ? 'bg-red-600 text-white' :
                  a.risco_triagem === 'LARANJA' ? 'bg-orange-500 text-white' :
                  a.risco_triagem === 'AMARELO' ? 'bg-yellow-400 text-slate-900' :
                  'bg-green-500 text-white'
                }`}>
                  ● {a.risco_triagem}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-slate-800 truncate">{a.titulo}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1"><User className="w-3 h-3" />{a.solicitante_nome}</span>
              {a.unidade && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{a.unidade}</span>}
              {a.setor && <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{a.setor}</span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              {tempoDecorrido(a.data_abertura)}
            </div>
            {a.sla_deadline && (
              <div className={`text-xs font-medium ${
                new Date(a.sla_deadline) < new Date() ? 'text-red-600' : 'text-slate-500'
              }`}>
                SLA: {new Date(a.sla_deadline).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>

        {/* Ações rápidas */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          {a.status === 'AGUARDANDO' && (
            <button onClick={() => onStatusChange(a.id, 'EM_ATENDIMENTO')}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors font-medium">
              <Clock className="w-3.5 h-3.5" /> Iniciar Atendimento
            </button>
          )}
          {a.status === 'EM_ATENDIMENTO' && (
            <>
              <button onClick={() => onStatusChange(a.id, 'AGUARDANDO_CLIENTE')}
                className="text-xs px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium">
                Ag. Cliente
              </button>
              <button onClick={() => onStatusChange(a.id, 'RESOLVIDO')}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Resolver
              </button>
            </>
          )}
          {(a.status === 'AGUARDANDO_CLIENTE' || a.status === 'AGUARDANDO_TERCEIRO') && (
            <button onClick={() => onStatusChange(a.id, 'EM_ATENDIMENTO')}
              className="text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors font-medium">
              Retomar
            </button>
          )}
          <button onClick={() => setExpanded(e => !e)}
            className="ml-auto text-xs text-slate-400 hover:text-slate-600 transition-colors">
            {expanded ? 'Menos ▲' : 'Mais ▼'}
          </button>
        </div>

        {/* Detalhes expandidos */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
            {a.descricao && <p><span className="font-semibold">Descrição:</span> {a.descricao}</p>}
            {a.sintomas && <p><span className="font-semibold">Sintomas:</span> {a.sintomas}</p>}
            {a.responsavel_nome && <p><span className="font-semibold">Responsável:</span> {a.responsavel_nome} — {a.equipe}</p>}
            {a.alergias && <p className="text-red-600"><span className="font-semibold">Alergias:</span> {a.alergias}</p>}
            {a.nivel_dor !== null && <p><span className="font-semibold">Nível de dor:</span> {a.nivel_dor}/10</p>}
            {a.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {a.tags.map(t => <span key={t} className="bg-slate-100 px-1.5 py-0.5 rounded">{t}</span>)}
              </div>
            )}
            {a.historico.length > 0 && (
              <div className="mt-2">
                <p className="font-semibold mb-1">Histórico de interações:</p>
                {a.historico.map(h => (
                  <div key={h.id} className="pl-3 border-l-2 border-slate-200 mb-1">
                    <span className="text-slate-400">{new Date(h.created_at).toLocaleString('pt-BR')} · {h.autor}:</span>{' '}
                    <span>{h.texto}</span>
                    {h.privado && <span className="ml-1 text-slate-400">[privado]</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EmAndamento() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [atendimentos, setAtendimentos] = useState(MOCK_ATENDIMENTOS);

  const ativos = atendimentos.filter(a =>
    ['AGUARDANDO', 'EM_ATENDIMENTO', 'AGUARDANDO_CLIENTE', 'AGUARDANDO_TERCEIRO', 'EM_ANALISE'].includes(a.status)
  );

  const filtered = ativos.filter(a => {
    const matchSearch = a.titulo.toLowerCase().includes(search.toLowerCase()) ||
      a.solicitante_nome.toLowerCase().includes(search.toLowerCase()) ||
      a.numero.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'TODOS' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Sort: URGENTE first, then CRITICA, then by openDate
  const sorted = [...filtered].sort((a, b) => {
    const prioOrder: Record<string, number> = { URGENTE: 0, CRITICA: 1, ALTA: 2, MEDIA: 3, BAIXA: 4 };
    const pd = (prioOrder[a.prioridade] ?? 9) - (prioOrder[b.prioridade] ?? 9);
    if (pd !== 0) return pd;
    return new Date(a.data_abertura).getTime() - new Date(b.data_abertura).getTime();
  });

  function handleStatusChange(id: string, status: Atendimento['status']) {
    setAtendimentos(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Em Andamento</h1>
          <p className="text-sm text-slate-500">{ativos.length} atendimentos ativos</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Ordenado por prioridade e tempo de espera
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar por título, número ou solicitante..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="TODOS">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 className="w-12 h-12 text-green-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Nenhum atendimento ativo no momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(a => (
            <AtendimentoCard key={a.id} a={a} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lista de Casos — Gestão de casos clínicos, técnicos, jurídicos etc.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Search, Plus, Briefcase, ChevronDown, ChevronUp, Stethoscope, Link2 } from 'lucide-react';
import { MOCK_CASOS } from '../mockData';
import type { Caso } from '../types';

interface Props { onNovo: () => void; }

const STATUS_BADGE: Record<string, string> = {
  ABERTO:           'bg-blue-100 text-blue-700',
  EM_INVESTIGACAO:  'bg-amber-100 text-amber-700',
  AGUARDANDO_EXAMES:'bg-purple-100 text-purple-700',
  DIAGNOSTICADO:    'bg-indigo-100 text-indigo-700',
  EM_TRATAMENTO:    'bg-cyan-100 text-cyan-700',
  MONITORAMENTO:    'bg-teal-100 text-teal-700',
  RESOLVIDO:        'bg-green-100 text-green-700',
  ARQUIVADO:        'bg-slate-100 text-slate-500',
  ENCAMINHADO:      'bg-orange-100 text-orange-700',
};

const PRIO_COLOR: Record<string, string> = {
  BAIXA: 'text-slate-500', MEDIA: 'text-blue-600',
  ALTA: 'text-amber-600', CRITICA: 'text-red-600', URGENTE: 'text-red-700',
};

function CasoCard({ c, expanded, onToggle }: { c: Caso; expanded: boolean; onToggle: () => void }) {
  const temDiag = c.diagnostico_principal || c.diagnosticos_secundarios.length > 0;
  const temExames = c.exames.length > 0;
  const temEvolucoes = c.evolucoes.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono text-slate-400">{c.numero}</span>
              <span className={`text-xs font-bold ${PRIO_COLOR[c.prioridade]}`}>{c.prioridade}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[c.status]}`}>
                {c.status.replace(/_/g, ' ')}
              </span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{c.tipo_caso}</span>
            </div>
            <h3 className="font-semibold text-slate-800">{c.titulo}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span>Paciente: <strong>{c.paciente_nome}</strong></span>
              {c.responsavel && <span>· {c.responsavel}</span>}
              {c.especialidade && <span>· {c.especialidade}</span>}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className="text-xs text-slate-400">
              {new Date(c.data_abertura).toLocaleDateString('pt-BR')}
            </span>
            <div className="flex items-center gap-2">
              {temDiag && (
                <span className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                  <Stethoscope className="w-3 h-3" /> Diagnóstico
                </span>
              )}
              {c.atendimentos_ids.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                  <Link2 className="w-3 h-3" /> {c.atendimentos_ids.length} atend.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Diagnóstico rápido */}
        {c.diagnostico_principal && (
          <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-xs">
            <span className="font-semibold text-indigo-700">Diagnóstico principal:</span>{' '}
            <span className="text-indigo-600">{c.diagnostico_principal}</span>
            {c.cid10 && <span className="ml-2 font-mono text-indigo-400">CID: {c.cid10}</span>}
            {c.probabilidade_diagnostico !== null && (
              <span className="ml-2 text-indigo-500">{c.probabilidade_diagnostico}% prob.</span>
            )}
          </div>
        )}

        {/* Toggle */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
          <span>{temExames ? `${c.exames.length} exame(s)` : 'Sem exames'}</span>
          <span>{temEvolucoes ? `${c.evolucoes.length} evolução(ões)` : 'Sem evoluções'}</span>
          <span>{c.prescricoes.length > 0 ? `${c.prescricoes.length} prescrição(ões)` : ''}</span>
          <button onClick={onToggle} className="ml-auto flex items-center gap-1 text-blue-600 hover:underline">
            {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Menos</> : <><ChevronDown className="w-3.5 h-3.5" /> Detalhes</>}
          </button>
        </div>

        {/* Detalhes */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-4 text-xs text-slate-700">
            {/* Diagnósticos secundários */}
            {c.diagnosticos_secundarios.length > 0 && (
              <div>
                <p className="font-semibold text-slate-600 mb-1.5">Diagnósticos Secundários</p>
                <div className="space-y-1">
                  {c.diagnosticos_secundarios.map(d => (
                    <div key={d.id} className="flex items-center gap-2 pl-3 border-l-2 border-slate-200">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${d.confirmado ? 'bg-green-500' : 'bg-amber-400'}`} />
                      <span>{d.descricao}</span>
                      {d.cid10 && <span className="font-mono text-slate-400">CID: {d.cid10}</span>}
                      <span className="text-slate-400">{d.probabilidade}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cadeia de diagnósticos */}
            {c.cadeia_diagnosticos.length > 0 && (
              <div>
                <p className="font-semibold text-slate-600 mb-1.5">Cadeia de Diagnósticos</p>
                <div className="space-y-1.5">
                  {c.cadeia_diagnosticos.sort((a, b) => a.ordem - b.ordem).map((cd, i) => (
                    <div key={cd.id} className="flex gap-2">
                      <div className="flex flex-col items-center">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">{cd.ordem}</span>
                        {i < c.cadeia_diagnosticos.length - 1 && <div className="w-0.5 flex-1 bg-blue-100 my-0.5" />}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="font-medium text-slate-700">{cd.diagnostico}</div>
                        {cd.cid10 && <span className="font-mono text-slate-400">CID: {cd.cid10}</span>}
                        {cd.causa && <div className="text-slate-500">Causa: {cd.causa}</div>}
                        {cd.efeito && <div className="text-slate-500">Efeito: {cd.efeito}</div>}
                        <div className="text-slate-400">{cd.responsavel} · {new Date(cd.data).toLocaleDateString('pt-BR')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Anamnese resumida */}
            {(c.queixa_principal || c.alergias) && (
              <div>
                <p className="font-semibold text-slate-600 mb-1.5">Anamnese</p>
                {c.queixa_principal && <p><strong>Queixa:</strong> {c.queixa_principal}</p>}
                {c.alergias && <p className="text-red-600"><strong>Alergias:</strong> {c.alergias}</p>}
                {c.medicamentos_em_uso.length > 0 && (
                  <p><strong>Medicamentos em uso:</strong> {c.medicamentos_em_uso.map(m => `${m.nome} ${m.dosagem}`).join(', ')}</p>
                )}
              </div>
            )}

            {/* Exames */}
            {c.exames.length > 0 && (
              <div>
                <p className="font-semibold text-slate-600 mb-1.5">Exames</p>
                <div className="space-y-1">
                  {c.exames.map(e => (
                    <div key={e.id} className="flex items-center gap-2 pl-3 border-l-2 border-purple-100">
                      <span>{e.nome}</span>
                      <span className="text-slate-400">({e.tipo})</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        e.status === 'LAUDO_DISPONIVEL' ? 'bg-green-100 text-green-700' :
                        e.status === 'REALIZADO' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>{e.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evoluções */}
            {c.evolucoes.length > 0 && (
              <div>
                <p className="font-semibold text-slate-600 mb-1.5">Evoluções</p>
                <div className="space-y-1.5">
                  {c.evolucoes.map(ev => (
                    <div key={ev.id} className="pl-3 border-l-2 border-teal-100">
                      <div className="text-slate-400">{new Date(ev.data).toLocaleString('pt-BR')} · {ev.responsavel}</div>
                      <p className="text-slate-700">{ev.texto}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ListaCasos({ onNovo }: Props) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('TODOS');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = MOCK_CASOS.filter(c => {
    const ms = [c.numero, c.titulo, c.paciente_nome, c.diagnostico_principal ?? '', c.tipo_caso]
      .some(v => v.toLowerCase().includes(search.toLowerCase()));
    const mf = filterStatus === 'TODOS' || c.status === filterStatus;
    return ms && mf;
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Gestão de Casos</h1>
          <p className="text-sm text-slate-500">{MOCK_CASOS.length} casos registrados</p>
        </div>
        <button onClick={onNovo}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Novo Caso
        </button>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar por número, paciente, diagnóstico..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="TODOS">Todos os status</option>
          {Object.keys(STATUS_BADGE).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Briefcase className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">Nenhum caso encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <CasoCard
              key={c.id} c={c}
              expanded={expandedId === c.id}
              onToggle={() => setExpandedId(prev => prev === c.id ? null : c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

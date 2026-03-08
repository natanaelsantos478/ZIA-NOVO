// ─────────────────────────────────────────────────────────────────────────────
// Diagnósticos — Visão consolidada de diagnósticos registrados nos casos
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Search, Stethoscope, TrendingUp, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { MOCK_CASOS } from '../mockData';
import type { Caso } from '../types';

interface DiagRow {
  casoNumero: string;
  casoId: string;
  paciente: string;
  diagnostico: string;
  cid10: string | null;
  tipo: 'PRINCIPAL' | 'SECUNDARIO' | 'CADEIA';
  probabilidade: number | null;
  causa: string | null;
  confirmado: boolean | null;
  data: string;
  responsavel: string | null;
}

function buildRows(casos: Caso[]): DiagRow[] {
  const rows: DiagRow[] = [];
  for (const c of casos) {
    if (c.diagnostico_principal) {
      rows.push({
        casoNumero: c.numero, casoId: c.id, paciente: c.paciente_nome,
        diagnostico: c.diagnostico_principal, cid10: c.cid10,
        tipo: 'PRINCIPAL', probabilidade: c.probabilidade_diagnostico,
        causa: c.causa_diagnostico, confirmado: null, data: c.data_abertura, responsavel: c.responsavel,
      });
    }
    for (const d of c.diagnosticos_secundarios) {
      rows.push({
        casoNumero: c.numero, casoId: c.id, paciente: c.paciente_nome,
        diagnostico: d.descricao, cid10: d.cid10,
        tipo: 'SECUNDARIO', probabilidade: d.probabilidade,
        causa: d.causa, confirmado: d.confirmado, data: c.data_abertura, responsavel: c.responsavel,
      });
    }
    for (const cd of c.cadeia_diagnosticos) {
      rows.push({
        casoNumero: c.numero, casoId: c.id, paciente: c.paciente_nome,
        diagnostico: cd.diagnostico, cid10: cd.cid10 ?? null,
        tipo: 'CADEIA', probabilidade: null,
        causa: cd.causa, confirmado: null, data: cd.data, responsavel: cd.responsavel,
      });
    }
  }
  return rows;
}

const TIPO_BADGE: Record<string, string> = {
  PRINCIPAL:  'bg-indigo-100 text-indigo-700',
  SECUNDARIO: 'bg-slate-100 text-slate-600',
  CADEIA:     'bg-blue-100 text-blue-700',
};

function ProbBar({ v }: { v: number }) {
  const color = v >= 80 ? 'bg-green-500' : v >= 50 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-slate-100 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${v}%` }} />
      </div>
      <span className="text-xs text-slate-600">{v}%</span>
    </div>
  );
}

export default function Diagnosticos() {
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('TODOS');
  const [groupByCaso, setGroupByCaso] = useState(true);

  const rows = buildRows(MOCK_CASOS);

  const filtered = rows.filter(r => {
    const ms = [r.diagnostico, r.cid10 ?? '', r.paciente, r.casoNumero].some(v =>
      v.toLowerCase().includes(search.toLowerCase())
    );
    const mt = filterTipo === 'TODOS' || r.tipo === filterTipo;
    return ms && mt;
  });

  // Frequência por diagnóstico
  const freq = filtered.reduce<Record<string, number>>((acc, r) => {
    const k = r.cid10 ? `${r.diagnostico} (${r.cid10})` : r.diagnostico;
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const topDiags = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Agrupado por caso
  const byCaso = filtered.reduce<Record<string, { paciente: string; rows: DiagRow[] }>>((acc, r) => {
    if (!acc[r.casoNumero]) acc[r.casoNumero] = { paciente: r.paciente, rows: [] };
    acc[r.casoNumero].rows.push(r);
    return acc;
  }, {});

  const [expandedCasos, setExpandedCasos] = useState<Set<string>>(new Set(Object.keys(byCaso)));

  function toggleCaso(k: string) {
    setExpandedCasos(prev => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Diagnósticos</h1>
        <p className="text-sm text-slate-500">{filtered.length} diagnósticos registrados em {MOCK_CASOS.length} caso(s)</p>
      </div>

      {/* Top diagnósticos */}
      {topDiags.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-700">Diagnósticos mais frequentes</h3>
          </div>
          <div className="space-y-2">
            {topDiags.map(([diag, count]) => (
              <div key={diag} className="flex items-center gap-3">
                <span className="text-xs text-slate-700 flex-1 truncate">{diag}</span>
                <div className="w-24 bg-slate-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(count / (topDiags[0][1])) * 100}%` }} />
                </div>
                <span className="text-xs font-bold text-slate-600 w-4 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar diagnóstico, CID-10, paciente..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="TODOS">Todos os tipos</option>
          <option value="PRINCIPAL">Principal</option>
          <option value="SECUNDARIO">Secundário</option>
          <option value="CADEIA">Cadeia</option>
        </select>
        <button onClick={() => setGroupByCaso(g => !g)}
          className={`px-3 py-2 rounded-lg text-sm border transition-colors ${groupByCaso ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
          {groupByCaso ? 'Agrupado por caso' : 'Lista plana'}
        </button>
      </div>

      {/* Conteúdo */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Stethoscope className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">Nenhum diagnóstico encontrado.</p>
        </div>
      ) : groupByCaso ? (
        /* Agrupado por caso */
        <div className="space-y-4">
          {Object.entries(byCaso).map(([casoNum, { paciente, rows: casoRows }]) => (
            <div key={casoNum} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button onClick={() => toggleCaso(casoNum)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-slate-500">{casoNum}</span>
                  <span className="font-semibold text-slate-800">{paciente}</span>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{casoRows.length} diag.</span>
                </div>
                {expandedCasos.has(casoNum) ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {expandedCasos.has(casoNum) && (
                <div className="border-t border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Tipo</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Diagnóstico</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">CID-10</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Probabilidade</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Causa</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Responsável</th>
                      </tr>
                    </thead>
                    <tbody>
                      {casoRows.map((r, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="px-4 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_BADGE[r.tipo]}`}>{r.tipo}</span>
                          </td>
                          <td className="px-4 py-2.5 font-medium text-slate-800 max-w-xs">
                            <div className="flex items-center gap-1.5">
                              {r.confirmado === true && <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />}
                              {r.confirmado === false && <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />}
                              <span className="truncate">{r.diagnostico}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{r.cid10 ?? '—'}</td>
                          <td className="px-4 py-2.5">
                            {r.probabilidade !== null ? <ProbBar v={r.probabilidade} /> : <span className="text-xs text-slate-400">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[150px] truncate">{r.causa ?? '—'}</td>
                          <td className="px-4 py-2.5 text-xs text-slate-500">{r.responsavel ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Lista plana */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Caso</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Paciente</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Tipo</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Diagnóstico</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">CID-10</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Probabilidade</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Causa</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{r.casoNumero}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.paciente}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_BADGE[r.tipo]}`}>{r.tipo}</span>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-800 max-w-xs truncate">{r.diagnostico}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{r.cid10 ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    {r.probabilidade !== null ? <ProbBar v={r.probabilidade} /> : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[150px] truncate">{r.causa ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legenda */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Verde = confirmado · Âmbar = hipótese · Probabilidade: verde ≥80%, âmbar ≥50%, vermelho &lt;50%</span>
      </div>
    </div>
  );
}

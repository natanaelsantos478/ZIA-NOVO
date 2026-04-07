// ─────────────────────────────────────────────────────────────────────────────
// ApiLogsTable — Tabela de logs de uso das API Keys
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Filter, RefreshCw, AlertCircle, Activity } from 'lucide-react';
import {
  getTenantLogs,
  type ApiLog,
  type ApiKey,
} from '../../../../lib/apiKeys';

interface Props {
  tenantIds: string[];
  apiKeys: ApiKey[];
  /** Se definido, filtra direto por esta key (vindo do botão "Ver Logs" no card) */
  selectedKeyId?: string | null;
  onBack?: () => void;
}

function statusColor(code: number | null): string {
  if (!code) return 'text-slate-400';
  if (code < 300) return 'text-green-600 font-semibold';
  if (code < 400) return 'text-blue-600 font-semibold';
  if (code < 500) return 'text-amber-600 font-semibold';
  return 'text-red-600 font-semibold';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function ApiLogsTable({ tenantIds, apiKeys, selectedKeyId, onBack }: Props) {
  const [logs, setLogs]         = useState<ApiLog[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Filtros
  const [filterKey, setFilterKey]     = useState<string>(selectedKeyId ?? '');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDate, setFilterDate]   = useState<string>('');

  const load = useCallback(async () => {
    if (tenantIds.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getTenantLogs(tenantIds, page, {
        apiKeyId:   filterKey   || undefined,
        statusCode: filterStatus ? parseInt(filterStatus, 10) : undefined,
        dateFrom:   filterDate  ? new Date(filterDate).toISOString() : undefined,
      });
      setLogs(result.data);
      setTotal(result.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  }, [tenantIds, page, filterKey, filterStatus, filterDate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filterKey, filterStatus, filterDate]);
  useEffect(() => { if (selectedKeyId) setFilterKey(selectedKeyId); }, [selectedKeyId]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
        )}

        <div className="flex-1 min-w-[180px]">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            <Filter className="inline w-3 h-3 mr-1" />Chave
          </label>
          <select
            value={filterKey}
            onChange={e => setFilterKey(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            <option value="">Todas as chaves</option>
            {apiKeys.map(k => (
              <option key={k.id} value={k.id}>{k.nome}</option>
            ))}
          </select>
        </div>

        <div className="min-w-[120px]">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status HTTP</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            <option value="">Todos</option>
            <option value="200">200</option>
            <option value="201">201</option>
            <option value="400">400</option>
            <option value="401">401</option>
            <option value="403">403</option>
            <option value="429">429</option>
            <option value="500">500</option>
          </select>
        </div>

        <div className="min-w-[160px]">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">A partir de</label>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Erro */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Carregando...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Activity className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Nenhum log encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Data/Hora</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Chave</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Endpoint</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Método</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">IP</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-500">Duração</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const keyName = apiKeys.find(k => k.id === log.api_key_id)?.nome ?? '—';
                  return (
                    <tr
                      key={log.id}
                      className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                        i % 2 === 0 ? '' : 'bg-slate-50/30'
                      }`}
                    >
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{formatDate(log.created_at)}</td>
                      <td className="px-4 py-2.5 text-slate-700 font-medium max-w-[120px] truncate">{keyName}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-600 max-w-[180px] truncate">{log.endpoint}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-500">{log.metodo}</td>
                      <td className={`px-4 py-2.5 ${statusColor(log.status_code)}`}>
                        {log.status_code ?? '—'}
                        {log.erro && (
                          <span className="ml-1 text-[10px] text-red-400" title={log.erro}>⚠</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono">{log.ip_origem ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right text-slate-400">
                        {log.duracao_ms != null ? `${log.duracao_ms}ms` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{total} registros · Página {page} de {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


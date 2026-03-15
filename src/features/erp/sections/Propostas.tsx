// ERP — Propostas Comerciais
// Propostas vêm do CRM: negociações na etapa "proposta_enviada"
// Apenas gestores têm acesso ao módulo financeiro (veem todas as vendas)
import { useEffect, useState, useCallback } from 'react';
import {
  ClipboardList, Search, RefreshCw, User, DollarSign,
  Calendar, ChevronRight, X, ExternalLink, Loader2, AlertCircle,
} from 'lucide-react';
import { getAllNegociacoes, type NegociacaoData } from '../../crm/data/crmData';

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d?: string) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

const ORC_STATUS_BADGE: Record<string, string> = {
  rascunho:  'bg-slate-100 text-slate-600',
  enviado:   'bg-blue-100 text-blue-700',
  aprovado:  'bg-green-100 text-green-700',
  recusado:  'bg-red-100 text-red-700',
};

const ORC_STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado:  'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

function DetailModal({ data, onClose }: { data: NegociacaoData; onClose: () => void }) {
  const n = data.negociacao;
  const orc = data.orcamento;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono font-bold text-slate-700 text-sm">
            {orc?.numero ?? `NEG-${n.id.slice(0, 8)}`}
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <h3 className="text-base font-bold text-slate-900 mb-4">
          {n.descricao ?? n.clienteNome}
        </h3>

        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-slate-500">Cliente</span>
            <span className="font-medium">{n.clienteNome}</span>
          </div>
          {n.clienteEmail && (
            <div className="flex justify-between">
              <span className="text-slate-500">E-mail</span>
              <span>{n.clienteEmail}</span>
            </div>
          )}
          {n.clienteTelefone && (
            <div className="flex justify-between">
              <span className="text-slate-500">Telefone</span>
              <span>{n.clienteTelefone}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Responsável</span>
            <span className="font-medium">{n.responsavel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Valor estimado</span>
            <span className="font-bold text-emerald-700">{BRL(n.valor_estimado ?? 0)}</span>
          </div>
          {n.dataFechamentoPrev && (
            <div className="flex justify-between">
              <span className="text-slate-500">Previsão fechamento</span>
              <span>{fmtDate(n.dataFechamentoPrev)}</span>
            </div>
          )}
          {n.probabilidade != null && (
            <div className="flex justify-between">
              <span className="text-slate-500">Probabilidade</span>
              <span>{n.probabilidade}%</span>
            </div>
          )}
          {orc && (
            <>
              <hr className="border-slate-100" />
              <div className="flex justify-between">
                <span className="text-slate-500">Orçamento</span>
                <span>{orc.numero ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total orçamento</span>
                <span className="font-bold text-slate-800">{BRL(orc.total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status orçamento</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ORC_STATUS_BADGE[orc.status] ?? ''}`}>
                  {ORC_STATUS_LABEL[orc.status] ?? orc.status}
                </span>
              </div>
              {orc.validade && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Validade</span>
                  <span>{fmtDate(orc.validade)}</span>
                </div>
              )}
            </>
          )}
        </div>

        {n.notas && (
          <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 mb-4">{n.notas}</p>
        )}

        <div className="flex gap-2 pt-3 border-t border-slate-100">
          <a
            href="/app/crm"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Ver no CRM
          </a>
          <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Propostas() {
  const [items, setItems]       = useState<NegociacaoData[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [busca, setBusca]       = useState('');
  const [vendedor, setVendedor] = useState('TODOS');
  const [detalhe, setDetalhe]   = useState<NegociacaoData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await getAllNegociacoes();
      // Filtra apenas negociações na etapa "proposta_enviada"
      setItems(all.filter(d => d.negociacao.etapa === 'proposta_enviada'));
    } catch (e) {
      setError('Não foi possível carregar as propostas do CRM.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const vendedores = ['TODOS', ...Array.from(new Set(items.map(d => d.negociacao.responsavel).filter(Boolean)))];

  const filtrados = items.filter(d => {
    const n = d.negociacao;
    const matchBusca =
      n.clienteNome.toLowerCase().includes(busca.toLowerCase()) ||
      (n.descricao ?? '').toLowerCase().includes(busca.toLowerCase()) ||
      (d.orcamento?.numero ?? '').toLowerCase().includes(busca.toLowerCase());
    const matchVendedor = vendedor === 'TODOS' || n.responsavel === vendedor;
    return matchBusca && matchVendedor;
  });

  const totalPipeline = filtrados.reduce((s, d) => s + (d.negociacao.valor_estimado ?? 0), 0);
  const totalOrcado   = filtrados.filter(d => d.orcamento).reduce((s, d) => s + (d.orcamento?.total ?? 0), 0);
  const aprovados     = filtrados.filter(d => d.orcamento?.status === 'aprovado').length;
  const taxaAprovacao = filtrados.filter(d => d.orcamento).length > 0
    ? Math.round(aprovados / filtrados.filter(d => d.orcamento).length * 100)
    : 0;

  return (
    <div className="p-6">
      {detalhe && <DetailModal data={detalhe} onClose={() => setDetalhe(null)} />}

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-600" /> Propostas Comerciais
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Negociações com proposta enviada — originadas do CRM
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="text-lg font-bold text-emerald-700">{BRL(totalPipeline)}</div>
          <div className="text-xs text-slate-500 mt-0.5">Valor em Pipeline</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-lg font-bold text-blue-700">{BRL(totalOrcado)}</div>
          <div className="text-xs text-slate-500 mt-0.5">Total Orçado</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-amber-700">{filtrados.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Propostas Abertas</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-700">{taxaAprovacao}%</div>
          <div className="text-xs text-slate-500 mt-0.5">Taxa de Aprovação</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Buscar cliente, descrição, número do orçamento…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2">
          <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-xs text-slate-500 whitespace-nowrap">Vendedor:</span>
          <div className="flex gap-1">
            {vendedores.map(v => (
              <button
                key={v}
                onClick={() => setVendedor(v)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${vendedor === v ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {v === 'TODOS' ? 'Todos' : v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Estado de carregamento / erro */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando propostas do CRM…
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Lista */}
      {!loading && !error && (
        <div className="space-y-3">
          {filtrados.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-10 text-center text-slate-400">
              <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Nenhuma proposta encontrada.</p>
              <p className="text-xs mt-1">Negociações aparecem aqui quando avançam para a etapa "Proposta Enviada" no CRM.</p>
            </div>
          )}

          {filtrados.map(d => {
            const n = d.negociacao;
            const orc = d.orcamento;
            return (
              <div
                key={n.id}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:border-emerald-300 transition-colors cursor-pointer"
                onClick={() => setDetalhe(d)}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {orc?.numero && (
                        <span className="font-mono text-xs text-slate-500">{orc.numero}</span>
                      )}
                      {orc && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ORC_STATUS_BADGE[orc.status] ?? 'bg-slate-100 text-slate-500'}`}>
                          {ORC_STATUS_LABEL[orc.status] ?? orc.status}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm truncate">
                      {n.descricao ?? n.clienteNome}
                    </h3>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-2">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />{n.clienteNome}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {BRL(orc ? orc.total : (n.valor_estimado ?? 0))}
                  </span>
                  {n.dataFechamentoPrev && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />prev. {fmtDate(n.dataFechamentoPrev)}
                    </span>
                  )}
                  <span className="font-medium text-slate-600">{n.responsavel}</span>
                  {n.probabilidade != null && (
                    <span className="text-emerald-600 font-medium">{n.probabilidade}% prob.</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

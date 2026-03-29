// ERP — Transação Externa
// Persistência: usa erp_estoque_movimentos com metadata serializado em observacao
// como prefixo __TE__:{JSON}. Sem tabela dedicada — dívida técnica documentada.
import { useState, useEffect, useCallback } from 'react';
import { Truck, Search, Plus, X, CheckCircle, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { getProdutos, registrarMovimento, getMovimentos } from '../../../lib/erp';
import type { ErpProduto, ErpMovimento } from '../../../lib/erp';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TransacaoExterna {
  id: string;
  numero: string;
  tipo: 'TRANSFERENCIA' | 'CONSIGNACAO' | 'BENEFICIAMENTO' | 'REMESSA_REPARO';
  origem: string;
  destino: string;
  transportadora: string;
  notaFiscal: string;
  data: string;
  previsaoRetorno?: string;
  status: 'EMITIDA' | 'EM_TRANSITO' | 'ENTREGUE' | 'RETORNADA' | 'CANCELADA';
  itens: { produto: string; quantidade: number }[];
  observacoes: string;
}

// Metadata stored inside erp_estoque_movimentos.observacao
interface TeMeta {
  tipo: TransacaoExterna['tipo'];
  origem: string;
  destino: string;
  transportadora: string;
  notaFiscal: string;
  previsaoRetorno: string;
  status: TransacaoExterna['status'];
  produto_nome: string;
  obs: string;
}

const TE_PREFIX = '__TE__:';

function encodeMeta(m: TeMeta): string {
  return TE_PREFIX + JSON.stringify(m);
}

function decodeMeta(observacao: string | null): TeMeta | null {
  if (!observacao?.startsWith(TE_PREFIX)) return null;
  try { return JSON.parse(observacao.slice(TE_PREFIX.length)) as TeMeta; }
  catch { return null; }
}

function movimentoToTE(m: ErpMovimento): TransacaoExterna | null {
  const meta = decodeMeta(m.observacao);
  if (!meta) return null;
  return {
    id: m.id,
    numero: `TE-${m.id.slice(-6).toUpperCase()}`,
    tipo: meta.tipo,
    origem: meta.origem,
    destino: meta.destino,
    transportadora: meta.transportadora,
    notaFiscal: meta.notaFiscal,
    data: m.created_at.split('T')[0],
    previsaoRetorno: meta.previsaoRetorno || undefined,
    status: meta.status,
    itens: [{ produto: meta.produto_nome, quantidade: m.quantidade }],
    observacoes: meta.obs,
  };
}

// ── UI Maps ───────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<string, string> = {
  TRANSFERENCIA:  'Transferência',
  CONSIGNACAO:    'Consignação',
  BENEFICIAMENTO: 'Beneficiamento',
  REMESSA_REPARO: 'Remessa p/ Reparo',
};

const STATUS_BADGE: Record<string, string> = {
  EMITIDA:     'bg-slate-100 text-slate-600',
  EM_TRANSITO: 'bg-blue-100 text-blue-700',
  ENTREGUE:    'bg-green-100 text-green-700',
  RETORNADA:   'bg-yellow-100 text-yellow-700',
  CANCELADA:   'bg-red-100 text-red-700',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function TransacaoExterna() {
  const [transacoes, setTransacoes] = useState<TransacaoExterna[]>([]);
  const [produtos, setProdutos] = useState<ErpProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('TODOS');
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Product search in form
  const [selectedProduto, setSelectedProduto] = useState<ErpProduto | null>(null);
  const [prodSearch, setProdSearch] = useState('');

  const [form, setForm] = useState({
    tipo:            'TRANSFERENCIA' as TransacaoExterna['tipo'],
    origem:          '',
    destino:         '',
    transportadora:  '',
    notaFiscal:      '',
    data:            new Date().toISOString().split('T')[0],
    previsaoRetorno: '',
    quantidade:      '1',
    observacoes:     '',
  });

  // ── Data loading ────────────────────────────────────────────────────────────
  // Load from erp_estoque_movimentos filtering by __TE__ prefix in observacao

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [movimentos, prods] = await Promise.all([
        getMovimentos(),
        getProdutos(),
      ]);
      setTransacoes(
        movimentos
          .map(movimentoToTE)
          .filter((t): t is TransacaoExterna => t !== null),
      );
      setProdutos(prods);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function resetForm() {
    setSelectedProduto(null);
    setProdSearch('');
    setForm({
      tipo: 'TRANSFERENCIA', origem: '', destino: '', transportadora: '',
      notaFiscal: '', data: new Date().toISOString().split('T')[0],
      previsaoRetorno: '', quantidade: '1', observacoes: '',
    });
  }

  // ── Save → registrarMovimento com metadata em observacao ────────────────────
  // Tipo SAIDA: itens saem fisicamente do estoque da empresa.
  // Metadata completo serializado em observacao com prefixo __TE__: para filtro
  // no load. Status tracking avançado (EM_TRANSITO, RETORNADA) entra no backlog.

  async function handleSalvar() {
    if (!selectedProduto) {
      showToast('Selecione um produto do catálogo.', false); return;
    }
    if (!form.origem.trim() || !form.destino.trim()) {
      showToast('Preencha origem e destino.', false); return;
    }
    const qty = parseInt(form.quantidade) || 1;
    if (qty > selectedProduto.estoque_atual) {
      showToast(`Estoque insuficiente. Disponível: ${selectedProduto.estoque_atual} ${selectedProduto.unidade_medida}.`, false);
      return;
    }

    const meta: TeMeta = {
      tipo:            form.tipo,
      origem:          form.origem,
      destino:         form.destino,
      transportadora:  form.transportadora,
      notaFiscal:      form.notaFiscal,
      previsaoRetorno: form.previsaoRetorno,
      status:          'EMITIDA',
      produto_nome:    selectedProduto.nome,
      obs:             form.observacoes,
    };

    setSaving(true);
    try {
      await registrarMovimento({
        produto_id:      selectedProduto.id,
        tipo_movimento:  'SAIDA',
        quantidade:      qty,
        deposito_origem: form.origem,
        deposito_destino: form.destino,
        observacao:      encodeMeta(meta),
      });
      showToast('Transação externa registrada!', true);
      resetForm();
      setShowForm(false);
      load();
    } catch (e) {
      showToast('Erro ao salvar: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  // ── Derived state ────────────────────────────────────────────────────────────

  const filteredProdutos = produtos
    .filter(p => p.nome.toLowerCase().includes(prodSearch.toLowerCase()))
    .slice(0, 6);

  const filtradas = transacoes.filter(t => {
    const matchBusca =
      t.numero.toLowerCase().includes(busca.toLowerCase()) ||
      t.origem.toLowerCase().includes(busca.toLowerCase()) ||
      t.destino.toLowerCase().includes(busca.toLowerCase());
    const matchTipo = tipoFiltro === 'TODOS' || t.tipo === tipoFiltro;
    return matchBusca && matchTipo;
  });

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" /> Transação Externa
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Transferências, consignações, beneficiamentos e remessas para reparo</p>
        </div>
        <button
          onClick={() => { if (showForm) resetForm(); setShowForm(!showForm); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {showForm ? <><X className="w-4 h-4" /> Cancelar</> : <><Plus className="w-4 h-4" /> Nova Transação</>}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 max-w-2xl">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Nova Transação Externa</h2>
          <div className="grid grid-cols-2 gap-3">

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo *</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TransacaoExterna['tipo'] }))}
              >
                {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data</label>
              <input type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.data}
                onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Origem *</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Filial / local de origem"
                value={form.origem}
                onChange={e => setForm(f => ({ ...f, origem: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Destino *</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Empresa / local de destino"
                value={form.destino}
                onChange={e => setForm(f => ({ ...f, destino: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Transportadora</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome da transportadora"
                value={form.transportadora}
                onChange={e => setForm(f => ({ ...f, transportadora: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nota Fiscal</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="NF-XXXXX"
                value={form.notaFiscal}
                onChange={e => setForm(f => ({ ...f, notaFiscal: e.target.value }))}
              />
            </div>

            {/* Product search — bound to catalog (requires real produto_id) */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Produto *</label>
              {!selectedProduto ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Buscar produto do catálogo..."
                    value={prodSearch}
                    onChange={e => setProdSearch(e.target.value)}
                  />
                  {prodSearch && (
                    <div className="absolute top-full left-0 right-0 border border-slate-200 bg-white rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                      {filteredProdutos.map(p => (
                        <button key={p.id}
                          onClick={() => { setSelectedProduto(p); setProdSearch(''); }}
                          className="w-full px-3 py-2 hover:bg-slate-50 text-sm text-left border-b border-slate-100 last:border-b-0 flex justify-between items-center"
                        >
                          <span>{p.nome}</span>
                          <span className="text-xs text-slate-400">{p.estoque_atual} {p.unidade_medida} disponível</span>
                        </button>
                      ))}
                      {filteredProdutos.length === 0 && (
                        <div className="px-3 py-2 text-sm text-slate-400">Nenhum produto encontrado.</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-sm font-medium text-blue-800">{selectedProduto.nome}</span>
                    <span className="text-xs text-blue-500 ml-2">Estoque: {selectedProduto.estoque_atual} {selectedProduto.unidade_medida}</span>
                  </div>
                  <button onClick={() => setSelectedProduto(null)} className="text-blue-600 text-xs">Alterar</button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Quantidade</label>
              <input type="number" min="1"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.quantidade}
                onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))}
              />
            </div>

            {(form.tipo === 'CONSIGNACAO' || form.tipo === 'REMESSA_REPARO') && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Previsão de Retorno</label>
                <input type="date"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.previsaoRetorno}
                  onChange={e => setForm(f => ({ ...f, previsaoRetorno: e.target.value }))}
                />
              </div>
            )}

            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
              <textarea
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => { resetForm(); setShowForm(false); }}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Registrar
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar por número, origem ou destino…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {['TODOS', ...Object.keys(TIPO_LABELS)].map(t => (
            <button key={t} onClick={() => setTipoFiltro(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tipoFiltro === t ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {t === 'TODOS' ? 'Todos' : TIPO_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando transações…
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-8 text-center text-slate-400">
              Nenhuma transação encontrada
            </div>
          )}
          {filtradas.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-800 text-sm">{t.numero}</span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{TIPO_LABELS[t.tipo]}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[t.status]}`}>{t.status.replace('_', ' ')}</span>
                </div>
                <span className="text-xs text-slate-500">{new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="font-medium text-slate-700">{t.origem}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span className="font-medium text-slate-700">{t.destino}</span>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-slate-500">
                {t.transportadora && <span>Transportadora: {t.transportadora}</span>}
                {t.notaFiscal && <span>NF: {t.notaFiscal}</span>}
                <span>{t.itens.map(i => `${i.quantidade}× ${i.produto}`).join(', ')}</span>
                {t.previsaoRetorno && (
                  <span>Retorno previsto: {new Date(t.previsaoRetorno + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

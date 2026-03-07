import { useState, useEffect, useMemo } from 'react';
import {
  ArrowDownCircle, Loader2, CheckCircle, AlertCircle, X, Plus,
  Search, Filter, Download, Clock, TrendingDown, Calendar,
} from 'lucide-react';
import {
  createLancamento, getLancamentos, getContasBancarias,
  baixarLancamento, cancelarLancamento, parcelarLancamento,
} from '../../../lib/erp';
import type { ErpLancamento, ErpContaBancaria, BaixaPayload } from '../../../lib/erp';

const CATEGORIAS = ['OPERACIONAL', 'FISCAL', 'FOLHA', 'HOSPEDAGEM', 'OUTROS'];
const FORMAS_PGT = ['PIX', 'BOLETO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO', 'TED', 'DOC', 'CHEQUE'] as const;

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (s: string) => new Date(s + 'T00:00').toLocaleDateString('pt-BR');
const today = () => new Date().toISOString().split('T')[0];
const diasAtraso = (venc: string) => {
  const diff = new Date().getTime() - new Date(venc + 'T00:00').getTime();
  return Math.floor(diff / 86400000);
};

// Modal de Baixa
function ModalBaixa({
  lancamento, contas, onClose, onSuccess,
}: {
  lancamento: ErpLancamento;
  contas: ErpContaBancaria[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const atraso = lancamento.data_vencimento < today() ? diasAtraso(lancamento.data_vencimento) : 0;
  const multaCalc = atraso > 0 ? lancamento.valor * 0.02 + lancamento.valor * 0.001 * atraso : 0;

  const [dataPgto, setDataPgto] = useState(today());
  const [valorPago, setValorPago] = useState(String((lancamento.valor + multaCalc).toFixed(2)));
  const [forma, setForma] = useState<typeof FORMAS_PGT[number]>('PIX');
  const [contaId, setContaId] = useState(contas[0]?.id ?? '');
  const [numDoc, setNumDoc] = useState('');
  const [desconto, setDesconto] = useState('0');
  const [juros, setJuros] = useState(multaCalc.toFixed(2));
  const [obs, setObs] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleBaixar() {
    setSaving(true);
    try {
      const payload: BaixaPayload = {
        data_pagamento: dataPgto,
        valor_pago: +valorPago,
        forma_pagamento: forma,
        conta_bancaria_id: contaId || null,
        numero_documento: numDoc,
        desconto_aplicado: +desconto,
        juros_multa: +juros,
        observacoes: obs,
      };
      await baixarLancamento(lancamento.id, payload);
      onSuccess();
    } catch (e) { alert('Erro: ' + (e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-bold text-slate-900">Baixar Recebimento</h2>
            <p className="text-xs text-slate-500 mt-0.5">{lancamento.descricao}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {atraso > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-700">
              <strong>{atraso} dias de atraso</strong> — multa estimada: {fmtBRL(multaCalc)}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor Original</label>
              <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-600">{fmtBRL(lancamento.valor)}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor Pago (R$) *</label>
              <input type="number" min="0.01" step="0.01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={valorPago} onChange={e => setValorPago(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Desconto (R$)</label>
              <input type="number" min="0" step="0.01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={desconto} onChange={e => setDesconto(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Juros/Multa (R$)</label>
              <input type="number" min="0" step="0.01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={juros} onChange={e => setJuros(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data Recebimento *</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={dataPgto} onChange={e => setDataPgto(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Forma de Recebimento</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={forma} onChange={e => setForma(e.target.value as typeof FORMAS_PGT[number])}>
                {FORMAS_PGT.map(f => <option key={f}>{f.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Conta Destino</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={contaId} onChange={e => setContaId(e.target.value)}>
              <option value="">Sem conta vinculada</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nº Documento / Comprovante</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={numDoc} onChange={e => setNumDoc(e.target.value)} placeholder="PIX ID, nº boleto, cheque..." />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
            <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              value={obs} onChange={e => setObs(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
          <button onClick={handleBaixar} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Confirmar Recebimento
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal de Parcelamento
function ModalParcelar({
  lancamento, onClose, onSuccess,
}: {
  lancamento: ErpLancamento;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [nParcelas, setNParcelas] = useState(3);
  const [parcelas, setParcelas] = useState(() => {
    const valUnit = lancamento.valor / 3;
    return Array.from({ length: 3 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() + i + 1);
      return { valor: valUnit.toFixed(2), data_vencimento: d.toISOString().split('T')[0] };
    });
  });
  const [saving, setSaving] = useState(false);

  function updateParcelas(n: number) {
    setNParcelas(n);
    const valUnit = lancamento.valor / n;
    setParcelas(Array.from({ length: n }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() + i + 1);
      return { valor: i === n - 1 ? (lancamento.valor - valUnit * (n - 1)).toFixed(2) : valUnit.toFixed(2), data_vencimento: d.toISOString().split('T')[0] };
    }));
  }

  async function handleParcelar() {
    setSaving(true);
    try {
      await parcelarLancamento(lancamento, parcelas.map(p => ({ valor: +p.valor, data_vencimento: p.data_vencimento })));
      onSuccess();
    } catch (e) { alert('Erro: ' + (e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-900">Parcelar Título</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nº de Parcelas</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={nParcelas} onChange={e => updateParcelas(+e.target.value)}>
              {[2,3,4,5,6,10,12].map(n => <option key={n} value={n}>{n}x</option>)}
            </select>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {parcelas.map((p, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 items-center">
                <input type="number" step="0.01" className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                  value={p.valor} onChange={e => { const n = [...parcelas]; n[i] = { ...n[i], valor: e.target.value }; setParcelas(n); }} />
                <input type="date" className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                  value={p.data_vencimento} onChange={e => { const n = [...parcelas]; n[i] = { ...n[i], data_vencimento: e.target.value }; setParcelas(n); }} />
              </div>
            ))}
          </div>
          <div className="text-xs text-slate-500 text-right">
            Total: {fmtBRL(parcelas.reduce((s, p) => s + +p.valor, 0))} | Original: {fmtBRL(lancamento.valor)}
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50">Cancelar</button>
          <button onClick={handleParcelar} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Parcelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EntradaValores() {
  const [lancamentos, setLancamentos] = useState<ErpLancamento[]>([]);
  const [contas, setContas] = useState<ErpContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Modais
  const [modalBaixa, setModalBaixa] = useState<ErpLancamento | null>(null);
  const [modalParcelar, setModalParcelar] = useState<ErpLancamento | null>(null);
  const [cancelando, setCancelando] = useState<ErpLancamento | null>(null);
  const [justificativa, setJustificativa] = useState('');

  // Formulário novo lançamento
  const [showForm, setShowForm] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [dataVencimento, setDataVencimento] = useState(today());
  const [contaId, setContaId] = useState('');
  const [marcarPago, setMarcarPago] = useState(false);
  const [dataPgtoRapido, setDataPgtoRapido] = useState(today());

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [filtroSearch, setFiltroSearch] = useState('');

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); }

  async function reload() {
    const [l, c] = await Promise.all([getLancamentos('RECEITA'), getContasBancarias()]);
    setLancamentos(l);
    setContas(c);
  }

  useEffect(() => { reload().finally(() => setLoading(false)); }, []);

  async function handleSave() {
    if (!descricao || !valor || +valor <= 0) return showToast('Descrição e valor são obrigatórios.', false);
    setSaving(true);
    try {
      await createLancamento({
        tipo: 'RECEITA', categoria, descricao, valor: +valor,
        data_vencimento: dataVencimento,
        data_pagamento: marcarPago ? dataPgtoRapido : null,
        status: marcarPago ? 'PAGO' : 'PENDENTE',
        nfe_id: null, pedido_id: null,
        conta_bancaria_id: contaId || null,
        numero_documento: null, forma_pagamento: null,
        parcela_numero: null, parcela_total: null,
        desconto_aplicado: 0, juros_multa: 0,
        valor_pago: marcarPago ? +valor : null,
        observacoes: null, grupo_lancamento_id: null,
      });
      showToast('Receita registrada.', true);
      setDescricao(''); setValor(''); setMarcarPago(false); setShowForm(false);
      reload();
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSaving(false); }
  }

  async function handleCancelar() {
    if (!cancelando) return;
    try {
      await cancelarLancamento(cancelando.id, justificativa || 'Cancelamento manual');
      showToast('Lançamento cancelado.', true);
      setCancelando(null);
      setJustificativa('');
      reload();
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
  }

  // KPIs
  const hoje = today();
  const proximosMes = new Date();
  proximosMes.setDate(proximosMes.getDate() + 30);
  const proxMesStr = proximosMes.toISOString().split('T')[0];
  const mesAtual = hoje.slice(0, 7);

  const totalPendente = lancamentos.filter(l => l.status === 'PENDENTE').reduce((s, l) => s + l.valor, 0);
  const totalVencido = lancamentos.filter(l => l.status === 'PENDENTE' && l.data_vencimento < hoje).reduce((s, l) => s + l.valor, 0);
  const recebidoMes = lancamentos.filter(l => l.status === 'PAGO' && (l.data_pagamento ?? '').startsWith(mesAtual)).reduce((s, l) => s + (l.valor_pago ?? l.valor), 0);
  const previsao30d = lancamentos.filter(l => l.status === 'PENDENTE' && l.data_vencimento >= hoje && l.data_vencimento <= proxMesStr).reduce((s, l) => s + l.valor, 0);

  // Filtros aplicados
  const filtrados = useMemo(() => {
    let list = lancamentos;
    if (filtroStatus !== 'TODOS') {
      if (filtroStatus === 'VENCIDO') list = list.filter(l => l.status === 'PENDENTE' && l.data_vencimento < hoje);
      else list = list.filter(l => l.status === filtroStatus);
    }
    if (filtroPeriodo) list = list.filter(l => l.data_vencimento.startsWith(filtroPeriodo));
    if (filtroSearch) list = list.filter(l => l.descricao.toLowerCase().includes(filtroSearch.toLowerCase()));
    return list;
  }, [lancamentos, filtroStatus, filtroPeriodo, filtroSearch]);

  function exportCSV() {
    const header = 'Descrição,Vencimento,Valor,Status,Forma Pag.,Documento';
    const rows = filtrados.map(l =>
      `"${l.descricao}",${l.data_vencimento},${l.valor},${l.status},${l.forma_pagamento ?? ''},${l.numero_documento ?? ''}`
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'contas-receber.csv'; a.click();
  }

  const statusBadge = (l: ErpLancamento) => {
    if (l.status === 'PAGO') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">PAGO</span>;
    if (l.status === 'CANCELADO') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">CANCELADO</span>;
    if (l.data_vencimento < hoje) {
      const dias = diasAtraso(l.data_vencimento);
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">VENCIDO +{dias}d</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">PENDENTE</span>;
  };

  return (
    <div className="p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {toast.msg}
        </div>
      )}

      {/* Modais */}
      {modalBaixa && (
        <ModalBaixa lancamento={modalBaixa} contas={contas} onClose={() => setModalBaixa(null)}
          onSuccess={() => { setModalBaixa(null); showToast('Recebimento registrado.', true); reload(); }} />
      )}
      {modalParcelar && (
        <ModalParcelar lancamento={modalParcelar} onClose={() => setModalParcelar(null)}
          onSuccess={() => { setModalParcelar(null); showToast('Título parcelado.', true); reload(); }} />
      )}
      {cancelando && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="font-bold text-slate-900 mb-3">Cancelar Lançamento</h2>
            <p className="text-sm text-slate-600 mb-3">"{cancelando.descricao}"</p>
            <textarea rows={3} placeholder="Justificativa (opcional)"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none mb-4"
              value={justificativa} onChange={e => setJustificativa(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => setCancelando(null)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-lg text-sm">Voltar</button>
              <button onClick={handleCancelar} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownCircle className="w-5 h-5 text-green-600" />
            <h1 className="text-xl font-bold text-slate-900">Contas a Receber</h1>
          </div>
          <p className="text-sm text-slate-500">Gerencie receitas, recebimentos e títulos em aberto</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 px-3 py-2 rounded-lg text-sm transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Novo Lançamento
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-amber-500" /><span className="text-xs text-slate-500">A Receber</span></div>
          <div className="text-xl font-bold text-amber-600">{fmtBRL(totalPendente)}</div>
        </div>
        <div className="bg-white rounded-xl border border-red-100 p-4">
          <div className="flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4 text-red-500" /><span className="text-xs text-slate-500">Vencido</span></div>
          <div className="text-xl font-bold text-red-600">{fmtBRL(totalVencido)}</div>
        </div>
        <div className="bg-white rounded-xl border border-green-100 p-4">
          <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-xs text-slate-500">Recebido no Mês</span></div>
          <div className="text-xl font-bold text-green-600">{fmtBRL(recebidoMes)}</div>
        </div>
        <div className="bg-white rounded-xl border border-blue-100 p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingDown className="w-4 h-4 text-blue-500" /><span className="text-xs text-slate-500">Previsão 30 dias</span></div>
          <div className="text-xl font-bold text-blue-600">{fmtBRL(previsao30d)}</div>
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Novo Lançamento de Receita</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Descrição *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Pagamento fatura cliente..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor (R$) *</label>
              <input type="number" min="0.01" step="0.01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={valor} onChange={e => setValor(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Vencimento</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Categoria</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={categoria} onChange={e => setCategoria(e.target.value)}>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Conta Bancária</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={contaId} onChange={e => setContaId(e.target.value)}>
                <option value="">Sem conta</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <input type="checkbox" id="marcarPago" checked={marcarPago} onChange={e => setMarcarPago(e.target.checked)} className="rounded" />
              <label htmlFor="marcarPago" className="text-sm text-slate-700">Já recebido</label>
              {marcarPago && (
                <input type="date" className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                  value={dataPgtoRapido} onChange={e => setDataPgtoRapido(e.target.value)} />
              )}
            </div>
            <div className="col-span-2 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Buscar descrição..." value={filtroSearch} onChange={e => setFiltroSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Filter className="w-4 h-4" />
          {['TODOS', 'PENDENTE', 'VENCIDO', 'PAGO', 'CANCELADO'].map(s => (
            <button key={s} onClick={() => setFiltroStatus(s)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${filtroStatus === s ? 'bg-green-600 text-white border-green-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input type="month" className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
            value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)} />
          {filtroPeriodo && <button onClick={() => setFiltroPeriodo('')} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Descrição</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Vencimento</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Categoria</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Valor</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Pago</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Forma</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">Nenhum lançamento encontrado.</td></tr>
            ) : filtrados.map(l => (
              <tr key={l.id} className={`hover:bg-slate-50 transition-colors ${l.status === 'PENDENTE' && l.data_vencimento < hoje ? 'bg-red-50/30' : ''}`}>
                <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">{l.descricao}</td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDate(l.data_vencimento)}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">{l.categoria}</span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmtBRL(l.valor)}</td>
                <td className="px-4 py-3 text-right text-green-700 font-medium">
                  {l.valor_pago != null ? fmtBRL(l.valor_pago) : '—'}
                </td>
                <td className="px-4 py-3 text-center">{statusBadge(l)}</td>
                <td className="px-4 py-3 text-center text-xs text-slate-500">{l.forma_pagamento?.replace('_', ' ') ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {l.status === 'PENDENTE' && (
                      <>
                        <button onClick={() => setModalBaixa(l)}
                          className="text-xs text-white bg-green-600 hover:bg-green-700 px-2.5 py-1 rounded font-medium transition-colors">
                          Receber
                        </button>
                        <button onClick={() => setModalParcelar(l)}
                          className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded font-medium border border-blue-200 hover:bg-blue-50 transition-colors">
                          Parcelar
                        </button>
                        <button onClick={() => { setCancelando(l); setJustificativa(''); }}
                          className="text-xs text-slate-400 hover:text-red-600 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
          {filtrados.length} lançamento(s)
        </div>
      </div>
    </div>
  );
}

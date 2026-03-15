// ERP — Transação Externa
import { useState } from 'react';
import { Truck, Search, Plus, X, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

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

const MOCK: TransacaoExterna[] = [
  {
    id: '1', numero: 'TE-0001', tipo: 'TRANSFERENCIA',
    origem: 'Filial São Paulo', destino: 'Filial Rio de Janeiro',
    transportadora: 'Correios', notaFiscal: 'NF-00231',
    data: '2026-03-08', status: 'ENTREGUE',
    itens: [{ produto: 'Produto A', quantidade: 100 }, { produto: 'Produto B', quantidade: 50 }],
    observacoes: 'Transferência de estoque de rotina',
  },
  {
    id: '2', numero: 'TE-0002', tipo: 'CONSIGNACAO',
    origem: 'Matriz', destino: 'Cliente Consignatário ABC',
    transportadora: 'FedEx', notaFiscal: 'NF-00245',
    data: '2026-03-12', previsaoRetorno: '2026-04-12', status: 'EM_TRANSITO',
    itens: [{ produto: 'Equipamento X', quantidade: 5 }],
    observacoes: 'Mercadoria em consignação por 30 dias',
  },
  {
    id: '3', numero: 'TE-0003', tipo: 'REMESSA_REPARO',
    origem: 'Filial BH', destino: 'Assistência Técnica TechFix',
    transportadora: 'TNT', notaFiscal: 'NF-00251',
    data: '2026-03-14', previsaoRetorno: '2026-03-28', status: 'EMITIDA',
    itens: [{ produto: 'Servidor Dell R740', quantidade: 1 }],
    observacoes: 'Reparo em garantia — HD com falha',
  },
];

const TIPO_LABELS: Record<string, string> = {
  TRANSFERENCIA: 'Transferência',
  CONSIGNACAO: 'Consignação',
  BENEFICIAMENTO: 'Beneficiamento',
  REMESSA_REPARO: 'Remessa p/ Reparo',
};

const STATUS_BADGE: Record<string, string> = {
  EMITIDA:    'bg-slate-100 text-slate-600',
  EM_TRANSITO:'bg-blue-100 text-blue-700',
  ENTREGUE:   'bg-green-100 text-green-700',
  RETORNADA:  'bg-yellow-100 text-yellow-700',
  CANCELADA:  'bg-red-100 text-red-700',
};


export default function TransacaoExterna() {
  const [transacoes, setTransacoes] = useState<TransacaoExterna[]>(MOCK);
  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('TODOS');
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [form, setForm] = useState({
    tipo: 'TRANSFERENCIA' as TransacaoExterna['tipo'],
    origem: '', destino: '', transportadora: '', notaFiscal: '',
    data: new Date().toISOString().split('T')[0], previsaoRetorno: '',
    produto: '', quantidade: '1', observacoes: '',
  });

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); }

  function handleSalvar() {
    if (!form.origem.trim() || !form.destino.trim() || !form.produto.trim()) {
      showToast('Preencha origem, destino e produto.', false); return;
    }
    const nova: TransacaoExterna = {
      id: String(Date.now()),
      numero: `TE-${String(transacoes.length + 1).padStart(4, '0')}`,
      tipo: form.tipo, origem: form.origem, destino: form.destino,
      transportadora: form.transportadora, notaFiscal: form.notaFiscal,
      data: form.data, previsaoRetorno: form.previsaoRetorno || undefined,
      status: 'EMITIDA',
      itens: [{ produto: form.produto, quantidade: parseInt(form.quantidade) || 1 }],
      observacoes: form.observacoes,
    };
    setTransacoes(prev => [nova, ...prev]);
    showToast('Transação externa registrada!', true);
    setShowForm(false);
  }

  const filtradas = transacoes.filter(t => {
    const matchBusca = t.numero.toLowerCase().includes(busca.toLowerCase()) || t.origem.toLowerCase().includes(busca.toLowerCase()) || t.destino.toLowerCase().includes(busca.toLowerCase());
    const matchTipo = tipoFiltro === 'TODOS' || t.tipo === tipoFiltro;
    return matchBusca && matchTipo;
  });

  return (
    <div className="p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" /> Transação Externa
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Transferências, consignações, beneficiamentos e remessas para reparo</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {showForm ? <><X className="w-4 h-4" /> Cancelar</> : <><Plus className="w-4 h-4" /> Nova Transação</>}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 max-w-2xl">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Nova Transação Externa</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo *</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TransacaoExterna['tipo'] }))}>
                {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Origem *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Filial / Empresa origem" value={form.origem} onChange={e => setForm(f => ({ ...f, origem: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Destino *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Filial / Empresa destino" value={form.destino} onChange={e => setForm(f => ({ ...f, destino: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Transportadora</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome da transportadora" value={form.transportadora} onChange={e => setForm(f => ({ ...f, transportadora: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nota Fiscal</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="NF-XXXXX" value={form.notaFiscal} onChange={e => setForm(f => ({ ...f, notaFiscal: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Produto *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome do produto" value={form.produto} onChange={e => setForm(f => ({ ...f, produto: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Quantidade</label>
              <input type="number" min="1" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
            </div>
            {(form.tipo === 'CONSIGNACAO' || form.tipo === 'REMESSA_REPARO') && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Previsão de Retorno</label>
                <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.previsaoRetorno} onChange={e => setForm(f => ({ ...f, previsaoRetorno: e.target.value }))} />
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button onClick={handleSalvar} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Registrar</button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Buscar por número, origem ou destino…" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {['TODOS', ...Object.keys(TIPO_LABELS)].map(t => (
            <button key={t} onClick={() => setTipoFiltro(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tipoFiltro === t ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {t === 'TODOS' ? 'Todos' : TIPO_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtradas.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-8 text-center text-slate-400">Nenhuma transação encontrada</div>
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
              <span>{t.itens.reduce((s, i) => s + i.quantidade, 0)} itens</span>
              {t.previsaoRetorno && <span>Retorno previsto: {new Date(t.previsaoRetorno + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

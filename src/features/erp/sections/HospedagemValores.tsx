// ERP — Hospedagem de Valores (controle de valores em custódia/garantia)
import { useState } from 'react';
import { Landmark, Plus, X, CheckCircle, AlertCircle, Search, Unlock, Calendar } from 'lucide-react';

interface ValorHospedado {
  id: string;
  referencia: string;
  tipo: 'GARANTIA' | 'CAUCAO' | 'DEPOSITO_JUDICIAL' | 'FUNDO_RESERVA' | 'ANTECIPACAO';
  parteDevedora: string;
  parteCredora: string;
  valor: number;
  dataDeposito: string;
  dataVencimento?: string;
  dataLiberacao?: string;
  status: 'ATIVO' | 'LIBERADO' | 'CONFISCADO' | 'EXPIRADO';
  descricao: string;
  conta: string;
}

const MOCK: ValorHospedado[] = [
  {
    id: '1', referencia: 'HOSP-0001', tipo: 'GARANTIA',
    parteDevedora: 'Empresa Alpha Ltda', parteCredora: 'Nossa Empresa',
    valor: 50000, dataDeposito: '2026-01-15', dataVencimento: '2026-07-15',
    status: 'ATIVO', descricao: 'Garantia contratual — contrato de serviços 12 meses',
    conta: 'Conta Garantias - Banco do Brasil',
  },
  {
    id: '2', referencia: 'HOSP-0002', tipo: 'CAUCAO',
    parteDevedora: 'Comércio Beta S/A', parteCredora: 'Nossa Empresa',
    valor: 12000, dataDeposito: '2026-02-01', dataVencimento: '2026-08-01',
    status: 'ATIVO', descricao: 'Caução locação de equipamentos — 2 meses',
    conta: 'Conta Poupança Jurídica - Itaú',
  },
  {
    id: '3', referencia: 'HOSP-0003', tipo: 'DEPOSITO_JUDICIAL',
    parteDevedora: 'Nossa Empresa', parteCredora: 'Tribunal de Justiça SP',
    valor: 35000, dataDeposito: '2025-11-10',
    status: 'ATIVO', descricao: 'Depósito judicial — processo 0001234-56.2025.8.26.0100',
    conta: 'Conta Judicial - CEF',
  },
  {
    id: '4', referencia: 'HOSP-0004', tipo: 'FUNDO_RESERVA',
    parteDevedora: 'Nossa Empresa', parteCredora: 'Fundo Interno',
    valor: 80000, dataDeposito: '2026-01-01',
    status: 'ATIVO', descricao: 'Fundo de reserva para contingências operacionais Q1/2026',
    conta: 'Conta Aplicações - Bradesco',
  },
  {
    id: '5', referencia: 'HOSP-0005', tipo: 'ANTECIPACAO',
    parteDevedora: 'Nossa Empresa', parteCredora: 'Indústria Norte ME',
    valor: 25000, dataDeposito: '2026-02-20', dataLiberacao: '2026-03-10',
    status: 'LIBERADO', descricao: 'Antecipação de fornecimento — entrega concluída',
    conta: 'Conta Corrente Principal',
  },
];

const TIPO_LABELS: Record<string, string> = {
  GARANTIA: 'Garantia', CAUCAO: 'Caução', DEPOSITO_JUDICIAL: 'Depósito Judicial',
  FUNDO_RESERVA: 'Fundo de Reserva', ANTECIPACAO: 'Antecipação',
};

const TIPO_BADGE: Record<string, string> = {
  GARANTIA: 'bg-blue-100 text-blue-700',
  CAUCAO: 'bg-violet-100 text-violet-700',
  DEPOSITO_JUDICIAL: 'bg-red-100 text-red-700',
  FUNDO_RESERVA: 'bg-amber-100 text-amber-700',
  ANTECIPACAO: 'bg-slate-100 text-slate-600',
};

const STATUS_BADGE: Record<string, string> = {
  ATIVO:     'bg-green-100 text-green-700',
  LIBERADO:  'bg-blue-100 text-blue-700',
  CONFISCADO:'bg-red-100 text-red-700',
  EXPIRADO:  'bg-gray-100 text-gray-500',
};

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function HospedagemValores() {
  const [valores, setValores] = useState<ValorHospedado[]>(MOCK);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('TODOS');
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [liberandoId, setLiberandoId] = useState<string | null>(null);

  const [form, setForm] = useState({
    tipo: 'GARANTIA' as ValorHospedado['tipo'],
    parteDevedora: '', parteCredora: '', valor: '',
    dataDeposito: new Date().toISOString().split('T')[0],
    dataVencimento: '', descricao: '', conta: '',
  });

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); }

  function handleSalvar() {
    if (!form.parteDevedora.trim() || !form.valor) { showToast('Preencha parte devedora e valor.', false); return; }
    const novo: ValorHospedado = {
      id: String(Date.now()),
      referencia: `HOSP-${String(valores.length + 1).padStart(4, '0')}`,
      tipo: form.tipo, parteDevedora: form.parteDevedora, parteCredora: form.parteCredora,
      valor: parseFloat(form.valor), dataDeposito: form.dataDeposito,
      dataVencimento: form.dataVencimento || undefined,
      status: 'ATIVO', descricao: form.descricao, conta: form.conta,
    };
    setValores(prev => [novo, ...prev]);
    showToast('Valor hospedado registrado!', true);
    setShowForm(false);
  }

  function liberar(id: string) {
    setValores(prev => prev.map(v => v.id === id ? { ...v, status: 'LIBERADO', dataLiberacao: new Date().toISOString().split('T')[0] } : v));
    showToast('Valor liberado com sucesso!', true);
    setLiberandoId(null);
  }

  const filtrados = valores.filter(v => {
    const matchBusca = v.referencia.toLowerCase().includes(busca.toLowerCase()) || v.parteDevedora.toLowerCase().includes(busca.toLowerCase()) || v.parteCredora.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = statusFiltro === 'TODOS' || v.status === statusFiltro;
    return matchBusca && matchStatus;
  });

  const totalAtivo = valores.filter(v => v.status === 'ATIVO').reduce((s, v) => s + v.valor, 0);

  return (
    <div className="p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {liberandoId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="font-semibold text-slate-800 mb-2">Liberar Valor</h3>
            <p className="text-sm text-slate-600 mb-4">Confirma a liberação de <strong>{BRL(valores.find(v => v.id === liberandoId)?.valor ?? 0)}</strong>? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2">
              <button onClick={() => liberar(liberandoId)} className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700">Confirmar Liberação</button>
              <button onClick={() => setLiberandoId(null)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-emerald-600" /> Hospedagem de Valores
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Controle de valores em custódia, garantias, caução e depósitos judiciais</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
          {showForm ? <><X className="w-4 h-4" /> Cancelar</> : <><Plus className="w-4 h-4" /> Novo Registro</>}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="text-lg font-bold text-green-700">{BRL(totalAtivo)}</div>
          <div className="text-xs text-slate-500">Total em Custódia</div>
        </div>
        {['GARANTIA', 'CAUCAO', 'DEPOSITO_JUDICIAL'].map(tipo => (
          <div key={tipo} className={`border rounded-xl p-4 ${TIPO_BADGE[tipo].replace('text-', 'border-').replace('bg-', 'border-').split(' ')[0]} bg-white`}>
            <div className="text-lg font-bold text-slate-800">{BRL(valores.filter(v => v.tipo === tipo && v.status === 'ATIVO').reduce((s, v) => s + v.valor, 0))}</div>
            <div className="text-xs text-slate-500">{TIPO_LABELS[tipo]}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 max-w-2xl">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Novo Valor Hospedado</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as ValorHospedado['tipo'] }))}>
                {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor *</label>
              <input type="number" min="0" step="0.01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Parte Devedora *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.parteDevedora} onChange={e => setForm(f => ({ ...f, parteDevedora: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Parte Credora</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.parteCredora} onChange={e => setForm(f => ({ ...f, parteCredora: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data do Depósito</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.dataDeposito} onChange={e => setForm(f => ({ ...f, dataDeposito: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Vencimento</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={form.dataVencimento} onChange={e => setForm(f => ({ ...f, dataVencimento: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Conta Bancária</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Banco / conta" value={form.conta} onChange={e => setForm(f => ({ ...f, conta: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" rows={2} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button onClick={handleSalvar} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700">Registrar</button>
          </div>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Buscar por referência, parte…" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {['TODOS', 'ATIVO', 'LIBERADO', 'CONFISCADO', 'EXPIRADO'].map(s => (
            <button key={s} onClick={() => setStatusFiltro(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFiltro === s ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {s === 'TODOS' ? 'Todos' : s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtrados.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-8 text-center text-slate-400">Nenhum registro encontrado</div>
        )}
        {filtrados.map(v => (
          <div key={v.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-emerald-300 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-slate-700">{v.referencia}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_BADGE[v.tipo]}`}>{TIPO_LABELS[v.tipo]}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[v.status]}`}>{v.status}</span>
                </div>
                <p className="text-sm text-slate-600 mb-1">{v.descricao}</p>
                <div className="flex gap-4 text-xs text-slate-400">
                  <span>Devedor: {v.parteDevedora}</span>
                  {v.parteCredora && <span>Credor: {v.parteCredora}</span>}
                  {v.conta && <span>Conta: {v.conta}</span>}
                </div>
                <div className="flex gap-4 text-xs text-slate-400 mt-0.5">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Depósito: {new Date(v.dataDeposito + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                  {v.dataVencimento && <span>Venc.: {new Date(v.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                  {v.dataLiberacao && <span className="text-emerald-600">Liberado: {new Date(v.dataLiberacao + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-bold text-slate-900">{BRL(v.valor)}</div>
                {v.status === 'ATIVO' && (
                  <button
                    onClick={() => setLiberandoId(v.id)}
                    className="mt-1 flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 transition-colors"
                  >
                    <Unlock className="w-3 h-3" /> Liberar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

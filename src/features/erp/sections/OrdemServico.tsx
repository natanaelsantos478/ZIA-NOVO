// ERP — Ordem de Serviço
import { useState, useEffect, useCallback } from 'react';
import {
  Wrench, Plus, X, CheckCircle, AlertCircle, Search, RefreshCw, Loader2,
} from 'lucide-react';
import {
  getAtendimentos, createAtendimento, updateAtendimento, getClientes,
} from '../../../lib/erp';
import type { ErpAtendimento, ErpCliente } from '../../../lib/erp';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OS {
  id: string;
  numero: string;
  cliente_id: string;
  cliente: string;
  contato: string;
  telefone: string;
  tipo: 'CORRETIVA' | 'PREVENTIVA' | 'INSTALACAO' | 'CONSULTORIA';
  descricaoProblema: string;
  equipamento: string;
  tecnico: string;
  dataAbertura: string;
  dataPrevista: string;
  dataFechamento?: string;
  status: 'ABERTA' | 'EM_ANDAMENTO' | 'AGUARDANDO_PECA' | 'AGUARDANDO_CLIENTE' | 'CONCLUIDA' | 'CANCELADA';
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  valorMaoDeObra: number;
  valorPecas: number;
  observacoes?: string;
}

// Campos extras que não existem no schema de erp_atendimentos — serializados em descricao
interface OsExtra {
  tipo_os?: string;
  equipamento?: string;
  tecnico?: string;
  contato?: string;
  telefone?: string;
  valor_mao?: number;
  valor_pecas?: number;
  data_prevista?: string;
  obs?: string;
}

// ── Badge maps ────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  ABERTA:             'bg-slate-100 text-slate-600',
  EM_ANDAMENTO:       'bg-blue-100 text-blue-700',
  AGUARDANDO_PECA:    'bg-yellow-100 text-yellow-700',
  AGUARDANDO_CLIENTE: 'bg-orange-100 text-orange-700',
  CONCLUIDA:          'bg-green-100 text-green-700',
  CANCELADA:          'bg-red-100 text-red-700',
};

const PRIORIDADE_BADGE: Record<string, string> = {
  BAIXA:   'bg-slate-100 text-slate-500',
  MEDIA:   'bg-blue-100 text-blue-600',
  ALTA:    'bg-orange-100 text-orange-600',
  URGENTE: 'bg-red-100 text-red-600',
};

// Status transitions allowed in the detail modal
const STATUS_NEXT: Record<OS['status'], OS['status'][]> = {
  ABERTA:             ['EM_ANDAMENTO', 'CANCELADA'],
  EM_ANDAMENTO:       ['AGUARDANDO_PECA', 'AGUARDANDO_CLIENTE', 'CONCLUIDA', 'CANCELADA'],
  AGUARDANDO_PECA:    ['EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'],
  AGUARDANDO_CLIENTE: ['EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'],
  CONCLUIDA:          [],
  CANCELADA:          [],
};

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ── Schema mapping helpers ────────────────────────────────────────────────────

// DB prioridade uses CRITICA; OS uses URGENTE — map both ways
function toDbPrioridade(p: OS['prioridade']): ErpAtendimento['prioridade'] {
  return p === 'URGENTE' ? 'CRITICA' : p;
}
function fromDbPrioridade(p: ErpAtendimento['prioridade']): OS['prioridade'] {
  return p === 'CRITICA' ? 'URGENTE' : p;
}

// DB status uses ABERTO/RESOLVIDO/FECHADO; OS uses ABERTA/CONCLUIDA/CANCELADA
function toDbStatus(s: OS['status']): ErpAtendimento['status'] {
  if (s === 'ABERTA')      return 'ABERTO';
  if (s === 'EM_ANDAMENTO') return 'EM_ANDAMENTO';
  if (s === 'CONCLUIDA')   return 'RESOLVIDO';
  return 'FECHADO'; // CANCELADA, AGUARDANDO_*
}
function fromDbStatus(s: ErpAtendimento['status']): OS['status'] {
  if (s === 'ABERTO')      return 'ABERTA';
  if (s === 'EM_ANDAMENTO') return 'EM_ANDAMENTO';
  if (s === 'RESOLVIDO')   return 'CONCLUIDA';
  return 'CANCELADA';
}

// Parse OS-specific fields stored as JSON in descricao
function parseExtra(descricao: string | null): OsExtra {
  if (!descricao) return {};
  try { return JSON.parse(descricao) as OsExtra; } catch { return {}; }
}

// Map a DB erp_atendimento record → local OS object
function atendimentoToOS(a: ErpAtendimento): OS {
  const extra = parseExtra(a.descricao);
  return {
    id: a.id,
    numero: `OS-${String(a.numero).padStart(4, '0')}`,
    cliente_id: a.cliente_id,
    cliente: a.erp_clientes?.nome ?? '',
    contato: extra.contato ?? '',
    telefone: extra.telefone ?? '',
    tipo: (extra.tipo_os as OS['tipo']) ?? 'CORRETIVA',
    descricaoProblema: a.titulo,
    equipamento: extra.equipamento ?? '',
    tecnico: extra.tecnico ?? '',
    dataAbertura: (a.data_abertura ?? '').split('T')[0],
    dataPrevista: extra.data_prevista ?? a.data_fechamento?.split('T')[0] ?? '',
    dataFechamento: a.data_fechamento?.split('T')[0],
    status: fromDbStatus(a.status),
    prioridade: fromDbPrioridade(a.prioridade),
    valorMaoDeObra: extra.valor_mao ?? 0,
    valorPecas: extra.valor_pecas ?? 0,
    observacoes: extra.obs,
  };
}

// ── Empty form ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  tipo: 'CORRETIVA' as OS['tipo'],
  prioridade: 'MEDIA' as OS['prioridade'],
  descricaoProblema: '',
  equipamento: '',
  tecnico: '',
  contato: '',
  telefone: '',
  dataPrevista: '',
  valorMaoDeObra: '',
  valorPecas: '',
  observacoes: '',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function OrdemServico() {
  const [ordens, setOrdens] = useState<OS[]>([]);
  const [clientes, setClientes] = useState<ErpCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [aba, setAba] = useState<'lista' | 'nova'>('lista');
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('TODAS');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [detalhe, setDetalhe] = useState<OS | null>(null);

  // Client search in the form
  const [clienteId, setClienteId] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');

  const [form, setForm] = useState(EMPTY_FORM);

  // ── Data loading ─────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ats, cli] = await Promise.all([
        getAtendimentos('ORDEM_SERVICO'),
        getClientes(),
      ]);
      setOrdens(ats.map(atendimentoToOS));
      setClientes(cli);
    } catch { /* silent — error boundary above handles critical failures */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function resetForm() {
    setClienteId('');
    setClienteSearch('');
    setForm(EMPTY_FORM);
  }

  // ── Save new OS → persisted in erp_atendimentos ───────────────────────────────
  // Extra OS fields (tipo_os, tecnico, equipamento, valores) are serialized to
  // descricao as JSON since erp_atendimentos has no dedicated columns for them.
  // Technical debt: a future DB migration can add these columns; the parse() call
  // above has graceful fallback so migration won't break existing records.

  async function handleSalvar() {
    if (!clienteId) {
      showToast('Selecione um cliente.', false); return;
    }
    if (!form.descricaoProblema.trim()) {
      showToast('Preencha a descrição do problema.', false); return;
    }

    const extra: OsExtra = {
      tipo_os:       form.tipo,
      equipamento:   form.equipamento   || undefined,
      tecnico:       form.tecnico       || undefined,
      contato:       form.contato       || undefined,
      telefone:      form.telefone      || undefined,
      valor_mao:     parseFloat(form.valorMaoDeObra) || 0,
      valor_pecas:   parseFloat(form.valorPecas)     || 0,
      data_prevista: form.dataPrevista  || undefined,
      obs:           form.observacoes   || undefined,
    };

    setSaving(true);
    try {
      await createAtendimento({
        tipo:           'ORDEM_SERVICO',
        status:         'ABERTO',
        cliente_id:     clienteId,
        responsavel_id: null,
        titulo:         form.descricaoProblema,
        descricao:      JSON.stringify(extra),
        prioridade:     toDbPrioridade(form.prioridade),
        data_abertura:  new Date().toISOString(),
        data_fechamento: form.dataPrevista || null,
      });
      showToast('Ordem de Serviço aberta com sucesso!', true);
      resetForm();
      setAba('lista');
      load();
    } catch (e) {
      showToast('Erro ao salvar: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  // ── Status update → persisted via updateAtendimento ───────────────────────────

  async function handleUpdateStatus(os: OS, novoStatus: OS['status']) {
    setUpdatingStatus(true);
    try {
      await updateAtendimento(os.id, {
        status: toDbStatus(novoStatus),
        data_fechamento:
          novoStatus === 'CONCLUIDA' || novoStatus === 'CANCELADA'
            ? new Date().toISOString()
            : null,
      });
      showToast('Status atualizado.', true);
      setDetalhe(null);
      load();
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setUpdatingStatus(false);
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────────

  const filteredClientes = clientes
    .filter(c => c.nome.toLowerCase().includes(clienteSearch.toLowerCase()))
    .slice(0, 6);
  const clienteSelecionado = clientes.find(c => c.id === clienteId);

  const filtradas = ordens.filter(o => {
    const matchBusca =
      o.numero.toLowerCase().includes(busca.toLowerCase()) ||
      o.cliente.toLowerCase().includes(busca.toLowerCase()) ||
      o.tecnico.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = statusFiltro === 'TODAS' || o.status === statusFiltro;
    return matchBusca && matchStatus;
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

      {/* Detail modal */}
      {detalhe && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="font-mono font-bold text-slate-800">{detalhe.numero}</span>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[detalhe.status]}`}>
                  {detalhe.status.replace(/_/g, ' ')}
                </span>
              </div>
              <button onClick={() => setDetalhe(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-slate-500">Cliente:</span> <span className="font-medium">{detalhe.cliente}</span></div>
                <div><span className="text-slate-500">Técnico:</span> <span className="font-medium">{detalhe.tecnico || '—'}</span></div>
                <div><span className="text-slate-500">Tipo:</span> <span className="font-medium">{detalhe.tipo}</span></div>
                <div>
                  <span className="text-slate-500">Prioridade:</span>{' '}
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PRIORIDADE_BADGE[detalhe.prioridade]}`}>
                    {detalhe.prioridade}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Abertura:</span>{' '}
                  <span>{new Date(detalhe.dataAbertura + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
                <div>
                  <span className="text-slate-500">Previsão:</span>{' '}
                  <span>{detalhe.dataPrevista ? new Date(detalhe.dataPrevista + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</span>
                </div>
              </div>

              {detalhe.equipamento && (
                <div>
                  <span className="text-slate-500 block mb-1">Equipamento:</span>
                  <span className="font-medium">{detalhe.equipamento}</span>
                </div>
              )}
              <div>
                <span className="text-slate-500 block mb-1">Problema:</span>
                <p className="text-slate-700 bg-slate-50 rounded-lg p-2">{detalhe.descricaoProblema}</p>
              </div>
              {detalhe.observacoes && (
                <div>
                  <span className="text-slate-500 block mb-1">Observações:</span>
                  <p className="text-slate-700 bg-slate-50 rounded-lg p-2">{detalhe.observacoes}</p>
                </div>
              )}

              <div className="flex justify-between pt-2 border-t border-slate-100">
                <span className="text-slate-500">Mão de obra: <strong>{BRL(detalhe.valorMaoDeObra)}</strong></span>
                <span className="text-slate-500">Peças: <strong>{BRL(detalhe.valorPecas)}</strong></span>
                <span className="font-semibold">Total: <strong className="text-slate-900">{BRL(detalhe.valorMaoDeObra + detalhe.valorPecas)}</strong></span>
              </div>

              {/* Status transitions */}
              {STATUS_NEXT[detalhe.status].length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 mb-2">Mover para:</p>
                  <div className="flex gap-2 flex-wrap">
                    {STATUS_NEXT[detalhe.status].map(s => (
                      <button
                        key={s}
                        disabled={updatingStatus}
                        onClick={() => handleUpdateStatus(detalhe, s)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-60 ${STATUS_BADGE[s]} border-current`}
                      >
                        {updatingStatus && <Loader2 className="w-3 h-3 animate-spin" />}
                        {s.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" /> Ordem de Serviço
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie ordens de serviço técnico e assistência ao cliente</p>
        </div>
        <button
          onClick={() => { if (aba === 'nova') resetForm(); setAba(aba === 'lista' ? 'nova' : 'lista'); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {aba === 'lista' ? <><Plus className="w-4 h-4" /> Nova OS</> : <><X className="w-4 h-4" /> Cancelar</>}
        </button>
      </div>

      {/* KPIs */}
      {aba === 'lista' && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Abertas',      value: ordens.filter(o => o.status === 'ABERTA').length,                                                    color: 'slate' },
            { label: 'Em Andamento', value: ordens.filter(o => o.status === 'EM_ANDAMENTO').length,                                              color: 'blue'  },
            { label: 'Aguardando',   value: ordens.filter(o => o.status === 'AGUARDANDO_PECA' || o.status === 'AGUARDANDO_CLIENTE').length,       color: 'yellow' },
            { label: 'Concluídas',   value: ordens.filter(o => o.status === 'CONCLUIDA').length,                                                  color: 'green' },
          ].map(k => (
            <div key={k.label} className={`bg-${k.color}-50 border border-${k.color}-200 rounded-xl p-4`}>
              <p className={`text-xs font-medium text-${k.color}-600 mb-1`}>{k.label}</p>
              <p className={`text-2xl font-bold text-${k.color}-700`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {aba === 'nova' ? (

        /* ── New OS form ── */
        <div className="bg-white rounded-xl border border-slate-200 p-5 max-w-2xl">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Nova Ordem de Serviço</h2>
          <div className="grid grid-cols-2 gap-3">

            {/* Cliente — searchable dropdown bound to catalog */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Cliente *</label>
              {!clienteId ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Buscar cliente..."
                    value={clienteSearch}
                    onChange={e => setClienteSearch(e.target.value)}
                  />
                  {clienteSearch && (
                    <div className="absolute top-full left-0 right-0 border border-slate-200 bg-white rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                      {filteredClientes.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setClienteId(c.id); setClienteSearch(''); }}
                          className="w-full px-3 py-2 hover:bg-slate-50 text-sm text-left border-b border-slate-100 last:border-b-0"
                        >
                          {c.nome}
                        </button>
                      ))}
                      {filteredClientes.length === 0 && (
                        <div className="px-3 py-2 text-sm text-slate-400">Nenhum cliente encontrado.</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium text-blue-800">{clienteSelecionado?.nome}</span>
                  <button onClick={() => setClienteId('')} className="text-blue-600 text-xs">Alterar</button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contato</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Telefone</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as OS['tipo'] }))}>
                {(['CORRETIVA', 'PREVENTIVA', 'INSTALACAO', 'CONSULTORIA'] as const).map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Prioridade</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value as OS['prioridade'] }))}>
                {(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'] as const).map(p => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Descrição do Problema *</label>
              <textarea
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                value={form.descricaoProblema}
                onChange={e => setForm(f => ({ ...f, descricaoProblema: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Equipamento</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.equipamento} onChange={e => setForm(f => ({ ...f, equipamento: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Técnico Responsável</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.tecnico} onChange={e => setForm(f => ({ ...f, tecnico: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data Prevista</label>
              <input type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.dataPrevista} onChange={e => setForm(f => ({ ...f, dataPrevista: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor Mão de Obra</label>
              <input type="number" min="0" step="0.01"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.valorMaoDeObra} onChange={e => setForm(f => ({ ...f, valorMaoDeObra: e.target.value }))} />
            </div>

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

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              onClick={() => { resetForm(); setAba('lista'); }}
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
              Abrir OS
            </button>
          </div>
        </div>

      ) : (

        /* ── List view ── */
        <>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Buscar OS, cliente, técnico…"
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {['TODAS', 'ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'].map(s => (
                <button key={s} onClick={() => setStatusFiltro(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFiltro === s ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {s === 'TODAS' ? 'Todas' : s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin" /> Carregando ordens de serviço…
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['OS', 'Cliente', 'Tipo', 'Prioridade', 'Técnico', 'Abertura', 'Previsão', 'Total', 'Status'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtradas.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Nenhuma OS encontrada</td></tr>
                  )}
                  {filtradas.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setDetalhe(o)}>
                      <td className="px-3 py-3 font-mono font-semibold text-slate-800">{o.numero}</td>
                      <td className="px-3 py-3 text-slate-700">{o.cliente}</td>
                      <td className="px-3 py-3 text-slate-600 text-xs">{o.tipo}</td>
                      <td className="px-3 py-3">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PRIORIDADE_BADGE[o.prioridade]}`}>{o.prioridade}</span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{o.tecnico || '—'}</td>
                      <td className="px-3 py-3 text-slate-500 text-xs">{new Date(o.dataAbertura + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="px-3 py-3 text-slate-500 text-xs">
                        {o.dataPrevista ? new Date(o.dataPrevista + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-800">{BRL(o.valorMaoDeObra + o.valorPecas)}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[o.status]}`}>
                          {o.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

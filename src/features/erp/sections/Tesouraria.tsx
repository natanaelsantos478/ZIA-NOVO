import { useState, useEffect, useMemo } from 'react';
import {
  Landmark, Plus, Loader2, CheckCircle, AlertCircle,
  TrendingUp, TrendingDown, Building2, CreditCard,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import {
  getContasBancarias, createContaBancaria, getLancamentos,
} from '../../../lib/erp';
import type { ErpContaBancaria, ErpLancamento } from '../../../lib/erp';

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const BANCO_NOMES: Record<string, string> = {
  '001': 'Banco do Brasil',
  '033': 'Santander',
  '104': 'Caixa Econômica',
  '237': 'Bradesco',
  '341': 'Itaú',
  '748': 'Sicredi',
  '756': 'Sicoob',
  '077': 'Inter',
  '260': 'Nubank',
};

function nomeBanco(codigo: string | null) {
  if (!codigo) return '—';
  return BANCO_NOMES[codigo] ?? `Banco ${codigo}`;
}

function initials(nome: string) {
  return nome.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const BANCO_COLORS = [
  'bg-blue-600', 'bg-emerald-600', 'bg-violet-600',
  'bg-amber-600', 'bg-rose-600', 'bg-cyan-600',
];

function colorForId(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffffff;
  return BANCO_COLORS[h % BANCO_COLORS.length];
}

export default function Tesouraria() {
  const [contas, setContas] = useState<ErpContaBancaria[]>([]);
  const [lancamentos, setLancamentos] = useState<ErpLancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedConta, setExpandedConta] = useState<string | null>(null);

  // Form
  const [nome, setNome] = useState('');
  const [bancoCode, setBancoCode] = useState('');
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');
  const [saving, setSaving] = useState(false);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    try {
      const [cs, rec, desp] = await Promise.all([
        getContasBancarias(),
        getLancamentos('RECEITA'),
        getLancamentos('DESPESA'),
      ]);
      setContas(cs);
      setLancamentos([...rec, ...desp]);
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    if (!nome.trim()) return showToast('Nome da conta é obrigatório.', false);
    setSaving(true);
    try {
      await createContaBancaria({
        nome: nome.trim(),
        banco_codigo: bancoCode || null,
        agencia: agencia || null,
        conta: conta || null,
        empresa_id: null,
        ativo: true,
      });
      showToast('Conta criada.', true);
      setNome(''); setBancoCode(''); setAgencia(''); setConta(''); setShowForm(false);
      load();
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  const saldoTotal = useMemo(() => contas.filter(c => c.ativo).reduce((s, c) => s + c.saldo_atual, 0), [contas]);

  // Lançamentos PAGO por conta
  const lancamentosContaMap = useMemo(() => {
    const map: Record<string, ErpLancamento[]> = {};
    lancamentos.forEach(l => {
      if (l.status === 'PAGO' && l.conta_bancaria_id) {
        if (!map[l.conta_bancaria_id]) map[l.conta_bancaria_id] = [];
        map[l.conta_bancaria_id].push(l);
      }
    });
    return map;
  }, [lancamentos]);

  return (
    <div className="p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Landmark className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">Tesouraria</h1>
          </div>
          <p className="text-sm text-slate-500">Contas bancárias, saldos e movimentações</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova Conta
        </button>
      </div>

      {/* Saldo consolidado */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 mb-6 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 opacity-80" />
          <span className="text-sm opacity-80">Saldo Consolidado — Todas as Contas Ativas</span>
        </div>
        <div className="text-3xl font-bold">{BRL(saldoTotal)}</div>
        <div className="text-sm opacity-70 mt-1">{contas.filter(c => c.ativo).length} conta(s) ativa(s)</div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Nova Conta Bancária</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="col-span-2 lg:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Nome da Conta *</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Conta Corrente - Itaú"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Banco</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={bancoCode} onChange={e => setBancoCode(e.target.value)}>
                <option value="">Selecione</option>
                {Object.entries(BANCO_NOMES).map(([cod, nm]) => (
                  <option key={cod} value={cod}>{nm} ({cod})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Agência</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={agencia} onChange={e => setAgencia(e.target.value)} placeholder="0001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Conta / Dígito</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={conta} onChange={e => setConta(e.target.value)} placeholder="00000-0" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Criar Conta
            </button>
          </div>
        </div>
      )}

      {/* Lista de contas */}
      {loading ? (
        <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
      ) : contas.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Nenhuma conta cadastrada. Crie a primeira conta bancária.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contas.map(c => {
            const movs = lancamentosContaMap[c.id] ?? [];
            const entradas = movs.filter(l => l.tipo === 'RECEITA').reduce((s, l) => s + l.valor, 0);
            const saidas = movs.filter(l => l.tipo === 'DESPESA').reduce((s, l) => s + l.valor, 0);
            const isExpanded = expandedConta === c.id;

            return (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Conta header */}
                <button
                  onClick={() => setExpandedConta(isExpanded ? null : c.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${colorForId(c.id)}`}>
                    {initials(c.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 truncate">{c.nome}</div>
                    <div className="text-xs text-slate-500">
                      {nomeBanco(c.banco_codigo)}
                      {c.agencia && ` · Ag. ${c.agencia}`}
                      {c.conta && ` · Conta ${c.conta}`}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 mr-2">
                    <div className={`text-base font-bold ${c.saldo_atual >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                      {BRL(c.saldo_atual)}
                    </div>
                    <div className="text-xs text-slate-400">saldo atual</div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-emerald-600">
                        <TrendingUp className="w-3 h-3" /> {BRL(entradas)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-red-500">
                        <TrendingDown className="w-3 h-3" /> {BRL(saidas)}
                      </div>
                    </div>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {/* Extrato expandido */}
                {isExpanded && (
                  <div className="border-t border-slate-100">
                    {movs.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-6">Nenhuma movimentação registrada nesta conta.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Descrição</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Data</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Categoria</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {movs
                            .sort((a, b) => (b.data_pagamento ?? '').localeCompare(a.data_pagamento ?? ''))
                            .slice(0, 20)
                            .map(l => (
                              <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2.5 text-slate-700 max-w-xs truncate">{l.descricao}</td>
                                <td className="px-4 py-2.5 text-slate-500 text-xs">
                                  {l.data_pagamento ? new Date(l.data_pagamento + 'T00:00').toLocaleDateString('pt-BR') : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-slate-400 text-xs">{l.categoria}</td>
                                <td className={`px-4 py-2.5 text-right font-semibold ${l.tipo === 'RECEITA' ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {l.tipo === 'RECEITA' ? '+' : '-'}{BRL(l.valor)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagamentos de Atendimento — Seção financeira INDEPENDENTE
// Localização: ERP → Financeiro → Pagamentos de Atendimento
// Não faz parte do submodulo operacional de Atendimento.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  Search, Download, CreditCard, CheckCircle2, Clock, XCircle,
  TrendingUp, AlertTriangle, DollarSign, ChevronDown, ChevronUp, Plus,
} from 'lucide-react';
import { MOCK_PAGAMENTOS, gerarNumeroPagamento } from './atendimento/mockData';
import type { PagamentoAtendimento, FormaPagamento, StatusPagAtend } from './atendimento/types';

const STATUS_BADGE: Record<StatusPagAtend, string> = {
  PENDENTE:  'bg-amber-100 text-amber-700',
  PARCIAL:   'bg-orange-100 text-orange-700',
  PAGO:      'bg-green-100 text-green-700',
  ISENTO:    'bg-slate-100 text-slate-500',
  CANCELADO: 'bg-red-100 text-red-600',
  ESTORNADO: 'bg-red-50 text-red-500',
};

const STATUS_ICON: Record<StatusPagAtend, React.ReactNode> = {
  PENDENTE:  <Clock className="w-3.5 h-3.5" />,
  PARCIAL:   <AlertTriangle className="w-3.5 h-3.5" />,
  PAGO:      <CheckCircle2 className="w-3.5 h-3.5" />,
  ISENTO:    <CheckCircle2 className="w-3.5 h-3.5" />,
  CANCELADO: <XCircle className="w-3.5 h-3.5" />,
  ESTORNADO: <XCircle className="w-3.5 h-3.5" />,
};

const FORMA_LABEL: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro', CARTAO_DEBITO: 'Débito', CARTAO_CREDITO: 'Crédito',
  PIX: 'PIX', BOLETO: 'Boleto', CONVENIO: 'Convênio',
  CHEQUE: 'Cheque', TRANSFERENCIA: 'Transferência', OUTRO: 'Outro',
};

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

// ─── Modal de novo pagamento ──────────────────────────────────────────────────
interface NovoPagModalProps {
  onClose: () => void;
  onSave: (p: Partial<PagamentoAtendimento>) => void;
}

function NovoPagModal({ onClose, onSave }: NovoPagModalProps) {
  const [atdNum, setAtdNum] = useState('');
  const [paciente, setPaciente] = useState('');
  const [valorServico, setValorServico] = useState('');
  const [desconto, setDesconto] = useState('0');
  const [descontoTipo, setDescontoTipo] = useState<'PERCENTUAL' | 'ABSOLUTO'>('PERCENTUAL');
  const [acrescimo, setAcrescimo] = useState('0');
  const [forma, setForma] = useState<FormaPagamento>('PIX');
  const [parcelas, setParcelas] = useState('1');
  const [convenio, setConvenio] = useState('');
  const [numConvenio, setNumConvenio] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [obs, setObs] = useState('');

  const vs = parseFloat(valorServico) || 0;
  const desc = parseFloat(desconto) || 0;
  const desc$ = descontoTipo === 'PERCENTUAL' ? vs * (desc / 100) : desc;
  const acr = parseFloat(acrescimo) || 0;
  const total = Math.max(0, vs - desc$ + acr);
  const parcVal = parcelas ? total / parseInt(parcelas) : total;

  function handleSave() {
    if (!atdNum || !paciente || !valorServico) return;
    onSave({
      numero: gerarNumeroPagamento(MOCK_PAGAMENTOS),
      atendimento_numero: atdNum, paciente_nome: paciente,
      valor_servico: vs, desconto: desc, desconto_tipo: descontoTipo, acrescimo: acr,
      valor_total: total, valor_pago: 0, valor_pendente: total,
      forma_pagamento: forma, status: 'PENDENTE',
      parcelas: parseInt(parcelas), parcelas_pagas: 0, valor_parcela: parcVal,
      convenio: convenio || null, numero_convenio: numConvenio || null,
      data_emissao: new Date().toISOString(),
      data_vencimento: vencimento || null,
      observacoes: obs || null,
    });
  }

  const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';
  const sel = `${inp} bg-white`;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-900">Novo Pagamento de Atendimento</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Vinculação */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">N° do Atendimento *</label>
              <input value={atdNum} onChange={e => setAtdNum(e.target.value)} className={inp} placeholder="ATD-2026-000001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Paciente / Solicitante *</label>
              <input value={paciente} onChange={e => setPaciente(e.target.value)} className={inp} placeholder="Nome..." />
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor do Serviço (R$) *</label>
              <input type="number" min={0} step={0.01} value={valorServico} onChange={e => setValorServico(e.target.value)} className={inp} placeholder="0,00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Desconto</label>
              <div className="flex gap-1">
                <input type="number" min={0} value={desconto} onChange={e => setDesconto(e.target.value)} className={`${inp} flex-1`} />
                <select value={descontoTipo} onChange={e => setDescontoTipo(e.target.value as typeof descontoTipo)} className={`${sel} w-20`}>
                  <option value="PERCENTUAL">%</option>
                  <option value="ABSOLUTO">R$</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Acréscimo (R$)</label>
              <input type="number" min={0} step={0.01} value={acrescimo} onChange={e => setAcrescimo(e.target.value)} className={inp} />
            </div>
          </div>

          {/* Resumo de valores */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-slate-500">Subtotal</div>
              <div className="text-lg font-bold text-slate-800">{fmt(vs)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Desconto / Acréscimo</div>
              <div className="text-lg font-bold text-red-600">-{fmt(desc$)} / +{fmt(acr)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Total a Pagar</div>
              <div className="text-2xl font-black text-emerald-700">{fmt(total)}</div>
            </div>
          </div>

          {/* Pagamento */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Forma de Pagamento</label>
              <select value={forma} onChange={e => setForma(e.target.value as FormaPagamento)} className={sel}>
                {(Object.entries(FORMA_LABEL) as [FormaPagamento, string][]).map(([v, l]) =>
                  <option key={v} value={v}>{l}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Parcelas</label>
              <select value={parcelas} onChange={e => setParcelas(e.target.value)} className={sel}>
                {[1,2,3,4,6,8,10,12,18,24].map(n => <option key={n} value={n}>{n}x {fmt(total / n)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Vencimento</label>
              <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} className={inp} />
            </div>
          </div>

          {/* Convênio */}
          {forma === 'CONVENIO' && (
            <div className="grid grid-cols-2 gap-4 bg-blue-50 border border-blue-100 rounded-xl p-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome do Convênio</label>
                <input value={convenio} onChange={e => setConvenio(e.target.value)} className={inp} placeholder="Unimed, SulAmérica..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Número / Matrícula</label>
                <input value={numConvenio} onChange={e => setNumConvenio(e.target.value)} className={inp} placeholder="00000000" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
            <textarea rows={2} value={obs} onChange={e => setObs(e.target.value)} className={`${inp} resize-none`} placeholder="Observações..." />
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={!atdNum || !paciente || !valorServico}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
              <CreditCard className="w-4 h-4" /> Registrar Pagamento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AtendimentoPagamentos() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('TODOS');
  const [filterForma, setFilterForma] = useState('TODOS');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showModal, setShowModal] = useState(false);
  const [pagamentos, setPagamentos] = useState<PagamentoAtendimento[]>(MOCK_PAGAMENTOS);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = pagamentos.filter(p => {
    const ms = [p.numero, p.atendimento_numero, p.paciente_nome, p.convenio ?? ''].some(v =>
      v.toLowerCase().includes(search.toLowerCase())
    );
    const mst = filterStatus === 'TODOS' || p.status === filterStatus;
    const mf = filterForma === 'TODOS' || p.forma_pagamento === filterForma;
    return ms && mst && mf;
  }).sort((a, b) => {
    const da = new Date(a.data_emissao).getTime();
    const db = new Date(b.data_emissao).getTime();
    return sortDir === 'desc' ? db - da : da - db;
  });

  const totalBruto = filtered.reduce((s, p) => s + p.valor_total, 0);
  const totalPago = filtered.reduce((s, p) => s + p.valor_pago, 0);
  const totalPendente = filtered.reduce((s, p) => s + p.valor_pendente, 0);

  function handleExport() {
    const headers = ['Número','Atendimento','Paciente','Serviço','Desconto','Total','Pago','Pendente','Forma','Parcelas','Status','Vencimento','Pagamento','Recibo'].join(';');
    const rows = filtered.map(p => [
      p.numero, p.atendimento_numero, p.paciente_nome,
      p.valor_servico, p.desconto, p.valor_total, p.valor_pago, p.valor_pendente,
      FORMA_LABEL[p.forma_pagamento], `${p.parcelas}x`,
      p.status,
      p.data_vencimento ? new Date(p.data_vencimento).toLocaleDateString('pt-BR') : '',
      p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString('pt-BR') : '',
      p.numero_recibo ?? '',
    ].join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + `${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `pagamentos_atendimentos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  function handleSaveNew(p: Partial<PagamentoAtendimento>) {
    const newPag: PagamentoAtendimento = {
      ...p,
      id: crypto.randomUUID(),
      atendimento_id: '',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      created_at: new Date().toISOString(),
      numero_recibo: null, nfse_numero: null, autorizacao_convenio: null,
    } as PagamentoAtendimento;
    setPagamentos(prev => [newPag, ...prev]);
    setShowModal(false);
  }

  function handleRegisterPayment(id: string) {
    setPagamentos(prev => prev.map(p => {
      if (p.id !== id) return p;
      return {
        ...p, valor_pago: p.valor_total, valor_pendente: 0,
        status: 'PAGO', data_pagamento: new Date().toISOString(),
        numero_recibo: `REC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(6, '0')}`,
      };
    }));
  }

  return (
    <div className="p-6">
      {showModal && <NovoPagModal onClose={() => setShowModal(false)} onSave={handleSaveNew} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pagamentos de Atendimento</h1>
          <p className="text-sm text-slate-500">ERP — Financeiro · {filtered.length} registros</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport}
            className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Novo Pagamento
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Faturado', value: totalBruto, icon: DollarSign, color: 'blue' },
          { label: 'Total Recebido', value: totalPago, icon: CheckCircle2, color: 'green' },
          { label: 'Pendente', value: totalPendente, icon: Clock, color: 'amber' },
        ].map(k => {
          const Icon = k.icon;
          const cc = ({ blue: 'bg-blue-50 text-blue-600 bg-blue-100', green: 'bg-green-50 text-green-600 bg-green-100', amber: 'bg-amber-50 text-amber-600 bg-amber-100' } as Record<string, string>)[k.color] ?? 'bg-slate-50 text-slate-600 bg-slate-100';
          const [, text, iconBg] = cc.split(' ');
          return (
            <div key={k.label} className={`rounded-xl border border-slate-200 p-4 flex items-center gap-3 bg-white`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                <Icon className={`w-5 h-5 ${text}`} />
              </div>
              <div>
                <div className={`text-xl font-bold ${text}`}>{fmt(k.value)}</div>
                <div className="text-xs text-slate-500">{k.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Buscar por número, paciente, atendimento..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="TODOS">Todos os status</option>
          {(['PENDENTE','PARCIAL','PAGO','ISENTO','CANCELADO','ESTORNADO'] as StatusPagAtend[]).map(s =>
            <option key={s} value={s}>{s}</option>
          )}
        </select>
        <select value={filterForma} onChange={e => setFilterForma(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="TODOS">Todas as formas</option>
          {(Object.entries(FORMA_LABEL) as [FormaPagamento, string][]).map(([v, l]) =>
            <option key={v} value={v}>{l}</option>
          )}
        </select>
        <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-1.5 border border-slate-200 bg-white px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <TrendingUp className="w-4 h-4" />
          {sortDir === 'desc' ? 'Mais recente' : 'Mais antigo'}
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Número</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Atendimento</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Paciente</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Forma</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Total</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Pago</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Pendente</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Parcelas</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Vencimento</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <>
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.numero}</td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">{p.atendimento_numero}</td>
                  <td className="px-4 py-3 text-slate-700">{p.paciente_nome}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <div className="flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      {FORMA_LABEL[p.forma_pagamento]}
                    </div>
                    {p.convenio && <div className="text-slate-400">{p.convenio}</div>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(p.valor_total)}</td>
                  <td className="px-4 py-3 text-right text-green-700 font-medium">{fmt(p.valor_pago)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={p.valor_pendente > 0 ? 'text-amber-700 font-semibold' : 'text-slate-400'}>{fmt(p.valor_pendente)}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.parcelas_pagas}/{p.parcelas}x</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_BADGE[p.status]}`}>{STATUS_ICON[p.status]}</span>
                      <span className={`text-xs font-medium ${STATUS_BADGE[p.status]} px-2 py-0.5 rounded-full`}>{p.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {p.data_vencimento ? (
                      <span className={new Date(p.data_vencimento) < new Date() && p.status === 'PENDENTE' ? 'text-red-600 font-semibold' : ''}>
                        {new Date(p.data_vencimento).toLocaleDateString('pt-BR')}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {p.status === 'PENDENTE' && (
                        <button onClick={() => handleRegisterPayment(p.id)}
                          className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors font-medium">
                          Receber
                        </button>
                      )}
                      <button onClick={() => setExpandedId(e => e === p.id ? null : p.id)}
                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                        {expandedId === p.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === p.id && (
                  <tr key={`${p.id}-detail`} className="bg-slate-50 border-b border-slate-100">
                    <td colSpan={11} className="px-6 py-3">
                      <div className="grid grid-cols-4 gap-4 text-xs text-slate-600">
                        <div><strong>Valor Serviço:</strong> {fmt(p.valor_servico)}</div>
                        <div><strong>Desconto:</strong> {p.desconto}{p.desconto_tipo === 'PERCENTUAL' ? '%' : ' R$'} = {fmt(p.desconto_tipo === 'PERCENTUAL' ? p.valor_servico * p.desconto / 100 : p.desconto)}</div>
                        <div><strong>Acréscimo:</strong> {fmt(p.acrescimo)}</div>
                        <div><strong>Valor parcela:</strong> {fmt(p.valor_parcela)}</div>
                        {p.convenio && <div><strong>Convênio:</strong> {p.convenio}</div>}
                        {p.numero_convenio && <div><strong>N° Convênio:</strong> {p.numero_convenio}</div>}
                        {p.autorizacao_convenio && <div><strong>Autorização:</strong> {p.autorizacao_convenio}</div>}
                        {p.numero_recibo && <div><strong>Recibo:</strong> {p.numero_recibo}</div>}
                        {p.nfse_numero && <div><strong>NFS-e:</strong> {p.nfse_numero}</div>}
                        {p.data_pagamento && <div><strong>Data Pagamento:</strong> {new Date(p.data_pagamento).toLocaleString('pt-BR')}</div>}
                        {p.observacoes && <div className="col-span-4"><strong>Obs:</strong> {p.observacoes}</div>}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50">
              <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-slate-600">Totais ({filtered.length} registros)</td>
              <td className="px-4 py-3 text-right font-bold text-slate-800">{fmt(totalBruto)}</td>
              <td className="px-4 py-3 text-right font-bold text-green-700">{fmt(totalPago)}</td>
              <td className="px-4 py-3 text-right font-bold text-amber-700">{fmt(totalPendente)}</td>
              <td colSpan={4} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

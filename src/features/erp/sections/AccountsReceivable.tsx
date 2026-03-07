import { useState } from 'react';
import {
  Wallet, AlertTriangle, CheckCircle, Clock,
  Search, Filter, Download, X, ChevronDown,
  TrendingUp, Calendar, CreditCard, Building2,
  Banknote, Smartphone, Receipt,
} from 'lucide-react';

type Status = 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO';
type Forma = 'PIX' | 'BOLETO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'TED' | 'DOC' | 'DINHEIRO' | 'CHEQUE';

interface Lancamento {
  id: string;
  descricao: string;
  cliente: string;
  valor: number;
  valor_pago?: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: Status;
  forma_pagamento?: Forma;
  parcela_numero?: number;
  parcela_total?: number;
  numero_documento?: string;
  categoria: string;
}

const MOCK_AR: Lancamento[] = [
  { id: 'LC-0079', descricao: 'Parcela 2/3 — Pedido #0072',        cliente: 'Metalúrgica ABC Ltda',    valor: 31400,  data_vencimento: '10/03/26', status: 'PENDENTE', parcela_numero: 2, parcela_total: 3, categoria: 'OPERACIONAL' },
  { id: 'LC-0081', descricao: 'Fatura integral — NF-e 001842',      cliente: 'Transportes Rápidos ME',  valor: 48200,  valor_pago: 48200, data_vencimento: '05/03/26', data_pagamento: '05/03/26', status: 'PAGO', forma_pagamento: 'PIX', numero_documento: 'E12345', categoria: 'OPERACIONAL' },
  { id: 'LC-0077', descricao: 'Fatura parcial — Contrato #0019',    cliente: 'Construção Norte S.A.',   valor: 22700,  valor_pago: 22700, data_vencimento: '02/03/26', data_pagamento: '02/03/26', status: 'PAGO', forma_pagamento: 'TED', numero_documento: 'TED-9871', categoria: 'OPERACIONAL' },
  { id: 'LC-0075', descricao: 'Parcela 1/2 — Proposta #0041',       cliente: 'Indústrias Omega Ltda',   valor: 55000,  valor_pago: 55000, data_vencimento: '28/02/26', data_pagamento: '28/02/26', status: 'PAGO', forma_pagamento: 'TED', numero_documento: 'TED-9812', categoria: 'OPERACIONAL' },
  { id: 'LC-0073', descricao: 'Mensalidade SaaS — fev/26',          cliente: 'TechSoft Sistemas ME',    valor: 4800,   data_vencimento: '20/02/26', status: 'VENCIDO', categoria: 'OPERACIONAL' },
  { id: 'LC-0071', descricao: 'Parcela 3/3 — Pedido #0065',         cliente: 'Distribuidora Sul Ltda',  valor: 17200,  data_vencimento: '15/02/26', status: 'VENCIDO', categoria: 'OPERACIONAL' },
  { id: 'LC-0069', descricao: 'Fatura integral — NF-e 001798',      cliente: 'Agro Pecuária Leste S.A.',valor: 128900, valor_pago: 128900, data_vencimento: '10/02/26', data_pagamento: '08/02/26', status: 'PAGO', forma_pagamento: 'TED', numero_documento: 'TED-9756', categoria: 'OPERACIONAL' },
  { id: 'LC-0067', descricao: 'Proposta #0038 — parcela única',     cliente: 'Construtora Delta',       valor: 78500,  data_vencimento: '20/03/26', status: 'PENDENTE', categoria: 'OPERACIONAL' },
  { id: 'LC-0065', descricao: 'Mensalidade SaaS — mar/26',          cliente: 'TechSoft Sistemas ME',    valor: 4800,   data_vencimento: '20/03/26', status: 'PENDENTE', categoria: 'OPERACIONAL' },
  { id: 'LC-0063', descricao: 'Parcela 1/3 — Pedido #0080',         cliente: 'Metalúrgica ABC Ltda',    valor: 31400,  data_vencimento: '30/03/26', status: 'PENDENTE', parcela_numero: 1, parcela_total: 3, categoria: 'OPERACIONAL' },
];

const STATUS_CONFIG: Record<Status, { label: string; color: string; icon: React.ElementType }> = {
  PENDENTE:   { label: 'Pendente',  color: 'bg-amber-100 text-amber-700',   icon: Clock },
  PAGO:       { label: 'Pago',      color: 'bg-emerald-100 text-emerald-700',icon: CheckCircle },
  VENCIDO:    { label: 'Vencido',   color: 'bg-red-100 text-red-600',        icon: AlertTriangle },
  CANCELADO:  { label: 'Cancelado', color: 'bg-slate-100 text-slate-500',    icon: X },
};

const FORMAS: Record<Forma, string> = {
  PIX: 'PIX', BOLETO: 'Boleto', CARTAO_CREDITO: 'Cartão Crédito',
  CARTAO_DEBITO: 'Cartão Débito', TED: 'TED', DOC: 'DOC',
  DINHEIRO: 'Dinheiro', CHEQUE: 'Cheque',
};

const CONTAS_BANCARIAS = [
  { id: 'CB-001', nome: 'Bradesco Principal' },
  { id: 'CB-002', nome: 'Itaú Conta Corrente' },
  { id: 'CB-003', nome: 'Caixa Físico' },
  { id: 'CB-004', nome: 'PagSeguro Digital' },
];

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function daysBetween(dateStr: string): number {
  const [d, m, y] = dateStr.split('/').map(Number);
  const due = new Date(y, m - 1, d);
  const today = new Date(2026, 2, 7); // March 7, 2026
  return Math.floor((today.getTime() - due.getTime()) / 86400000);
}

interface BaixaModalProps {
  item: Lancamento;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

function BaixaModal({ item, onClose, onConfirm }: BaixaModalProps) {
  const [dataPgto, setDataPgto] = useState('07/03/2026');
  const [valorPago, setValorPago] = useState(item.valor.toString());
  const [forma, setForma] = useState<Forma>('PIX');
  const [conta, setConta] = useState(CONTAS_BANCARIAS[0].id);
  const [numDoc, setNumDoc] = useState('');

  const dias = daysBetween(item.data_vencimento);
  const multa = dias > 0 ? item.valor * 0.02 : 0;
  const juros = dias > 0 ? item.valor * 0.001 * dias : 0;
  const sugerido = item.valor + multa + juros;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Baixar Título</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          {/* Info */}
          <div className="bg-slate-50 rounded-lg p-3 text-sm">
            <p className="font-medium text-slate-700">{item.id} — {item.descricao}</p>
            <p className="text-slate-500 mt-1">{item.cliente}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-slate-500">Valor nominal:</span>
              <span className="font-semibold text-slate-800">{fmt(item.valor)}</span>
            </div>
            {dias > 0 && (
              <>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-slate-500">Multa (2%):</span>
                  <span className="text-red-500">+ {fmt(multa)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-slate-500">Juros ({dias}d × 0,1%/d):</span>
                  <span className="text-red-500">+ {fmt(juros)}</span>
                </div>
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200">
                  <span className="text-slate-600 font-medium">Sugerido com acréscimos:</span>
                  <span className="font-bold text-slate-800">{fmt(sugerido)}</span>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Data do Pagamento</label>
              <input value={dataPgto} onChange={e => setDataPgto(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Valor Pago (R$)</label>
              <input value={valorPago} onChange={e => setValorPago(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Forma de Pagamento</label>
            <select value={forma} onChange={e => setForma(e.target.value as Forma)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400">
              {(Object.entries(FORMAS)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Conta Bancária</label>
            <select value={conta} onChange={e => setConta(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400">
              {CONTAS_BANCARIAS.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Nº Documento / Comprovante</label>
            <input value={numDoc} onChange={e => setNumDoc(e.target.value)}
              placeholder="Ex: E12345678, TED-9999..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400" />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={() => { onConfirm(item.id); onClose(); }}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
            Confirmar Baixa
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccountsReceivable() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<Status | 'TODOS'>('TODOS');
  const [items, setItems] = useState<Lancamento[]>(MOCK_AR);
  const [baixaItem, setBaixaItem] = useState<Lancamento | null>(null);

  const filtered = items.filter(it => {
    const matchSearch = it.descricao.toLowerCase().includes(search.toLowerCase())
      || it.cliente.toLowerCase().includes(search.toLowerCase())
      || it.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'TODOS' || it.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPendente = items.filter(i => i.status === 'PENDENTE').reduce((s, i) => s + i.valor, 0);
  const totalVencido  = items.filter(i => i.status === 'VENCIDO').reduce((s, i) => s + i.valor, 0);
  const totalPago     = items.filter(i => i.status === 'PAGO' && i.valor_pago).reduce((s, i) => s + (i.valor_pago ?? 0), 0);
  const previsao30    = items.filter(i => i.status === 'PENDENTE').reduce((s, i) => s + i.valor, 0);

  function handleBaixa(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'PAGO', valor_pago: i.valor, data_pagamento: '07/03/26' } : i));
  }

  function handleCancelar(id: string) {
    if (!confirm('Cancelar este título? Esta ação não pode ser desfeita.')) return;
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'CANCELADO' } : i));
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contas a Receber</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestão de receitas, faturas e recebimentos</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-800">
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Pendente',         value: fmt(totalPendente), icon: Clock,         color: 'text-amber-600',   bg: 'bg-amber-50' },
          { label: 'Total Vencido',           value: fmt(totalVencido),  icon: AlertTriangle, color: 'text-red-500',     bg: 'bg-red-50' },
          { label: 'Recebido no Mês',         value: fmt(totalPago),     icon: CheckCircle,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Previsão próximos 30d',   value: fmt(previsao30),    icon: TrendingUp,    color: 'text-blue-600',    bg: 'bg-blue-50' },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <p className="text-xl font-bold text-slate-800">{kpi.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-48 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente, descrição, ID..."
            className="bg-transparent text-sm w-full focus:outline-none text-slate-700 placeholder-slate-400" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as Status | 'TODOS')}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none text-slate-700 bg-white">
            <option value="TODOS">Todos os status</option>
            {(Object.keys(STATUS_CONFIG) as Status[]).map(s => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">ID</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Descrição / Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Vencimento</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Valor</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Status</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(item => {
                const cfg = STATUS_CONFIG[item.status];
                const StatusIcon = cfg.icon;
                const isLate = item.status === 'VENCIDO';
                const dias = isLate ? daysBetween(item.data_vencimento) : 0;
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-500">{item.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">
                        {item.descricao}
                        {item.parcela_numero && item.parcela_total && (
                          <span className="ml-2 text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                            {item.parcela_numero}/{item.parcela_total}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3" /> {item.cliente}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {item.data_vencimento}
                      </p>
                      {isLate && (
                        <p className="text-xs text-red-500 mt-0.5">{dias} dia(s) em atraso</p>
                      )}
                      {item.data_pagamento && (
                        <p className="text-xs text-emerald-600 mt-0.5">Pago em {item.data_pagamento}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-semibold text-slate-800">{fmt(item.valor)}</p>
                      {item.forma_pagamento && (
                        <p className="text-xs text-slate-400 mt-0.5">{FORMAS[item.forma_pagamento]}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {(item.status === 'PENDENTE' || item.status === 'VENCIDO') && (
                          <button onClick={() => setBaixaItem(item)}
                            className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 font-medium">
                            Baixar
                          </button>
                        )}
                        {item.status === 'PENDENTE' && (
                          <button onClick={() => handleCancelar(item.id)}
                            className="text-xs px-2.5 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium">
                            Cancelar
                          </button>
                        )}
                        {item.status === 'PAGO' && (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Wallet className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Nenhum lançamento encontrado</p>
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
          {filtered.length} de {items.length} registros
        </div>
      </div>

      {/* Baixa Modal */}
      {baixaItem && (
        <BaixaModal item={baixaItem} onClose={() => setBaixaItem(null)} onConfirm={handleBaixa} />
      )}
    </div>
  );
}

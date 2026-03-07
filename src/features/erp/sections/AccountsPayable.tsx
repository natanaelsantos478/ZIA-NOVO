import { useState } from 'react';
import {
  CreditCard, AlertTriangle, CheckCircle, Clock,
  Search, Filter, Download, X,
  Calendar, Building2, Tag, Plus,
} from 'lucide-react';

type Status = 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO';
type Forma = 'PIX' | 'BOLETO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'TED' | 'DOC' | 'DINHEIRO' | 'CHEQUE';
type Categoria = 'FISCAL' | 'FOLHA' | 'OPERACIONAL' | 'HOSPEDAGEM' | 'OUTROS';

interface Lancamento {
  id: string;
  descricao: string;
  fornecedor: string;
  valor: number;
  valor_pago?: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: Status;
  forma_pagamento?: Forma;
  categoria: Categoria;
  numero_documento?: string;
}

const MOCK_AP: Lancamento[] = [
  { id: 'CP-0041', descricao: 'Aluguel sede — março/2026',         fornecedor: 'Imob Centro Ltda',       valor: 12500, valor_pago: 12500, data_vencimento: '05/03/26', data_pagamento: '05/03/26', status: 'PAGO',     forma_pagamento: 'TED',    categoria: 'OPERACIONAL', numero_documento: 'TED-7821' },
  { id: 'CP-0040', descricao: 'DARF — PIS/COFINS fev/26',          fornecedor: 'Receita Federal',         valor: 9870,  valor_pago: 9870,  data_vencimento: '03/03/26', data_pagamento: '03/03/26', status: 'PAGO',     forma_pagamento: 'DOC',    categoria: 'FISCAL',      numero_documento: 'DARF-1234' },
  { id: 'CP-0039', descricao: 'Fornecedor Plásticos Norte',         fornecedor: 'Plásticos Norte Ltda',   valor: 18300, data_vencimento: '10/03/26', status: 'PENDENTE',   categoria: 'OPERACIONAL' },
  { id: 'CP-0038', descricao: 'INSS Patronal — fev/26',            fornecedor: 'INSS / DATAPREV',         valor: 21400, data_vencimento: '07/03/26', status: 'PENDENTE',   categoria: 'FOLHA' },
  { id: 'CP-0037', descricao: 'FGTS — fev/26',                     fornecedor: 'CEF — Caixa Econômica',  valor: 14200, data_vencimento: '07/03/26', status: 'PENDENTE',   categoria: 'FOLHA' },
  { id: 'CP-0036', descricao: 'Internet e telefonia — mar/26',      fornecedor: 'Vivo Empresas',           valor: 1890,  data_vencimento: '12/03/26', status: 'PENDENTE',   categoria: 'OPERACIONAL' },
  { id: 'CP-0035', descricao: 'IRRF sobre salários — fev/26',       fornecedor: 'Receita Federal',         valor: 8340,  data_vencimento: '20/03/26', status: 'PENDENTE',   categoria: 'FISCAL' },
  { id: 'CP-0034', descricao: 'Manutenção preventiva — equipamentos',fornecedor: 'TecnoPro Serviços ME', valor: 4200,  data_vencimento: '15/03/26', status: 'PENDENTE',   categoria: 'OPERACIONAL' },
  { id: 'CP-0033', descricao: 'Energia elétrica — fev/26',          fornecedor: 'CELESC Distribuição',    valor: 3780,  data_vencimento: '08/02/26', status: 'VENCIDO',    categoria: 'OPERACIONAL' },
  { id: 'CP-0032', descricao: 'ISSQN — serviços jan/26',            fornecedor: 'Prefeitura Municipal',   valor: 2940,  data_vencimento: '20/02/26', status: 'VENCIDO',    categoria: 'FISCAL' },
  { id: 'CP-0031', descricao: 'Assinatura ERP Zita — fev/26',       fornecedor: 'Zita Tecnologia Ltda',  valor: 890,   valor_pago: 890,  data_vencimento: '01/02/26', data_pagamento: '31/01/26', status: 'PAGO', forma_pagamento: 'PIX', categoria: 'HOSPEDAGEM' },
  { id: 'CP-0030', descricao: 'Salário — Ana Souza (adiant.)',       fornecedor: 'Funcionário — Folha',    valor: 3500,  data_vencimento: '25/02/26', status: 'VENCIDO',    categoria: 'FOLHA' },
];

const STATUS_CONFIG: Record<Status, { label: string; color: string; icon: React.ElementType }> = {
  PENDENTE:   { label: 'Pendente',  color: 'bg-amber-100 text-amber-700',   icon: Clock },
  PAGO:       { label: 'Pago',      color: 'bg-emerald-100 text-emerald-700',icon: CheckCircle },
  VENCIDO:    { label: 'Vencido',   color: 'bg-red-100 text-red-600',        icon: AlertTriangle },
  CANCELADO:  { label: 'Cancelado', color: 'bg-slate-100 text-slate-500',    icon: X },
};

const CAT_CONFIG: Record<Categoria, { label: string; color: string }> = {
  FISCAL:      { label: 'Fiscal',      color: 'bg-violet-100 text-violet-700' },
  FOLHA:       { label: 'Folha',       color: 'bg-pink-100 text-pink-700' },
  OPERACIONAL: { label: 'Operacional', color: 'bg-slate-100 text-slate-600' },
  HOSPEDAGEM:  { label: 'Hospedagem',  color: 'bg-blue-100 text-blue-700' },
  OUTROS:      { label: 'Outros',      color: 'bg-gray-100 text-gray-600' },
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
];

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function daysBetween(dateStr: string): number {
  const [d, m, y] = dateStr.split('/').map(Number);
  const due = new Date(y, m - 1, d);
  const today = new Date(2026, 2, 7);
  return Math.floor((today.getTime() - due.getTime()) / 86400000);
}

interface PagarModalProps {
  item: Lancamento;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

function PagarModal({ item, onClose, onConfirm }: PagarModalProps) {
  const [dataPgto, setDataPgto] = useState('07/03/2026');
  const [valorPago, setValorPago] = useState(item.valor.toString());
  const [forma, setForma] = useState<Forma>('TED');
  const [conta, setConta] = useState(CONTAS_BANCARIAS[0].id);
  const [numDoc, setNumDoc] = useState('');

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Registrar Pagamento</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="bg-slate-50 rounded-lg p-3 text-sm">
            <p className="font-medium text-slate-700">{item.id} — {item.descricao}</p>
            <p className="text-slate-500 mt-1">{item.fornecedor}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-slate-500">Valor a pagar:</span>
              <span className="font-bold text-slate-800">{fmt(item.valor)}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-slate-500">Categoria:</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${CAT_CONFIG[item.categoria].color}`}>
                {CAT_CONFIG[item.categoria].label}
              </span>
            </div>
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
            <label className="text-xs font-medium text-slate-600 block mb-1">Conta Debitada</label>
            <select value={conta} onChange={e => setConta(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400">
              {CONTAS_BANCARIAS.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Nº Comprovante / Documento</label>
            <input value={numDoc} onChange={e => setNumDoc(e.target.value)}
              placeholder="Ex: TED-0001, DARF-9999..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400" />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={() => { onConfirm(item.id); onClose(); }}
            className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
            Confirmar Pagamento
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccountsPayable() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<Status | 'TODOS'>('TODOS');
  const [filterCat, setFilterCat] = useState<Categoria | 'TODOS'>('TODOS');
  const [items, setItems] = useState<Lancamento[]>(MOCK_AP);
  const [pagarItem, setPagarItem] = useState<Lancamento | null>(null);

  const filtered = items.filter(it => {
    const matchSearch = it.descricao.toLowerCase().includes(search.toLowerCase())
      || it.fornecedor.toLowerCase().includes(search.toLowerCase())
      || it.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'TODOS' || it.status === filterStatus;
    const matchCat = filterCat === 'TODOS' || it.categoria === filterCat;
    return matchSearch && matchStatus && matchCat;
  });

  const totalPendente = items.filter(i => i.status === 'PENDENTE').reduce((s, i) => s + i.valor, 0);
  const totalVencido  = items.filter(i => i.status === 'VENCIDO').reduce((s, i) => s + i.valor, 0);
  const totalPago     = items.filter(i => i.status === 'PAGO' && i.valor_pago).reduce((s, i) => s + (i.valor_pago ?? 0), 0);
  const previsao7d    = items.filter(i => i.status === 'PENDENTE').reduce((s, i) => s + i.valor, 0);

  function handlePagar(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'PAGO', valor_pago: i.valor, data_pagamento: '07/03/26' } : i));
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contas a Pagar</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestão de despesas, fornecedores e obrigações fiscais</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-slate-300 shadow-sm">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-800">
            <Plus className="w-4 h-4" /> Novo Lançamento
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'A Pagar (Pendente)',  value: fmt(totalPendente), icon: Clock,         color: 'text-amber-600',   bg: 'bg-amber-50' },
          { label: 'Vencido (em atraso)', value: fmt(totalVencido),  icon: AlertTriangle, color: 'text-red-500',     bg: 'bg-red-50' },
          { label: 'Pago no Mês',         value: fmt(totalPago),     icon: CheckCircle,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Saídas Próximos 7d',  value: fmt(previsao7d),    icon: CreditCard,    color: 'text-slate-700',   bg: 'bg-slate-100' },
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

      {/* Category Summary */}
      <div className="grid grid-cols-5 gap-3">
        {(Object.keys(CAT_CONFIG) as Categoria[]).map(cat => {
          const total = items.filter(i => i.categoria === cat && i.status === 'PENDENTE').reduce((s, i) => s + i.valor, 0);
          return (
            <button key={cat} onClick={() => setFilterCat(filterCat === cat ? 'TODOS' : cat)}
              className={`bg-white border rounded-xl p-3 text-left shadow-sm transition-all ${filterCat === cat ? 'border-slate-400 ring-1 ring-slate-300' : 'border-slate-200 hover:border-slate-300'}`}>
              <span className={`text-xs px-2 py-0.5 rounded-full ${CAT_CONFIG[cat].color}`}>{CAT_CONFIG[cat].label}</span>
              <p className="text-lg font-bold text-slate-800 mt-2">{fmt(total)}</p>
              <p className="text-xs text-slate-400">pendente</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-48 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por fornecedor, descrição, ID..."
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
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Descrição / Fornecedor</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Categoria</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Vencimento</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Valor</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Status</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(item => {
                const cfg = STATUS_CONFIG[item.status];
                const catCfg = CAT_CONFIG[item.categoria];
                const StatusIcon = cfg.icon;
                const isLate = item.status === 'VENCIDO';
                const dias = isLate ? daysBetween(item.data_vencimento) : 0;
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-500">{item.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">{item.descricao}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3" /> {item.fornecedor}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${catCfg.color}`}>
                        <Tag className="w-3 h-3 inline mr-1" />{catCfg.label}
                      </span>
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
                      {(item.status === 'PENDENTE' || item.status === 'VENCIDO') ? (
                        <button onClick={() => setPagarItem(item)}
                          className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium">
                          Pagar
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Nenhum lançamento encontrado</p>
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
          {filtered.length} de {items.length} registros
        </div>
      </div>

      {pagarItem && (
        <PagarModal item={pagarItem} onClose={() => setPagarItem(null)} onConfirm={handlePagar} />
      )}
    </div>
  );
}

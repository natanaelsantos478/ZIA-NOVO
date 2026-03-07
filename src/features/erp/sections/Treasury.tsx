import { useState } from 'react';
import {
  Banknote, ArrowUpRight, ArrowDownRight,
  Building, Smartphone, Wallet,
  ArrowLeftRight, Plus, X, ChevronRight,
} from 'lucide-react';

interface ContaBancaria {
  id: string;
  nome: string;
  banco: string;
  agencia?: string;
  conta?: string;
  tipo: 'CORRENTE' | 'POUPANCA' | 'CAIXA_FISICO' | 'CARTEIRA_DIGITAL';
  saldo: number;
  saldo_inicial: number;
  pix_chave?: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

const CONTAS: ContaBancaria[] = [
  { id: 'CB-001', nome: 'Bradesco Principal',    banco: 'Bradesco (237)',   agencia: '1234-5', conta: '98765-0', tipo: 'CORRENTE',        saldo: 482300, saldo_inicial: 200000, pix_chave: '12.345.678/0001-99', icon: Building,    color: 'text-red-600',     bg: 'bg-red-50' },
  { id: 'CB-002', nome: 'Itaú Conta Corrente',   banco: 'Itaú (341)',       agencia: '5678-9', conta: '12345-6', tipo: 'CORRENTE',        saldo: 193700, saldo_inicial: 100000, pix_chave: 'financeiro@empresa.com', icon: Building, color: 'text-orange-600',  bg: 'bg-orange-50' },
  { id: 'CB-003', nome: 'Caixa Físico',          banco: 'Caixa Interna',    tipo: 'CAIXA_FISICO',     saldo: 8400, saldo_inicial: 5000, icon: Wallet, color: 'text-slate-600', bg: 'bg-slate-100' },
  { id: 'CB-004', nome: 'PagSeguro Digital',     banco: 'PagSeguro',        tipo: 'CARTEIRA_DIGITAL', saldo: 31200, saldo_inicial: 0, pix_chave: 'pix@empresa.com', icon: Smartphone, color: 'text-blue-600', bg: 'bg-blue-50' },
];

const TIPO_LABELS: Record<ContaBancaria['tipo'], string> = {
  CORRENTE: 'Conta Corrente', POUPANCA: 'Poupança',
  CAIXA_FISICO: 'Caixa Físico', CARTEIRA_DIGITAL: 'Carteira Digital',
};

const HISTORICO = [
  { data: '05/03/26', desc: 'Recebimento — Metalúrgica ABC', tipo: 'ENTRADA', valor: 48200, conta: 'Bradesco Principal' },
  { data: '05/03/26', desc: 'Aluguel sede — março/2026',    tipo: 'SAIDA',   valor: 12500, conta: 'Bradesco Principal' },
  { data: '03/03/26', desc: 'DARF PIS/COFINS fev/26',       tipo: 'SAIDA',   valor: 9870,  conta: 'Bradesco Principal' },
  { data: '02/03/26', desc: 'Recebimento — Transp. Rápidos',tipo: 'ENTRADA', valor: 22700, conta: 'Itaú Conta Corrente' },
  { data: '01/03/26', desc: 'Transferência interna',        tipo: 'SAIDA',   valor: 5000,  conta: 'Bradesco Principal' },
  { data: '01/03/26', desc: 'Transferência interna',        tipo: 'ENTRADA', valor: 5000,  conta: 'Caixa Físico' },
  { data: '28/02/26', desc: 'Recebimento — Indústrias Omega',tipo: 'ENTRADA', valor: 55000, conta: 'Itaú Conta Corrente' },
];

// Simple 12-week projection data
const PROJECAO = [
  { semana: 'S1 Mar', entrada: 120000, saida: 80000 },
  { semana: 'S2 Mar', entrada: 95000,  saida: 62000 },
  { semana: 'S3 Mar', entrada: 140000, saida: 88000 },
  { semana: 'S4 Mar', entrada: 110000, saida: 95000 },
  { semana: 'S1 Abr', entrada: 130000, saida: 72000 },
  { semana: 'S2 Abr', entrada: 85000,  saida: 68000 },
];

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface TransferModalProps {
  contas: ContaBancaria[];
  onClose: () => void;
  onConfirm: (origem: string, destino: string, valor: number, obs: string) => void;
}

function TransferModal({ contas, onClose, onConfirm }: TransferModalProps) {
  const [origem, setOrigem] = useState(contas[0].id);
  const [destino, setDestino] = useState(contas[1].id);
  const [valor, setValor] = useState('');
  const [obs, setObs] = useState('');

  function handleSubmit() {
    const v = parseFloat(valor.replace(',', '.'));
    if (!v || v <= 0) return;
    if (origem === destino) { alert('Origem e destino devem ser diferentes.'); return; }
    onConfirm(origem, destino, v, obs);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Transferência Entre Contas</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Conta de Origem</label>
            <select value={origem} onChange={e => setOrigem(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome} — {fmt(c.saldo)}</option>)}
            </select>
          </div>
          <div className="flex justify-center">
            <ArrowLeftRight className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Conta de Destino</label>
            <select value={destino} onChange={e => setDestino(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
              {contas.filter(c => c.id !== origem).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Valor (R$)</label>
            <input value={valor} onChange={e => setValor(e.target.value)}
              placeholder="0,00"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Observação (opcional)</label>
            <input value={obs} onChange={e => setObs(e.target.value)}
              placeholder="Ex: Reforço de caixa, troco..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400" />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
            Transferir
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectionChart({ data }: { data: typeof PROJECAO }) {
  const maxVal = Math.max(...data.flatMap(d => [d.entrada, d.saida]));
  const chartH = 120;
  const barW = 22;
  const gap = 6;
  const groupW = barW * 2 + gap + 20;
  const totalW = data.length * groupW;

  return (
    <div className="overflow-x-auto">
      <svg width={totalW} height={chartH + 36} className="block">
        {data.map((d, i) => {
          const x = i * groupW + 10;
          const rH = Math.round((d.entrada / maxVal) * chartH);
          const sH = Math.round((d.saida / maxVal) * chartH);
          return (
            <g key={d.semana}>
              <rect x={x} y={chartH - rH} width={barW} height={rH} fill="#10b981" rx={3} opacity={0.8} />
              <rect x={x + barW + gap} y={chartH - sH} width={barW} height={sH} fill="#f87171" rx={3} opacity={0.8} />
              <text x={x + barW + gap / 2} y={chartH + 18} textAnchor="middle" fontSize={10} fill="#94a3b8">{d.semana}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function Treasury() {
  const [contas, setContas] = useState<ContaBancaria[]>(CONTAS);
  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedConta, setSelectedConta] = useState<string | null>(null);

  const totalSaldo = contas.reduce((s, c) => s + c.saldo, 0);

  function handleTransfer(origemId: string, destinoId: string, valor: number) {
    setContas(prev => prev.map(c => {
      if (c.id === origemId) return { ...c, saldo: c.saldo - valor };
      if (c.id === destinoId) return { ...c, saldo: c.saldo + valor };
      return c;
    }));
  }

  const historico = selectedConta
    ? HISTORICO.filter(h => {
        const conta = contas.find(c => c.id === selectedConta);
        return conta ? h.conta === conta.nome : true;
      })
    : HISTORICO;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tesouraria</h1>
          <p className="text-slate-500 text-sm mt-0.5">Saldos bancários, fluxo de caixa e transferências</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowTransfer(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-slate-300 shadow-sm">
            <ArrowLeftRight className="w-4 h-4" /> Transferência
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-800">
            <Plus className="w-4 h-4" /> Nova Conta
          </button>
        </div>
      </div>

      {/* Total Caixa */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Banknote className="w-6 h-6 text-slate-300" />
          <span className="text-slate-300 text-sm">Posição de Caixa Consolidada</span>
        </div>
        <p className="text-4xl font-bold">{fmt(totalSaldo)}</p>
        <p className="text-slate-400 text-sm mt-2">
          {contas.length} contas ativas · atualizado em 07/03/2026
        </p>
      </div>

      {/* Conta Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {contas.map(c => {
          const Icon = c.icon;
          const variacao = c.saldo - c.saldo_inicial;
          const isSelected = selectedConta === c.id;
          return (
            <button key={c.id} onClick={() => setSelectedConta(isSelected ? null : c.id)}
              className={`bg-white border rounded-xl p-5 text-left shadow-sm transition-all ${isSelected ? 'border-slate-400 ring-2 ring-slate-200' : 'border-slate-200 hover:border-slate-300'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${c.color}`} />
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-90 text-slate-500' : 'text-slate-300'}`} />
              </div>
              <p className="text-2xl font-bold text-slate-800">{fmt(c.saldo)}</p>
              <p className="text-sm font-medium text-slate-600 mt-1">{c.nome}</p>
              <p className="text-xs text-slate-400">{TIPO_LABELS[c.tipo]}</p>
              {c.agencia && (
                <p className="text-xs text-slate-400 mt-1">Ag: {c.agencia} · C/C: {c.conta}</p>
              )}
              {c.pix_chave && (
                <p className="text-xs text-slate-400 mt-0.5 truncate">PIX: {c.pix_chave}</p>
              )}
              <div className={`flex items-center gap-1 mt-2 text-xs ${variacao >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {variacao >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {variacao >= 0 ? '+' : ''}{fmt(variacao)} vs. saldo inicial
              </div>
            </button>
          );
        })}
      </div>

      {/* Projeção + Histórico */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Fluxo Projetado */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-700 mb-1">Fluxo Projetado — Próximas 6 Semanas</h2>
          <p className="text-xs text-slate-400 mb-4">Baseado em títulos em aberto (CR e CP)</p>
          <ProjectionChart data={PROJECAO} />
          <div className="flex items-center justify-center gap-6 mt-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Entradas
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> Saídas
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
            {[
              { label: 'Entradas Previstas',  value: fmt(PROJECAO.reduce((s, d) => s + d.entrada, 0)) },
              { label: 'Saídas Previstas',    value: fmt(PROJECAO.reduce((s, d) => s + d.saida, 0)) },
              { label: 'Saldo Projetado',     value: fmt(PROJECAO.reduce((s, d) => s + d.entrada - d.saida, 0)) },
            ].map(m => (
              <div key={m.label} className="text-center">
                <p className="text-base font-bold text-slate-800">{m.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Movimentações Recentes */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-700">
              {selectedConta ? `Extrato — ${contas.find(c => c.id === selectedConta)?.nome}` : 'Movimentações Recentes'}
            </h2>
            {selectedConta && (
              <button onClick={() => setSelectedConta(null)} className="text-xs text-slate-400 hover:text-slate-600">
                Ver todas
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto custom-scrollbar">
            {historico.map((h, idx) => (
              <div key={idx} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${h.tipo === 'ENTRADA' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  {h.tipo === 'ENTRADA'
                    ? <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                    : <ArrowDownRight className="w-4 h-4 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{h.desc}</p>
                  <p className="text-xs text-slate-400">{h.data} · {h.conta}</p>
                </div>
                <p className={`text-sm font-semibold flex-shrink-0 ${h.tipo === 'ENTRADA' ? 'text-emerald-700' : 'text-red-600'}`}>
                  {h.tipo === 'ENTRADA' ? '+' : '-'} {fmt(h.valor)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showTransfer && (
        <TransferModal
          contas={contas}
          onClose={() => setShowTransfer(false)}
          onConfirm={handleTransfer}
        />
      )}
    </div>
  );
}

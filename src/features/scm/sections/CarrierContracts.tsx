import { useState } from 'react';
import { Search, Plus, FileSignature, CheckCircle2, Clock, AlertTriangle, Download, Edit2 } from 'lucide-react';

type ContractStatus = 'Vigente' | 'Em renovação' | 'Vencido' | 'Rascunho';

interface Contract {
  id: string;
  carrier: string;
  type: string;
  signedAt?: string;
  validFrom: string;
  validTo: string;
  value: number;
  status: ContractStatus;
  autoRenew: boolean;
  alertDays: number;
  daysToExpire?: number;
}

const CONTRACTS: Contract[] = [
  { id: 'CTR-001', carrier: 'Jadlog',         type: 'Contrato de Prestação de Serviços', signedAt: '01/01/2026', validFrom: '01/01/2026', validTo: '31/12/2026', value: 150_000, status: 'Vigente',      autoRenew: true,  alertDays: 60, daysToExpire: 301 },
  { id: 'CTR-002', carrier: 'Total Express',  type: 'Contrato de Distribuição Exclusiva',  signedAt: '01/03/2026', validFrom: '01/03/2026', validTo: '28/02/2027', value: 220_000, status: 'Vigente',      autoRenew: true,  alertDays: 90, daysToExpire: 360 },
  { id: 'CTR-003', carrier: 'Braspress',      type: 'Contrato Rodoviário Nacional',       signedAt: '01/07/2025', validFrom: '01/07/2025', validTo: '30/06/2026', value: 65_000,  status: 'Em renovação', autoRenew: false, alertDays: 60, daysToExpire: 117 },
  { id: 'CTR-004', carrier: 'Correios',       type: 'Contrato Corporativo ECT',           signedAt: '01/01/2026', validFrom: '01/01/2026', validTo: '31/12/2026', value: 108_000, status: 'Vigente',      autoRenew: true,  alertDays: 60, daysToExpire: 301 },
  { id: 'CTR-005', carrier: 'Sequoia',        type: 'Contrato de Transporte Expresso',    signedAt: '15/03/2025', validFrom: '15/03/2025', validTo: '14/03/2026', value: 92_000,  status: 'Vencido',      autoRenew: false, alertDays: 60, daysToExpire: -20 },
  { id: 'CTR-006', carrier: 'Rapidão Cometa', type: 'Carta Acordo Experimental',          validFrom: '01/04/2026', validTo: '31/07/2026',                          value: 18_000,  status: 'Rascunho',     autoRenew: false, alertDays: 30 },
];

const STATUS_BADGE: Record<ContractStatus, string> = {
  'Vigente':      'bg-emerald-100 text-emerald-700',
  'Em renovação': 'bg-amber-100 text-amber-700',
  'Vencido':      'bg-red-100 text-red-700',
  'Rascunho':     'bg-slate-100 text-slate-500',
};

export default function CarrierContracts() {
  const [search, setSearch] = useState('');

  const filtered = CONTRACTS.filter((c) =>
    c.carrier.toLowerCase().includes(search.toLowerCase()) ||
    c.id.toLowerCase().includes(search.toLowerCase()) ||
    c.type.toLowerCase().includes(search.toLowerCase())
  );

  const totalContractValue = CONTRACTS.filter((c) => c.status === 'Vigente').reduce((s, c) => s + c.value, 0);
  const expiringCount = CONTRACTS.filter((c) => c.daysToExpire !== undefined && c.daysToExpire >= 0 && c.daysToExpire <= 90).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contratos de Transportadoras</h1>
          <p className="text-slate-500 text-sm mt-0.5">Assinatura eletrônica, vigência e alertas de renovação</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" />
            Novo Contrato
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Valor Total Vigente',   value: `R$ ${(totalContractValue / 1000).toFixed(0)}K/ano`, icon: FileSignature, color: 'emerald' },
          { label: 'Contratos Vigentes',    value: CONTRACTS.filter((c) => c.status === 'Vigente').length,     icon: CheckCircle2,  color: 'blue'    },
          { label: 'Vencendo em 90 dias',   value: expiringCount,  icon: Clock,         color: 'amber'   },
          { label: 'Vencidos / Pendentes',  value: CONTRACTS.filter((c) => c.status === 'Vencido' || c.status === 'Em renovação').length, icon: AlertTriangle, color: 'red' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 bg-${s.color}-50`}>
                <Icon className={`w-4 h-4 text-${s.color}-600`} />
              </div>
              <div className="text-xl font-bold text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar contrato, transportadora ou tipo..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map((c) => (
          <div key={c.id} className={`bg-white rounded-xl border p-5 shadow-sm transition-colors ${c.status === 'Vencido' ? 'border-red-100' : c.daysToExpire !== undefined && c.daysToExpire <= 90 && c.daysToExpire >= 0 ? 'border-amber-100' : 'border-slate-100'}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="font-mono text-xs font-bold text-slate-500">{c.id}</span>
                  <span className="font-semibold text-slate-800">{c.carrier}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[c.status]}`}>{c.status}</span>
                  {c.autoRenew && <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">Renovação automática</span>}
                </div>
                <p className="text-sm text-slate-600 mb-2">{c.type}</p>
                <div className="flex items-center gap-6 text-xs text-slate-500">
                  <span>Vigência: {c.validFrom} → {c.validTo}</span>
                  <span>Valor: <span className="font-bold text-slate-700">R$ {c.value.toLocaleString('pt-BR')}/ano</span></span>
                  {c.signedAt && <span>Assinado: {c.signedAt}</span>}
                  {c.daysToExpire !== undefined && (
                    <span className={`font-bold ${c.daysToExpire < 0 ? 'text-red-600' : c.daysToExpire <= 90 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {c.daysToExpire < 0 ? `Vencido há ${Math.abs(c.daysToExpire)} dias` : `${c.daysToExpire} dias restantes`}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 ml-4 flex-shrink-0">
                <button className="flex items-center gap-1 text-xs border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                  <Download className="w-3 h-3" /> PDF
                </button>
                <button className="flex items-center gap-1 text-xs border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                  <Edit2 className="w-3 h-3" /> Editar
                </button>
                {(c.status === 'Vencido' || c.status === 'Em renovação') && (
                  <button className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors">
                    Renovar
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

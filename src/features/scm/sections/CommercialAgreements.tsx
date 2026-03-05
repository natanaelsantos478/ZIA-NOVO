import { useState } from 'react';
import { Plus, Handshake, Clock, AlertTriangle, DollarSign, Download } from 'lucide-react';

type AgreementType = 'Desconto por volume' | 'Rebate' | 'Bonificação' | 'SLA premium' | 'Exclusividade';
type AgreementStatus = 'Ativo' | 'Pendente aprovação' | 'Vencido' | 'Em renovação';

interface Agreement {
  id: string;
  carrier: string;
  type: AgreementType;
  description: string;
  value: string;
  status: AgreementStatus;
  validFrom: string;
  validTo: string;
  volumeCommitment?: number;
  currentVolume?: number;
}

const AGREEMENTS: Agreement[] = [
  { id: 'ACD-001', carrier: 'Jadlog',        type: 'Desconto por volume', description: '8% desconto acima de 1.500 entregas/mês',      value: 'R$ 3.200/mês (est.)', status: 'Ativo',            validFrom: '01/01/2026', validTo: '31/12/2026', volumeCommitment: 1_500, currentVolume: 1_980 },
  { id: 'ACD-002', carrier: 'Total Express', type: 'SLA premium',         description: 'SLA 95%+ garantido + penalidade por falha',    value: 'Crédito de R$ 50/falha', status: 'Ativo',         validFrom: '01/03/2026', validTo: '28/02/2027', },
  { id: 'ACD-003', carrier: 'Correios',      type: 'Desconto por volume', description: '5% desconto acima de 3.000 objetos/mês',       value: 'R$ 1.800/mês (est.)', status: 'Ativo',            validFrom: '01/01/2026', validTo: '31/12/2026', volumeCommitment: 3_000, currentVolume: 5_120 },
  { id: 'ACD-004', carrier: 'Braspress',     type: 'Rebate',              description: 'Rebate trimestral 3% acima de 40 embarques',   value: 'R$ 680 (Q1/2026)',    status: 'Pendente aprovação', validFrom: '01/01/2026', validTo: '31/12/2026', volumeCommitment: 40, currentVolume: 43 },
  { id: 'ACD-005', carrier: 'Jadlog',        type: 'Bonificação',         description: 'Frete grátis a cada 500 entregas adicionais',  value: 'Crédito variável',    status: 'Em renovação',     validFrom: '01/01/2025', validTo: '31/12/2025' },
];

const STATUS_BADGE: Record<AgreementStatus, string> = {
  'Ativo':               'bg-emerald-100 text-emerald-700',
  'Pendente aprovação':  'bg-amber-100 text-amber-700',
  'Vencido':             'bg-red-100 text-red-700',
  'Em renovação':        'bg-blue-100 text-blue-700',
};

const TYPE_BADGE: Record<AgreementType, string> = {
  'Desconto por volume': 'bg-emerald-50 text-emerald-700',
  'Rebate':             'bg-purple-50 text-purple-700',
  'Bonificação':        'bg-amber-50 text-amber-700',
  'SLA premium':        'bg-blue-50 text-blue-700',
  'Exclusividade':      'bg-rose-50 text-rose-700',
};

export default function CommercialAgreements() {
  const [filter, setFilter] = useState('Todos');

  const STATUSES: AgreementStatus[] = ['Ativo', 'Pendente aprovação', 'Vencido', 'Em renovação'];

  const filtered = AGREEMENTS.filter((a) => filter === 'Todos' || a.status === filter);
  const totalBenefit = 3_200 + 1_800 + 680;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Acordos Comerciais</h1>
          <p className="text-slate-500 text-sm mt-0.5">Descontos por volume, bonificações, rebates e SLAs garantidos</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" />
            Novo Acordo
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Acordos Ativos',         value: AGREEMENTS.filter((a) => a.status === 'Ativo').length, icon: Handshake, color: 'emerald' },
          { label: 'Benefício Estimado/mês', value: `R$ ${totalBenefit.toLocaleString('pt-BR')}`, icon: DollarSign, color: 'blue' },
          { label: 'Pendentes Aprovação',    value: AGREEMENTS.filter((a) => a.status === 'Pendente aprovação').length, icon: Clock, color: 'amber' },
          { label: 'Em Renovação',           value: AGREEMENTS.filter((a) => a.status === 'Em renovação').length, icon: AlertTriangle, color: 'orange' },
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

      {/* Filter */}
      <div className="flex items-center gap-2">
        {(['Todos', ...STATUSES] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === s ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{s}</button>
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {filtered.map((ag) => (
          <div key={ag.id} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold text-slate-800">{ag.carrier}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${TYPE_BADGE[ag.type]}`}>{ag.type}</span>
                  <span className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[ag.status]}`}>{ag.status}</span>
                </div>
                <p className="text-sm text-slate-600 mb-2">{ag.description}</p>
                <div className="flex items-center gap-6 text-xs text-slate-500">
                  <span>Vigência: {ag.validFrom} → {ag.validTo}</span>
                  <span className="text-emerald-600 font-medium">Benefício: {ag.value}</span>
                  {ag.volumeCommitment && (
                    <span>Volume comprometido: <span className="text-slate-700">{ag.volumeCommitment.toLocaleString('pt-BR')}</span></span>
                  )}
                  {ag.currentVolume && ag.volumeCommitment && (
                    <span className={`font-medium ${ag.currentVolume >= ag.volumeCommitment ? 'text-emerald-600' : 'text-amber-600'}`}>
                      Atual: {ag.currentVolume.toLocaleString('pt-BR')} {ag.currentVolume >= ag.volumeCommitment ? '✓' : '⚠'}
                    </span>
                  )}
                </div>
                {ag.currentVolume && ag.volumeCommitment && (
                  <div className="mt-3">
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min((ag.currentVolume / ag.volumeCommitment) * 100, 100)}%` }} />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 ml-4 flex-shrink-0">
                <button className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">Ver</button>
                <button className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">Editar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

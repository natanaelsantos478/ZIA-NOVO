import { useState } from 'react';
import { Search, Download, FileSearch, CheckCircle2, XCircle, AlertTriangle, DollarSign, TrendingDown } from 'lucide-react';

type AuditStatus = 'Conforme' | 'Divergência' | 'Em análise' | 'Contestado';

interface AuditRecord {
  id: string;
  carrier: string;
  invoice: string;
  period: string;
  quoted: number;
  charged: number;
  difference: number;
  status: AuditStatus;
  shipments: number;
  divergences: number;
}

const AUDITS: AuditRecord[] = [
  { id: 'AUD-481', carrier: 'Jadlog',        invoice: 'FAT-JDL-0324', period: 'Fev/2026', quoted: 12_480.00, charged: 13_240.00, difference: -760.00,  status: 'Divergência', shipments: 234, divergences: 18 },
  { id: 'AUD-480', carrier: 'Correios',      invoice: 'FAT-COR-0214', period: 'Fev/2026', quoted: 8_920.00,  charged: 8_850.00,  difference: 70.00,    status: 'Conforme',    shipments: 512, divergences: 3  },
  { id: 'AUD-479', carrier: 'Total Express', invoice: 'FAT-TEX-0198', period: 'Fev/2026', quoted: 18_300.00, charged: 18_300.00, difference: 0,        status: 'Conforme',    shipments: 189, divergences: 0  },
  { id: 'AUD-478', carrier: 'Braspress',     invoice: 'FAT-BRS-0087', period: 'Fev/2026', quoted: 5_600.00,  charged: 6_840.00,  difference: -1_240.00, status: 'Contestado', shipments: 43,  divergences: 8  },
  { id: 'AUD-477', carrier: 'Sequoia',       invoice: 'FAT-SEQ-0056', period: 'Fev/2026', quoted: 9_100.00,  charged: 9_410.00,  difference: -310.00,  status: 'Em análise',  shipments: 78,  divergences: 5  },
  { id: 'AUD-476', carrier: 'Jadlog',        invoice: 'FAT-JDL-0289', period: 'Jan/2026', quoted: 11_200.00, charged: 11_640.00, difference: -440.00,  status: 'Contestado',  shipments: 198, divergences: 12 },
];

const STATUS_BADGE: Record<AuditStatus, string> = {
  'Conforme':    'bg-emerald-100 text-emerald-700',
  'Divergência': 'bg-red-100 text-red-700',
  'Em análise':  'bg-amber-100 text-amber-700',
  'Contestado':  'bg-purple-100 text-purple-700',
};

export default function FreightAudit() {
  const [search, setSearch] = useState('');

  const filtered = AUDITS.filter((a) =>
    a.carrier.toLowerCase().includes(search.toLowerCase()) ||
    a.invoice.toLowerCase().includes(search.toLowerCase())
  );

  const totalDivergence = AUDITS.reduce((s, a) => s + Math.min(0, a.difference), 0);
  const divergenceCount = AUDITS.filter((a) => a.status === 'Divergência' || a.status === 'Contestado').length;
  const totalShipments = AUDITS.reduce((s, a) => s + a.shipments, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Auditoria de Fretes</h1>
          <p className="text-slate-500 text-sm mt-0.5">Conferência automática entre valores cotados e cobrados pelas transportadoras</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            Exportar Relatório
          </button>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <FileSearch className="w-4 h-4" />
            Nova Auditoria
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Cobrado a Mais',   value: `R$ ${Math.abs(totalDivergence).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingDown, color: 'red'     },
          { label: 'Faturas com Divergência', value: divergenceCount, icon: AlertTriangle, color: 'amber'   },
          { label: 'Embarques Auditados',    value: totalShipments,  icon: FileSearch,    color: 'blue'    },
          { label: 'Taxa de Conformidade',   value: '58%',           icon: CheckCircle2,  color: 'emerald' },
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
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar transportadora ou fatura..."
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Transportadora</th>
              <th className="px-5 py-3 text-left">Fatura</th>
              <th className="px-5 py-3 text-center">Período</th>
              <th className="px-5 py-3 text-center">Embarques</th>
              <th className="px-5 py-3 text-right">Cotado</th>
              <th className="px-5 py-3 text-right">Cobrado</th>
              <th className="px-5 py-3 text-right">Diferença</th>
              <th className="px-5 py-3 text-center">Divergências</th>
              <th className="px-5 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((aud) => (
              <tr key={aud.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5 font-medium text-slate-800">{aud.carrier}</td>
                <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{aud.invoice}</td>
                <td className="px-5 py-3.5 text-center text-slate-600">{aud.period}</td>
                <td className="px-5 py-3.5 text-center text-slate-600">{aud.shipments}</td>
                <td className="px-5 py-3.5 text-right text-slate-700">
                  R$ {aud.quoted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-5 py-3.5 text-right text-slate-700">
                  R$ {aud.charged.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className={`font-bold ${aud.difference < 0 ? 'text-red-600' : aud.difference > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {aud.difference < 0 ? '-' : aud.difference > 0 ? '+' : ''}
                    R$ {Math.abs(aud.difference).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`text-sm font-bold ${aud.divergences > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {aud.divergences}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[aud.status]}`}>
                    {aud.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button className="text-xs text-slate-500 hover:text-slate-800">Detalhes</button>
                    {(aud.status === 'Divergência') && (
                      <button className="text-xs text-red-500 hover:text-red-700">Contestar</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI tip */}
      <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-emerald-800 text-sm">ZIA identificou R$ 2.750 de cobranças indevidas em Fev/2026</span>
        </div>
        <p className="text-xs text-emerald-700">
          Principais causas: peso cúbico divergente (R$ 1.240), fretes cobrados sem embarque correspondente (R$ 890), taxa de seguro não contratada (R$ 620).
        </p>
        <button className="mt-3 text-xs bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors">
          Gerar Carta de Contestação Automática
        </button>
      </div>
    </div>
  );
}

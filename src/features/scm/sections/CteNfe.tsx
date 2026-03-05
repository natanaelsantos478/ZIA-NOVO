import { useState } from 'react';
import { Search, Plus, Download, FileText, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';

type DocType = 'CT-e' | 'NF-e' | 'NFC-e' | 'MDF-e';
type DocStatus = 'Autorizado' | 'Pendente' | 'Rejeitado' | 'Cancelado';

interface FiscalDoc {
  id: string;
  type: DocType;
  number: string;
  series: string;
  emitter: string;
  recipient: string;
  value: number;
  status: DocStatus;
  emittedAt: string;
  key: string;
}

const DOCS: FiscalDoc[] = [
  { id: '1', type: 'CT-e', number: '000.412', series: '1', emitter: 'ZIA Logística Ltda',    recipient: 'Mercado Silva',      value: 1_240.00, status: 'Autorizado', emittedAt: '05/03/2026', key: '35260312345678000100570010004120001234567890' },
  { id: '2', type: 'NF-e', number: '012.841', series: '1', emitter: 'Distribuidora Norte',    recipient: 'Varejo ABC',          value: 8_450.50, status: 'Autorizado', emittedAt: '05/03/2026', key: '35260312345678000100550010128410001234567891' },
  { id: '3', type: 'CT-e', number: '000.413', series: '1', emitter: 'ZIA Logística Ltda',    recipient: 'Tech Distribuidora', value: 2_100.00, status: 'Pendente',   emittedAt: '05/03/2026', key: '35260312345678000100570010004130001234567892' },
  { id: '4', type: 'NF-e', number: '012.842', series: '1', emitter: 'Fornecedor XYZ',        recipient: 'ZIA Logística Ltda', value: 3_320.80, status: 'Autorizado', emittedAt: '04/03/2026', key: '35260312345678000100550010128420001234567893' },
  { id: '5', type: 'MDF-e', number: '000.091', series: '1', emitter: 'ZIA Logística Ltda',   recipient: 'Manifesto de Carga', value: 12_000.00, status: 'Autorizado', emittedAt: '04/03/2026', key: '35260312345678000100580010000910001234567894' },
  { id: '6', type: 'CT-e', number: '000.410', series: '1', emitter: 'ZIA Logística Ltda',    recipient: 'Supermercado BH',   value: 890.00,  status: 'Rejeitado',  emittedAt: '03/03/2026', key: '35260312345678000100570010004100001234567895' },
  { id: '7', type: 'NF-e', number: '012.839', series: '2', emitter: 'Indústria Beta Ltda',   recipient: 'Atacadão SP',        value: 22_800.00, status: 'Cancelado', emittedAt: '02/03/2026', key: '35260312345678000100550020128390001234567896' },
];

const STATUS_BADGE: Record<DocStatus, string> = {
  'Autorizado': 'bg-emerald-100 text-emerald-700',
  'Pendente':   'bg-amber-100 text-amber-700',
  'Rejeitado':  'bg-red-100 text-red-700',
  'Cancelado':  'bg-slate-100 text-slate-500',
};

const STATUS_ICON: Record<DocStatus, React.ElementType> = {
  'Autorizado': CheckCircle2,
  'Pendente':   Clock,
  'Rejeitado':  XCircle,
  'Cancelado':  AlertTriangle,
};

const TYPE_BADGE: Record<DocType, string> = {
  'CT-e':  'bg-blue-100 text-blue-700',
  'NF-e':  'bg-purple-100 text-purple-700',
  'NFC-e': 'bg-pink-100 text-pink-700',
  'MDF-e': 'bg-orange-100 text-orange-700',
};

const DOC_TYPES: DocType[] = ['CT-e', 'NF-e', 'NFC-e', 'MDF-e'];

export default function CteNfe() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'Todos' | DocType>('Todos');

  const filtered = DOCS.filter((d) => {
    const matchSearch = d.number.includes(search) || d.recipient.toLowerCase().includes(search.toLowerCase()) || d.emitter.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'Todos' || d.type === typeFilter;
    return matchSearch && matchType;
  });

  const totalAuthorized = DOCS.filter((d) => d.status === 'Autorizado').reduce((s, d) => s + d.value, 0);
  const pendingCount = DOCS.filter((d) => d.status === 'Pendente').length;
  const rejectedCount = DOCS.filter((d) => d.status === 'Rejeitado').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">CT-e / NF-e</h1>
          <p className="text-slate-500 text-sm mt-0.5">Emissão e gestão de documentos fiscais via Focus NFe</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-slate-200 px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            Exportar XML
          </button>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" />
            Emitir Documento
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Valor Autorizado',  value: `R$ ${totalAuthorized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'emerald', icon: CheckCircle2 },
          { label: 'Documentos Hoje',   value: DOCS.length.toString(), color: 'blue', icon: FileText },
          { label: 'Pendentes SEFAZ',   value: pendingCount.toString(), color: 'amber', icon: Clock },
          { label: 'Rejeitados',        value: rejectedCount.toString(), color: 'red', icon: XCircle },
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

      {/* Type filter tabs */}
      <div className="flex items-center gap-2">
        {(['Todos', ...DOC_TYPES] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t as 'Todos' | DocType)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              typeFilter === t
                ? 'bg-emerald-600 text-white'
                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t}
          </button>
        ))}
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar número, emitente, destinatário..."
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Tipo</th>
              <th className="px-5 py-3 text-left">Número / Série</th>
              <th className="px-5 py-3 text-left">Emitente</th>
              <th className="px-5 py-3 text-left">Destinatário</th>
              <th className="px-5 py-3 text-right">Valor</th>
              <th className="px-5 py-3 text-center">Emissão</th>
              <th className="px-5 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((doc) => {
              const StatusIcon = STATUS_ICON[doc.status];
              return (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${TYPE_BADGE[doc.type]}`}>
                      {doc.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-mono text-slate-800">{doc.number}</div>
                    <div className="text-xs text-slate-500">Série {doc.series}</div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-700">{doc.emitter}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-800">{doc.recipient}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-slate-800">
                    R$ {doc.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3.5 text-center text-slate-500">{doc.emittedAt}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[doc.status]}`}>
                      <StatusIcon className="w-3 h-3" />
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button className="text-xs text-slate-500 hover:text-slate-800">XML</button>
                      <button className="text-xs text-slate-500 hover:text-slate-800">DANFE</button>
                      {doc.status === 'Autorizado' && (
                        <button className="text-xs text-red-500 hover:text-red-700">Cancelar</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SEFAZ Status */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-slate-700">SEFAZ Online — Focus NFe</span>
          <span className="text-xs text-slate-500">Última consulta: 05/03/2026 14:58</span>
          <span className="ml-auto text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Integração ativa</span>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { FileBarChart, Download, Package, TrendingDown, Wrench, Users, Building } from 'lucide-react';
import { getAssets, getDepreciationSnapshots, getWorkOrders, type Asset } from '../../../lib/eam';

type ReportType = 'patrimonio' | 'depreciacao' | 'manutencao' | 'por_responsavel' | 'por_departamento';

const REPORTS: { id: ReportType; label: string; description: string; icon: React.ElementType }[] = [
  { id: 'patrimonio', label: 'Inventário Patrimonial', description: 'Lista completa de ativos com valores e status', icon: Package },
  { id: 'depreciacao', label: 'Depreciação por Período', description: 'Depreciação acumulada e valor contábil por ativo', icon: TrendingDown },
  { id: 'manutencao', label: 'Custo de Manutenção', description: 'Ordens de serviço, custos e histórico de manutenção', icon: Wrench },
  { id: 'por_responsavel', label: 'Ativos por Responsável', description: 'Patrimônio agrupado por guardião/responsável', icon: Users },
  { id: 'por_departamento', label: 'Ativos por Departamento', description: 'Distribuição patrimonial por departamento/CC', icon: Building },
];

function fmt(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }

function downloadCsv(rows: string[][], filename: string) {
  const content = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename + '.csv'; a.click();
  URL.revokeObjectURL(url);
}

const TYPE_LABELS: Record<string, string> = { fixo: 'Ativo Fixo', ti: 'TI', mobiliario: 'Mobiliário', intangivel: 'Intangível' };
const STATUS_LABELS: Record<string, string> = { em_aquisicao: 'Em Aquisição', disponivel: 'Disponível', em_uso: 'Em Uso', em_manutencao: 'Em Manutenção', em_emprestimo: 'Emprestado', descartado: 'Descartado', alienado: 'Alienado', extraviado: 'Extraviado' };

export default function AssetReports() {
  const [selected, setSelected] = useState<ReportType>('patrimonio');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string[][] | null>(null);
  const [reportLabel, setReportLabel] = useState('');

  async function generateReport() {
    setLoading(true);
    setPreview(null);
    try {
      let rows: string[][] = [];
      const rpt = REPORTS.find((r) => r.id === selected)!;
      setReportLabel(rpt.label);

      if (selected === 'patrimonio') {
        const { data: assets } = await getAssets({ pageSize: 9999 });
        rows = [
          ['Tag', 'Nome', 'Tipo', 'Status', 'Valor Histórico', 'Valor Contábil', 'Responsável', 'Departamento', 'Localização', 'Garantia até'],
          ...assets.map((a) => [
            a.tag, a.name, TYPE_LABELS[a.asset_type] ?? a.asset_type, STATUS_LABELS[a.status] ?? a.status,
            fmt(a.acquisition_value), a.current_book_value != null ? fmt(a.current_book_value) : '—',
            a.responsible_name ?? '—', a.department_name ?? '—',
            [a.location_unit, a.location_floor, a.location_room].filter(Boolean).join(' / ') || '—',
            a.warranty_end ? new Date(a.warranty_end).toLocaleDateString('pt-BR') : '—',
          ]),
        ];
      }

      if (selected === 'depreciacao') {
        const { data: assets } = await getAssets({ pageSize: 9999 });
        const allSnaps = await Promise.all(assets.map((a) => getDepreciationSnapshots(a.id)));
        rows = [['Tag', 'Nome', 'Valor Histórico', 'Dep. Acumulada', 'Valor Contábil', 'Método', 'Vida Útil (m)']];
        assets.forEach((a, i) => {
          const snaps = allSnaps[i];
          const accDep = snaps.reduce((s, sn) => s + Number(sn.monthly_quota), 0);
          rows.push([a.tag, a.name, fmt(a.acquisition_value), fmt(accDep), fmt(Math.max(a.residual_value, a.acquisition_value - accDep)), a.depreciation_method, String(a.useful_life_months)]);
        });
      }

      if (selected === 'manutencao') {
        const orders = await getWorkOrders();
        rows = [
          ['Ativo ID', 'Tipo', 'Status', 'Título', 'Fornecedor', 'Técnico', 'Custo Peças', 'Custo M.O.', 'Custo Total', 'Abertura', 'Conclusão'],
          ...orders.map((o) => [
            o.asset_id, o.type, o.status, o.title, o.supplier_name ?? '—', o.technician_name ?? '—',
            fmt(o.parts_cost), fmt(o.labor_cost), fmt(o.total_cost),
            new Date(o.opened_at).toLocaleDateString('pt-BR'),
            o.concluded_at ? new Date(o.concluded_at).toLocaleDateString('pt-BR') : '—',
          ]),
        ];
      }

      if (selected === 'por_responsavel') {
        const { data: assets } = await getAssets({ pageSize: 9999 });
        const grouped = assets.reduce<Record<string, Asset[]>>((acc, a) => {
          const key = a.responsible_name ?? '(Sem responsável)';
          (acc[key] = acc[key] ?? []).push(a);
          return acc;
        }, {});
        rows = [['Responsável', 'Qtd Ativos', 'Valor Total', 'Valor Contábil Total']];
        Object.entries(grouped).forEach(([resp, list]) => {
          const vt = list.reduce((s, a) => s + Number(a.acquisition_value), 0);
          const vc = list.reduce((s, a) => s + Number(a.current_book_value ?? a.acquisition_value), 0);
          rows.push([resp, String(list.length), fmt(vt), fmt(vc)]);
        });
      }

      if (selected === 'por_departamento') {
        const { data: assets } = await getAssets({ pageSize: 9999 });
        const grouped = assets.reduce<Record<string, Asset[]>>((acc, a) => {
          const key = a.department_name ?? '(Sem departamento)';
          (acc[key] = acc[key] ?? []).push(a);
          return acc;
        }, {});
        rows = [['Departamento', 'Qtd Ativos', 'Valor Total', 'Valor Contábil Total']];
        Object.entries(grouped).forEach(([dept, list]) => {
          const vt = list.reduce((s, a) => s + Number(a.acquisition_value), 0);
          const vc = list.reduce((s, a) => s + Number(a.current_book_value ?? a.acquisition_value), 0);
          rows.push([dept, String(list.length), fmt(vt), fmt(vc)]);
        });
      }

      setPreview(rows);
    } finally { setLoading(false); }
  }

  function handleDownload() {
    if (!preview) return;
    downloadCsv(preview, `${reportLabel.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`);
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Relatórios</h1>
        <p className="text-slate-500 text-sm">Gere relatórios sob demanda e exporte em CSV</p>
      </div>

      {/* Report selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {REPORTS.map((r) => (
          <button key={r.id} onClick={() => { setSelected(r.id); setPreview(null); }}
            className={`text-left p-4 rounded-xl border transition-all ${selected === r.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${selected === r.id ? 'bg-blue-500' : 'bg-slate-100'}`}>
              <r.icon className={`w-4 h-4 ${selected === r.id ? 'text-white' : 'text-slate-500'}`} />
            </div>
            <p className={`text-sm font-semibold ${selected === r.id ? 'text-blue-700' : 'text-slate-700'}`}>{r.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{r.description}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={generateReport} disabled={loading}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          <FileBarChart className="w-4 h-4" /> {loading ? 'Gerando…' : 'Gerar Relatório'}
        </button>
        {preview && (
          <button onClick={handleDownload}
            className="flex items-center gap-2 border border-slate-200 text-slate-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">{reportLabel} — {preview.length - 1} registros</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {preview[0].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {preview.slice(1, 21).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2 text-slate-600 whitespace-nowrap text-xs">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 22 && (
              <p className="px-4 py-3 text-xs text-slate-400 border-t border-slate-50">Exibindo 20 de {preview.length - 1} registros. Exporte o CSV para ver todos.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

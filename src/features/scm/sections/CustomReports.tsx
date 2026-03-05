import { useState } from 'react';
import { FileText, Plus, Download, Clock, Star, Trash2, Play } from 'lucide-react';

interface Report {
  id: string;
  name: string;
  description: string;
  metrics: string[];
  format: 'PDF' | 'Excel' | 'CSV';
  schedule: string;
  lastRun: string;
  starred: boolean;
}

const REPORTS: Report[] = [
  { id: 'REP-001', name: 'Resumo Executivo Semanal',     description: 'KPIs de OTIF, custo/pedido e NPS para a diretoria',     metrics: ['OTIF', 'Custo/pedido', 'NPS', 'Volume'],       format: 'PDF',   schedule: 'Toda segunda, 08:00',    lastRun: '03/03/2026', starred: true  },
  { id: 'REP-002', name: 'Análise de Transportadoras',  description: 'SLA, avarias e custo por transportadora no período',     metrics: ['OTIF', 'Avaria', 'Custo/kg', 'NPS'],           format: 'Excel', schedule: 'Mensal — dia 5',         lastRun: '01/03/2026', starred: true  },
  { id: 'REP-003', name: 'Ocorrências Abertas',          description: 'Listagem de todas as ocorrências não resolvidas',        metrics: ['ID', 'Tipo', 'Carrier', 'Dias aberta'],        format: 'Excel', schedule: 'Diário — 07:00',         lastRun: '05/03/2026', starred: false },
  { id: 'REP-004', name: 'Custo por SKU',               description: 'Decomposição de custo logístico por categoria de produto', metrics: ['SKU', 'Custo/pedido', 'Volume', 'Região'],    format: 'Excel', schedule: 'Quinzenal',              lastRun: '01/03/2026', starred: false },
  { id: 'REP-005', name: 'Embarques do Período',        description: 'Listagem de todos os embarques com status detalhado',     metrics: ['Embarque', 'Carrier', 'Status', 'ETA'],        format: 'CSV',   schedule: 'Sob demanda',            lastRun: '05/03/2026', starred: false },
  { id: 'REP-006', name: 'Auditoria de Faturas',        description: 'Divergências entre valores cotados e cobrados',           metrics: ['Carrier', 'Fatura', 'Cotado', 'Cobrado', 'Diff'], format: 'Excel', schedule: 'Mensal — dia 1',      lastRun: '01/03/2026', starred: true  },
];

const FORMAT_BADGE: Record<string, string> = {
  'PDF':   'bg-red-50 text-red-700',
  'Excel': 'bg-green-50 text-green-700',
  'CSV':   'bg-slate-50 text-slate-600',
};

const METRICS_OPTIONS = ['OTIF', 'Custo/pedido', 'Custo/kg', 'NPS', 'Volume', 'Avaria', 'SKU', 'Região', 'Carrier', 'SLA', 'Lead Time', 'Capacidade armazém'];

export default function CustomReports() {
  const [filter, setFilter] = useState('Todos');
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);

  const displayed = REPORTS.filter((r) => filter === 'Favoritos' ? r.starred : true);

  function toggleMetric(m: string) {
    setSelectedMetrics((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Relatórios</h1>
          <p className="text-slate-500 text-sm mt-0.5">Relatórios customizáveis — PDF, Excel, CSV — com agendamento automático</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNew(!showNew)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Relatório
          </button>
        </div>
      </div>

      {/* New report builder */}
      {showNew && (
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Construtor de Relatório</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Nome do relatório</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Performance mensal da frota" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Formato</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option>Excel</option>
                <option>PDF</option>
                <option>CSV</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs text-slate-500 block mb-2">Métricas a incluir</label>
            <div className="flex flex-wrap gap-2">
              {METRICS_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => toggleMetric(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedMetrics.includes(m) ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
              Salvar e Executar
            </button>
            <button onClick={() => setShowNew(false)} className="text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {['Todos', 'Favoritos'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{f}</button>
        ))}
      </div>

      {/* Reports list */}
      <div className="space-y-3">
        {displayed.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm hover:border-slate-200 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-semibold text-slate-800">{r.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${FORMAT_BADGE[r.format]}`}>{r.format}</span>
                  {r.starred && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                </div>
                <p className="text-sm text-slate-500 mb-2">{r.description}</p>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {r.schedule}</span>
                  <span>Última execução: {r.lastRun}</span>
                  <span>Métricas: {r.metrics.join(', ')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button className="flex items-center gap-1.5 text-xs border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                  <Play className="w-3 h-3" />
                  Executar
                </button>
                <button className="flex items-center gap-1.5 text-xs border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                  <Download className="w-3 h-3" />
                  Baixar
                </button>
                <button className="text-xs text-red-400 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

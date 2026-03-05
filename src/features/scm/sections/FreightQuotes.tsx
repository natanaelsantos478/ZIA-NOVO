import { useState } from 'react';
import { Search, Plus, Filter, Download, Package, MapPin, Scale, DollarSign, Clock, Star, ChevronDown } from 'lucide-react';

interface Quote {
  id: string;
  origin: string;
  destination: string;
  weight: number;
  volume: number;
  carrier: string;
  service: string;
  price: number;
  deadline: number;
  reliability: number;
  status: 'Aprovada' | 'Pendente' | 'Recusada' | 'Expirada';
  createdAt: string;
}

const QUOTES: Quote[] = [
  { id: 'COT-4821', origin: 'São Paulo, SP',    destination: 'Rio de Janeiro, RJ', weight: 15.3, volume: 0.08, carrier: 'Jadlog',        service: 'Package',    price: 48.90,  deadline: 3, reliability: 91, status: 'Aprovada',  createdAt: '05/03/2026' },
  { id: 'COT-4820', origin: 'São Paulo, SP',    destination: 'Belo Horizonte, MG', weight: 32.0, volume: 0.24, carrier: 'Total Express', service: 'Rodoviário', price: 89.50,  deadline: 2, reliability: 96, status: 'Aprovada',  createdAt: '05/03/2026' },
  { id: 'COT-4819', origin: 'Campinas, SP',     destination: 'Curitiba, PR',       weight: 8.5,  volume: 0.06, carrier: 'Correios',      service: 'PAC',        price: 34.20,  deadline: 5, reliability: 88, status: 'Pendente',  createdAt: '04/03/2026' },
  { id: 'COT-4818', origin: 'São Paulo, SP',    destination: 'Fortaleza, CE',      weight: 120,  volume: 1.40, carrier: 'Braspress',     service: 'Rodoviário', price: 312.00, deadline: 7, reliability: 94, status: 'Pendente',  createdAt: '04/03/2026' },
  { id: 'COT-4817', origin: 'Rio de Janeiro, RJ', destination: 'Salvador, BA',    weight: 55.0, volume: 0.48, carrier: 'Sequoia',       service: 'Expresso',   price: 178.00, deadline: 4, reliability: 92, status: 'Recusada',  createdAt: '03/03/2026' },
  { id: 'COT-4816', origin: 'São Paulo, SP',    destination: 'Porto Alegre, RS',   weight: 200,  volume: 2.00, carrier: 'Frota Própria', service: 'Dedicado',   price: 520.00, deadline: 2, reliability: 99, status: 'Aprovada',  createdAt: '03/03/2026' },
  { id: 'COT-4815', origin: 'Guarulhos, SP',    destination: 'Goiânia, GO',        weight: 18.0, volume: 0.12, carrier: 'Jadlog',        service: 'Package',    price: 67.40,  deadline: 4, reliability: 91, status: 'Expirada',  createdAt: '01/03/2026' },
];

const STATUS_BADGE: Record<string, string> = {
  'Aprovada':  'bg-emerald-100 text-emerald-700',
  'Pendente':  'bg-amber-100 text-amber-700',
  'Recusada':  'bg-red-100 text-red-700',
  'Expirada':  'bg-slate-100 text-slate-500',
};

const CARRIERS = ['Todos', 'Correios', 'Jadlog', 'Total Express', 'Braspress', 'Sequoia', 'Frota Própria'];

interface SimulatorState {
  origin: string;
  destination: string;
  weight: string;
  volume: string;
}

interface SimResult {
  carrier: string;
  service: string;
  price: number;
  deadline: number;
  reliability: number;
}

const SIM_RESULTS: SimResult[] = [
  { carrier: 'Frota Própria',  service: 'Dedicado',      price: 280.00, deadline: 1, reliability: 99 },
  { carrier: 'Total Express',  service: 'Expresso',      price: 145.50, deadline: 2, reliability: 96 },
  { carrier: 'Jadlog',         service: 'Package',       price: 89.90,  deadline: 3, reliability: 91 },
  { carrier: 'Correios',       service: 'SEDEX',         price: 78.40,  deadline: 3, reliability: 88 },
  { carrier: 'Braspress',      service: 'Rodoviário',    price: 64.20,  deadline: 5, reliability: 94 },
  { carrier: 'Correios',       service: 'PAC',           price: 42.80,  deadline: 7, reliability: 88 },
];

export default function FreightQuotes() {
  const [search, setSearch] = useState('');
  const [carrier, setCarrier] = useState('Todos');
  const [showSimulator, setShowSimulator] = useState(false);
  const [simState, setSimState] = useState<SimulatorState>({ origin: '', destination: '', weight: '', volume: '' });
  const [simResults, setSimResults] = useState<SimResult[]>([]);

  const filtered = QUOTES.filter((q) => {
    const matchSearch = q.id.toLowerCase().includes(search.toLowerCase()) ||
      q.destination.toLowerCase().includes(search.toLowerCase()) ||
      q.carrier.toLowerCase().includes(search.toLowerCase());
    const matchCarrier = carrier === 'Todos' || q.carrier === carrier;
    return matchSearch && matchCarrier;
  });

  function simulate() {
    setSimResults(SIM_RESULTS);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cotação de Fretes</h1>
          <p className="text-slate-500 text-sm mt-0.5">Cotação automática com múltiplas transportadoras</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className="flex items-center gap-2 border border-emerald-300 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-colors"
          >
            <DollarSign className="w-4 h-4" />
            Simular Frete
          </button>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" />
            Nova Cotação
          </button>
        </div>
      </div>

      {/* Simulator */}
      {showSimulator && (
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Simulador de Frete</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Origem</label>
              <input
                value={simState.origin}
                onChange={(e) => setSimState({ ...simState, origin: e.target.value })}
                placeholder="São Paulo, SP"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Destino</label>
              <input
                value={simState.destination}
                onChange={(e) => setSimState({ ...simState, destination: e.target.value })}
                placeholder="Rio de Janeiro, RJ"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Peso (kg)</label>
              <input
                value={simState.weight}
                onChange={(e) => setSimState({ ...simState, weight: e.target.value })}
                placeholder="25"
                type="number"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Volume (m³)</label>
              <input
                value={simState.volume}
                onChange={(e) => setSimState({ ...simState, volume: e.target.value })}
                placeholder="0.12"
                type="number"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
          <button
            onClick={simulate}
            className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            Buscar Melhores Opções
          </button>

          {simResults.length > 0 && (
            <div className="mt-5 space-y-2">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Resultados — ordenado por custo-benefício</h3>
              {simResults.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${i === 0 ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    {i === 0 && <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">Recomendado</span>}
                    <span className="font-medium text-slate-800">{r.carrier}</span>
                    <span className="text-xs text-slate-500">{r.service}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-1 text-slate-600">
                      <Clock className="w-3.5 h-3.5" />
                      {r.deadline}d
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      {r.reliability}%
                    </div>
                    <span className="font-bold text-emerald-700 w-20 text-right">R$ {r.price.toFixed(2)}</span>
                    <button className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700 transition-colors">
                      Aprovar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ID, destino ou transportadora..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div className="relative">
          <select
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            className="appearance-none border border-slate-200 rounded-lg px-4 py-2 pr-8 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {CARRIERS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <button className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <Filter className="w-4 h-4" />
          Filtros
        </button>
        <button className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">ID</th>
              <th className="px-5 py-3 text-left">Origem → Destino</th>
              <th className="px-5 py-3 text-center">Peso / Vol.</th>
              <th className="px-5 py-3 text-left">Transportadora</th>
              <th className="px-5 py-3 text-center">Prazo</th>
              <th className="px-5 py-3 text-center">Confiab.</th>
              <th className="px-5 py-3 text-right">Valor</th>
              <th className="px-5 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((q) => (
              <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{q.id}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-700">{q.origin}</span>
                    <span className="text-slate-400">→</span>
                    <span className="font-medium text-slate-800">{q.destination}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <div className="text-xs text-slate-600">
                    <div className="flex items-center justify-center gap-1"><Scale className="w-3 h-3" /> {q.weight} kg</div>
                    <div className="flex items-center justify-center gap-1 mt-0.5"><Package className="w-3 h-3" /> {q.volume} m³</div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="font-medium text-slate-800">{q.carrier}</div>
                  <div className="text-xs text-slate-500">{q.service}</div>
                </td>
                <td className="px-5 py-3.5 text-center text-slate-600">{q.deadline}d</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`text-xs font-medium ${q.reliability >= 95 ? 'text-emerald-600' : q.reliability >= 90 ? 'text-amber-600' : 'text-red-600'}`}>
                    {q.reliability}%
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right font-bold text-slate-800">R$ {q.price.toFixed(2)}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[q.status]}`}>
                    {q.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <button className="text-xs text-emerald-600 hover:underline">Ver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-500">Nenhuma cotação encontrada.</div>
        )}
      </div>
    </div>
  );
}

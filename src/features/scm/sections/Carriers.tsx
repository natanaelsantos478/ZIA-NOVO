import { useState } from 'react';
import { Search, Plus, Users, CheckCircle2, Clock, AlertTriangle, FileText } from 'lucide-react';

type CarrierStatus = 'Homologado' | 'Em homologação' | 'Suspenso' | 'Inativo';

interface Carrier {
  id: string;
  name: string;
  cnpj: string;
  antt: string;
  type: 'Rodoviário' | 'Expresso' | 'Correios' | 'Aéreo' | 'Frota própria';
  regions: string[];
  status: CarrierStatus;
  insuranceExp: string;
  anttExp: string;
  contact: string;
  email: string;
  rating: number;
}

const CARRIERS: Carrier[] = [
  { id: 'CAR-001', name: 'Jadlog',         cnpj: '04.884.082/0001-34', antt: '008184-0', type: 'Expresso',    regions: ['Sul', 'Sudeste', 'Centro-Oeste'],       status: 'Homologado',    insuranceExp: '15/06/2026', anttExp: '31/12/2026', contact: 'Fernanda Ops',   email: 'ops@jadlog.com.br',      rating: 4.2 },
  { id: 'CAR-002', name: 'Total Express', cnpj: '60.542.454/0001-34', antt: '000212-0', type: 'Expresso',    regions: ['São Paulo', 'Grande SP'],                status: 'Homologado',    insuranceExp: '01/08/2026', anttExp: '31/12/2026', contact: 'Ricardo Alves',  email: 'comercial@totalexpress.com.br', rating: 4.7 },
  { id: 'CAR-003', name: 'Braspress',      cnpj: '48.740.351/0001-65', antt: '000041-0', type: 'Rodoviário',  regions: ['Nacional'],                             status: 'Homologado',    insuranceExp: '20/04/2026', anttExp: '31/12/2026', contact: 'Carlos Transporte', email: 'sp@braspress.com.br', rating: 4.5 },
  { id: 'CAR-004', name: 'Correios',       cnpj: '34.028.316/0001-03', antt: 'Isenção', type: 'Correios',    regions: ['Nacional'],                             status: 'Homologado',    insuranceExp: 'N/A',        anttExp: 'N/A',        contact: 'Atendimento',    email: 'empresas@correios.com.br', rating: 3.8 },
  { id: 'CAR-005', name: 'Sequoia',        cnpj: '04.162.213/0001-22', antt: '009912-0', type: 'Expresso',    regions: ['Sudeste', 'Sul', 'Nordeste'],           status: 'Homologado',    insuranceExp: '10/09/2026', anttExp: '31/12/2026', contact: 'Patrícia Ops',   email: 'sp@sequoia.com.br',  rating: 4.1 },
  { id: 'CAR-006', name: 'Rapidão Cometa', cnpj: '01.895.228/0001-40', antt: '001243-0', type: 'Rodoviário',  regions: ['Nordeste', 'Norte'],                   status: 'Em homologação', insuranceExp: '—',          anttExp: '—',         contact: 'Julio Rocha',    email: 'comercial@rapidao.com.br', rating: 0 },
  { id: 'CAR-007', name: 'TransBrasil',    cnpj: '12.345.678/0001-00', antt: 'Vencida', type: 'Rodoviário',  regions: ['Sul'],                                  status: 'Suspenso',      insuranceExp: '01/01/2025', anttExp: '01/01/2025', contact: 'Marco Reyes',    email: 'contato@transbrasil.com', rating: 2.1 },
];

const STATUS_BADGE: Record<CarrierStatus, string> = {
  'Homologado':     'bg-emerald-100 text-emerald-700',
  'Em homologação': 'bg-amber-100 text-amber-700',
  'Suspenso':       'bg-red-100 text-red-700',
  'Inativo':        'bg-slate-100 text-slate-500',
};

export default function Carriers() {
  const [search, setSearch] = useState('');

  const filtered = CARRIERS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.cnpj.includes(search) ||
    c.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cadastro de Transportadoras</h1>
          <p className="text-slate-500 text-sm mt-0.5">Documentação, ANTT, seguro, avaliações e homologação</p>
        </div>
        <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
          <Plus className="w-4 h-4" />
          Cadastrar Transportadora
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Homologadas',    value: CARRIERS.filter((c) => c.status === 'Homologado').length,     icon: CheckCircle2,  color: 'emerald' },
          { label: 'Em Homologação', value: CARRIERS.filter((c) => c.status === 'Em homologação').length, icon: Clock,         color: 'amber'   },
          { label: 'Suspensas',      value: CARRIERS.filter((c) => c.status === 'Suspenso').length,       icon: AlertTriangle, color: 'red'     },
          { label: 'Total',          value: CARRIERS.length,                                               icon: Users,         color: 'blue'    },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 bg-${s.color}-50`}>
                <Icon className={`w-4 h-4 text-${s.color}-600`} />
              </div>
              <div className="text-2xl font-bold text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar transportadora, CNPJ ou tipo..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Transportadora</th>
              <th className="px-5 py-3 text-center">Tipo</th>
              <th className="px-5 py-3 text-left">Regiões</th>
              <th className="px-5 py-3 text-center">Seguro</th>
              <th className="px-5 py-3 text-center">ANTT</th>
              <th className="px-5 py-3 text-left">Contato</th>
              <th className="px-5 py-3 text-center">Rating</th>
              <th className="px-5 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                <td className="px-5 py-3.5">
                  <div className="font-medium text-slate-800">{c.name}</div>
                  <div className="font-mono text-xs text-slate-500">{c.cnpj}</div>
                </td>
                <td className="px-5 py-3.5 text-center text-slate-600 text-xs">{c.type}</td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {c.regions.map((r) => (
                      <span key={r} className="px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-600">{r}</span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-center text-xs text-slate-500">{c.insuranceExp}</td>
                <td className="px-5 py-3.5 text-center text-xs text-slate-500">{c.anttExp}</td>
                <td className="px-5 py-3.5">
                  <div className="text-slate-700 text-sm">{c.contact}</div>
                  <div className="text-xs text-slate-400">{c.email}</div>
                </td>
                <td className="px-5 py-3.5 text-center">
                  {c.rating > 0 ? (
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-amber-400">★</span>
                      <span className="text-sm font-bold text-slate-700">{c.rating.toFixed(1)}</span>
                    </div>
                  ) : <span className="text-slate-400 text-xs">N/A</span>}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[c.status]}`}>{c.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

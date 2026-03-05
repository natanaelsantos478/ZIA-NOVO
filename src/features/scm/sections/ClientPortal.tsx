import { useState } from 'react';
import { Search, UserCheck, Package, Truck, CheckCircle2, Plus } from 'lucide-react';

interface ClientAccount {
  id: string;
  name: string;
  cnpj: string;
  plan: 'Starter' | 'Growth' | 'Pro' | 'Enterprise';
  ordersThisMonth: number;
  openOrders: number;
  onTimeRate: number;
  lastAccess: string;
  contact: string;
  active: boolean;
}

const CLIENTS: ClientAccount[] = [
  { id: 'CLI-001', name: 'TechCorp Ltda',           cnpj: '11.111.111/0001-11', plan: 'Enterprise', ordersThisMonth: 312, openOrders: 28, onTimeRate: 97, lastAccess: '05/03 13:45', contact: 'Ana Lima',      active: true  },
  { id: 'CLI-002', name: 'Distribuidora Norte',      cnpj: '22.222.222/0001-22', plan: 'Pro',        ordersThisMonth: 184, openOrders: 15, onTimeRate: 94, lastAccess: '05/03 10:20', contact: 'Pedro Gomes',   active: true  },
  { id: 'CLI-003', name: 'Atacado Regional',         cnpj: '33.333.333/0001-33', plan: 'Growth',     ordersThisMonth: 98,  openOrders: 8,  onTimeRate: 91, lastAccess: '04/03 16:00', contact: 'Maria Silva',   active: true  },
  { id: 'CLI-004', name: 'Varejo Express',           cnpj: '44.444.444/0001-44', plan: 'Pro',        ordersThisMonth: 445, openOrders: 42, onTimeRate: 95, lastAccess: '05/03 09:00', contact: 'Lucas Ribeiro', active: true  },
  { id: 'CLI-005', name: 'MedFarma Distribuidora',   cnpj: '55.555.555/0001-55', plan: 'Enterprise', ordersThisMonth: 220, openOrders: 18, onTimeRate: 98, lastAccess: '05/03 11:30', contact: 'Carla Fonseca', active: true  },
  { id: 'CLI-006', name: 'Importadora Delta',        cnpj: '66.666.666/0001-66', plan: 'Starter',    ordersThisMonth: 12,  openOrders: 2,  onTimeRate: 75, lastAccess: '01/03 14:00', contact: 'Fábio Santos',  active: false },
];

const PLAN_BADGE: Record<string, string> = {
  'Starter':    'bg-slate-100 text-slate-600',
  'Growth':     'bg-blue-100 text-blue-700',
  'Pro':        'bg-purple-100 text-purple-700',
  'Enterprise': 'bg-amber-100 text-amber-700',
};

const PORTAL_FEATURES = [
  'Visão dos pedidos em tempo real',
  'Solicitação de coleta diretamente pelo portal',
  'Relatórios de performance personalizados',
  'Consulta de tabelas de frete contratadas',
  'Abertura de ocorrências',
  'Download de documentos fiscais',
];

export default function ClientPortal() {
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientAccount | null>(null);

  const filtered = CLIENTS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.cnpj.includes(search)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Portal Embarcador (B2B)</h1>
          <p className="text-slate-500 text-sm mt-0.5">Cada cliente vê apenas seus pedidos e relatórios — isolamento total</p>
        </div>
        <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Clientes Ativos',   value: CLIENTS.filter((c) => c.active).length, icon: UserCheck,    color: 'emerald' },
          { label: 'Pedidos Abertos',   value: CLIENTS.reduce((s, c) => s + c.openOrders, 0), icon: Package, color: 'blue' },
          { label: 'Em Trânsito',       value: 284, icon: Truck,        color: 'purple'  },
          { label: 'OTIF Médio',        value: `${Math.round(CLIENTS.filter((c) => c.active).reduce((s, c) => s + c.onTimeRate, 0) / CLIENTS.filter((c) => c.active).length)}%`, icon: CheckCircle2, color: 'teal' },
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
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente ou CNPJ..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Client list */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left">Cliente</th>
                <th className="px-5 py-3 text-center">Plano</th>
                <th className="px-5 py-3 text-center">Pedidos/mês</th>
                <th className="px-5 py-3 text-center">Em Aberto</th>
                <th className="px-5 py-3 text-center">OTIF</th>
                <th className="px-5 py-3 text-center">Último Acesso</th>
                <th className="px-5 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((client) => (
                <tr key={client.id} className={`hover:bg-slate-50 transition-colors cursor-pointer ${!client.active ? 'opacity-60' : ''}`} onClick={() => setSelectedClient(client)}>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-slate-800">{client.name}</div>
                    <div className="text-xs text-slate-500">{client.cnpj}</div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${PLAN_BADGE[client.plan]}`}>{client.plan}</span>
                  </td>
                  <td className="px-5 py-3.5 text-center font-bold text-slate-700">{client.ordersThisMonth}</td>
                  <td className="px-5 py-3.5 text-center text-slate-600">{client.openOrders}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`font-bold text-sm ${client.onTimeRate >= 95 ? 'text-emerald-600' : client.onTimeRate >= 88 ? 'text-amber-600' : 'text-red-600'}`}>{client.onTimeRate}%</span>
                  </td>
                  <td className="px-5 py-3.5 text-center text-xs text-slate-500">{client.lastAccess}</td>
                  <td className="px-5 py-3.5 text-center">
                    <button className="text-xs text-emerald-600 hover:underline">Acessar Portal</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Portal features */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-3">Funcionalidades do Portal</h3>
            <div className="space-y-2">
              {PORTAL_FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-xs text-slate-600">{f}</span>
                </div>
              ))}
            </div>
          </div>

          {selectedClient && (
            <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
              <h3 className="font-semibold text-slate-800 mb-2">{selectedClient.name}</h3>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div>Contato: <span className="font-medium">{selectedClient.contact}</span></div>
                <div>Plano: <span className="font-medium">{selectedClient.plan}</span></div>
                <div>Último acesso: <span className="font-medium">{selectedClient.lastAccess}</span></div>
              </div>
              <button className="mt-3 w-full bg-emerald-600 text-white py-2 rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors">
                Simular Visão do Cliente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

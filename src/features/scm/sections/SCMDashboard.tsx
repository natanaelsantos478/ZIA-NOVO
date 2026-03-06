import { useEffect, useState } from 'react';
import { Truck, Users, Route, Package, RefreshCw, AlertTriangle } from 'lucide-react';
import { fetchVehicles, fetchDrivers, fetchRoutes, fetchShipments } from '../../../lib/scm';

interface KPI {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  color: string;
}

export default function SCMDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<KPI[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [vehicles, drivers, routes, shipments] = await Promise.all([
          fetchVehicles(),
          fetchDrivers(),
          fetchRoutes(),
          fetchShipments(),
        ]);

        setKpis([
          {
            label: 'Veículos',
            value: vehicles.length,
            sub: `${vehicles.filter(v => v.status === 'available').length} disponíveis`,
            icon: Truck,
            color: 'emerald',
          },
          {
            label: 'Motoristas',
            value: drivers.length,
            sub: `${drivers.filter(d => d.status === 'active').length} ativos`,
            icon: Users,
            color: 'blue',
          },
          {
            label: 'Rotas',
            value: routes.length,
            sub: `${routes.filter(r => r.status === 'active').length} em andamento`,
            icon: Route,
            color: 'purple',
          },
          {
            label: 'Embarques',
            value: shipments.length,
            sub: `${shipments.filter(s => s.status === 'in_transit').length} em trânsito`,
            icon: Package,
            color: 'amber',
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
        <span className="ml-2 text-slate-500">Carregando painel...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-red-500">
        <AlertTriangle className="w-5 h-5" />
        <span>{error}</span>
      </div>
    );
  }

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    blue:    'bg-blue-50 text-blue-600 border-blue-200',
    purple:  'bg-purple-50 text-purple-600 border-purple-200',
    amber:   'bg-amber-50 text-amber-600 border-amber-200',
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">Painel SCM</h2>
        <p className="text-sm text-slate-500">Visão geral da operação logística</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className={`rounded-xl border p-4 ${colorMap[kpi.color]}`}>
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{kpi.label}</span>
            </div>
            <div className="text-3xl font-black">{kpi.value}</div>
            <div className="text-xs mt-1 opacity-70">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {kpis.every(k => k.value === 0) && (
        <div className="mt-8 text-center text-slate-400 text-sm">
          Nenhum dado cadastrado ainda. Adicione veículos, motoristas e rotas para visualizar o painel.
        </div>
      )}
    </div>
  );
}

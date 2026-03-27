// SCM Dashboard — KPIs em tempo real de todas as entidades logísticas
import { useEffect, useState } from 'react';
import {
  Truck, Route, Package, RefreshCw, Building, ArrowRightLeft,
  Leaf, Thermometer, Plane, AlertTriangle, TrendingUp, CheckCircle2,
} from 'lucide-react';
import { getScmDashboard, type ScmDashboard } from '../../../lib/scm';

// ── KPI Card ──────────────────────────────────────────────────────────────────
interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  color: string;
  alert?: boolean;
  onClick?: () => void;
}

function KpiCard({ icon, label, value, sub, color, alert, onClick }: KpiCardProps) {
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border text-left w-full transition-all hover:shadow-md ${
        alert && value > 0 ? 'border-red-200 bg-red-50' : 'border-slate-100 hover:border-emerald-200'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
        {alert && value > 0 && (
          <span className="w-2 h-2 rounded-full bg-red-500 mt-1" />
        )}
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm font-medium text-slate-700 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </button>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-slate-100 mb-3" />
          <div className="h-7 w-12 bg-slate-100 rounded mb-2" />
          <div className="h-4 w-24 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState<ScmDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const d = await getScmDashboard();
      setData(d);
      setLastUpdate(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const kpis = data ? [
    {
      icon: <Truck className="w-5 h-5 text-emerald-600" />,
      label: 'Veículos em Rota',
      value: data.veiculos_em_rota,
      sub: `${data.veiculos_total} total na frota`,
      color: 'bg-emerald-50',
    },
    {
      icon: <Route className="w-5 h-5 text-blue-600" />,
      label: 'Rotas Ativas',
      value: data.rotas_ativas,
      sub: 'Roteiros em operação',
      color: 'bg-blue-50',
    },
    {
      icon: <Package className="w-5 h-5 text-violet-600" />,
      label: 'Embarques em Trânsito',
      value: data.embarques_em_transito,
      sub: `${data.embarques_entregues_mes} entregues este mês`,
      color: 'bg-violet-50',
    },
    {
      icon: <Building className="w-5 h-5 text-amber-600" />,
      label: 'Docas Livres',
      value: data.docas_livres,
      sub: 'WMS disponível',
      color: 'bg-amber-50',
    },
    {
      icon: <RefreshCw className="w-5 h-5 text-orange-600" />,
      label: 'Devoluções Pendentes',
      value: data.devolucoes_pendentes,
      sub: 'Logística reversa',
      color: 'bg-orange-50',
      alert: true,
    },
    {
      icon: <ArrowRightLeft className="w-5 h-5 text-teal-600" />,
      label: 'Auditorias Pendentes',
      value: data.auditorias_pendentes,
      sub: 'Conferência de fretes',
      color: 'bg-teal-50',
      alert: true,
    },
    {
      icon: <Thermometer className="w-5 h-5 text-red-600" />,
      label: 'Alertas Cold Chain',
      value: data.alertas_cold_chain,
      sub: 'Temperatura fora do range',
      color: 'bg-red-50',
      alert: true,
    },
    {
      icon: <Plane className="w-5 h-5 text-sky-600" />,
      label: 'Drones em Voo',
      value: data.drones_em_voo,
      sub: 'Missões ativas',
      color: 'bg-sky-50',
    },
    {
      icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
      label: 'Entregues no Mês',
      value: data.embarques_entregues_mes,
      sub: 'Entregas concluídas',
      color: 'bg-green-50',
    },
    {
      icon: <Leaf className="w-5 h-5 text-lime-600" />,
      label: 'Métricas ESG',
      value: data.rotas_ativas,
      sub: 'Sustentabilidade ativa',
      color: 'bg-lime-50',
    },
  ] : [];

  const totalAlertas = data
    ? data.devolucoes_pendentes + data.auditorias_pendentes + data.alertas_cold_chain
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard SCM</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Visão geral de Logística & Supply Chain
            {lastUpdate && (
              <span className="ml-2 text-slate-400">
                · Atualizado às {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Alertas banner */}
      {!loading && totalAlertas > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            <strong>{totalAlertas} {totalAlertas === 1 ? 'item requer' : 'itens requerem'} atenção</strong>
            {' '}— devoluções pendentes, auditorias de frete ou alertas de temperatura.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* KPIs */}
      {loading ? (
        <Skeleton />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      )}

      {/* Status operacional resumido */}
      {!loading && data && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-800">Status Operacional</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatusBar label="Frota Ativa" value={data.veiculos_em_rota} total={Math.max(data.veiculos_total, 1)} color="bg-emerald-500" />
            <StatusBar label="Embarques OK" value={data.embarques_entregues_mes} total={Math.max(data.embarques_em_transito + data.embarques_entregues_mes, 1)} color="bg-blue-500" />
            <StatusBar label="Cold Chain OK" value={Math.max(0, 10 - data.alertas_cold_chain)} total={10} color="bg-teal-500" />
            <StatusBar label="Docas Livres" value={data.docas_livres} total={Math.max(data.docas_livres + 2, 1)} color="bg-amber-500" />
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = Math.round((value / total) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1.5">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-400 mt-1">{value} / {total}</p>
    </div>
  );
}

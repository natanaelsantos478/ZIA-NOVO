import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Umbrella, AlertTriangle, CheckCircle, Clock, Sparkles,
  Plus, Search, MoreHorizontal, Calendar, DollarSign,
} from 'lucide-react';

type VacationStatus =
  | 'Período Aquisitivo'
  | 'Disponível para Gozo'
  | 'Em Gozo'
  | 'Vencendo em 30d'
  | 'Vencendo em 60d'
  | 'Vencendo em 90d'
  | 'Vendida (Abono)'
  | 'Encerrada';

interface VacationRecord {
  id: string;
  employee: string;
  dept: string;
  admissionDate: string;
  acquisitionStart: string;
  acquisitionEnd: string;
  concessionDeadline: string;
  daysAvailable: number;
  daysSold: number;
  daysScheduled: number;
  startDate?: string;
  endDate?: string;
  status: VacationStatus;
  thirdSalary: number;
}



const STATUS_CONFIG: Record<VacationStatus, { color: string; bg: string; icon: React.ElementType }> = {
  'Período Aquisitivo':   { color: 'text-slate-600',   bg: 'bg-slate-100',    icon: Clock        },
  'Disponível para Gozo': { color: 'text-blue-700',    bg: 'bg-blue-100',     icon: Umbrella     },
  'Em Gozo':             { color: 'text-green-700',   bg: 'bg-green-100',    icon: CheckCircle  },
  'Vencendo em 30d':     { color: 'text-rose-700',    bg: 'bg-rose-100',     icon: AlertTriangle },
  'Vencendo em 60d':     { color: 'text-amber-700',   bg: 'bg-amber-100',    icon: AlertTriangle },
  'Vencendo em 90d':     { color: 'text-yellow-700',  bg: 'bg-yellow-100',   icon: AlertTriangle },
  'Vendida (Abono)':     { color: 'text-purple-700',  bg: 'bg-purple-100',   icon: DollarSign   },
  'Encerrada':           { color: 'text-slate-500',   bg: 'bg-slate-100',    icon: CheckCircle  },
};

const ZIA_SUGGESTIONS = [
  {
    employee: 'Carlos Eduardo Lima',
    suggestion: 'Período sugerido: 10/03 – 08/04 (30 dias). Menor impacto: equipe de TI tem cobertura de 4 devs. Evitar fevereiro (sprints críticos).',
    savings: 'Custo adicional: R$ 0 (sem HE de substituição)',
  },
  {
    employee: 'Rafael Nunes',
    suggestion: 'Período sugerido: 01/04 – 30/04. Mês com menor demanda de BI (relatórios trimestrais concluídos em março).',
    savings: 'Custo adicional: R$ 1.200 (analista backup temporário)',
  },
  {
    employee: 'Guilherme Martins',
    suggestion: 'URGENTE: férias vencem em 02/03. Programar imediatamente. Período sugerido: 03/03 – 01/04 para evitar multa trabalhista.',
    savings: 'Risco: multa de 1 salário + acréscimo de 50% se não programado',
  },
];

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Vacations() {
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('Todos');
  const [activeTab, setTab]   = useState('list');
  const [vacations, setVacations] = useState<VacationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVacations = async () => {
    try {
      const { data, error } = await supabase
        .from('vacations')
        .select(`
          *,
          employees (
            name,
            department
          )
        `);

      if (error) throw error;

      const mappedData: VacationRecord[] = (data || []).map((v: any) => {
        // Calculate dynamic status based on concession_deadline
        let status = v.status || 'Disponível para Gozo';
        if (v.concession_deadline) {
          const deadline = new Date(v.concession_deadline);
          const today = new Date();
          const diffTime = deadline.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 30 && diffDays > 0) status = 'Vencendo em 30d';
          else if (diffDays <= 60 && diffDays > 30) status = 'Vencendo em 60d';
          else if (diffDays <= 90 && diffDays > 60) status = 'Vencendo em 90d';
        }

        return {
          id: v.id,
          employee: v.employees?.name || 'Desconhecido',
          dept: v.employees?.department || 'Desconhecido',
          admissionDate: v.admission_date ? new Date(v.admission_date).toLocaleDateString('pt-BR') : '',
          acquisitionStart: v.acquisition_start ? new Date(v.acquisition_start).toLocaleDateString('pt-BR') : '',
          acquisitionEnd: v.acquisition_end ? new Date(v.acquisition_end).toLocaleDateString('pt-BR') : '',
          concessionDeadline: v.concession_deadline ? new Date(v.concession_deadline).toLocaleDateString('pt-BR') : '',
          daysAvailable: v.days_available || 0,
          daysSold: v.days_sold || 0,
          daysScheduled: v.days_scheduled || 0,
          startDate: v.start_date ? new Date(v.start_date).toLocaleDateString('pt-BR') : undefined,
          endDate: v.end_date ? new Date(v.end_date).toLocaleDateString('pt-BR') : undefined,
          status: status as VacationStatus,
          thirdSalary: v.third_salary || 0,
        };
      });

      setVacations(mappedData);
    } catch (err) {
      console.error('Error fetching vacations:', err);
      setVacations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVacations();
  }, []);

  const expiring30 = vacations.filter((r) => r.status === 'Vencendo em 30d').length;
  const expiring60 = vacations.filter((r) => r.status === 'Vencendo em 60d').length;
  const onVacation = vacations.filter((r) => r.status === 'Em Gozo').length;
  const available  = vacations.filter((r) => r.status === 'Disponível para Gozo').length;

  const filtered = vacations.filter((r) => {
    const matchSearch = r.employee.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'Todos' || r.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Férias</h1>
          <p className="text-slate-500 text-sm mt-1">Períodos aquisitivos/concessivos, alertas de vencimento, cálculo de terço e sugestões ZIA</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
          <Plus className="w-4 h-4" /> Programar Férias
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Em Gozo',           value: onVacation, color: 'text-green-600 bg-green-50',  icon: Umbrella     },
          { label: 'Disponíveis',       value: available,  color: 'text-blue-600 bg-blue-50',    icon: Calendar     },
          { label: 'Vencendo em 30d',   value: expiring30, color: 'text-rose-600 bg-rose-50',    icon: AlertTriangle },
          { label: 'Vencendo em 60d',   value: expiring60, color: 'text-amber-600 bg-amber-50',  icon: AlertTriangle },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500">{s.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Alert banners */}
      {expiring30 > 0 && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl px-5 py-3 mb-4">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <p className="text-sm text-rose-800">
            <span className="font-semibold">{expiring30} colaborador(es)</span> com férias vencendo em até 30 dias. Risco de infração trabalhista — ação imediata necessária.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex border-b border-slate-100 px-6 pt-4 gap-6">
          {[
            { id: 'list', label: 'Controle de Períodos' },
            { id: 'zia',  label: 'ZIA – Sugestões de Período' },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setTab(tab.id)}
              className={`pb-3 text-sm font-semibold transition-all border-b-2 -mb-px flex items-center gap-1.5 ${
                activeTab === tab.id ? 'text-pink-600 border-pink-600' : 'text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              {tab.id === 'zia' && <Sparkles className="w-3.5 h-3.5" />}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'list' && (
            <div>
              {/* Filters */}
              <div className="flex items-center gap-3 mb-5">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Buscar colaborador..." value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 w-56"
                  />
                </div>
                <div className="flex gap-1.5">
                  {['Todos', 'Disponível para Gozo', 'Em Gozo', 'Vencendo em 30d', 'Período Aquisitivo'].map((f) => (
                    <button key={f} onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                        filter === f ? 'bg-pink-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Colaborador', 'Período Aquisitivo', 'Prazo Concessão', 'Dias Disp.', 'Abono (Vendido)', 'Programado', 'Terço Constitucional', 'Status'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                          Carregando férias...
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                          Nenhum registro encontrado.
                        </td>
                      </tr>
                    ) : filtered.map((r) => {
                      const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG['Disponível para Gozo'];
                      const Icon = cfg.icon;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800 text-sm">{r.employee}</p>
                            <p className="text-xs text-slate-400">{r.dept}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                            {r.acquisitionStart} → {r.acquisitionEnd}
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            <span className={`font-semibold ${r.status.includes('Vencendo') ? 'text-rose-600' : 'text-slate-600'}`}>
                              {r.concessionDeadline}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-slate-800">{r.daysAvailable || '—'}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{r.daysSold > 0 ? `${r.daysSold}d` : '—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                            {r.startDate ? `${r.startDate} – ${r.endDate}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-green-700">
                            {r.thirdSalary > 0 ? fmt(r.thirdSalary) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.color}`}>
                              <Icon className="w-3 h-3" />{r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'zia' && (
            <div>
              {/* ZIA intro */}
              <div className="flex items-center gap-3 bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 rounded-xl p-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 text-sm">ZIA – Sugestão de Melhores Períodos</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Baseado em demanda histórica, absenteísmo, escalas e vencimentos. Considera cobertura mínima por setor.
                  </p>
                </div>
                <button className="px-3 py-2 text-sm font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700 flex items-center gap-1.5 shrink-0">
                  <Sparkles className="w-3.5 h-3.5" /> Reanalisar
                </button>
              </div>

              <div className="space-y-4">
                {ZIA_SUGGESTIONS.map((s, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-slate-800">{s.employee}</p>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-pink-400" />
                          Sugestão gerada por ZIA
                        </p>
                      </div>
                      <button className="px-3 py-1.5 text-xs font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700">
                        Programar
                      </button>
                    </div>
                    <p className="text-sm text-slate-700 mb-3 leading-relaxed">{s.suggestion}</p>
                    <div className={`flex items-center gap-2 text-xs font-medium rounded-lg px-3 py-2 ${
                      s.savings.includes('URGENTE') || s.savings.includes('multa') || s.savings.includes('Risco')
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-green-50 text-green-700'
                    }`}>
                      <DollarSign className="w-3.5 h-3.5 shrink-0" />
                      {s.savings}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

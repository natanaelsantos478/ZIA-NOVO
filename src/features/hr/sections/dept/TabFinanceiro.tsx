import { useState } from 'react';
import { Plus, RefreshCw, TrendingDown, TrendingUp, DollarSign, X } from 'lucide-react';
import type { DeptRow } from '../OrgChart';

type SubTab = 'pessoal' | 'direto' | 'indireto';

interface DirectCost {
  id: string; description: string; category: string;
  amount: number; type: 'direto' | 'indireto'; date: string; origin: string;
}

const PERSONNEL = [
  { name: 'Ana Beatriz Souza',   role: 'Engenheira Sênior',    salary: 12500, bonus: 1500, benefits: 1200, total: 15200 },
  { name: 'Carlos Eduardo Lima', role: 'Analista Pleno',       salary: 7800,  bonus: 500,  benefits: 980,  total: 9280  },
  { name: 'Fernanda Rocha',      role: 'Tech Lead',            salary: 15000, bonus: 2500, benefits: 1400, total: 18900 },
  { name: 'Guilherme Martins',   role: 'Dev Junior',           salary: 5200,  bonus: 0,    benefits: 780,  total: 5980  },
  { name: 'Isabela Ferreira',    role: 'Product Owner (PJ)',   salary: 18000, bonus: 0,    benefits: 0,    total: 18000 },
  { name: 'Leonardo Carvalho',   role: 'DevOps Engineer',      salary: 11000, bonus: 800,  benefits: 1100, total: 12900 },
];

const INDIRECT_ERP: DirectCost[] = [
  { id: 'e1', description: 'Licença SaaS — GitHub Enterprise', category: 'Tecnologia', amount: 4200, type: 'indireto', date: '2025-01-01', origin: 'ERP Automático' },
  { id: 'e2', description: 'Servidor AWS us-east-1',           category: 'Infraestrutura', amount: 8750, type: 'indireto', date: '2025-01-05', origin: 'ERP Automático' },
  { id: 'e3', description: 'Licença Jira + Confluence',        category: 'Tecnologia', amount: 1850, type: 'indireto', date: '2025-01-01', origin: 'ERP Automático' },
  { id: 'e4', description: 'Seguro coletivo TI',               category: 'Seguros',    amount: 3200, type: 'indireto', date: '2025-01-10', origin: 'ERP Automático' },
  { id: 'e5', description: 'Rateio de Telecom',                category: 'Telecom',    amount: 920,  type: 'indireto', date: '2025-01-15', origin: 'ERP Automático' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Tecnologia:      'bg-blue-100 text-blue-700',
  Infraestrutura:  'bg-amber-100 text-amber-700',
  Seguros:         'bg-purple-100 text-purple-700',
  Telecom:         'bg-teal-100 text-teal-700',
  Treinamento:     'bg-green-100 text-green-700',
  Equipamentos:    'bg-rose-100 text-rose-700',
  Outros:          'bg-slate-100 text-slate-600',
};

function currency(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function KpiCard({ label, value, sub, trend, up }: {
  label: string; value: string; sub: string; trend?: string; up?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <p className="text-xs text-slate-500 mb-2">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-slate-400">{sub}</p>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${up ? 'text-red-500' : 'text-green-500'}`}>
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {trend}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Add Direct Cost Modal ────────────────────────────────────────────────── */
function AddCostModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (c: DirectCost) => void;
}) {
  const [form, setForm] = useState({
    description: '', category: 'Tecnologia', amount: '', type: 'direto' as 'direto' | 'indireto', date: '',
  });
  const set = (p: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...p }));
  const INPUT = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Lançar Custo</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição *</label>
            <input type="text" value={form.description} onChange={(e) => set({ description: e.target.value })} className={INPUT} placeholder="Ex: Treinamento AWS" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Categoria</label>
              <select value={form.category} onChange={(e) => set({ category: e.target.value })} className={INPUT}>
                {Object.keys(CATEGORY_COLORS).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo</label>
              <select value={form.type} onChange={(e) => set({ type: e.target.value as 'direto' | 'indireto' })} className={INPUT}>
                <option value="direto">Custo Direto</option>
                <option value="indireto">Custo Indireto</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Valor (R$) *</label>
              <input type="number" value={form.amount} onChange={(e) => set({ amount: e.target.value })} className={INPUT} placeholder="0,00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Competência *</label>
              <input type="month" value={form.date} onChange={(e) => set({ date: e.target.value })} className={INPUT} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium">Cancelar</button>
          <button
            onClick={() => {
              if (!form.description || !form.amount || !form.date) return;
              onAdd({ id: Date.now().toString(), description: form.description, category: form.category, amount: Number(form.amount), type: form.type, date: form.date, origin: 'Manual' });
              onClose();
            }}
            className="px-5 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium"
          >Lançar</button>
        </div>
      </div>
    </div>
  );
}

export default function TabFinanceiro({ dept: _dept }: { dept: DeptRow }) {
  const [sub, setSub] = useState<SubTab>('pessoal');
  const [showAdd, setShowAdd] = useState(false);
  const [directCosts, setDirectCosts] = useState<DirectCost[]>([
    { id: 'd1', description: 'Treinamento Cloud AWS',    category: 'Treinamento',  amount: 3500, type: 'direto', date: '2025-01', origin: 'Manual' },
    { id: 'd2', description: 'Equipamentos notebooks x2',category: 'Equipamentos', amount: 9800, type: 'direto', date: '2025-01', origin: 'Manual' },
    { id: 'd3', description: 'Consultoria segurança',    category: 'Outros',       amount: 5000, type: 'direto', date: '2025-01', origin: 'Manual' },
  ]);

  const totalPessoal = PERSONNEL.reduce((s, p) => s + p.total, 0);
  const totalDireto  = directCosts.filter((c) => c.type === 'direto').reduce((s, c) => s + c.amount, 0);
  const totalIndireto= INDIRECT_ERP.reduce((s, c) => s + c.amount, 0);
  const totalGeral   = totalPessoal + totalDireto + totalIndireto;

  return (
    <div>
      {showAdd && <AddCostModal onClose={() => setShowAdd(false)} onAdd={(c) => setDirectCosts((prev) => [...prev, c])} />}

      {/* Sub-tabs */}
      <div className="bg-white border-b border-slate-200 px-8">
        <div className="flex gap-0">
          {[
            { id: 'pessoal',  label: 'Custo de Pessoal' },
            { id: 'direto',   label: 'Custos Diretos'   },
            { id: 'indireto', label: 'Custos Indiretos (ERP)' },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setSub(id as SubTab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${sub === id ? 'border-pink-500 text-pink-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* KPIs always visible */}
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Custo Total Departamento" value={currency(totalGeral)}    sub="Acumulado mensal" trend="+4,2%" up />
          <KpiCard label="Custo de Pessoal"         value={currency(totalPessoal)} sub={`${PERSONNEL.length} colaboradores`} />
          <KpiCard label="Custos Diretos"           value={currency(totalDireto)}  sub="Lançados manualmente" />
          <KpiCard label="Custos Indiretos (ERP)"  value={currency(totalIndireto)} sub="Sincronizado automaticamente" />
        </div>

        {/* Pessoal */}
        {sub === 'pessoal' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700">Folha de Pessoal — Janeiro 2025</h3>
              <span className="text-sm font-bold text-pink-600">{currency(totalPessoal)}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Colaborador','Cargo','Salário Base','Gratificações','Benefícios','Total'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PERSONNEL.map((p) => (
                  <tr key={p.name} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-medium text-slate-800">{p.name}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{p.role}</td>
                    <td className="px-6 py-4 text-slate-700">{currency(p.salary)}</td>
                    <td className="px-6 py-4 text-slate-700">{currency(p.bonus)}</td>
                    <td className="px-6 py-4 text-slate-700">{currency(p.benefits)}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{currency(p.total)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={5} className="px-6 py-3 font-bold text-slate-700">Total</td>
                  <td className="px-6 py-3 font-bold text-pink-600 text-base">{currency(totalPessoal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Direto */}
        {sub === 'direto' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700">Custos Diretos Lançados</h3>
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium"
              >
                <Plus className="w-4 h-4" /> Lançar Custo
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Descrição','Categoria','Tipo','Competência','Origem','Valor'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {directCosts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-medium text-slate-800">{c.description}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[c.category] ?? 'bg-slate-100 text-slate-600'}`}>{c.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.type === 'direto' ? 'bg-pink-100 text-pink-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {c.type === 'direto' ? 'Direto' : 'Indireto'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{c.date}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{c.origin}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{currency(c.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={5} className="px-6 py-3 font-bold text-slate-700">Total</td>
                  <td className="px-6 py-3 font-bold text-pink-600">{currency(totalDireto)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Indireto ERP */}
        {sub === 'indireto' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-700">Custos Indiretos — Sincronizado via ERP</h3>
                <p className="text-xs text-slate-400 mt-0.5">Última sincronização: 27/01/2025 às 03:00</p>
              </div>
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                <RefreshCw className="w-4 h-4" /> Sincronizar agora
              </button>
            </div>
            <div className="px-6 py-3 bg-green-50 border-b border-green-100 flex items-center gap-2 text-xs text-green-700 font-medium">
              <DollarSign className="w-3 h-3" /> ERP conectado — dados sincronizados automaticamente
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Descrição','Categoria','Competência','Origem','Valor'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {INDIRECT_ERP.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-medium text-slate-800">{c.description}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[c.category] ?? 'bg-slate-100 text-slate-600'}`}>{c.category}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{c.date}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{c.origin}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">{currency(c.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={4} className="px-6 py-3 font-bold text-slate-700">Total</td>
                  <td className="px-6 py-3 font-bold text-pink-600">{currency(totalIndireto)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

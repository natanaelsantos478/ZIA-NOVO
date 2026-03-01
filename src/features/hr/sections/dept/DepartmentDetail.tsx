import { useState } from 'react';
import {
  ChevronLeft, Users, DollarSign, Heart, Star, Zap, Building2,
} from 'lucide-react';
import type { DeptRow } from '../OrgChart';
import TabColaboradores from './TabColaboradores';
import TabFinanceiro from './TabFinanceiro';
import TabSaude from './TabSaude';
import TabSatisfacao from './TabSatisfacao';
import TabAutomacoes from './TabAutomacoes';

type Tab = 'colaboradores' | 'financeiro' | 'saude' | 'satisfacao' | 'automacoes';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'colaboradores', label: 'Colaboradores', icon: Users     },
  { id: 'financeiro',    label: 'Financeiro',    icon: DollarSign },
  { id: 'saude',         label: 'Saúde',         icon: Heart      },
  { id: 'satisfacao',    label: 'Satisfação',    icon: Star       },
  { id: 'automacoes',    label: 'Automações',    icon: Zap        },
];

interface Props {
  dept: DeptRow;
  companyName: string;
  onBack: () => void;
}

export default function DepartmentDetail({ dept, companyName, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('colaboradores');

  return (
    <div className="flex flex-col h-full">
      {/* ── Top bar ── */}
      <div className="px-8 pt-6 pb-0 bg-white border-b border-slate-200">
        {/* breadcrumb */}
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-pink-600 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar ao Organograma
        </button>

        {/* dept header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-800">{dept.dept}</h1>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  dept.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                }`}>{dept.status}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                <span>{companyName}</span>
                <span className="text-slate-300">·</span>
                <span>Gestor: <strong className="text-slate-700">{dept.manager}</strong></span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{dept.costCenter}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-slate-800">{dept.headcount}</p>
              <p className="text-xs text-slate-400">Colaboradores</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{dept.budget}</p>
              <p className="text-xs text-slate-400">Orçamento Anual</p>
            </div>
          </div>
        </div>

        {/* tab nav */}
        <div className="flex gap-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                tab === id
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-auto bg-slate-50">
        {tab === 'colaboradores' && <TabColaboradores dept={dept} />}
        {tab === 'financeiro'    && <TabFinanceiro    dept={dept} />}
        {tab === 'saude'         && <TabSaude         dept={dept} />}
        {tab === 'satisfacao'    && <TabSatisfacao    dept={dept} />}
        {tab === 'automacoes'    && <TabAutomacoes    dept={dept} />}
      </div>
    </div>
  );
}

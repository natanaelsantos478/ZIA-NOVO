// ERP — Força de Vendas (dashboard de performance da equipe comercial)
import { useState } from 'react';
import { TrendingUp, Award, ChevronUp, ChevronDown, Star } from 'lucide-react';

interface Vendedor {
  id: string;
  nome: string;
  avatar: string;
  regiao: string;
  meta: number;
  realizado: number;
  qtdVendas: number;
  ticketMedio: number;
  crescimento: number;
  rank: number;
}

const VENDEDORES: Vendedor[] = [
  { id: '1', nome: 'Carlos Vieira', avatar: 'CV', regiao: 'São Paulo', meta: 80000, realizado: 97200, qtdVendas: 18, ticketMedio: 5400, crescimento: 21.5, rank: 1 },
  { id: '2', nome: 'Ana Souza', avatar: 'AS', regiao: 'Rio de Janeiro', meta: 70000, realizado: 74500, qtdVendas: 14, ticketMedio: 5321, crescimento: 8.3, rank: 2 },
  { id: '3', nome: 'Pedro Torres', avatar: 'PT', regiao: 'Belo Horizonte', meta: 60000, realizado: 61000, qtdVendas: 11, ticketMedio: 5545, crescimento: 3.2, rank: 3 },
  { id: '4', nome: 'Mariana Lima', avatar: 'ML', regiao: 'Curitiba', meta: 55000, realizado: 48200, qtdVendas: 9, ticketMedio: 5356, crescimento: -7.4, rank: 4 },
  { id: '5', nome: 'Ricardo Faria', avatar: 'RF', regiao: 'Porto Alegre', meta: 50000, realizado: 41800, qtdVendas: 8, ticketMedio: 5225, crescimento: -2.1, rank: 5 },
];

interface Meta { label: string; realizado: number; meta: number; cor: string; }
const METAS: Meta[] = [
  { label: 'Vendas do Mês', realizado: 322700, meta: 315000, cor: 'emerald' },
  { label: 'Novos Clientes', realizado: 12, meta: 15, cor: 'blue' },
  { label: 'Ticket Médio', realizado: 5369, meta: 5000, cor: 'violet' },
  { label: 'Recorrência', realizado: 68, meta: 70, cor: 'amber' },
];

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function ProgressBar({ pct, cor }: { pct: number; cor: string }) {
  const w = Math.min(pct, 100);
  const COLOR: Record<string, string> = {
    emerald: 'bg-emerald-500', blue: 'bg-blue-500', violet: 'bg-violet-500', amber: 'bg-amber-500',
    red: 'bg-red-400', slate: 'bg-slate-400',
  };
  return (
    <div className="w-full bg-slate-200 rounded-full h-2">
      <div className={`${COLOR[cor] ?? 'bg-blue-500'} h-2 rounded-full transition-all`} style={{ width: `${w}%` }} />
    </div>
  );
}

export default function ForcaVendas() {
  const [periodo, setPeriodo] = useState<'mes' | 'trimestre' | 'ano'>('mes');

  const totalRealizado = VENDEDORES.reduce((s, v) => s + v.realizado, 0);
  const totalMeta = VENDEDORES.reduce((s, v) => s + v.meta, 0);
  const percentualMeta = Math.round((totalRealizado / totalMeta) * 100);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" /> Força de Vendas
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Performance da equipe comercial e acompanhamento de metas</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {(['mes', 'trimestre', 'ano'] as const).map(p => (
            <button key={p} onClick={() => setPeriodo(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${periodo === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {p === 'mes' ? 'Mês' : p === 'trimestre' ? 'Trimestre' : 'Ano'}
            </button>
          ))}
        </div>
      </div>

      {/* Cards de meta geral */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {METAS.map(m => {
          const pct = Math.round((m.realizado / m.meta) * 100);
          const atingida = pct >= 100;
          return (
            <div key={m.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">{m.label}</span>
                <span className={`text-xs font-bold ${atingida ? 'text-emerald-600' : 'text-slate-600'}`}>{pct}%</span>
              </div>
              <div className="text-lg font-bold text-slate-900 mb-1">
                {m.label.includes('Ticket') || m.label.includes('Vendas') ? BRL(m.realizado) : `${m.realizado}${m.label.includes('Recorrência') ? '%' : ''}`}
              </div>
              <ProgressBar pct={pct} cor={atingida ? 'emerald' : m.cor} />
              <div className="text-xs text-slate-400 mt-1">
                Meta: {m.label.includes('Ticket') || m.label.includes('Vendas') ? BRL(m.meta) : `${m.meta}${m.label.includes('Recorrência') ? '%' : ''}`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ranking de vendedores */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" /> Ranking de Vendedores
          </h2>
          <span className="text-xs text-slate-500">Total equipe: {BRL(totalRealizado)} de {BRL(totalMeta)} ({percentualMeta}%)</span>
        </div>

        <div className="divide-y divide-slate-100">
          {VENDEDORES.map(v => {
            const pct = Math.round((v.realizado / v.meta) * 100);
            return (
              <div key={v.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                {/* Rank */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${v.rank <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                  {v.rank === 1 ? <Star className="w-4 h-4" /> : v.rank}
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 flex-shrink-0">
                  {v.avatar}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-slate-800 text-sm">{v.nome}</span>
                    <span className="text-xs text-slate-400">{v.regiao}</span>
                  </div>
                  <ProgressBar pct={pct} cor={pct >= 100 ? 'emerald' : pct >= 80 ? 'blue' : pct >= 60 ? 'amber' : 'red'} />
                </div>

                {/* Valores */}
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-slate-900 text-sm">{BRL(v.realizado)}</div>
                  <div className="text-xs text-slate-400">{pct}% da meta</div>
                </div>

                {/* Crescimento */}
                <div className={`flex items-center gap-0.5 text-sm font-semibold flex-shrink-0 w-16 justify-end ${v.crescimento >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {v.crescimento >= 0 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {Math.abs(v.crescimento)}%
                </div>

                {/* Stats extras */}
                <div className="text-xs text-slate-500 flex-shrink-0 w-28 text-right">
                  {v.qtdVendas} vendas<br />
                  TM: {BRL(v.ticketMedio)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

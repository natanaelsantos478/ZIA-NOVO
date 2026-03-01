import { useState } from 'react';
import {
  User, CheckCircle, AlertTriangle, ChevronUp, ChevronDown, TrendingUp,
} from 'lucide-react';

const EMPLOYEES_LIST = [
  'Carlos Eduardo Lima',
  'Ana Beatriz Souza',
  'Guilherme Martins',
  'Fernanda Rocha',
  'Rafael Nunes',
];

const COMPETENCE = 'Fevereiro / 2025';

const INNER_TABS = [
  { id: 'proventos',   label: 'Proventos'            },
  { id: 'descontos',   label: 'Descontos'            },
  { id: 'banco-horas', label: 'Banco de Horas'       },
  { id: 'folgas',      label: 'Folgas'               },
  { id: 'comissoes',   label: 'Comissões Detalhadas' },
  { id: 'alertas',     label: 'Alertas da Folha'     },
];

// ── Data per employee (Carlos as default / full detail) ──────────────────────

const PROVENTOS = [
  { desc: 'Salário Base',                   ref: '220h',   valor: 12000.00,  note: '' },
  { desc: 'HE 50% – Dias Úteis (12h50min)', ref: '12,83h', valor: 1125.00,  note: 'Aprovada(s) pela gestão' },
  { desc: 'HE 100% – Domingos/Feriados',    ref: '—',      valor: 0,        note: '' },
  { desc: 'Adicional de Periculosidade',    ref: '—',      valor: 0,        note: '' },
  { desc: 'Adicional de Insalubridade',     ref: '—',      valor: 0,        note: '' },
  { desc: 'DSR s/ HE',                      ref: '—',      valor: 375.00,   note: 'Calculado automaticamente' },
  { desc: 'Comissões (CRM – Jan/2025)',      ref: '—',      valor: 0,        note: 'Sem metas ativas neste mês' },
];

const TOTAL_GROSS = PROVENTOS.reduce((s, p) => s + p.valor, 0);

const DESCONTOS = [
  { desc: 'INSS Progressivo',               ref: 'Tabela 2025', valor: 908.86, note: 'Teto atingido'           },
  { desc: 'IRRF',                           ref: 'Tabela mensal', valor: 1488.13, note: 'Base: R$ 12.591,14'   },
  { desc: 'Vale Transporte (desconto 6%)',   ref: '6% sal. base', valor: 231.00, note: 'R$ 720 concedido'      },
  { desc: 'Plano de Saúde – Co-participação', ref: 'Premium',    valor: 150.00, note: 'Operadora: SulAmérica'  },
  { desc: 'Adiantamento 1ª Quinzena',        ref: '20/01/2025',  valor: 2000.00, note: 'Liberado via sistema'  },
  { desc: 'Falta Não Justificada',           ref: '—',           valor: 0,      note: ''                       },
];

const TOTAL_DEDUCT = DESCONTOS.reduce((s, d) => s + d.valor, 0);
const NET_SALARY   = TOTAL_GROSS - TOTAL_DEDUCT;

const BANK_MOVES = [
  { date: '11/02', desc: 'HE Aprovada – Sprint deadline',     type: 'credit', hours: '+02h 30min', balance: '+18h 20min' },
  { date: '18/02', desc: 'HE Aprovada – Bug produção',        type: 'credit', hours: '+03h 30min', balance: '+15h 50min' },
  { date: '05/02', desc: 'Compensação – Saída antecipada',    type: 'debit',  hours: '-01h 00min', balance: '+12h 20min' },
];

const FOLGAS_DATA = [
  { date: '03/02 Seg', expected: '08h', worked: '08h', dayOff: false, status: 'ok' as const },
  { date: '04/02 Ter', expected: '08h', worked: '08h', dayOff: false, status: 'ok' as const },
  { date: '05/02 Qua', expected: '08h', worked: '07h 35min', dayOff: false, status: 'inconsistency' as const },
  { date: '06/02 Qui', expected: '08h', worked: '08h', dayOff: false, status: 'ok' as const },
  { date: '07/02 Sex', expected: '08h', worked: '00h', dayOff: false, status: 'absence' as const },
  { date: '24/02 Seg', expected: '08h', worked: '08h', dayOff: true,  status: 'ok' as const },
];

const COMMISSIONS = [
  { metric: 'Meta de Vendas (MRR)',       base: 'R$ 80.000', achieved: 'R$ 87.200 (109%)', commission: 'R$ 1.200',  pct: '1,5%',  note: '' },
  { metric: 'Upsell / Expansão',          base: 'R$ 15.000', achieved: 'R$ 18.400 (122%)', commission: 'R$ 460',   pct: '2,5%',  note: 'Acelerador atingido' },
  { metric: 'NPS de Satisfação',          base: 'NPS ≥ 70',  achieved: 'NPS 74',            commission: 'R$ 200',   pct: 'Bônus', note: 'Meta qualitativa' },
  { metric: 'DSR s/ Comissões (4 dom.)',  base: '—',          achieved: '—',                 commission: 'R$ 276',   pct: '—',     note: 'Calculado automaticamente' },
  { metric: 'Reflexo 13º (1/12 avos)',    base: '—',          achieved: '—',                 commission: 'R$ 178',   pct: '—',     note: 'Provisionado' },
];

interface AlertItem {
  severity: 'Alta' | 'Média' | 'Info';
  desc: string;
  action?: string;
}

const FOLHA_ALERTS: AlertItem[] = [
  { severity: 'Alta',  desc: 'Falta não justificada em 07/02 sem atestado ou evidência. Desconto não aplicado por aguardar posição do RH.', action: 'Aplicar Desconto' },
  { severity: 'Média', desc: 'Batida do intervalo ausente em 13/02 (entrada retornou 13:00 mas saída de intervalo não registrada). Corrigido por solicitação PC003?', action: 'Confirmar' },
  { severity: 'Info',  desc: '12h50min de HE acumuladas em fevereiro. Limite recomendado: 20h/mês. Acompanhar.' },
];

const ALERT_CFG = {
  Alta:  { bg: 'bg-rose-50 border-rose-200',   icon: AlertTriangle, color: 'text-rose-600',   badge: 'bg-rose-100 text-rose-700'  },
  Média: { bg: 'bg-amber-50 border-amber-200',  icon: AlertTriangle, color: 'text-amber-600',  badge: 'bg-amber-100 text-amber-700' },
  Info:  { bg: 'bg-blue-50 border-blue-200',    icon: CheckCircle,   color: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700'  },
};

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Tab components ────────────────────────────────────────────────────────────

function ProventosTab() {
  return (
    <div>
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Referência</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Observação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {PROVENTOS.map((p, i) => (
            <tr key={i} className={`hover:bg-slate-50/60 ${p.valor === 0 ? 'opacity-40' : ''}`}>
              <td className="px-4 py-3 text-slate-700 font-medium text-sm">{p.desc}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">{p.ref}</td>
              <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">{p.valor > 0 ? fmt(p.valor) : '—'}</td>
              <td className="px-4 py-3 text-xs text-slate-400 italic">{p.note || '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 bg-green-50/60">
            <td colSpan={2} className="px-4 py-3 font-bold text-green-800 text-sm">TOTAL BRUTO</td>
            <td className="px-4 py-3 text-right font-mono font-black text-green-800 text-base">{fmt(TOTAL_GROSS)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
      <p className="text-xs text-slate-400 flex items-center gap-1">
        <TrendingUp className="w-3 h-3" />
        Comissões integradas em tempo real via módulo CRM · Atualizado em 28/02/2025 às 08:00
      </p>
    </div>
  );
}

function DescontosTab() {
  return (
    <div>
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Base / Referência</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Observação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {DESCONTOS.map((d, i) => (
            <tr key={i} className={`hover:bg-slate-50/60 ${d.valor === 0 ? 'opacity-40' : ''}`}>
              <td className="px-4 py-3 text-slate-700 font-medium text-sm">{d.desc}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">{d.ref}</td>
              <td className="px-4 py-3 text-right font-mono font-semibold text-rose-700">{d.valor > 0 ? fmt(d.valor) : '—'}</td>
              <td className="px-4 py-3 text-xs text-slate-400 italic">{d.note || '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-200 bg-rose-50/40">
            <td colSpan={2} className="px-4 py-2.5 font-semibold text-rose-800 text-sm">Total Descontos</td>
            <td className="px-4 py-2.5 text-right font-mono font-bold text-rose-800">{fmt(TOTAL_DEDUCT)}</td>
            <td />
          </tr>
          <tr className="border-t-2 border-slate-200 bg-green-50/60">
            <td colSpan={2} className="px-4 py-3 font-black text-green-800 text-sm">SALÁRIO LÍQUIDO</td>
            <td className="px-4 py-3 text-right font-mono font-black text-green-800 text-base">{fmt(NET_SALARY)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function BancoHorasTab() {
  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <p className="text-xs text-green-700 font-semibold uppercase tracking-wider mb-1">Saldo Atual</p>
          <p className="text-2xl font-black text-green-800">+18h 20min</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-xs text-blue-700 font-semibold uppercase tracking-wider mb-1">Créditos (mês)</p>
          <p className="text-2xl font-black text-blue-800">+06h 00min</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider mb-1">Débitos (mês)</p>
          <p className="text-2xl font-black text-slate-700">-01h 00min</p>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Horas</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {BANK_MOVES.map((m, i) => (
            <tr key={i} className="hover:bg-slate-50/60">
              <td className="px-4 py-3 text-xs text-slate-500">{m.date}</td>
              <td className="px-4 py-3 text-sm text-slate-700">{m.desc}</td>
              <td className="px-4 py-3 text-center">
                <span className={`flex items-center justify-center gap-1 font-mono text-xs font-bold ${m.type === 'credit' ? 'text-green-600' : 'text-rose-600'}`}>
                  {m.type === 'credit' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {m.hours}
                </span>
              </td>
              <td className="px-4 py-3 text-center font-mono text-xs font-semibold text-slate-800">{m.balance}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FolgasTab() {
  const STATUS_STYLE = {
    ok:            { row: '', badge: 'text-green-600', label: 'OK'            },
    inconsistency: { row: 'bg-amber-50/60', badge: 'text-amber-600', label: 'Inconsistência' },
    absence:       { row: 'bg-rose-50/60',  badge: 'text-rose-600',  label: 'Falta'         },
  } as const;

  return (
    <div>
      <div className="flex gap-4 mb-5">
        {[
          { label: 'Dias Úteis Esperados', value: '19',  color: 'text-slate-700' },
          { label: 'Dias Trabalhados',     value: '17',  color: 'text-green-700' },
          { label: 'Folgas Planejadas',    value: '1',   color: 'text-blue-700'  },
          { label: 'Faltas/Ausências',     value: '1',   color: 'text-rose-700'  },
        ].map((s) => (
          <div key={s.label} className="flex-1 bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
            <p className="text-xs text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Data / Dia</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Jornada Esperada</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Jornada Trabalhada</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Folga Programada?</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Validação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {FOLGAS_DATA.map((row, i) => {
            const cfg = STATUS_STYLE[row.status];
            return (
              <tr key={i} className={`hover:brightness-95 transition-all ${cfg.row}`}>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.date}</td>
                <td className="px-4 py-3 text-center text-xs text-slate-600">{row.expected}</td>
                <td className="px-4 py-3 text-center font-mono text-xs font-semibold text-slate-800">{row.worked}</td>
                <td className="px-4 py-3 text-center">
                  {row.dayOff
                    ? <CheckCircle className="w-4 h-4 text-blue-500 mx-auto" />
                    : <span className="text-slate-300 text-xs">—</span>
                  }
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-semibold ${cfg.badge}`}>{cfg.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ComissoesTab() {
  const totalComm = COMMISSIONS.reduce((s, c) => {
    const v = parseFloat(c.commission.replace('R$ ', '').replace('.', '').replace(',', '.'));
    return s + v;
  }, 0);

  return (
    <div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-5 text-sm text-blue-800">
        <span className="font-semibold">Comissões integradas em tempo real do módulo CRM/Financeiro.</span>
        {' '}Percentuais, metas e aceleradores configurados no plano de remuneração variável ativo.
      </div>

      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Métrica / Componente</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Base / Meta</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Realizado</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">% Aplic.</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Comissão</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Obs.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {COMMISSIONS.map((c, i) => (
            <tr key={i} className="hover:bg-slate-50/60">
              <td className="px-4 py-3 font-medium text-slate-800 text-sm">{c.metric}</td>
              <td className="px-4 py-3 text-xs text-slate-600">{c.base}</td>
              <td className="px-4 py-3 text-xs text-slate-600">{c.achieved}</td>
              <td className="px-4 py-3 text-center">
                <span className="text-xs font-semibold text-indigo-600">{c.pct}</span>
              </td>
              <td className="px-4 py-3 text-right font-mono font-bold text-green-700">{c.commission}</td>
              <td className="px-4 py-3 text-xs text-slate-400 italic">{c.note || '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 bg-green-50/60">
            <td colSpan={4} className="px-4 py-3 font-bold text-green-800">TOTAL COMISSÕES (incl. reflexos)</td>
            <td className="px-4 py-3 text-right font-black text-green-800 text-base font-mono">
              {totalComm.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function AlertasFolhaTab() {
  return (
    <div>
      <p className="text-sm text-slate-500 mb-5">
        Inconsistências identificadas pelo sistema para aprovação ou contestação do gestor <strong>antes do fechamento da folha</strong>.
      </p>
      <div className="space-y-3">
        {FOLHA_ALERTS.map((a, i) => {
          const cfg = ALERT_CFG[a.severity];
          const Icon = cfg.icon;
          return (
            <div key={i} className={`flex items-start gap-4 border rounded-xl p-4 ${cfg.bg}`}>
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${cfg.badge}`}>
                    {a.severity}
                  </span>
                </div>
                <p className="text-sm text-slate-700">{a.desc}</p>
              </div>
              {a.action && (
                <div className="flex gap-2 shrink-0">
                  <button className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                    Contestar
                  </button>
                  <button className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700">
                    {a.action}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {FOLHA_ALERTS.length > 0 && (
        <div className="mt-5 flex justify-end gap-2">
          <button className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
            Contestar Todos
          </button>
          <button className="px-4 py-2 text-sm font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700">
            Aprovar e Fechar Folha
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EmployeePayslip() {
  const [selectedEmp, setSelectedEmp] = useState(EMPLOYEES_LIST[0]);
  const [innerTab, setInnerTab]       = useState('proventos');

  const alertCount = FOLHA_ALERTS.length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Detalhamento Individual na Folha</h1>
          <p className="text-slate-500 text-sm mt-1">Proventos, descontos, banco de horas, comissões e alertas por colaborador</p>
        </div>
        <div className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          Competência: <span className="font-semibold text-slate-600">{COMPETENCE}</span>
        </div>
      </div>

      {/* Employee selector */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={selectedEmp}
            onChange={(e) => setSelectedEmp(e.target.value)}
            className="pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 bg-white font-medium text-slate-700"
          >
            {EMPLOYEES_LIST.map((e) => <option key={e}>{e}</option>)}
          </select>
        </div>

        {/* Quick totals */}
        <div className="flex gap-3">
          {[
            { label: 'Bruto',      value: fmt(TOTAL_GROSS),  color: 'text-slate-700' },
            { label: 'Descontos',  value: fmt(TOTAL_DEDUCT), color: 'text-rose-700'  },
            { label: 'Líquido',    value: fmt(NET_SALARY),   color: 'text-green-700' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm">
              <span className="text-slate-400">{s.label}:</span>
              <span className={`font-bold ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Card with inner tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex border-b border-slate-100 px-6 pt-4 gap-5 overflow-x-auto">
          {INNER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setInnerTab(tab.id)}
              className={`pb-3 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap flex items-center gap-1.5 ${
                innerTab === tab.id
                  ? 'text-pink-600 border-pink-600'
                  : 'text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              {tab.label}
              {tab.id === 'alertas' && alertCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black flex items-center justify-center">
                  {alertCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="p-6">
          {innerTab === 'proventos'   && <ProventosTab />}
          {innerTab === 'descontos'   && <DescontosTab />}
          {innerTab === 'banco-horas' && <BancoHorasTab />}
          {innerTab === 'folgas'      && <FolgasTab />}
          {innerTab === 'comissoes'   && <ComissoesTab />}
          {innerTab === 'alertas'     && <AlertasFolhaTab />}
        </div>
      </div>
    </div>
  );
}

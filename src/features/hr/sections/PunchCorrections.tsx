import { useState } from 'react';
import {
  Plus, Search, Clock, CheckCircle, AlertTriangle,
  Upload, FileText, MoreHorizontal, ChevronDown,
  Shield,
} from 'lucide-react';

type CorrectionType = 'Entrada Esquecida' | 'Saída Esquecida' | 'Batida Incorreta' | 'Intervalo Não Registrado';
type CorrectionStatus = 'Pendente RH' | 'Aprovada' | 'Reprovada' | 'Em Análise';

interface Correction {
  id: string;
  employee: string;
  dept: string;
  requestDate: string;
  punchDate: string;
  type: CorrectionType;
  originalValue: string;
  requestedValue: string;
  justification: string;
  evidence: string | null;
  status: CorrectionStatus;
  reviewedBy?: string;
  reviewDate?: string;
  reviewNote?: string;
}

const CORRECTIONS: Correction[] = [
  {
    id: 'PC001',
    employee: 'Carlos Eduardo Lima',
    dept: 'TI – Dev',
    requestDate: '13/02/2025',
    punchDate:   '13/02/2025',
    type: 'Saída Esquecida',
    originalValue: '—',
    requestedValue: '17:00',
    justification: 'Saí pelo portão lateral e não passei pelo relógio de ponto. Tenho print do ticket de estacionamento como comprovante.',
    evidence: 'ticket_estacionamento_13022025.jpg',
    status: 'Aprovada',
    reviewedBy: 'Carla Mendes (RH)',
    reviewDate: '14/02/2025',
    reviewNote: 'Evidência validada. Saída corrigida para 17:00.',
  },
  {
    id: 'PC002',
    employee: 'Ana Beatriz Souza',
    dept: 'RH',
    requestDate: '05/02/2025',
    punchDate:   '05/02/2025',
    type: 'Entrada Esquecida',
    originalValue: '—',
    requestedValue: '08:00',
    justification: 'Cheguei às 08:00 mas o sistema biométrico estava com falha neste dia. Outros colegas também relataram o problema.',
    evidence: 'chamado_ti_biometria_05022025.pdf',
    status: 'Aprovada',
    reviewedBy: 'Carla Mendes (RH)',
    reviewDate: '06/02/2025',
    reviewNote: 'Falha sistêmica confirmada pelo TI. Entrada corrigida.',
  },
  {
    id: 'PC003',
    employee: 'Guilherme Martins',
    dept: 'Comercial',
    requestDate: '19/02/2025',
    punchDate:   '18/02/2025',
    type: 'Batida Incorreta',
    originalValue: '14:32',
    requestedValue: '08:05',
    justification: 'Registrei o ponto de entrada com o horário errado (marcou 14:32 em vez de 08:05). Estava em reunião com cliente externo de manhã.',
    evidence: 'agenda_reuniao_cliente_18022025.pdf',
    status: 'Pendente RH',
    reviewedBy: undefined,
    reviewDate: undefined,
    reviewNote: undefined,
  },
  {
    id: 'PC004',
    employee: 'Fernanda Rocha',
    dept: 'Qualidade',
    requestDate: '20/02/2025',
    punchDate:   '20/02/2025',
    type: 'Intervalo Não Registrado',
    originalValue: '—',
    requestedValue: '12:00–13:00',
    justification: 'Fui ao refeitório mas o leitor estava inoperante. Tenho o comprovante do restaurante.',
    evidence: 'nota_refeitorio_20022025.jpg',
    status: 'Em Análise',
    reviewedBy: undefined,
    reviewDate: undefined,
    reviewNote: undefined,
  },
  {
    id: 'PC005',
    employee: 'Rafael Nunes',
    dept: 'TI – Dados',
    requestDate: '10/02/2025',
    punchDate:   '10/02/2025',
    type: 'Saída Esquecida',
    originalValue: '—',
    requestedValue: '18:30',
    justification: 'Saí com o cliente para uma reunião externa e não retornei à empresa. Esqueci de registrar a saída.',
    evidence: null,
    status: 'Reprovada',
    reviewedBy: 'Carla Mendes (RH)',
    reviewDate: '12/02/2025',
    reviewNote: 'Solicitação reprovada: sem evidência e histórico de ocorrências similares sem justificativa.',
  },
];

const STATUS_CONFIG: Record<CorrectionStatus, { color: string; icon: React.ElementType }> = {
  'Pendente RH': { color: 'bg-amber-100 text-amber-700',  icon: Clock         },
  'Aprovada':    { color: 'bg-green-100 text-green-700',  icon: CheckCircle   },
  'Reprovada':   { color: 'bg-rose-100 text-rose-700',    icon: AlertTriangle },
  'Em Análise':  { color: 'bg-blue-100 text-blue-700',    icon: Clock         },
};

const TYPE_BADGE: Record<CorrectionType, string> = {
  'Entrada Esquecida':          'bg-indigo-100 text-indigo-700',
  'Saída Esquecida':            'bg-purple-100 text-purple-700',
  'Batida Incorreta':           'bg-rose-100 text-rose-700',
  'Intervalo Não Registrado':   'bg-amber-100 text-amber-700',
};

function NewRequestForm({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-slate-800">Nova Solicitação de Correção</h2>
        <button onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Colaborador *</label>
            <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 bg-white">
              <option>Selecionar colaborador...</option>
              <option>Carlos Eduardo Lima</option>
              <option>Ana Beatriz Souza</option>
              <option>Guilherme Martins</option>
              <option>Fernanda Rocha</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data da Batida *</label>
            <input type="date" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo de Correção *</label>
            <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 bg-white">
              <option>Entrada Esquecida</option>
              <option>Saída Esquecida</option>
              <option>Batida Incorreta</option>
              <option>Intervalo Não Registrado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Horário Solicitado *</label>
            <input type="time" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Justificativa *</label>
          <textarea
            rows={4}
            placeholder="Descreva detalhadamente o motivo da correção solicitada..."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Evidência (opcional)</label>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
            <Upload className="w-6 h-6 text-slate-400 mb-2" />
            <p className="text-sm text-slate-500">Arraste ou clique para anexar</p>
            <p className="text-xs text-slate-400 mt-0.5">PDF, JPG, PNG — máx. 5MB</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
            Cancelar
          </button>
          <button className="px-6 py-2 text-sm font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700">
            Enviar para RH
          </button>
        </div>
      </div>
    </div>
  );
}

function AuditRow({ c }: { c: Correction }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[c.status];
  const Icon = cfg.icon;

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
          {c.employee.split(' ').map((n) => n[0]).slice(0, 2).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 text-sm">{c.employee}</p>
          <p className="text-xs text-slate-400">{c.dept} · Batida: {c.punchDate}</p>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_BADGE[c.type]}`}>{c.type}</span>
        <div className="text-xs text-slate-500 shrink-0">Solicitado: {c.requestDate}</div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${cfg.color}`}>
          <Icon className="w-3 h-3" />{c.status}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-100 pt-4">
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Detalhes da Correção</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex gap-2"><span className="text-slate-400 w-28 shrink-0">Tipo:</span><span className="text-slate-700 font-medium">{c.type}</span></div>
                <div className="flex gap-2"><span className="text-slate-400 w-28 shrink-0">Valor original:</span><span className="font-mono text-slate-600">{c.originalValue}</span></div>
                <div className="flex gap-2"><span className="text-slate-400 w-28 shrink-0">Valor solicitado:</span><span className="font-mono font-semibold text-slate-800">{c.requestedValue}</span></div>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Evidência</p>
              {c.evidence ? (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm text-blue-700 w-fit cursor-pointer hover:bg-blue-100">
                  <FileText className="w-4 h-4" />
                  <span className="truncate max-w-48">{c.evidence}</span>
                </div>
              ) : (
                <span className="text-sm text-slate-400 italic">Sem evidência anexada</span>
              )}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Justificativa</p>
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">{c.justification}</p>
          </div>

          {/* Audit trail */}
          {c.reviewedBy && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trilha de Auditoria</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle className="w-3 h-3 text-slate-500" />
                </div>
                <div>
                  <p className="text-slate-700 font-medium">{c.reviewedBy}</p>
                  <p className="text-xs text-slate-400">{c.reviewDate} · {c.status}</p>
                  {c.reviewNote && <p className="text-xs text-slate-600 mt-1 italic">"{c.reviewNote}"</p>}
                </div>
              </div>
            </div>
          )}

          {/* Actions for pending */}
          {(c.status === 'Pendente RH' || c.status === 'Em Análise') && (
            <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
              <input type="text" placeholder="Observação da revisão..." className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 bg-white" />
              <button className="px-4 py-2 text-sm font-semibold text-rose-700 bg-rose-100 rounded-lg hover:bg-rose-200">Reprovar</button>
              <button className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Aprovar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PunchCorrections() {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('Todos');

  const filtered = CORRECTIONS.filter((c) => {
    const matchSearch = c.employee.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'Todos' || c.status === filter;
    return matchSearch && matchFilter;
  });

  const stats = [
    { label: 'Total',       value: CORRECTIONS.length,                                              color: 'text-slate-600 bg-slate-100'  },
    { label: 'Pendentes',   value: CORRECTIONS.filter((c) => c.status === 'Pendente RH').length,   color: 'text-amber-600 bg-amber-50'   },
    { label: 'Em Análise',  value: CORRECTIONS.filter((c) => c.status === 'Em Análise').length,    color: 'text-blue-600 bg-blue-50'     },
    { label: 'Aprovadas',   value: CORRECTIONS.filter((c) => c.status === 'Aprovada').length,      color: 'text-green-600 bg-green-50'   },
    { label: 'Reprovadas',  value: CORRECTIONS.filter((c) => c.status === 'Reprovada').length,     color: 'text-rose-600 bg-rose-50'     },
  ];

  if (showForm) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <NewRequestForm onCancel={() => setShowForm(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Solicitações e Alterações de Ponto</h1>
          <p className="text-slate-500 text-sm mt-1">Correção de batidas com evidências e trilha de auditoria completa</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium"
        >
          <Plus className="w-4 h-4" /> Nova Solicitação
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className={`flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white shadow-sm text-sm`}>
            <span className="text-slate-500">{s.label}:</span>
            <span className={`font-bold ${s.color.split(' ')[0]}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar colaborador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 w-56"
          />
        </div>
        <div className="flex gap-1.5">
          {['Todos', 'Pendente RH', 'Em Análise', 'Aprovada', 'Reprovada'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filter === f ? 'bg-pink-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button className="ml-auto flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
          <MoreHorizontal className="w-4 h-4" /> Exportar Auditoria
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map((c) => <AuditRow key={c.id} c={c} />)}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
            Nenhuma solicitação encontrada.
          </div>
        )}
      </div>
    </div>
  );
}

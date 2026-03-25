// ERP — Cadeias de Projetos (dependências e encadeamento entre projetos)
import { useState } from 'react';
import { Plus, X, ChevronRight, Link2, AlertCircle, CheckCircle2, Clock, Search } from 'lucide-react';

interface NoProjeto {
  projetoId: string;
  nome: string;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'BLOQUEADO';
  percentual: number;
  responsavel: string;
}

interface Cadeia {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  dataInicio: string;
  dataPrevisaoFim: string;
  status: 'ATIVA' | 'PAUSADA' | 'CONCLUIDA';
  nos: NoProjeto[];
}


const STATUS_NO: Record<string, { badge: string; icon: typeof CheckCircle2 }> = {
  CONCLUIDO:    { badge: 'bg-green-100 text-green-700 border-green-300',  icon: CheckCircle2 },
  EM_ANDAMENTO: { badge: 'bg-blue-100 text-blue-700 border-blue-300',     icon: Clock },
  PENDENTE:     { badge: 'bg-slate-100 text-slate-600 border-slate-300',  icon: Clock },
  BLOQUEADO:    { badge: 'bg-red-100 text-red-700 border-red-300',        icon: AlertCircle },
};

export default function CadeiasProjectos() {
  const [cadeias] = useState<Cadeia[]>([]);
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const filtradas = cadeias.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.categoria.toLowerCase().includes(busca.toLowerCase()),
  );

  function toggleExpand(id: string) {
    setExpandidos(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-amber-600" /> Cadeias de Projetos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Encadeamento e dependências entre projetos sequenciais</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors">
          {showForm ? <><X className="w-4 h-4" /> Cancelar</> : <><Plus className="w-4 h-4" /> Nova Cadeia</>}
        </button>
      </div>

      {/* Sumário */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Cadeias Ativas', value: cadeias.filter(c => c.status === 'ATIVA').length, color: 'amber' },
          { label: 'Projetos em Andamento', value: cadeias.flatMap(c => c.nos).filter(n => n.status === 'EM_ANDAMENTO').length, color: 'blue' },
          { label: 'Projetos Bloqueados', value: cadeias.flatMap(c => c.nos).filter(n => n.status === 'BLOQUEADO').length, color: 'red' },
          { label: 'Concluídos', value: cadeias.flatMap(c => c.nos).filter(n => n.status === 'CONCLUIDO').length, color: 'green' },
        ].map(k => (
          <div key={k.label} className={`bg-${k.color}-50 border border-${k.color}-200 rounded-xl p-4`}>
            <div className={`text-2xl font-bold text-${k.color}-700`}>{k.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="Buscar cadeia…" value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      <div className="space-y-4">
        {filtradas.map(cadeia => {
          const isOpen = expandidos.has(cadeia.id);
          const progressoTotal = Math.round(cadeia.nos.reduce((s, n) => s + n.percentual, 0) / cadeia.nos.length);
          return (
            <div key={cadeia.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                onClick={() => toggleExpand(cadeia.id)}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cadeia.status === 'ATIVA' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                  <Link2 className={`w-4 h-4 ${cadeia.status === 'ATIVA' ? 'text-amber-600' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-slate-800 text-sm truncate">{cadeia.nome}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${cadeia.status === 'ATIVA' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{cadeia.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{cadeia.categoria}</span>
                    <span>·</span>
                    <span>{cadeia.nos.length} projetos</span>
                    <span>·</span>
                    <span>{progressoTotal}% concluído</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {isOpen ? <X className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 px-5 py-4">
                  {/* Barra de progresso global */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Progresso geral da cadeia</span>
                      <span className="font-semibold">{progressoTotal}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${progressoTotal}%` }} />
                    </div>
                  </div>

                  {/* Pipeline visual */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {cadeia.nos.map((no, i) => {
                      const cfg = STATUS_NO[no.status];
                      const Icon = cfg.icon;
                      return (
                        <div key={no.projetoId} className="flex items-center flex-shrink-0">
                          <div className={`border-2 rounded-xl p-3 min-w-40 ${cfg.badge}`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="text-xs font-bold">{no.status.replace(/_/g, ' ')}</span>
                            </div>
                            <div className="text-xs font-semibold text-slate-700 leading-tight mb-1">{no.nome}</div>
                            <div className="text-xs text-slate-500">{no.responsavel}</div>
                            {no.percentual > 0 && no.percentual < 100 && (
                              <div className="mt-1.5">
                                <div className="w-full bg-white rounded-full h-1.5">
                                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${no.percentual}%` }} />
                                </div>
                                <span className="text-xs text-blue-600 font-medium">{no.percentual}%</span>
                              </div>
                            )}
                          </div>
                          {i < cadeia.nos.length - 1 && (
                            <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0 mx-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 text-xs text-slate-400">
                    {new Date(cadeia.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')} → {new Date(cadeia.dataPrevisaoFim + 'T00:00:00').toLocaleDateString('pt-BR')}
                    {cadeia.descricao && <span className="ml-2">· {cadeia.descricao}</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtradas.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-8 text-center text-slate-400">Nenhuma cadeia encontrada</div>
        )}
      </div>
    </div>
  );
}

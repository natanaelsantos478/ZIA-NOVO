// ERP — Consulta de Cargas (rastreamento e histórico)
import { useState } from 'react';
import { FileText, Search, MapPin, Clock, CheckCircle2, Truck, Package } from 'lucide-react';

interface Evento { data: string; hora: string; local: string; descricao: string; }

interface Carga {
  id: string;
  numero: string;
  nfe: string;
  cliente: string;
  origem: string;
  destino: string;
  transportadora: string;
  dataEmissao: string;
  dataEntrega?: string;
  status: 'EMITIDA' | 'COLETADA' | 'EM_TRANSITO' | 'SAIU_ENTREGA' | 'ENTREGUE' | 'DEVOLVIDA';
  peso: number;
  valor: number;
  rastreio: string;
  eventos: Evento[];
}


const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: typeof Truck }> = {
  EMITIDA:      { label: 'NF-e Emitida',      badge: 'bg-slate-100 text-slate-600',   icon: FileText },
  COLETADA:     { label: 'Coletada',           badge: 'bg-yellow-100 text-yellow-700', icon: Package },
  EM_TRANSITO:  { label: 'Em Trânsito',        badge: 'bg-blue-100 text-blue-700',     icon: Truck },
  SAIU_ENTREGA: { label: 'Saiu p/ Entrega',    badge: 'bg-orange-100 text-orange-700', icon: MapPin },
  ENTREGUE:     { label: 'Entregue',           badge: 'bg-green-100 text-green-700',   icon: CheckCircle2 },
  DEVOLVIDA:    { label: 'Devolvida',          badge: 'bg-red-100 text-red-700',       icon: Package },
};

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ConsultaCargas() {
  const [cargas] = useState<Carga[]>([]);
  const [busca, setBusca] = useState('');
  const [selecionada, setSelecionada] = useState<Carga | null>(null);

  const filtradas = cargas.filter(c =>
    c.numero.toLowerCase().includes(busca.toLowerCase()) ||
    c.cliente.toLowerCase().includes(busca.toLowerCase()) ||
    c.rastreio.toLowerCase().includes(busca.toLowerCase()) ||
    c.nfe.includes(busca),
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" /> Consulta de Cargas
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Rastreamento e histórico de cargas emitidas</p>
      </div>

      <div className="flex gap-5 h-[calc(100vh-16rem)]">
        {/* Lista lateral */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Número, cliente, rastreio, NF-e…"
              value={busca} onChange={e => setBusca(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
            {filtradas.map(c => {
              const cfg = STATUS_CONFIG[c.status];
              
              return (
                <button
                  key={c.id}
                  onClick={() => setSelecionada(c)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${selecionada?.id === c.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-300'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-sm text-slate-800">{c.numero}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>{cfg.label}</span>
                  </div>
                  <div className="text-xs text-slate-600 mb-0.5">{c.cliente}</div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <MapPin className="w-3 h-3" />
                    {c.origem} → {c.destino}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalhe */}
        {selecionada ? (
          <div className="flex-1 bg-white rounded-xl border border-slate-200 p-5 overflow-y-auto custom-scrollbar">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-slate-800">{selecionada.numero}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[selecionada.status].badge}`}>{STATUS_CONFIG[selecionada.status].label}</span>
                </div>
                <p className="text-sm text-slate-500">Rastreio: <span className="font-mono text-slate-800">{selecionada.rastreio}</span></p>
              </div>
              <div className="text-right text-sm">
                <div className="font-bold text-slate-900">{BRL(selecionada.valor)}</div>
                <div className="text-slate-500">{selecionada.peso} kg</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-5">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-0.5">Cliente</div>
                <div className="font-medium text-slate-700">{selecionada.cliente}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-0.5">Transportadora</div>
                <div className="font-medium text-slate-700">{selecionada.transportadora}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-0.5">Origem → Destino</div>
                <div className="font-medium text-slate-700">{selecionada.origem} → {selecionada.destino}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-0.5">Emissão{selecionada.dataEntrega ? ' / Entrega' : ''}</div>
                <div className="font-medium text-slate-700">
                  {new Date(selecionada.dataEmissao + 'T00:00:00').toLocaleDateString('pt-BR')}
                  {selecionada.dataEntrega && ` / ${new Date(selecionada.dataEntrega + 'T00:00:00').toLocaleDateString('pt-BR')}`}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 mb-5">
              <div className="text-xs text-slate-400 mb-1">Chave NF-e</div>
              <div className="font-mono text-xs text-slate-700 break-all">{selecionada.nfe}</div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase mb-3">Histórico de Rastreamento</h3>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
                <div className="space-y-3">
                  {selecionada.eventos.map((ev, i) => (
                    <div key={i} className="flex gap-4 relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${i === 0 ? 'bg-emerald-100' : 'bg-white border border-slate-200'}`}>
                        <Clock className={`w-4 h-4 ${i === 0 ? 'text-emerald-600' : 'text-slate-400'}`} />
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-slate-700">{new Date(ev.data + 'T00:00:00').toLocaleDateString('pt-BR')} {ev.hora}</span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-slate-500">{ev.local}</span>
                        </div>
                        <p className={`text-sm ${i === 0 ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>{ev.descricao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400">
            Selecione uma carga para ver os detalhes
          </div>
        )}
      </div>
    </div>
  );
}

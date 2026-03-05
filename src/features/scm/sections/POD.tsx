import { useState } from 'react';
import { Search, CheckSquare, Camera, MapPin, User, Clock, Download } from 'lucide-react';

type PODStatus = 'Com assinatura' | 'Com foto' | 'Entregue p/ vizinho' | 'Tentativa' | 'Recusado';

interface PODRecord {
  id: string;
  orderId: string;
  recipient: string;
  driver: string;
  carrier: string;
  deliveredAt: string;
  location: string;
  status: PODStatus;
  hasPhoto: boolean;
  hasSignature: boolean;
  hasGeo: boolean;
  notes?: string;
}

const PODS: PODRecord[] = [
  { id: 'POD-8841', orderId: 'PED-12854', recipient: 'Maria Santos',     driver: 'Carlos Silva',   carrier: 'Frota Própria', deliveredAt: '05/03 14:23', location: 'R. Vergueiro, 540', status: 'Com assinatura', hasPhoto: true, hasSignature: true,  hasGeo: true },
  { id: 'POD-8840', orderId: 'PED-12850', recipient: 'TechCorp Ltda',    driver: 'Amanda Costa',   carrier: 'Frota Própria', deliveredAt: '05/03 11:08', location: 'Av. Paulista, 1000', status: 'Com foto',       hasPhoto: true, hasSignature: false, hasGeo: true },
  { id: 'POD-8839', orderId: 'PED-12847', recipient: 'Fernanda Lima',    driver: 'Roberto Lima',   carrier: 'Total Express', deliveredAt: '04/03 16:45', location: 'R. das Flores, 230', status: 'Com assinatura', hasPhoto: true, hasSignature: true,  hasGeo: true },
  { id: 'POD-8838', orderId: 'PED-12843', recipient: 'Pedro Oliveira',   driver: 'Carlos Silva',   carrier: 'Frota Própria', deliveredAt: '04/03 10:30', location: 'Av. Brasil, 88',    status: 'Entregue p/ vizinho', hasPhoto: true, hasSignature: false, hasGeo: true, notes: 'Entregue para o ap 42 (vizinho), segundo informações do destinatário' },
  { id: 'POD-8837', orderId: 'PED-12839', recipient: 'João Alves',       driver: 'Fernanda Souza', carrier: 'Jadlog',        deliveredAt: '04/03 09:15', location: '—',                 status: 'Tentativa',      hasPhoto: false, hasSignature: false, hasGeo: false, notes: 'Destinatário ausente. 1ª tentativa.' },
  { id: 'POD-8836', orderId: 'PED-12837', recipient: 'Carla Menezes',    driver: 'Pedro Alves',    carrier: 'Correios',      deliveredAt: '03/03 15:20', location: 'R. São Paulo, 401', status: 'Recusado',       hasPhoto: true, hasSignature: false, hasGeo: true, notes: 'Recusado — produto com avaria visível na embalagem' },
];

const STATUS_BADGE: Record<PODStatus, string> = {
  'Com assinatura':     'bg-emerald-100 text-emerald-700',
  'Com foto':           'bg-blue-100 text-blue-700',
  'Entregue p/ vizinho': 'bg-amber-100 text-amber-700',
  'Tentativa':          'bg-orange-100 text-orange-700',
  'Recusado':           'bg-red-100 text-red-700',
};

export default function POD() {
  const [search, setSearch] = useState('');

  const filtered = PODS.filter((p) =>
    p.id.toLowerCase().includes(search.toLowerCase()) ||
    p.recipient.toLowerCase().includes(search.toLowerCase()) ||
    p.orderId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Prova de Entrega (POD)</h1>
          <p className="text-slate-500 text-sm mt-0.5">Foto, assinatura digital e geolocalização — confirmação de cada entrega</p>
        </div>
        <button className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <Download className="w-4 h-4" />
          Exportar PODs
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Com Assinatura', value: PODS.filter((p) => p.hasSignature).length, icon: CheckSquare, color: 'emerald' },
          { label: 'Com Foto',       value: PODS.filter((p) => p.hasPhoto).length,     icon: Camera,      color: 'blue'    },
          { label: 'Com Geoloc.',    value: PODS.filter((p) => p.hasGeo).length,        icon: MapPin,      color: 'purple'  },
          { label: 'Tentativas',     value: PODS.filter((p) => p.status === 'Tentativa').length, icon: Clock, color: 'amber' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 bg-${s.color}-50`}>
                <Icon className={`w-4 h-4 text-${s.color}-600`} />
              </div>
              <div className="text-2xl font-bold text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar POD, pedido ou destinatário..."
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map((pod) => (
          <div key={pod.id} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="font-mono text-sm font-bold text-slate-700">{pod.id}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-sm text-slate-600">{pod.orderId}</span>
                  <span className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[pod.status]}`}>{pod.status}</span>
                </div>
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <span className="flex items-center gap-1.5 text-slate-700"><User className="w-3.5 h-3.5 text-slate-400" />{pod.recipient}</span>
                  <span className="text-slate-500">Motorista: {pod.driver}</span>
                  <span className="text-slate-500">{pod.carrier}</span>
                  <span className="flex items-center gap-1 text-slate-500"><Clock className="w-3.5 h-3.5" />{pod.deliveredAt}</span>
                  {pod.location !== '—' && <span className="flex items-center gap-1 text-slate-500"><MapPin className="w-3.5 h-3.5" />{pod.location}</span>}
                </div>
                {pod.notes && <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg mt-2">{pod.notes}</p>}
              </div>
              <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <Camera className={`w-4 h-4 ${pod.hasPhoto ? 'text-emerald-500' : 'text-slate-300'}`} />
                  <span className="text-xs text-slate-500">Foto</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <CheckSquare className={`w-4 h-4 ${pod.hasSignature ? 'text-emerald-500' : 'text-slate-300'}`} />
                  <span className="text-xs text-slate-500">Assin.</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <MapPin className={`w-4 h-4 ${pod.hasGeo ? 'text-emerald-500' : 'text-slate-300'}`} />
                  <span className="text-xs text-slate-500">GPS</span>
                </div>
                <button className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors ml-2">Ver POD</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

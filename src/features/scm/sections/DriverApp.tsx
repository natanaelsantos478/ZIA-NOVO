import { Smartphone, MapPin, Camera, CheckCircle2, MessageSquare, Battery, Wifi, Navigation } from 'lucide-react';

const FEATURES = [
  { icon: Navigation,    title: 'Roteiro com Navegação',     desc: 'Lista de paradas em ordem otimizada com navegação integrada (Google Maps / Waze).' },
  { icon: Camera,        title: 'Coleta de Prova de Entrega', desc: 'Foto da entrega, assinatura digital do destinatário e confirmação com geolocalização.' },
  { icon: MessageSquare, title: 'Comunicação Integrada',     desc: 'Chat com a operação, alertas e notificações direto no app, sem necessidade de telefone.' },
  { icon: Wifi,          title: 'Funciona Offline',          desc: 'Roteiro e dados de entrega disponíveis sem internet — sincronização quando houver sinal.' },
  { icon: Battery,       title: 'Baixo Consumo de Bateria',  desc: 'Otimizado para durar um turno completo sem precisar recarregar o dispositivo.' },
  { icon: CheckCircle2,  title: 'Checklist Diário',          desc: 'Checklist de inspeção do veículo antes de sair — avarias, combustível, documentação.' },
];

const ACTIVE_DRIVERS = [
  { name: 'Carlos Silva',   vehicle: 'VW Delivery — GHJ-4521', battery: 72,  signal: 'Ótimo',  stops: 9,  done: 19, lat: -23.55, lng: -46.63 },
  { name: 'Amanda Costa',   vehicle: 'Fiat Ducato — MNO-7832',  battery: 48,  signal: 'Bom',    stops: 7,  done: 15, lat: -23.68, lng: -46.56 },
  { name: 'Roberto Lima',   vehicle: 'Sprinter — KLM-3210',     battery: 15,  signal: 'Fraco',  stops: 11, done: 20, lat: -23.45, lng: -47.12 },
  { name: 'Fernanda Souza', vehicle: 'Renault Master — PQR-5643', battery: 91, signal: 'Ótimo', stops: 0,  done: 17, lat: -23.52, lng: -46.61 },
];

export default function DriverApp() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">App do Motorista</h1>
          <p className="text-slate-500 text-sm mt-0.5">Roteiro, navegação, coleta de POD e comunicação — Android e iOS</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-slate-200 px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            Baixar APK para Homologação
          </button>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Smartphone className="w-4 h-4" />
            Gerenciar Dispositivos
          </button>
        </div>
      </div>

      {/* Active drivers */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Motoristas Conectados Agora</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {ACTIVE_DRIVERS.map((d) => (
            <div key={d.name} className="px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0">
                {d.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800">{d.name}</div>
                <div className="text-xs text-slate-500">{d.vehicle}</div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <Battery className={`w-3.5 h-3.5 ${d.battery < 20 ? 'text-red-500' : d.battery < 50 ? 'text-amber-500' : 'text-emerald-500'}`} />
                  <span className={d.battery < 20 ? 'text-red-600 font-bold' : 'text-slate-600'}>{d.battery}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Wifi className={`w-3.5 h-3.5 ${d.signal === 'Ótimo' ? 'text-emerald-500' : d.signal === 'Bom' ? 'text-amber-500' : 'text-red-500'}`} />
                  <span className="text-slate-600">{d.signal}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-600">{d.done} entregues / {d.stops} pendentes</span>
                </div>
                <button className="text-xs border border-slate-200 px-3 py-1 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">Mensagem</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
              <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
                <Icon className="w-4.5 h-4.5 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-slate-800 text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          );
        })}
      </div>

      {/* App download */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold mb-1">ZIA Driver App</h3>
            <p className="text-emerald-100 text-sm">Disponível para Android e iOS — funciona offline</p>
            <div className="flex items-center gap-2 mt-3">
              <span className="bg-white/20 rounded-lg px-3 py-1 text-xs">v2.4.1</span>
              <span className="bg-white/20 rounded-lg px-3 py-1 text-xs">4 dispositivos ativos</span>
            </div>
          </div>
          <Smartphone className="w-16 h-16 text-white/30" />
        </div>
      </div>
    </div>
  );
}

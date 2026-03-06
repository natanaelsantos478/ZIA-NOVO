import { Thermometer, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

// Cadeia Fria — dados mock enquanto integração com sensores IoT não está disponível
// Candidatos a integrar: AWS IoT, Azure IoT Hub, sensores de temperatura via MQTT

const MOCK_ZONES = [
  { id: 'Z1', name: 'Câmara Fria 01', temp: -18.2, target: -18, status: 'ok',    product: 'Congelados' },
  { id: 'Z2', name: 'Câmara Fria 02', temp: -16.5, target: -18, status: 'alert', product: 'Sorvetes' },
  { id: 'Z3', name: 'Refrigerados A', temp: 4.1,   target: 4,   status: 'ok',    product: 'Laticínios' },
  { id: 'Z4', name: 'Refrigerados B', temp: 6.8,   target: 6,   status: 'alert', product: 'Carnes' },
  { id: 'Z5', name: 'Câmara Seca',    temp: 18.3,  target: 18,  status: 'ok',    product: 'Farmácia' },
];

const MOCK_VEHICLES = [
  { plate: 'ABC-1234', temp: -17.8, target: -18, status: 'ok',    route: 'SP → Campinas' },
  { plate: 'DEF-5678', temp: -14.0, target: -18, status: 'alert', route: 'SP → Santos' },
  { plate: 'GHI-9012', temp: 4.2,   target: 4,   status: 'ok',    route: 'SP → Barueri' },
];

export default function ColdChain() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Cadeia Fria (Cold Chain)</h2>
        <p className="text-sm text-slate-500">Monitoramento de temperatura em câmaras e veículos refrigerados</p>
      </div>

      <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sm text-sky-700 flex items-center gap-3">
        <Thermometer className="w-5 h-5 flex-shrink-0" />
        <span>
          Integração com sensores IoT em desenvolvimento. Os dados abaixo são ilustrativos até a conexão com os dispositivos ser estabelecida.
        </span>
      </div>

      <div>
        <h3 className="font-semibold text-slate-700 mb-3">Câmaras e Zonas de Armazenagem</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {MOCK_ZONES.map((z) => (
            <div key={z.id} className={`bg-white rounded-xl border p-4 shadow-sm ${z.status === 'alert' ? 'border-orange-300' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{z.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{z.product}</p>
                </div>
                {z.status === 'ok'
                  ? <CheckCircle className="w-5 h-5 text-green-500" />
                  : <AlertTriangle className="w-5 h-5 text-orange-500" />}
              </div>
              <div className="mt-3 flex items-end gap-3">
                <div>
                  <p className="text-xs text-slate-400">Temperatura atual</p>
                  <p className={`text-3xl font-bold ${z.status === 'alert' ? 'text-orange-600' : 'text-blue-600'}`}>
                    {z.temp > 0 ? '+' : ''}{z.temp}°C
                  </p>
                </div>
                <div className="mb-1">
                  <p className="text-xs text-slate-400">Meta: {z.target > 0 ? '+' : ''}{z.target}°C</p>
                  <p className={`text-xs font-medium ${z.status === 'alert' ? 'text-orange-600' : 'text-green-600'}`}>
                    {z.status === 'alert' ? '⚠ Fora do limite' : '✓ Dentro do limite'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-slate-700 mb-3">Veículos Refrigerados em Rota</h3>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Placa', 'Rota', 'Temp. Atual', 'Temp. Alvo', 'Status'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_VEHICLES.map((v) => (
                <tr key={v.plate} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-800">{v.plate}</td>
                  <td className="px-4 py-3 text-slate-600">{v.route}</td>
                  <td className="px-4 py-3">
                    <span className={`text-lg font-bold ${v.status === 'alert' ? 'text-orange-600' : 'text-blue-600'}`}>
                      {v.temp > 0 ? '+' : ''}{v.temp}°C
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{v.target > 0 ? '+' : ''}{v.target}°C</td>
                  <td className="px-4 py-3">
                    {v.status === 'ok'
                      ? <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle className="w-3.5 h-3.5" /> OK</span>
                      : <span className="flex items-center gap-1 text-orange-600 text-xs font-medium"><AlertTriangle className="w-3.5 h-3.5" /> Alerta</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 text-sm text-slate-500">
        <Clock className="w-4 h-4 flex-shrink-0" />
        Última atualização simulada: {new Date().toLocaleTimeString('pt-BR')} — Atualização em tempo real disponível após integração com sensores IoT.
      </div>
    </div>
  );
}

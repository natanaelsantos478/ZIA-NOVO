import { Globe, Smartphone, Bell, Star, CheckCircle2, Settings } from 'lucide-react';

const FEATURES = [
  { icon: Globe,       title: 'Página de Rastreio Branded',     desc: 'Página personalizada com logo, cores e domínio da sua empresa para o destinatário acompanhar a entrega.' },
  { icon: Bell,        title: 'Notificações Automáticas',        desc: 'SMS, WhatsApp e e-mail disparados automaticamente em cada evento da entrega (postado, em trânsito, saiu para entrega, entregue).' },
  { icon: Smartphone,  title: 'ETA Dinâmico',                   desc: 'Prazo de entrega atualizado em tempo real conforme eventos de rota, clima e trânsito.' },
  { icon: Star,        title: 'NPS Pós-entrega',                 desc: 'Pesquisa de satisfação enviada automaticamente após confirmação de entrega.' },
  { icon: CheckCircle2, title: 'Prova de Entrega (POD)',         desc: 'Foto, assinatura digital e geolocalização registrados na confirmação de entrega.' },
  { icon: Settings,    title: 'Configuração White-label',        desc: 'Configure logo, cores, domínio personalizado e mensagens personalizadas para cada cliente.' },
];

const CONFIGS = [
  { label: 'Domínio personalizado',   value: 'rastreio.suaempresa.com.br', status: 'Ativo' },
  { label: 'Logo',                    value: 'logo_empresa.png',           status: 'Configurado' },
  { label: 'Cor primária',            value: '#10B981 (Emerald)',           status: 'Configurado' },
  { label: 'WhatsApp Business',       value: '+55 11 9999-0000',           status: 'Ativo' },
  { label: 'E-mail remetente',        value: 'noreply@suaempresa.com.br',  status: 'Ativo' },
  { label: 'NPS automático',          value: '24h após entrega',           status: 'Ativo' },
];

export default function RecipientPortal() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Portal do Destinatário</h1>
          <p className="text-slate-500 text-sm mt-0.5">Página branded para o cliente final acompanhar a entrega</p>
        </div>
        <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
          <Globe className="w-4 h-4" />
          Abrir Portal de Demonstração
        </button>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-emerald-600 px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg" />
          <div>
            <div className="text-white font-bold">Sua Empresa</div>
            <div className="text-emerald-100 text-xs">rastreio.suaempresa.com.br</div>
          </div>
        </div>
        <div className="p-6">
          <div className="max-w-md mx-auto text-center">
            <div className="text-sm text-slate-500 mb-2">Rastreando pedido</div>
            <div className="font-mono text-2xl font-bold text-slate-800 mb-4">PED-12855</div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <div className="font-semibold text-slate-800">Saiu para entrega!</div>
              <div className="text-sm text-slate-600 mt-1">Previsão: hoje até 18h</div>
            </div>
            <div className="text-xs text-slate-500">
              Acompanhe em tempo real · Notificações ativadas
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
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

      {/* Config */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Configurações Atuais</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {CONFIGS.map((c) => (
            <div key={c.label} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-slate-600">{c.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-800">{c.value}</span>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{c.status}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-4">
          <button className="text-sm text-emerald-600 hover:underline">Editar configurações do portal</button>
        </div>
      </div>
    </div>
  );
}

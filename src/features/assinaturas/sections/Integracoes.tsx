import { useState, useEffect } from 'react';
import { Plug, RefreshCw, CheckCircle, XCircle, Settings2, Loader2 } from 'lucide-react';
import {
  getIntegracoes, upsertIntegracao,
  type AssinaturaIntegracao,
} from '../../../lib/assinaturas';

const TIPOS = [
  { id: 'asaas',    label: 'Asaas',    desc: 'Gateway de pagamentos PIX/Boleto/Cartão' },
  { id: 'iugu',     label: 'Iugu',     desc: 'Gateway de pagamentos e assinaturas' },
  { id: 'stripe',   label: 'Stripe',   desc: 'Processamento de pagamentos internacional' },
  { id: 'hotmart',  label: 'Hotmart',  desc: 'Plataforma de produtos digitais' },
  { id: 'kiwify',   label: 'Kiwify',   desc: 'Plataforma de infoprodutos' },
];

function IntegracaoCard({
  tipo,
  integracao,
  onSave,
}: {
  tipo: typeof TIPOS[number];
  integracao: AssinaturaIntegracao | undefined;
  onSave: (tipo: string, apiKey: string, webhookUrl: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [apiKey, setApiKey] = useState(integracao?.api_key_enc ?? '');
  const [webhook, setWebhook] = useState(integracao?.webhook_url ?? '');
  const [saving, setSaving] = useState(false);

  const isAtivo = integracao?.ativo ?? false;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(tipo.id, apiKey, webhook);
      setExpanded(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isAtivo ? 'bg-green-100' : 'bg-slate-100'}`}>
          <Plug className={`w-4 h-4 ${isAtivo ? 'text-green-600' : 'text-slate-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{tipo.label}</p>
          <p className="text-xs text-slate-400 truncate">{tipo.desc}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAtivo ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> Ativo
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              <XCircle className="w-3 h-3" /> Inativo
            </span>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-4 bg-slate-50 space-y-3">
          {integracao?.ultimo_erro && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              Último erro: {integracao.ultimo_erro}
            </div>
          )}
          {integracao?.ultimo_sync && (
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              Último sync: {new Date(integracao.ultimo_sync).toLocaleString('pt-BR')}
            </p>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">API Key / Token</label>
            <input
              type="password"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Insira sua chave de API..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Webhook URL (opcional)</label>
            <input
              type="url"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="https://..."
              value={webhook}
              onChange={e => setWebhook(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Integracoes() {
  const [integracoes, setIntegracoes] = useState<AssinaturaIntegracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getIntegracoes()
      .then(setIntegracoes)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(tipo: string, apiKey: string, webhookUrl: string) {
    const updated = await upsertIntegracao(tipo, {
      api_key_enc: apiKey || null,
      webhook_url: webhookUrl || null,
      ativo: !!apiKey,
    });
    setIntegracoes(prev => {
      const idx = prev.findIndex(i => i.tipo === tipo);
      if (idx >= 0) return prev.map((i, n) => n === idx ? updated : i);
      return [...prev, updated];
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Integrações</h1>
        <p className="text-sm text-slate-500 mt-0.5">Conecte gateways de pagamento e plataformas externas</p>
      </div>

      <div className="space-y-3">
        {TIPOS.map(tipo => (
          <IntegracaoCard
            key={tipo.id}
            tipo={tipo}
            integracao={integracoes.find(i => i.tipo === tipo.id)}
            onSave={handleSave}
          />
        ))}
      </div>
    </div>
  );
}

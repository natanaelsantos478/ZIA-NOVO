import { useState, useEffect } from 'react';
import { Save, Loader2, Settings, Info } from 'lucide-react';
import { getAssConfig, saveAssConfig, type AssinaturaConfig } from '../../../lib/assinaturas';

type FormState = {
  allow_trial: boolean;
  trial_dias_padrao: string;
  churn_alerta_dias: string;
  notificar_inadimplente_dias: string;
  is_internal_license_mode: boolean;
};

export default function Configuracoes() {
  const [config, setConfig] = useState<AssinaturaConfig | null>(null);
  const [form, setForm] = useState<FormState>({
    allow_trial: true,
    trial_dias_padrao: '14',
    churn_alerta_dias: '30',
    notificar_inadimplente_dias: '3',
    is_internal_license_mode: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    setLoading(true);
    getAssConfig()
      .then(cfg => {
        if (cfg) {
          setConfig(cfg);
          setForm({
            allow_trial: cfg.allow_trial,
            trial_dias_padrao: String(cfg.trial_dias_padrao),
            churn_alerta_dias: String(cfg.churn_alerta_dias),
            notificar_inadimplente_dias: String(cfg.notificar_inadimplente_dias),
            is_internal_license_mode: cfg.is_internal_license_mode,
          });
        }
      })
      .catch((e: Error) => showToast('Erro ao carregar configurações: ' + e.message, false))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await saveAssConfig({
        ...(config ? { id: config.id } : {}),
        allow_trial: form.allow_trial,
        trial_dias_padrao: parseInt(form.trial_dias_padrao) || 14,
        churn_alerta_dias: parseInt(form.churn_alerta_dias) || 30,
        notificar_inadimplente_dias: parseInt(form.notificar_inadimplente_dias) || 3,
        is_internal_license_mode: form.is_internal_license_mode,
      });
      setConfig(saved);
      showToast('Configurações salvas com sucesso.', true);
    } catch (e) {
      showToast('Erro ao salvar: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-slate-800">Configurações</h1>
        <p className="text-sm text-slate-500 mt-0.5">Parâmetros globais do módulo de Assinaturas</p>
      </div>

      <div className="max-w-xl space-y-5">
        {/* Trial */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-3.5 h-3.5" /> Trial
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-blue-600"
              checked={form.allow_trial}
              onChange={e => setForm(p => ({ ...p, allow_trial: e.target.checked }))}
            />
            <span className="text-sm text-slate-700">Permitir período de trial</span>
          </label>
          {form.allow_trial && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Dias de trial padrão</label>
              <input
                type="number"
                min={1}
                max={365}
                className="w-32 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.trial_dias_padrao}
                onChange={e => setForm(p => ({ ...p, trial_dias_padrao: e.target.value }))}
              />
            </div>
          )}
        </div>

        {/* Alertas */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alertas</p>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Alertar churn (dias sem pagamento)
            </label>
            <input
              type="number"
              min={1}
              className="w-32 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.churn_alerta_dias}
              onChange={e => setForm(p => ({ ...p, churn_alerta_dias: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Notificar inadimplência após (dias)
            </label>
            <input
              type="number"
              min={1}
              className="w-32 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.notificar_inadimplente_dias}
              onChange={e => setForm(p => ({ ...p, notificar_inadimplente_dias: e.target.value }))}
            />
          </div>
        </div>

        {/* Modo licença interna */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Modo de Operação</p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-blue-600 mt-0.5"
              checked={form.is_internal_license_mode}
              onChange={e => setForm(p => ({ ...p, is_internal_license_mode: e.target.checked }))}
            />
            <div>
              <span className="text-sm text-slate-700 font-medium">Modo Licença Interna</span>
              <p className="text-xs text-slate-400 mt-0.5">
                Ative para usar o módulo para controle de licenças internas em vez de vendas externas.
                Nesse modo, cobranças não são geradas automaticamente.
              </p>
            </div>
          </label>
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              O ZIA Omnisystem utiliza este módulo para gerenciar suas próprias licenças de clientes.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
}

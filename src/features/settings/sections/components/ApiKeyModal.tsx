// ─────────────────────────────────────────────────────────────────────────────
// ApiKeyModal — Modal para criar ou editar uma API Key
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import {
  X, Bot, Save, Check, Eye, EyeOff, Copy, AlertTriangle, ChevronDown,
} from 'lucide-react';
import {
  createApiKey, updateApiKey,
  type ApiKey, type CreateApiKeyInput, type IntegracaoTipo, type Permissoes,
  DEFAULT_PERMISSOES,
} from '../../../../lib/apiKeys';

const MODULOS_OPCOES = [
  { id: 'crm',        label: 'CRM' },
  { id: 'erp',        label: 'ERP' },
  { id: 'rh',         label: 'RH' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'scm',        label: 'SCM (Logística)' },
  { id: 'eam',        label: 'EAM (Ativos)' },
  { id: 'ia',         label: 'IA' },
];

const INTEGRACAO_OPCOES: { value: IntegracaoTipo | ''; label: string }[] = [
  { value: '',         label: 'Selecione o tipo...' },
  { value: 'flowise',  label: 'Flowise' },
  { value: 'n8n',      label: 'n8n' },
  { value: 'make',     label: 'Make (Integromat)' },
  { value: 'runway',   label: 'Runway' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'excel',    label: 'Excel / Power Automate' },
  { value: 'webhook',  label: 'Webhook genérico' },
  { value: 'custom',   label: 'Custom (outro)' },
];

interface Employee { id: string; nome: string; }

interface Props {
  tenantId: string;
  editKey?: ApiKey | null;
  employees?: Employee[];
  criadorId?: string;
  onClose: () => void;
  onCreated: (key: ApiKey, rawKey: string) => void;
  onUpdated: (key: ApiKey) => void;
}

interface WaConfig {
  provider: 'zapi' | 'twilio';
  instanceUrl: string;
  token: string;
  accountSid: string;
  authToken: string;
  from: string;
}

interface FormState {
  nome: string;
  descricao: string;
  integracao_tipo: IntegracaoTipo | '';
  integracao_url: string;
  employee_id: string;
  status: 'ativo' | 'inativo';
  permissoes: Permissoes;
  wa: WaConfig;
}

function Toggle({ value, onChange, label, help }: {
  value: boolean; onChange: (v: boolean) => void; label: string; help?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm text-slate-700">{label}</p>
        {help && <p className="text-[11px] text-slate-400">{help}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${value ? 'bg-indigo-600' : 'bg-slate-200'}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export default function ApiKeyModal({
  tenantId, editKey, employees = [], criadorId, onClose, onCreated, onUpdated,
}: Props) {
  const isEdit = !!editKey;
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(() => ({
    nome:           editKey?.nome           ?? '',
    descricao:      editKey?.descricao      ?? '',
    integracao_tipo: (editKey?.integracao_tipo ?? '') as IntegracaoTipo | '',
    integracao_url: editKey?.integracao_url  ?? '',
    employee_id:    editKey?.employee_id     ?? '',
    status:         (editKey?.status as 'ativo' | 'inativo') ?? 'ativo',
    permissoes: editKey?.permissoes ?? { ...DEFAULT_PERMISSOES },
    wa: {
      provider:    (editKey?.integracao_config?.provider as 'zapi' | 'twilio') ?? 'zapi',
      instanceUrl: (editKey?.integracao_config?.instanceUrl as string) ?? '',
      token:       (editKey?.integracao_config?.token as string) ?? '',
      accountSid:  (editKey?.integracao_config?.accountSid as string) ?? '',
      authToken:   (editKey?.integracao_config?.authToken as string) ?? '',
      from:        (editKey?.integracao_config?.from as string) ?? '',
    },
  }));

  function setPermissao<
    G extends keyof Permissoes,
    K extends keyof Permissoes[G]
  >(group: G, key: K, value: Permissoes[G][K]) {
    setForm(prev => ({
      ...prev,
      permissoes: {
        ...prev.permissoes,
        [group]: { ...prev.permissoes[group], [key]: value },
      },
    }));
  }

  function toggleModulo(id: string) {
    setForm(prev => {
      const mods = prev.permissoes.modulos;
      const updated = mods.includes(id) ? mods.filter(m => m !== id) : [...mods, id];
      return { ...prev, permissoes: { ...prev.permissoes, modulos: updated } };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { setError('Nome obrigatório'); return; }
    setSaving(true);
    setError(null);

    const waConfig = form.integracao_tipo === 'whatsapp'
      ? { provider: form.wa.provider, instanceUrl: form.wa.instanceUrl, token: form.wa.token, accountSid: form.wa.accountSid, authToken: form.wa.authToken, from: form.wa.from }
      : undefined;

    try {
      if (isEdit && editKey) {
        const updated = await updateApiKey(editKey.id, {
          nome:             form.nome.trim(),
          descricao:        form.descricao.trim() || null,
          integracao_tipo:  form.integracao_tipo || null,
          integracao_url:   form.integracao_url.trim() || null,
          employee_id:      form.employee_id || null,
          status:           form.status,
          permissoes:       form.permissoes,
          integracao_config: waConfig ?? editKey.integracao_config,
        });
        onUpdated(updated);
      } else {
        const input: CreateApiKeyInput = {
          tenant_id:        tenantId,
          nome:             form.nome.trim(),
          descricao:        form.descricao.trim() || undefined,
          integracao_tipo:  form.integracao_tipo || null,
          integracao_url:   form.integracao_url.trim() || undefined,
          employee_id:      form.employee_id || null,
          permissoes:       form.permissoes,
          criado_por:       criadorId,
          integracao_config: waConfig,
        };
        const { key: created, rawKey } = await createApiKey(input);
        onCreated(created, rawKey);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  // Fechar com ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const p = form.permissoes;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-slate-800">
              {isEdit ? 'Editar API Key' : 'Nova API Key'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-6">

            {/* Info básica */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Informações básicas</h3>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Nome da IA *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  placeholder="ex: Assistente Vendas - Flowise"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Descreva a finalidade desta integração..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>

              {/* Tipo de integração */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Tipo de integração</label>
                <div className="relative">
                  <select
                    value={form.integracao_tipo}
                    onChange={e => setForm(p => ({ ...p, integracao_tipo: e.target.value as IntegracaoTipo | '' }))}
                    className="w-full appearance-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    {INTEGRACAO_OPCOES.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* URL da integração */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">URL da integração</label>
                <input
                  type="url"
                  value={form.integracao_url}
                  onChange={e => setForm(p => ({ ...p, integracao_url: e.target.value }))}
                  placeholder="ex: https://flowise.minhaempresa.com/api/..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* WhatsApp config fields */}
              {form.integracao_tipo === 'whatsapp' && (
                <div className="space-y-3 p-4 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Configuração WhatsApp</p>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700">Provider</label>
                    <div className="flex gap-2">
                      {(['zapi', 'twilio'] as const).map(pv => (
                        <button key={pv} type="button"
                          onClick={() => setForm(p => ({ ...p, wa: { ...p.wa, provider: pv } }))}
                          className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${form.wa.provider === pv ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200 hover:border-green-400'}`}
                        >
                          {pv === 'zapi' ? 'Z-API' : 'Twilio'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {form.wa.provider === 'zapi' ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-slate-700">Instance URL</label>
                        <input value={form.wa.instanceUrl} onChange={e => setForm(p => ({ ...p, wa: { ...p.wa, instanceUrl: e.target.value } }))}
                          placeholder="https://api.z-api.io/instances/SEU_ID/token/SEU_TOKEN"
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-slate-700">Client Token</label>
                        <input type="password" value={form.wa.token} onChange={e => setForm(p => ({ ...p, wa: { ...p.wa, token: e.target.value } }))}
                          placeholder="Seu client-token Z-API"
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-slate-700">Account SID</label>
                        <input value={form.wa.accountSid} onChange={e => setForm(p => ({ ...p, wa: { ...p.wa, accountSid: e.target.value } }))}
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-slate-700">Auth Token</label>
                        <input type="password" value={form.wa.authToken} onChange={e => setForm(p => ({ ...p, wa: { ...p.wa, authToken: e.target.value } }))}
                          placeholder="Seu Auth Token Twilio"
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-slate-700">Número remetente</label>
                        <input value={form.wa.from} onChange={e => setForm(p => ({ ...p, wa: { ...p.wa, from: e.target.value } }))}
                          placeholder="+5511999999999"
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Funcionário IA */}
              {employees.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Funcionário IA vinculado</label>
                  <div className="relative">
                    <select
                      value={form.employee_id}
                      onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))}
                      className="w-full appearance-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    >
                      <option value="">Nenhum (IA sem funcionário vinculado)</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.nome}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Vincula esta IA a um perfil de funcionário para fins de auditoria e logs.
                  </p>
                </div>
              )}

              {/* Status (somente edição) */}
              {isEdit && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Status</label>
                  <div className="flex gap-2">
                    {(['ativo', 'inativo'] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, status: s }))}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          form.status === s
                            ? s === 'ativo'
                              ? 'bg-green-600 text-white'
                              : 'bg-amber-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {s === 'ativo' ? 'Ativo' : 'Inativo'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Módulos */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Módulos permitidos</h3>
              <p className="text-[12px] text-slate-400">
                Deixe todos desmarcados para permitir acesso a todos os módulos.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {MODULOS_OPCOES.map(m => {
                  const checked = p.modulos.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleModulo(m.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors text-left ${
                        checked
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                        checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                      }`}>
                        {checked && <Check className="w-3 h-3 text-white" />}
                      </div>
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Ações */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Ações permitidas</h3>
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <Toggle
                  value={p.acoes.ler}
                  onChange={v => setPermissao('acoes', 'ler', v)}
                  label="Ler dados"
                  help="Consultar registros (GET)"
                />
                <Toggle
                  value={p.acoes.criar}
                  onChange={v => setPermissao('acoes', 'criar', v)}
                  label="Criar registros"
                  help="Inserir novos dados"
                />
                <Toggle
                  value={p.acoes.editar}
                  onChange={v => setPermissao('acoes', 'editar', v)}
                  label="Editar registros"
                  help="Atualizar dados existentes"
                />
                <Toggle
                  value={p.acoes.deletar}
                  onChange={v => setPermissao('acoes', 'deletar', v)}
                  label="Deletar registros"
                  help="Remover dados permanentemente"
                />
              </div>
            </section>

            {/* WhatsApp */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">WhatsApp</h3>
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <Toggle
                  value={p.whatsapp.ler_mensagens}
                  onChange={v => setPermissao('whatsapp', 'ler_mensagens', v)}
                  label="Ler mensagens"
                  help="Acesso ao histórico de conversas"
                />
                <Toggle
                  value={p.whatsapp.enviar_mensagens}
                  onChange={v => setPermissao('whatsapp', 'enviar_mensagens', v)}
                  label="Enviar mensagens"
                  help="Enviar em resposta a uma mensagem recebida"
                />
                <Toggle
                  value={p.whatsapp.enviar_sem_comando}
                  onChange={v => setPermissao('whatsapp', 'enviar_sem_comando', v)}
                  label="Enviar sem comando"
                  help="Enviar proativamente sem trigger do cliente"
                />
              </div>
            </section>

            {/* Webhooks */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Webhooks</h3>
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <Toggle
                  value={p.webhooks.receber}
                  onChange={v => setPermissao('webhooks', 'receber', v)}
                  label="Receber webhooks"
                />
                <Toggle
                  value={p.webhooks.enviar}
                  onChange={v => setPermissao('webhooks', 'enviar', v)}
                  label="Disparar webhooks externos"
                />
              </div>
            </section>

            {/* Rate limits */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Rate Limits</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Requests / minuto</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={p.rate_limit.requests_por_minuto}
                    onChange={e => setPermissao('rate_limit', 'requests_por_minuto', parseInt(e.target.value, 10) || 60)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Requests / dia</label>
                  <input
                    type="number"
                    min={1}
                    max={1000000}
                    value={p.rate_limit.requests_por_dia}
                    onChange={e => setPermissao('rate_limit', 'requests_por_dia', parseInt(e.target.value, 10) || 10000)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
            </section>

            {/* Aviso criação */}
            {!isEdit && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-[12px] text-amber-700">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <p>
                  A chave de API será exibida <strong>uma única vez</strong> após a criação.
                  Copie e guarde em lugar seguro — não será possível ver novamente.
                </p>
              </div>
            )}

            {/* Erro */}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            {saving
              ? <><Save className="w-4 h-4 animate-pulse" /> Salvando...</>
              : <><Save className="w-4 h-4" /> {isEdit ? 'Salvar alterações' : 'Criar chave'}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de exibição da chave após criação ────────────────────────────────────

interface KeyRevealProps { rawKey: string; onClose: () => void; }

export function ApiKeyRevealModal({ rawKey, onClose }: KeyRevealProps) {
  const [copied, setCopied] = useState(false);
  const [show, setShow]     = useState(false);

  function doCopy() {
    navigator.clipboard.writeText(rawKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="font-bold text-slate-800 text-lg mb-1">Chave criada com sucesso!</h2>
          <p className="text-[13px] text-slate-500">
            Esta é a <strong>única vez</strong> que a chave completa será exibida. Copie e guarde em local seguro.
          </p>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-y border-slate-100">
          <div className="flex items-center gap-2">
            <code className={`flex-1 text-[12px] font-mono text-slate-700 break-all ${show ? '' : 'blur-sm select-none'}`}>
              {rawKey}
            </code>
            <button
              onClick={() => setShow(s => !s)}
              className="p-2 rounded-xl hover:bg-slate-200 text-slate-400 transition-colors shrink-0"
              title={show ? 'Ocultar' : 'Revelar'}
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="px-6 py-4 flex gap-3">
          <button
            onClick={doCopy}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado!' : 'Copiar chave'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

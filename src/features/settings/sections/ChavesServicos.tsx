// ─────────────────────────────────────────────────────────────────────────────
// ChavesServicos — Chaves de API para serviços externos
// Módulos do sistema consultam essas chaves via getServiceApiKey(service)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import {
  Key, Plus, Pencil, Trash2, Eye, EyeOff, Check, X,
  ToggleLeft, ToggleRight, AlertCircle, Info,
} from 'lucide-react';
import {
  getAllServiceKeys, addServiceKey, updateServiceKey, removeServiceKey,
  type ServiceKey,
} from '../../../lib/serviceKeys';

// ── Serviços conhecidos ────────────────────────────────────────────────────────
const KNOWN_SERVICES = [
  { service: 'serasa',          label: 'Serasa Experian',         desc: 'Consulta de crédito e score empresarial' },
  { service: 'google-search',   label: 'Google Custom Search API', desc: 'Busca web para prospecção de leads'       },
  { service: 'receita-ws',      label: 'ReceitaWS / BrasilAPI',   desc: 'Consulta de CNPJ (plano pago)'           },
  { service: 'cnpj-ws',         label: 'CNPJ.ws',                 desc: 'Dados de CNPJ em tempo real'             },
  { service: 'asaas',           label: 'Asaas',                   desc: 'PIX, boleto e cartão de crédito'         },
  { service: 'evolution-api',   label: 'Evolution API',           desc: 'WhatsApp Business'                       },
  { service: 'focus-nfe',       label: 'Focus NFe',               desc: 'Emissão de NF-e e NFS-e'                },
  { service: 'google-maps',     label: 'Google Maps / Places',    desc: 'Geocodificação e dados de endereço'      },
  { service: 'openai',          label: 'OpenAI',                  desc: 'GPT-4 para módulos de IA'               },
  { service: 'custom',          label: 'Serviço personalizado',   desc: 'Outro serviço externo'                   },
];

// ── Form modal ─────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  service: string;
  apiKey: string;
  endpoint: string;
  description: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: '', service: '', apiKey: '', endpoint: '', description: '', isActive: true,
};

function KeyModal({
  editing,
  onSave,
  onClose,
}: {
  editing: ServiceKey | null;
  onSave: (data: Omit<ServiceKey, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    editing
      ? { name: editing.name, service: editing.service, apiKey: editing.apiKey, endpoint: editing.endpoint ?? '', description: editing.description ?? '', isActive: editing.isActive }
      : EMPTY_FORM,
  );
  const [showKey, setShowKey] = useState(false);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  function set(field: keyof FormState, value: string | boolean) {
    setForm(p => ({ ...p, [field]: value }));
    setErrors(p => ({ ...p, [field]: '' }));
  }

  function handleServiceChange(svc: string) {
    const known = KNOWN_SERVICES.find(s => s.service === svc);
    set('service', svc);
    if (!editing && known && svc !== 'custom') {
      set('name', known.label);
      set('description', known.desc);
    }
  }

  function validate(): boolean {
    const e: Partial<FormState> = {};
    if (!form.name.trim()) e.name = 'Obrigatório';
    if (!form.service.trim()) e.service = 'Obrigatório';
    if (!form.apiKey.trim()) e.apiKey = 'Obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave({
      name: form.name.trim(),
      service: form.service.trim().toLowerCase().replace(/\s+/g, '-'),
      apiKey: form.apiKey.trim(),
      endpoint: form.endpoint.trim() || undefined,
      description: form.description.trim() || undefined,
      isActive: form.isActive,
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">{editing ? 'Editar chave' : 'Nova chave de API'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Serviço */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Serviço</label>
            <select
              value={form.service}
              onChange={e => handleServiceChange(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
            >
              <option value="">Selecione...</option>
              {KNOWN_SERVICES.map(s => (
                <option key={s.service} value={s.service}>{s.label}</option>
              ))}
            </select>
            {form.service === 'custom' && (
              <input
                value={form.service === 'custom' ? '' : form.service}
                onChange={e => set('service', e.target.value)}
                placeholder="Slug do serviço (ex: meu-servico)"
                className="mt-2 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
              />
            )}
            {errors.service && <p className="text-xs text-red-500 mt-1">{errors.service}</p>}
          </div>

          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome de exibição</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ex: Serasa Experian"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Chave de API */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Chave de API / Token</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={form.apiKey}
                onChange={e => set('apiKey', e.target.value)}
                placeholder="Cole sua chave aqui"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.apiKey && <p className="text-xs text-red-500 mt-1">{errors.apiKey}</p>}
          </div>

          {/* Endpoint (opcional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">URL do endpoint <span className="text-slate-400 font-normal">(opcional)</span></label>
            <input
              value={form.endpoint}
              onChange={e => set('endpoint', e.target.value)}
              placeholder="https://api.exemplo.com/v1"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição <span className="text-slate-400 font-normal">(opcional)</span></label>
            <input
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Para que serve esta chave?"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
            />
          </div>

          {/* Ativo */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <span className="text-sm font-semibold text-slate-700">Chave ativa</span>
            <button onClick={() => set('isActive', !form.isActive)} className="text-slate-400">
              {form.isActive
                ? <ToggleRight className="w-8 h-8 text-indigo-500" />
                : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancelar</button>
          <button onClick={handleSubmit} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── KeyCard ────────────────────────────────────────────────────────────────────

function KeyCard({
  svcKey,
  onEdit,
  onToggle,
  onDelete,
}: {
  svcKey: ServiceKey;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const maskedKey = svcKey.apiKey.length > 8
    ? `${svcKey.apiKey.slice(0, 4)}${'•'.repeat(Math.min(20, svcKey.apiKey.length - 8))}${svcKey.apiKey.slice(-4)}`
    : '••••••••';

  const known = KNOWN_SERVICES.find(s => s.service === svcKey.service);

  return (
    <div className={`bg-white rounded-2xl border p-4 transition-all ${svcKey.isActive ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${svcKey.isActive ? 'bg-indigo-50' : 'bg-slate-100'}`}>
          <Key className={`w-5 h-5 ${svcKey.isActive ? 'text-indigo-500' : 'text-slate-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-800 text-sm">{svcKey.name}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${svcKey.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {svcKey.isActive ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Serviço: <span className="font-mono">{svcKey.service}</span>
            {known && ` · ${known.desc}`}
          </p>
          {svcKey.description && !known && (
            <p className="text-[11px] text-slate-400 mt-0.5">{svcKey.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <code className="text-xs font-mono bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-slate-600 flex-1 truncate">
              {showKey ? svcKey.apiKey : maskedKey}
            </code>
            <button onClick={() => setShowKey(v => !v)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0">
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          {svcKey.endpoint && (
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              Endpoint: <span className="font-mono">{svcKey.endpoint}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors" title={svcKey.isActive ? 'Desativar' : 'Ativar'}>
            {svcKey.isActive ? <ToggleRight className="w-5 h-5 text-indigo-500" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ChavesServicos() {
  const [keys, setKeys] = useState<ServiceKey[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ServiceKey | null>(null);

  function refresh() { setKeys(getAllServiceKeys()); }
  useEffect(() => { refresh(); }, []);

  function handleSave(data: Omit<ServiceKey, 'id' | 'createdAt'>) {
    if (editing) {
      updateServiceKey(editing.id, data);
    } else {
      addServiceKey(data);
    }
    setShowModal(false);
    setEditing(null);
    refresh();
  }

  function handleEdit(k: ServiceKey) {
    setEditing(k);
    setShowModal(true);
  }

  function handleToggle(k: ServiceKey) {
    updateServiceKey(k.id, { isActive: !k.isActive });
    refresh();
  }

  function handleDelete(k: ServiceKey) {
    if (confirm(`Remover a chave "${k.name}"?`)) {
      removeServiceKey(k.id);
      refresh();
    }
  }

  function openNew() {
    setEditing(null);
    setShowModal(true);
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Chaves de Serviços Externos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie as chaves de API que os módulos usam para consultas externas
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nova chave
        </button>
      </div>

      {/* Aviso de segurança */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          As chaves são armazenadas localmente neste navegador. Para uso em produção com múltiplos usuários, configure as chaves via <strong>API &amp; IAs → Serviços Externos</strong>.
        </p>
      </div>

      {/* Como funciona */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl mb-6">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700 space-y-1">
          <p><strong>Como usar:</strong> Adicione a chave do serviço desejado e os módulos do ZITA usarão automaticamente.</p>
          <p>Exemplo: a chave <code className="font-mono bg-blue-100 px-1 rounded">serasa</code> será usada pela IA de Prospecção para consultar dados reais de crédito.</p>
        </div>
      </div>

      {/* Lista de chaves */}
      {keys.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Key className="w-7 h-7 text-slate-400" />
          </div>
          <p className="font-semibold text-slate-700 mb-1">Nenhuma chave configurada</p>
          <p className="text-sm text-slate-400 mb-4">Adicione chaves de API para habilitar integrações reais nos módulos.</p>
          <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> Adicionar primeira chave
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map(k => (
            <KeyCard
              key={k.id}
              svcKey={k}
              onEdit={() => handleEdit(k)}
              onToggle={() => handleToggle(k)}
              onDelete={() => handleDelete(k)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <KeyModal
          editing={editing}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

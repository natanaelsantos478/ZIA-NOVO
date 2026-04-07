// ─────────────────────────────────────────────────────────────────────────────
// Settings > Alertas — Configuração global do sistema de alertas
// Abas: Tipos de Alerta · Alertas Ativos · Regras da IA
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  Plus, Trash2, Bell, AlertCircle, AlertTriangle, Info, Shield, Zap, X,
  Check, Monitor, Layers, Radio, Bot, ToggleLeft, ToggleRight,
} from 'lucide-react';
import {
  useAlerts,
  type AlertType, type AlertColor, type AlertIcon, type AlertChannel, type AIAlertRule,
} from '../../../context/AlertContext';

/* ── Constants ───────────────────────────────────────────────────────────────── */

const COLOR_OPTIONS: { value: AlertColor; label: string; cls: string }[] = [
  { value: 'red',    label: 'Vermelho', cls: 'bg-red-500'    },
  { value: 'amber',  label: 'Âmbar',   cls: 'bg-amber-500'  },
  { value: 'blue',   label: 'Azul',    cls: 'bg-blue-500'   },
  { value: 'green',  label: 'Verde',   cls: 'bg-green-500'  },
  { value: 'purple', label: 'Roxo',    cls: 'bg-purple-500' },
  { value: 'indigo', label: 'Índigo',  cls: 'bg-indigo-500' },
  { value: 'rose',   label: 'Rosa',    cls: 'bg-rose-500'   },
  { value: 'slate',  label: 'Cinza',   cls: 'bg-slate-500'  },
];

const ICON_OPTIONS: { value: AlertIcon; Icon: React.ElementType }[] = [
  { value: 'alert-circle',   Icon: AlertCircle   },
  { value: 'alert-triangle', Icon: AlertTriangle  },
  { value: 'bell',           Icon: Bell           },
  { value: 'zap',            Icon: Zap            },
  { value: 'shield',         Icon: Shield         },
  { value: 'info',           Icon: Info           },
  { value: 'x-circle',       Icon: X              },
];

const CHANNEL_OPTIONS: { value: AlertChannel; label: string; desc: string; Icon: React.ElementType }[] = [
  { value: 'notification', label: 'Notificação',      desc: 'Sininho no Header — não interrompe',         Icon: Bell    },
  { value: 'banner',       label: 'Banner Inline',    desc: 'Faixa no topo do módulo ativo',              Icon: Layers  },
  { value: 'fullscreen',   label: 'Tela Cheia',       desc: 'Bloqueia a tela até o usuário confirmar',    Icon: Monitor },
];

const MODULE_OPTIONS = ['RH','CRM','SCM','ERP','EAM','QUALIDADE','DOCS','IA','TODOS'];
const LEVEL_LABELS: Record<number, string> = { 1: 'Holding', 2: 'Matriz', 3: 'Filial', 4: 'Funcionário' };

function iconComponent(icon: AlertIcon, className = 'w-4 h-4') {
  const map: Record<AlertIcon, React.ElementType> = {
    'alert-circle': AlertCircle, 'alert-triangle': AlertTriangle,
    'bell': Bell, 'zap': Zap, 'shield': Shield, 'info': Info, 'x-circle': X,
  };
  const Icon = map[icon] ?? Bell;
  return <Icon className={className} />;
}

const COLOR_BG: Record<AlertColor, string> = {
  red: 'bg-red-100 text-red-700', amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700', green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700', indigo: 'bg-indigo-100 text-indigo-700',
  rose: 'bg-rose-100 text-rose-700', slate: 'bg-slate-100 text-slate-600',
};

/* ── Blank forms ─────────────────────────────────────────────────────────────── */

const BLANK_TYPE: Omit<AlertType, 'id' | 'createdAt'> = {
  name: '', description: '', color: 'blue', icon: 'bell',
  channel: 'notification', visibleToLevels: [1,2,3,4],
  requiresAck: false, playSound: false,
};

const BLANK_RULE: Omit<AIAlertRule, 'id' | 'createdAt'> = {
  name: '', condition: '', sourceModule: 'TODOS', alertTypeId: '', active: true,
};

/* ── Tab: Tipos de Alerta ────────────────────────────────────────────────────── */

function TiposTab() {
  const { alertTypes, addAlertType, updateAlertType, removeAlertType } = useAlerts();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<AlertType,'id'|'createdAt'>>(BLANK_TYPE);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  function set(p: Partial<typeof BLANK_TYPE>) { setForm(prev => ({ ...prev, ...p })); }

  function toggleLevel(l: number) {
    set({ visibleToLevels: form.visibleToLevels.includes(l) ? form.visibleToLevels.filter(v => v !== l) : [...form.visibleToLevels, l] });
  }

  function handleSave() {
    if (!form.name.trim()) return;
    if (editId) updateAlertType(editId, form); else addAlertType(form);
    setShowForm(false); setEditId(null); setForm(BLANK_TYPE);
  }

  function handleEdit(t: AlertType) {
    setForm({ name: t.name, description: t.description, color: t.color, icon: t.icon,
      channel: t.channel, visibleToLevels: t.visibleToLevels, requiresAck: t.requiresAck, playSound: t.playSound });
    setEditId(t.id); setShowForm(true);
  }

  const INPUT = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{alertTypes.length} tipo(s) configurado(s)</p>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(BLANK_TYPE); }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700">
          <Plus className="w-4 h-4" /> Novo Tipo
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <h3 className="font-bold text-slate-800">{editId ? 'Editar Tipo' : 'Novo Tipo de Alerta'}</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Nome *</label>
              <input value={form.name} onChange={e => set({ name: e.target.value })} placeholder="Ex: Crítico, Informativo..." className={`mt-1 ${INPUT}`} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Descrição</label>
              <input value={form.description} onChange={e => set({ description: e.target.value })} placeholder="Para que serve este tipo?" className={`mt-1 ${INPUT}`} />
            </div>

            {/* Cor */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Cor</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button key={c.value} onClick={() => set({ color: c.value })} title={c.label}
                    className={`w-7 h-7 rounded-full ${c.cls} ${form.color === c.value ? 'ring-2 ring-offset-2 ring-slate-600' : ''}`} />
                ))}
              </div>
            </div>

            {/* Ícone */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Ícone</label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map(({ value, Icon }) => (
                  <button key={value} onClick={() => set({ icon: value })}
                    className={`p-2 rounded-lg border transition-all ${form.icon === value ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 text-slate-500 hover:border-slate-400'}`}>
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Canal */}
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Canal de Entrega *</label>
              <div className="grid grid-cols-3 gap-2">
                {CHANNEL_OPTIONS.map(ch => (
                  <label key={ch.value} className={`flex flex-col gap-1 p-3 border rounded-xl cursor-pointer transition-all ${form.channel === ch.value ? 'border-slate-800 bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="channel" value={ch.value} checked={form.channel === ch.value} onChange={() => set({ channel: ch.value })} className="sr-only" />
                    <div className="flex items-center gap-2"><ch.Icon className="w-4 h-4 text-slate-600" /><span className="text-sm font-semibold text-slate-700">{ch.label}</span></div>
                    <span className="text-[11px] text-slate-400">{ch.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Níveis visíveis */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Visível para níveis</label>
              <div className="flex gap-2">
                {[1,2,3,4].map(l => (
                  <button key={l} onClick={() => toggleLevel(l)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${form.visibleToLevels.includes(l) ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-500 hover:border-slate-400'}`}>
                    {LEVEL_LABELS[l]}
                  </button>
                ))}
              </div>
            </div>

            {/* Opções */}
            <div className="flex flex-col gap-3 justify-end">
              {form.channel === 'fullscreen' && (
                <div className="flex items-center gap-3">
                  <button onClick={() => set({ requiresAck: !form.requiresAck })} className={`relative w-9 h-5 rounded-full transition-colors ${form.requiresAck ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.requiresAck ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm text-slate-600">Exige confirmação</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button onClick={() => set({ playSound: !form.playSound })} className={`relative w-9 h-5 rounded-full transition-colors ${form.playSound ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.playSound ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-slate-600">Tocar som</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
            <button onClick={handleSave} disabled={!form.name.trim()} className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-slate-800 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50">
              <Check className="w-4 h-4" /> {editId ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {alertTypes.map(t => (
          <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${COLOR_BG[t.color]}`}>
              {iconComponent(t.icon)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-900 text-sm">{t.name}</span>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{CHANNEL_OPTIONS.find(c => c.value === t.channel)?.label}</span>
                {t.requiresAck && <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">Exige confirmação</span>}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{t.description || 'Sem descrição'} · Níveis: {t.visibleToLevels.join(', ')}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => handleEdit(t)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Editar"><Zap className="w-4 h-4" /></button>
              {confirm === t.id
                ? <div className="flex gap-1">
                    <button onClick={() => { removeAlertType(t.id); setConfirm(null); }} className="px-2 py-1 text-[10px] bg-red-600 text-white rounded-lg font-semibold">Excluir</button>
                    <button onClick={() => setConfirm(null)} className="px-2 py-1 text-[10px] bg-slate-100 text-slate-600 rounded-lg">Cancelar</button>
                  </div>
                : <button onClick={() => setConfirm(t.id)} className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Tab: Regras da IA ───────────────────────────────────────────────────────── */

function RegrasIATab() {
  const { alertTypes, aiRules, addAIRule, updateAIRule, removeAIRule } = useAlerts();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<AIAlertRule,'id'|'createdAt'>>(BLANK_RULE);
  const [confirm, setConfirm] = useState<string | null>(null);

  function set(p: Partial<typeof BLANK_RULE>) { setForm(prev => ({ ...prev, ...p })); }

  function handleSave() {
    if (!form.name.trim() || !form.condition.trim() || !form.alertTypeId) return;
    addAIRule(form); setShowForm(false); setForm(BLANK_RULE);
  }

  const INPUT = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white';

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-700 flex items-start gap-3">
        <Bot className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-0.5">Regras da IA ZIA</p>
          <p className="text-xs text-indigo-600">Configure condições em linguagem natural. A IA monitora continuamente e dispara o tipo de alerta escolhido quando a condição for identificada.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700">
          <Plus className="w-4 h-4" /> Nova Regra
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800">Nova Regra da IA</h3>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Nome da Regra *</label>
            <input value={form.name} onChange={e => set({ name: e.target.value })} placeholder="Ex: Negociação em risco de perda" className={`mt-1 ${INPUT}`} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Condição (linguagem natural) *</label>
            <textarea value={form.condition} onChange={e => set({ condition: e.target.value })}
              placeholder="Ex: Quando uma negociação ficar sem resposta por mais de 5 dias, gerar alerta de atenção para o gerente responsável."
              rows={3} className={`mt-1 ${INPUT} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Módulo de Origem</label>
              <select value={form.sourceModule} onChange={e => set({ sourceModule: e.target.value })} className={`mt-1 ${INPUT}`}>
                {MODULE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Tipo de Alerta *</label>
              <select value={form.alertTypeId} onChange={e => set({ alertTypeId: e.target.value })} className={`mt-1 ${INPUT}`}>
                <option value="">Selecionar...</option>
                {alertTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
            <button onClick={handleSave} disabled={!form.name.trim() || !form.condition.trim() || !form.alertTypeId}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-slate-800 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50">
              <Check className="w-4 h-4" /> Criar Regra
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {aiRules.map(r => {
          const tipo = alertTypes.find(t => t.id === r.alertTypeId);
          return (
            <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0"><Bot className="w-5 h-5 text-indigo-600" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 text-sm">{r.name}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{r.sourceModule}</span>
                  {tipo && <span className={`text-[10px] px-2 py-0.5 rounded-full ${COLOR_BG[tipo.color]}`}>{tipo.name}</span>}
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{r.condition}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => updateAIRule(r.id, { active: !r.active })}
                  className={`p-2 rounded-lg transition-colors ${r.active ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`} title={r.active ? 'Ativa' : 'Inativa'}>
                  {r.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                {confirm === r.id
                  ? <div className="flex gap-1">
                      <button onClick={() => { removeAIRule(r.id); setConfirm(null); }} className="px-2 py-1 text-[10px] bg-red-600 text-white rounded-lg font-semibold">Excluir</button>
                      <button onClick={() => setConfirm(null)} className="px-2 py-1 text-[10px] bg-slate-100 text-slate-600 rounded-lg">Cancelar</button>
                    </div>
                  : <button onClick={() => setConfirm(r.id)} className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                }
              </div>
            </div>
          );
        })}
        {aiRules.length === 0 && <p className="text-sm text-slate-400 text-center py-8">Nenhuma regra de IA configurada.</p>}
      </div>
    </div>
  );
}

/* ── Tab: Alertas Ativos ─────────────────────────────────────────────────────── */

function AlertasAtivosTab() {
  const { systemAlerts, markSystemRead, clearSystemAlerts, alertTypes } = useAlerts();
  const sorted = [...systemAlerts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{systemAlerts.filter(a => !a.read).length} não lido(s) · {systemAlerts.length} total</p>
        {systemAlerts.length > 0 && (
          <button onClick={clearSystemAlerts} className="text-xs text-red-500 hover:text-red-700 font-medium">Limpar todos</button>
        )}
      </div>
      {sorted.length === 0 && <p className="text-sm text-slate-400 text-center py-12">Nenhum alerta disparado ainda.</p>}
      <div className="space-y-2">
        {sorted.map(a => {
          const tipo = alertTypes.find(t => t.id === a.typeId);
          return (
            <div key={a.id} className={`bg-white border rounded-2xl p-4 flex items-start gap-4 transition-opacity ${a.read ? 'opacity-60 border-slate-100' : 'border-slate-200'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tipo ? COLOR_BG[tipo.color] : 'bg-slate-100 text-slate-500'}`}>
                {tipo ? iconComponent(tipo.icon) : <Bell className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 text-sm">{a.title}</span>
                  {!a.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{a.sourceModule}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{CHANNEL_OPTIONS.find(c => c.value === a.channel)?.label}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{a.message}</p>
                <p className="text-[10px] text-slate-400 mt-1">{new Date(a.createdAt).toLocaleString('pt-BR')}</p>
              </div>
              {!a.read && (
                <button onClick={() => markSystemRead(a.id)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 shrink-0" title="Marcar como lido">
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────────────────── */

const TABS = [
  { id: 'tipos',    label: 'Tipos de Alerta', Icon: Radio  },
  { id: 'ativos',   label: 'Alertas Ativos',  Icon: Bell   },
  { id: 'ia',       label: 'Regras da IA',    Icon: Bot    },
] as const;
type TabId = typeof TABS[number]['id'];

export default function Alertas() {
  const [tab, setTab] = useState<TabId>('tipos');
  const { systemUnread } = useAlerts();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Configuração de Alertas</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Crie tipos de alerta, configure canais de entrega e defina regras automáticas para a IA
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.Icon className="w-4 h-4" />
            {t.label}
            {t.id === 'ativos' && systemUnread > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{systemUnread}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'tipos'  && <TiposTab />}
      {tab === 'ativos' && <AlertasAtivosTab />}
      {tab === 'ia'     && <RegrasIATab />}
    </div>
  );
}

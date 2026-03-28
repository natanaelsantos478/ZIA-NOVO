import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, X, Tag, MapPin, Bell } from 'lucide-react';
import {
  getCategories, createCategory, deleteCategory,
  getLocations, createLocation, deleteLocation,
  getNotificationRules, saveNotificationRules,
  type AssetCategory, type AssetLocation,
} from '../../../lib/eam';

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm ${type === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
      <span>{msg}</span><button onClick={onClose}><X className="w-4 h-4" /></button>
    </div>
  );
}

const LOCATION_TYPE_LABELS: Record<string, string> = {
  unidade: 'Unidade', predio: 'Prédio', andar: 'Andar', sala: 'Sala', almoxarifado: 'Almoxarifado', externo: 'Externo',
};

const CATEGORY_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#14b8a6', '#f97316'];

type Tab = 'categories' | 'locations' | 'notifications';

export default function AssetSettings() {
  const [tab, setTab] = useState<Tab>('categories');
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
        <p className="text-slate-500 text-sm">Categorias, localizações e regras de alerta</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { id: 'categories', label: 'Categorias', icon: Tag },
          { id: 'locations', label: 'Localizações', icon: MapPin },
          { id: 'notifications', label: 'Alertas', icon: Bell },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'categories' && <CategoriesTab showToast={showToast} />}
      {tab === 'locations' && <LocationsTab showToast={showToast} />}
      {tab === 'notifications' && <NotificationsTab showToast={showToast} />}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ─── Categories ─────────────────────────────────────────────────────────── */

function CategoriesTab({ showToast }: { showToast: (m: string, t?: 'ok' | 'err') => void }) {
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', parent_id: '', color: CATEGORY_COLORS[0], icon: '' });

  async function load() {
    setLoading(true);
    setCategories(await getCategories());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) { showToast('Nome é obrigatório', 'err'); return; }
    setSaving(true);
    try {
      await createCategory({ ...form, parent_id: form.parent_id || undefined });
      setShowForm(false);
      setForm({ name: '', description: '', parent_id: '', color: CATEGORY_COLORS[0], icon: '' });
      await load();
      showToast('Categoria criada!');
    } catch { showToast('Erro ao criar categoria', 'err'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir categoria "${name}"?`)) return;
    try {
      await deleteCategory(id);
      await load();
      showToast('Categoria excluída!');
    } catch { showToast('Não é possível excluir — categoria em uso', 'err'); }
  }

  const roots = categories.filter((c) => !c.parent_id);
  const children = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{categories.length} categorias cadastradas</p>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nova Categoria
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Nova Categoria</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Categoria Pai</label>
              <select value={form.parent_id} onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Raiz (sem pai) —</option>
                {roots.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {CATEGORY_COLORS.map((color) => (
                  <button key={color} type="button" onClick={() => setForm((f) => ({ ...f, color }))}
                    style={{ backgroundColor: color }}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === color ? 'border-slate-800 scale-110' : 'border-transparent'}`} />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
              <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Criando…' : 'Criar'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-5 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : roots.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-slate-400">
            <Tag className="w-10 h-10 mb-2" />
            <p className="text-sm">Nenhuma categoria cadastrada</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {roots.map((cat) => (
              <div key={cat.id}>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color ?? '#94a3b8' }} />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{cat.name}</p>
                      {cat.description && <p className="text-xs text-slate-400">{cat.description}</p>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(cat.id, cat.name)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {children(cat.id).map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between px-4 py-2.5 bg-slate-50/50 border-t border-slate-50">
                    <div className="flex items-center gap-3 pl-6">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sub.color ?? '#94a3b8' }} />
                      <p className="text-sm text-slate-700">{sub.name}</p>
                    </div>
                    <button onClick={() => handleDelete(sub.id, sub.name)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Locations ──────────────────────────────────────────────────────────── */

function LocationsTab({ showToast }: { showToast: (m: string, t?: 'ok' | 'err') => void }) {
  const [locations, setLocations] = useState<AssetLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'sala' as AssetLocation['type'], parent_id: '', address: '' });

  async function load() {
    setLoading(true);
    setLocations(await getLocations());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) { showToast('Nome é obrigatório', 'err'); return; }
    setSaving(true);
    try {
      await createLocation({ ...form, parent_id: form.parent_id || undefined, active: true });
      setShowForm(false);
      setForm({ name: '', type: 'sala', parent_id: '', address: '' });
      await load();
      showToast('Localização criada!');
    } catch { showToast('Erro ao criar localização', 'err'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir localização "${name}"?`)) return;
    try {
      await deleteLocation(id);
      await load();
      showToast('Localização excluída!');
    } catch { showToast('Não é possível excluir — localização em uso', 'err'); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{locations.length} localizações cadastradas</p>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nova Localização
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Nova Localização</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AssetLocation['type'] }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(LOCATION_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Localização Pai</label>
              <select value={form.parent_id} onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Sem pai —</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name} ({LOCATION_TYPE_LABELS[l.type] ?? l.type})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Endereço / Referência</label>
              <input type="text" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Criando…' : 'Criar'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-5 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : locations.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-slate-400">
            <MapPin className="w-10 h-10 mb-2" />
            <p className="text-sm">Nenhuma localização cadastrada</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {locations.map((loc) => {
              const parent = locations.find((l) => l.id === loc.parent_id);
              return (
                <div key={loc.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                      {LOCATION_TYPE_LABELS[loc.type] ?? loc.type}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{loc.name}</p>
                      {parent && <p className="text-xs text-slate-400">Em: {parent.name}</p>}
                      {loc.address && <p className="text-xs text-slate-400">{loc.address}</p>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(loc.id, loc.name)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Notification Rules ─────────────────────────────────────────────────── */

function NotificationsTab({ showToast }: { showToast: (m: string, t?: 'ok' | 'err') => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    warranty_alert_days: [30, 60, 90],
    insurance_alert_days: [30, 60],
    maintenance_alert_days: 7,
    no_responsible_alert_days: 30,
  });
  const [newWarrantyDay, setNewWarrantyDay] = useState('');
  const [newInsuranceDay, setNewInsuranceDay] = useState('');

  useEffect(() => {
    getNotificationRules().then((r) => {
      if (r) {
        setForm({
          warranty_alert_days: r.warranty_alert_days ?? [30, 60, 90],
          insurance_alert_days: r.insurance_alert_days ?? [30, 60],
          maintenance_alert_days: r.maintenance_alert_days ?? 7,
          no_responsible_alert_days: r.no_responsible_alert_days ?? 30,
        });
      }
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await saveNotificationRules(form);
      showToast('Configurações salvas!');
    } catch { showToast('Erro ao salvar', 'err'); }
    finally { setSaving(false); }
  }

  function addDay(field: 'warranty_alert_days' | 'insurance_alert_days', raw: string, clear: () => void) {
    const n = parseInt(raw);
    if (!n || n <= 0) return;
    setForm((f) => ({ ...f, [field]: [...new Set([...f[field], n])].sort((a, b) => a - b) }));
    clear();
  }

  function removeDay(field: 'warranty_alert_days' | 'insurance_alert_days', day: number) {
    setForm((f) => ({ ...f, [field]: f[field].filter((d) => d !== day) }));
  }

  if (loading) return <div className="flex items-center justify-center h-32"><div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 space-y-6">
        <h2 className="text-base font-semibold text-slate-800">Regras de Alertas Automáticos</h2>

        {/* Warranty alerts */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Alertas de Garantia (dias antes do vencimento)</label>
          <p className="text-xs text-slate-400 mb-3">Gera alerta X dias antes da garantia expirar</p>
          <div className="flex gap-2 flex-wrap mb-2">
            {form.warranty_alert_days.map((d) => (
              <span key={d} className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                {d}d
                <button onClick={() => removeDay('warranty_alert_days', d)} className="ml-0.5 hover:text-blue-900"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="number" placeholder="Ex: 15" value={newWarrantyDay} onChange={(e) => setNewWarrantyDay(e.target.value)} min="1"
              className="w-28 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={() => addDay('warranty_alert_days', newWarrantyDay, () => setNewWarrantyDay(''))}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200">
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
          </div>
        </div>

        {/* Insurance alerts */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Alertas de Seguro (dias antes do vencimento)</label>
          <p className="text-xs text-slate-400 mb-3">Gera alerta X dias antes da apólice expirar</p>
          <div className="flex gap-2 flex-wrap mb-2">
            {form.insurance_alert_days.map((d) => (
              <span key={d} className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                {d}d
                <button onClick={() => removeDay('insurance_alert_days', d)} className="ml-0.5 hover:text-amber-900"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="number" placeholder="Ex: 45" value={newInsuranceDay} onChange={(e) => setNewInsuranceDay(e.target.value)} min="1"
              className="w-28 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={() => addDay('insurance_alert_days', newInsuranceDay, () => setNewInsuranceDay(''))}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200">
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
          </div>
        </div>

        {/* Maintenance alert */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Alerta de Manutenção Preventiva</label>
          <p className="text-xs text-slate-400 mb-2">Gera alerta X dias antes da manutenção estar prevista</p>
          <div className="flex items-center gap-2">
            <input type="number" value={form.maintenance_alert_days} min="1" max="90"
              onChange={(e) => setForm((f) => ({ ...f, maintenance_alert_days: parseInt(e.target.value) || 7 }))}
              className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <span className="text-sm text-slate-500">dias de antecedência</span>
          </div>
        </div>

        {/* No responsible alert */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Alerta de Ativo sem Responsável</label>
          <p className="text-xs text-slate-400 mb-2">Gera alerta se um ativo estiver sem responsável há X dias</p>
          <div className="flex items-center gap-2">
            <input type="number" value={form.no_responsible_alert_days} min="1" max="365"
              onChange={(e) => setForm((f) => ({ ...f, no_responsible_alert_days: parseInt(e.target.value) || 30 }))}
              className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <span className="text-sm text-slate-500">dias sem responsável</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Salvando…' : 'Salvar Configurações'}
          </button>
        </div>
      </div>
    </div>
  );
}

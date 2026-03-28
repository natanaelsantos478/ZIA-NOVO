import { useEffect, useState, useCallback } from 'react';
import { ClipboardList, Plus, Play, CheckCircle, Search, X } from 'lucide-react';
import {
  getInventories, createInventory, startInventory, finishInventory,
  getInventoryItems, checkInventoryItem,
  type Inventory, type InventoryItem,
} from '../../../lib/eam';

const STATUS_LABELS: Record<string, string> = { planejado: 'Planejado', em_andamento: 'Em Andamento', concluido: 'Concluído' };
const STATUS_COLORS: Record<string, string> = { planejado: 'bg-yellow-100 text-yellow-700', em_andamento: 'bg-blue-100 text-blue-700', concluido: 'bg-green-100 text-green-700' };

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm ${type === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
      <span>{msg}</span><button onClick={onClose}><X className="w-4 h-4" /></button>
    </div>
  );
}

export default function AssetInventory() {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeInv, setActiveInv] = useState<Inventory | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [scanTag, setScanTag] = useState('');
  const [scanNote, setScanNote] = useState('');
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [form, setForm] = useState({ name: '', description: '', scope: 'geral' as Inventory['scope'], responsible_name: '', planned_start: '' });

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    setInventories(await getInventories());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function loadItems(inv: Inventory) {
    setActiveInv(inv);
    setItems(await getInventoryItems(inv.id));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) { showToast('Nome é obrigatório', 'err'); return; }
    setSaving(true);
    try {
      await createInventory({ ...form, status: 'planejado' });
      setShowForm(false);
      setForm({ name: '', description: '', scope: 'geral', responsible_name: '', planned_start: '' });
      await load(); showToast('Inventário criado!');
    } catch { showToast('Erro ao criar inventário', 'err'); }
    finally { setSaving(false); }
  }

  async function handleStart(id: string) {
    if (!confirm('Iniciar inventário? Isso criará a lista de ativos esperados.')) return;
    setSaving(true);
    try {
      await startInventory(id);
      await load();
      const updated = inventories.find((i) => i.id === id);
      if (updated) await loadItems({ ...updated, status: 'em_andamento' });
      showToast('Inventário iniciado!');
    } catch { showToast('Erro ao iniciar', 'err'); }
    finally { setSaving(false); }
  }

  async function handleFinish(id: string) {
    if (!confirm('Finalizar inventário? Itens ainda pendentes serão marcados como não encontrados.')) return;
    await finishInventory(id);
    await load();
    setActiveInv(null);
    showToast('Inventário concluído!');
  }

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!activeInv || !scanTag.trim()) return;
    setScanning(true);
    try {
      const result = await checkInventoryItem(activeInv.id, scanTag.trim(), undefined, scanNote || undefined);
      if (result) {
        setItems((prev) => prev.map((i) => i.id === result.id ? result : i));
        setScanTag(''); setScanNote('');
        showToast(`Ativo ${scanTag} localizado!`);
      } else {
        showToast(`Tag "${scanTag}" não encontrada neste inventário`, 'err');
      }
    } finally { setScanning(false); }
  }

  const found = items.filter((i) => i.status === 'localizado').length;
  const pending = items.filter((i) => i.status === 'pendente').length;

  if (activeInv) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveInv(null)} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{activeInv.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[activeInv.status]}`}>{STATUS_LABELS[activeInv.status]}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Esperado', value: activeInv.total_expected, color: 'text-slate-700' },
            { label: 'Localizados', value: found, color: 'text-green-600' },
            { label: 'Pendentes', value: pending, color: 'text-yellow-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Scanner */}
        {activeInv.status === 'em_andamento' && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Conferir Ativo</h2>
            <form onSubmit={handleScan} className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Digite ou leia a tag (ex: PAT-2024-00001)…"
                  value={scanTag} onChange={(e) => setScanTag(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
              </div>
              <button type="submit" disabled={scanning || !scanTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {scanning ? '…' : 'Conferir'}
              </button>
            </form>
          </div>
        )}

        {/* Items list */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Lista de Ativos ({items.length})
          </div>
          <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto custom-scrollbar">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">{item.asset_name ?? '—'}</p>
                  <p className="text-xs font-mono text-slate-400">{item.asset_tag}</p>
                  {item.expected_location && <p className="text-xs text-slate-400">Local esperado: {item.expected_location}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  item.status === 'localizado' ? 'bg-green-100 text-green-700' :
                  item.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {item.status === 'localizado' ? 'Localizado' : item.status === 'pendente' ? 'Pendente' : 'Não Encontrado'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {activeInv.status === 'em_andamento' && (
          <button onClick={() => handleFinish(activeInv.id)}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
            <CheckCircle className="w-4 h-4" /> Finalizar Inventário
          </button>
        )}

        {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventário Patrimonial</h1>
          <p className="text-slate-500 text-sm">Controle e conferência do patrimônio</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Novo Inventário
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Novo Inventário</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Escopo</label>
              <select value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as Inventory['scope'] }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="geral">Geral (todos os ativos)</option>
                <option value="por_setor">Por Setor</option>
                <option value="por_unidade">Por Unidade</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Responsável</label>
              <input type="text" value={form.responsible_name} onChange={(e) => setForm((f) => ({ ...f, responsible_name: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data Planejada</label>
              <input type="date" value={form.planned_start} onChange={(e) => setForm((f) => ({ ...f, planned_start: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? 'Criando…' : 'Criar'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40"><div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : inventories.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <ClipboardList className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Nenhum inventário cadastrado</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {inventories.map((inv) => (
              <div key={inv.id} className="p-4 hover:bg-slate-50 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[inv.status]}`}>{STATUS_LABELS[inv.status]}</span>
                  </div>
                  <p className="font-medium text-slate-800 text-sm">{inv.name}</p>
                  <p className="text-xs text-slate-500">{inv.scope === 'geral' ? 'Escopo geral' : inv.scope_label ?? inv.scope}</p>
                  {inv.responsible_name && <p className="text-xs text-slate-400">Resp: {inv.responsible_name}</p>}
                  {inv.status === 'concluido' && (
                    <p className="text-xs text-slate-500 mt-0.5">{inv.total_found}/{inv.total_expected} localizados · {inv.total_missing} não encontrados</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {inv.status === 'planejado' && (
                    <button onClick={() => handleStart(inv.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100">
                      <Play className="w-3.5 h-3.5" /> Iniciar
                    </button>
                  )}
                  {inv.status !== 'planejado' && (
                    <button onClick={() => loadItems(inv)}
                      className="px-3 py-1.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-100">
                      {inv.status === 'em_andamento' ? 'Conduzir' : 'Ver Resultado'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

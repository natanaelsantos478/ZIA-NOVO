import { useEffect, useState, useCallback } from 'react';
import { Wrench, Plus, CheckCircle, X, AlertTriangle } from 'lucide-react';
import {
  getWorkOrders, createWorkOrder, updateWorkOrder, closeWorkOrder,
  getMaintenancePlans, createMaintenancePlan, deleteMaintenancePlan,
  getAssets, type WorkOrder, type MaintenancePlan, type Asset,
} from '../../../lib/eam';

const WO_STATUS_LABELS: Record<string, string> = {
  aberta: 'Aberta', em_andamento: 'Em Andamento', aguardando_peca: 'Aguardando Peça',
  concluida: 'Concluída', cancelada: 'Cancelada',
};
const WO_STATUS_COLORS: Record<string, string> = {
  aberta: 'bg-yellow-100 text-yellow-700', em_andamento: 'bg-blue-100 text-blue-700',
  aguardando_peca: 'bg-orange-100 text-orange-700', concluida: 'bg-green-100 text-green-700',
  cancelada: 'bg-slate-100 text-slate-500',
};

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm ${type === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
      <span>{msg}</span><button onClick={onClose}><X className="w-4 h-4" /></button>
    </div>
  );
}

type TabId = 'orders' | 'plans';

export default function AssetMaintenance() {
  const [tab, setTab] = useState<TabId>('orders');
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [closeModal, setCloseModal] = useState<WorkOrder | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [filterStatus, setFilterStatus] = useState('');

  // Close WO form
  const [closeSolution, setCloseSolution] = useState('');
  const [closeParts, setCloseParts] = useState(0);
  const [closeLabor, setCloseLabor] = useState(0);
  const [saving, setSaving] = useState(false);

  // New WO form
  const [woForm, setWoForm] = useState({
    asset_id: '', type: 'corretiva' as WorkOrder['type'], title: '',
    failure_description: '', technician_name: '', supplier_name: '', estimated_cost: 0,
  });
  // New Plan form
  const [planForm, setPlanForm] = useState({
    asset_id: '', name: '', trigger_type: 'periodicidade' as MaintenancePlan['trigger_type'],
    trigger_value: 30, trigger_unit: 'dias', service_description: '',
    estimated_cost: 0, advance_alert_days: 7, next_due_date: '',
  });

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [ordersData, plansData, assetRes] = await Promise.all([
      getWorkOrders(undefined, filterStatus || undefined),
      getMaintenancePlans(),
      getAssets({ pageSize: 200 }),
    ]);
    setOrders(ordersData);
    setPlans(plansData);
    setAssets(assetRes.data);
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  async function handleCreateWO(e: React.FormEvent) {
    e.preventDefault();
    if (!woForm.asset_id || !woForm.title) { showToast('Preencha os campos obrigatórios', 'err'); return; }
    setSaving(true);
    try {
      await createWorkOrder({ ...woForm, status: 'aberta', opened_at: new Date().toISOString() } as Omit<WorkOrder, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'parts_cost' | 'labor_cost' | 'total_cost'>);
      setShowForm(false);
      setWoForm({ asset_id: '', type: 'corretiva', title: '', failure_description: '', technician_name: '', supplier_name: '', estimated_cost: 0 });
      await load();
      showToast('Ordem de serviço aberta!');
    } catch { showToast('Erro ao criar OS', 'err'); }
    finally { setSaving(false); }
  }

  async function handleCloseWO() {
    if (!closeModal || !closeSolution) { showToast('Informe a solução aplicada', 'err'); return; }
    setSaving(true);
    try {
      await closeWorkOrder(closeModal.id, closeSolution, { parts: closeParts, labor: closeLabor });
      setCloseModal(null); setCloseSolution(''); setCloseParts(0); setCloseLabor(0);
      await load();
      showToast('OS concluída com sucesso!');
    } catch { showToast('Erro ao concluir OS', 'err'); }
    finally { setSaving(false); }
  }

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!planForm.asset_id || !planForm.name) { showToast('Preencha os campos obrigatórios', 'err'); return; }
    setSaving(true);
    try {
      await createMaintenancePlan({ ...planForm, status: 'ativo', last_executed: null, preferred_supplier_id: null, preferred_supplier_name: null });
      setShowForm(false);
      setPlanForm({ asset_id: '', name: '', trigger_type: 'periodicidade', trigger_value: 30, trigger_unit: 'dias', service_description: '', estimated_cost: 0, advance_alert_days: 7, next_due_date: '' });
      await load();
      showToast('Plano de manutenção criado!');
    } catch { showToast('Erro ao criar plano', 'err'); }
    finally { setSaving(false); }
  }

  async function handleDeletePlan(id: string) {
    if (!confirm('Excluir este plano de manutenção?')) return;
    await deleteMaintenancePlan(id);
    await load();
    showToast('Plano excluído');
  }

  async function handleStartWO(id: string) {
    await updateWorkOrder(id, { status: 'em_andamento', started_at: new Date().toISOString() });
    await load();
    showToast('OS iniciada');
  }

  const assetName = (id: string) => {
    const a = assets.find((a) => a.id === id);
    return a ? `${a.tag} – ${a.name}` : id;
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manutenção</h1>
          <p className="text-slate-500 text-sm">Ordens de serviço e planos preventivos</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> {tab === 'orders' ? 'Nova OS' : 'Novo Plano'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {(['orders', 'plans'] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setShowForm(false); }}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t === 'orders' ? `Ordens de Serviço (${orders.length})` : `Planos Preventivos (${plans.length})`}
          </button>
        ))}
      </div>

      {/* Close WO modal */}
      {closeModal && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-bold text-slate-800 mb-1">Concluir OS</h3>
            <p className="text-sm text-slate-500 mb-4">{closeModal.title}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Solução Aplicada *</label>
                <textarea value={closeSolution} onChange={(e) => setCloseSolution(e.target.value)} rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[['Custo Peças (R$)', closeParts, setCloseParts], ['Custo M.O. (R$)', closeLabor, setCloseLabor]].map(([label, val, setter]) => (
                  <div key={label as string}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{label as string}</label>
                    <input type="number" value={val as number} onChange={(e) => (setter as (v: number) => void)(Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleCloseWO} disabled={saving}
                className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                <CheckCircle className="w-4 h-4" /> Concluir
              </button>
              <button onClick={() => setCloseModal(null)}
                className="px-5 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ORDERS TAB */}
      {tab === 'orders' && (
        <>
          {showForm && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <h2 className="text-base font-semibold text-slate-800 mb-4">Nova Ordem de Serviço</h2>
              <form onSubmit={handleCreateWO} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ativo *</label>
                  <select value={woForm.asset_id} onChange={(e) => setWoForm((f) => ({ ...f, asset_id: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                    <option value="">— Selecione —</option>
                    {assets.map((a) => <option key={a.id} value={a.id}>{a.tag} – {a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                  <select value={woForm.type} onChange={(e) => setWoForm((f) => ({ ...f, type: e.target.value as WorkOrder['type'] }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="corretiva">Corretiva</option>
                    <option value="preventiva">Preventiva</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
                  <input type="text" value={woForm.title} onChange={(e) => setWoForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Descrição da Falha</label>
                  <textarea value={woForm.failure_description} onChange={(e) => setWoForm((f) => ({ ...f, failure_description: e.target.value }))} rows={2}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {[['Técnico', 'technician_name'], ['Fornecedor', 'supplier_name']].map(([label, key]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                    <input type="text" value={(woForm as Record<string, unknown>)[key] as string} onChange={(e) => setWoForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
                <div className="sm:col-span-2 flex gap-3">
                  <button type="submit" disabled={saving} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'Criando…' : 'Abrir OS'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                </div>
              </form>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {['', 'aberta', 'em_andamento', 'concluida'].map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {s === '' ? 'Todas' : WO_STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-40"><div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <Wrench className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">Nenhuma ordem de serviço</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {orders.map((o) => (
                  <div key={o.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">{o.type === 'corretiva' ? 'Corretiva' : 'Preventiva'}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${WO_STATUS_COLORS[o.status]}`}>{WO_STATUS_LABELS[o.status]}</span>
                        </div>
                        <p className="font-medium text-slate-800 text-sm">{o.title}</p>
                        <p className="text-xs text-slate-500">{assetName(o.asset_id)}</p>
                        {o.technician_name && <p className="text-xs text-slate-400 mt-0.5">Técnico: {o.technician_name}</p>}
                        <p className="text-xs text-slate-400 mt-0.5">{new Date(o.opened_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="flex gap-2">
                        {o.status === 'aberta' && (
                          <button onClick={() => handleStartWO(o.id)} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100">Iniciar</button>
                        )}
                        {(o.status === 'aberta' || o.status === 'em_andamento' || o.status === 'aguardando_peca') && (
                          <button onClick={() => setCloseModal(o)} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100">
                            <CheckCircle className="w-3.5 h-3.5" /> Concluir
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* PLANS TAB */}
      {tab === 'plans' && (
        <>
          {showForm && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <h2 className="text-base font-semibold text-slate-800 mb-4">Novo Plano Preventivo</h2>
              <form onSubmit={handleCreatePlan} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ativo *</label>
                  <select value={planForm.asset_id} onChange={(e) => setPlanForm((f) => ({ ...f, asset_id: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                    <option value="">— Selecione —</option>
                    {assets.map((a) => <option key={a.id} value={a.id}>{a.tag} – {a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nome do Plano *</label>
                  <input type="text" value={planForm.name} onChange={(e) => setPlanForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Frequência</label>
                  <div className="flex gap-2">
                    <input type="number" value={planForm.trigger_value} onChange={(e) => setPlanForm((f) => ({ ...f, trigger_value: Number(e.target.value) }))}
                      className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <select value={planForm.trigger_unit} onChange={(e) => setPlanForm((f) => ({ ...f, trigger_unit: e.target.value }))}
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {['dias', 'semanas', 'meses', 'km', 'horas', 'ciclos'].map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Próxima Data</label>
                  <input type="date" value={planForm.next_due_date} onChange={(e) => setPlanForm((f) => ({ ...f, next_due_date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Descrição do Serviço</label>
                  <textarea value={planForm.service_description} onChange={(e) => setPlanForm((f) => ({ ...f, service_description: e.target.value }))} rows={2}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2 flex gap-3">
                  <button type="submit" disabled={saving} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'Criando…' : 'Criar Plano'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {plans.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <AlertTriangle className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">Nenhum plano preventivo cadastrado</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {plans.map((p) => {
                  const isOverdue = p.next_due_date && p.next_due_date < new Date().toISOString().split('T')[0];
                  return (
                    <div key={p.id} className="p-4 hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-800 text-sm">{p.name}</p>
                          <p className="text-xs text-slate-500">{assetName(p.asset_id)}</p>
                          <p className="text-xs text-slate-400 mt-0.5">A cada {p.trigger_value} {p.trigger_unit} · {p.service_description || '—'}</p>
                          {p.next_due_date && (
                            <p className={`text-xs mt-1 font-medium ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
                              {isOverdue ? '⚠ Vencido: ' : 'Próximo: '}
                              {new Date(p.next_due_date).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        <button onClick={() => handleDeletePlan(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

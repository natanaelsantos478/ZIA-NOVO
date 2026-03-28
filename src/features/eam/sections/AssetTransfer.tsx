import { useEffect, useState, useCallback } from 'react';
import { ArrowRightLeft, Plus, CheckCircle, XCircle, Clock, X } from 'lucide-react';
import {
  getWorkflows, createWorkflow, approveWorkflow, rejectWorkflow,
  confirmWorkflowReceipt, getAssets, type AssetWorkflow, type Asset,
} from '../../../lib/eam';

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente', aprovado: 'Aprovado', rejeitado: 'Rejeitado',
  confirmado_recebimento: 'Recebido', cancelado: 'Cancelado',
};
const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-700', aprovado: 'bg-blue-100 text-blue-700',
  rejeitado: 'bg-red-100 text-red-700', confirmado_recebimento: 'bg-green-100 text-green-700',
  cancelado: 'bg-slate-100 text-slate-500',
};
const TYPE_LABELS: Record<string, string> = {
  transferencia: 'Transferência', requisicao_uso: 'Requisição de Uso', emprestimo: 'Empréstimo',
};

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm ${type === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
      <span>{msg}</span><button onClick={onClose}><X className="w-4 h-4" /></button>
    </div>
  );
}

export default function AssetTransfer() {
  const [workflows, setWorkflows] = useState<AssetWorkflow[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [actionMode, setActionMode] = useState<'approve' | 'reject' | 'confirm' | null>(null);

  // Form state
  const [form, setForm] = useState({
    asset_id: '', type: 'transferencia' as AssetWorkflow['type'],
    requester_name: '', target_responsible_name: '',
    target_department: '', requester_comment: '', expected_return: '',
  });
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [wfs, assetRes] = await Promise.all([
      getWorkflows(filterStatus || undefined),
      getAssets({ pageSize: 200 }),
    ]);
    setWorkflows(wfs);
    setAssets(assetRes.data);
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.asset_id || !form.requester_name || !form.target_responsible_name) {
      showToast('Preencha os campos obrigatórios', 'err'); return;
    }
    setSaving(true);
    try {
      await createWorkflow({ ...form, expected_return: form.expected_return || undefined });
      setShowForm(false);
      setForm({ asset_id: '', type: 'transferencia', requester_name: '', target_responsible_name: '', target_department: '', requester_comment: '', expected_return: '' });
      await load();
      showToast('Solicitação criada com sucesso!');
    } catch { showToast('Erro ao criar solicitação', 'err'); }
    finally { setSaving(false); }
  }

  async function handleAction() {
    if (!actionId || !actionMode) return;
    setSaving(true);
    try {
      if (actionMode === 'approve') await approveWorkflow(actionId, actionNote);
      else if (actionMode === 'reject') { if (!actionNote) { showToast('Informe o motivo da rejeição', 'err'); setSaving(false); return; } await rejectWorkflow(actionId, actionNote); }
      else await confirmWorkflowReceipt(actionId, actionNote);
      setActionId(null); setActionMode(null); setActionNote('');
      await load();
      showToast('Ação realizada com sucesso!');
    } catch { showToast('Erro ao processar ação', 'err'); }
    finally { setSaving(false); }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Movimentações</h1>
          <p className="text-slate-500 text-sm">Transferências, requisições e empréstimos de ativos</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nova Solicitação
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'pendente', 'aprovado', 'confirmado_recebimento', 'rejeitado'].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {s === '' ? 'Todos' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* New workflow form */}
      {showForm && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Nova Solicitação</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ativo *</label>
              <select value={form.asset_id} onChange={(e) => setForm((f) => ({ ...f, asset_id: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="">— Selecione o ativo —</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.tag} – {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo *</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AssetWorkflow['type'] }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {[
              { label: 'Solicitante *', key: 'requester_name' },
              { label: 'Destinatário *', key: 'target_responsible_name' },
              { label: 'Departamento Destino', key: 'target_department' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                <input type="text" value={(form as Record<string, string>)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            {form.type === 'emprestimo' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Previsão de Devolução</label>
                <input type="date" value={form.expected_return} onChange={(e) => setForm((f) => ({ ...f, expected_return: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Justificativa</label>
              <textarea value={form.requester_comment} onChange={(e) => setForm((f) => ({ ...f, requester_comment: e.target.value }))} rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Criando…' : 'Criar Solicitação'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-5 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Action modal */}
      {actionId && actionMode && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-bold text-slate-800 mb-4">
              {actionMode === 'approve' ? 'Aprovar Solicitação' : actionMode === 'reject' ? 'Rejeitar Solicitação' : 'Confirmar Recebimento'}
            </h3>
            <textarea value={actionNote} onChange={(e) => setActionNote(e.target.value)}
              placeholder={actionMode === 'reject' ? 'Motivo da rejeição (obrigatório)…' : 'Observações (opcional)…'} rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-3">
              <button onClick={handleAction} disabled={saving}
                className={`px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${actionMode === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                {saving ? 'Processando…' : 'Confirmar'}
              </button>
              <button onClick={() => { setActionId(null); setActionMode(null); setActionNote(''); }}
                className="px-5 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <ArrowRightLeft className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Nenhuma movimentação encontrada</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {workflows.map((wf) => {
              const asset = assets.find((a) => a.id === wf.asset_id);
              return (
                <div key={wf.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{TYPE_LABELS[wf.type]}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[wf.status]}`}>{STATUS_LABELS[wf.status]}</span>
                      </div>
                      <p className="font-medium text-slate-800 text-sm">
                        {asset ? `${asset.tag} – ${asset.name}` : wf.asset_id}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        De: <strong>{wf.requester_name}</strong> → Para: <strong>{(wf as AssetWorkflow & { target_responsible_name?: string }).target_responsible_name ?? '—'}</strong>
                      </p>
                      {wf.requester_comment && <p className="text-xs text-slate-400 mt-1 italic">"{wf.requester_comment}"</p>}
                      <p className="text-xs text-slate-400 mt-1">{new Date(wf.requested_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    {wf.status === 'pendente' && (
                      <div className="flex gap-2">
                        <button onClick={() => { setActionId(wf.id); setActionMode('approve'); }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100">
                          <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                        </button>
                        <button onClick={() => { setActionId(wf.id); setActionMode('reject'); }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100">
                          <XCircle className="w-3.5 h-3.5" /> Rejeitar
                        </button>
                      </div>
                    )}
                    {wf.status === 'aprovado' && (
                      <button onClick={() => { setActionId(wf.id); setActionMode('confirm'); }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100">
                        <Clock className="w-3.5 h-3.5" /> Confirmar Recebimento
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

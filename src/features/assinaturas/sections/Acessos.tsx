import { useEffect, useState, useMemo } from 'react';
import {
  KeyRound, Plus, Search, Download, X, Eye, EyeOff,
  PauseCircle, PlayCircle, XCircle, ChevronDown,
} from 'lucide-react';
import Loader from '../../../components/UI/Loader';
import {
  getAcessos, createAcesso, updateAcesso, deleteAcesso,
  type AssinaturaAcesso,
} from '../../../lib/assinaturas';

// ── helpers ──────────────────────────────────────────────────────────────────

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

const fmtDateTime = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const STATUS_META: Record<AssinaturaAcesso['status'], { label: string; badge: string }> = {
  ativo:     { label: 'Ativo',     badge: 'bg-green-100 text-green-800' },
  suspenso:  { label: 'Suspenso',  badge: 'bg-amber-100 text-amber-800' },
  cancelado: { label: 'Cancelado', badge: 'bg-slate-100 text-slate-600' },
};

const NIVEL_OPTIONS = ['admin', 'operador', 'visualizador'] as const;

// ── Toast ─────────────────────────────────────────────────────────────────────

interface ToastState { msg: string; type: 'success' | 'error' }

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
      ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
      {toast.msg}
      <button onClick={onClose}><X className="w-4 h-4" /></button>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  onClose: () => void;
  onSaved: (a: AssinaturaAcesso) => void;
}

function NovoAcessoModal({ onClose, onSaved }: ModalProps) {
  const [form, setForm] = useState({
    assinatura_id: '',
    nome_usuario: '',
    email: '',
    nivel: 'operador',
    nivel_custom: '',
    valor_diferenciado: '',
    status: 'ativo' as AssinaturaAcesso['status'],
    externo_id: null as string | null,
    ultimo_acesso: null as string | null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCustomNivel, setUseCustomNivel] = useState(false);

  const set = (key: string, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assinatura_id.trim()) { setError('ID da Assinatura é obrigatório.'); return; }
    if (!form.nome_usuario.trim()) { setError('Nome do usuário é obrigatório.'); return; }
    if (!form.email.trim()) { setError('E-mail é obrigatório.'); return; }
    setSaving(true);
    setError(null);
    try {
      const nivel = useCustomNivel ? form.nivel_custom.trim() || 'operador' : form.nivel;
      const payload: Omit<AssinaturaAcesso, 'id' | 'tenant_id' | 'created_at' | 'erp_assinaturas'> = {
        assinatura_id: form.assinatura_id.trim(),
        nome_usuario: form.nome_usuario.trim(),
        email: form.email.trim(),
        nivel,
        valor_diferenciado: form.valor_diferenciado !== '' ? parseFloat(form.valor_diferenciado) : null,
        status: form.status,
        externo_id: form.externo_id,
        ultimo_acesso: form.ultimo_acesso,
      };
      const result = await createAcesso(payload);
      onSaved(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar acesso.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-base font-semibold text-slate-800">Novo Acesso</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">ID da Assinatura *</label>
            <input
              type="text"
              value={form.assinatura_id}
              onChange={e => set('assinatura_id', e.target.value)}
              placeholder="UUID da assinatura"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nome do Usuário *</label>
              <input
                type="text"
                value={form.nome_usuario}
                onChange={e => set('nome_usuario', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">E-mail *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nível</label>
            <div className="flex gap-2">
              {useCustomNivel ? (
                <input
                  type="text"
                  value={form.nivel_custom}
                  onChange={e => set('nivel_custom', e.target.value)}
                  placeholder="Ex: gerente, financeiro…"
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              ) : (
                <div className="relative flex-1">
                  <select
                    value={form.nivel}
                    onChange={e => set('nivel', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    {NIVEL_OPTIONS.map(n => (
                      <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              )}
              <button
                type="button"
                onClick={() => setUseCustomNivel(v => !v)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                {useCustomNivel ? 'Usar padrão' : 'Personalizado'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor Diferenciado (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.valor_diferenciado}
                onChange={e => set('valor_diferenciado', e.target.value)}
                placeholder="Opcional"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <div className="relative">
                <select
                  value={form.status}
                  onChange={e => set('status', e.target.value as AssinaturaAcesso['status'])}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  <option value="ativo">Ativo</option>
                  <option value="suspenso">Suspenso</option>
                  <option value="cancelado">Cancelado</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Acessos() {
  const [acessos, setAcessos] = useState<AssinaturaAcesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | AssinaturaAcesso['status']>('');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAcessos();
      setAcessos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar acessos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return acessos.filter(a => {
      const matchSearch = !q
        || a.nome_usuario.toLowerCase().includes(q)
        || a.email.toLowerCase().includes(q);
      const matchStatus = !filterStatus || a.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [acessos, search, filterStatus]);

  const handleStatusChange = async (acesso: AssinaturaAcesso, newStatus: AssinaturaAcesso['status']) => {
    setActionLoading(acesso.id);
    try {
      const updated = await updateAcesso(acesso.id, { status: newStatus });
      setAcessos(prev => prev.map(a => a.id === updated.id ? { ...a, status: updated.status } : a));
      setToast({ msg: `Acesso ${STATUS_META[newStatus].label.toLowerCase()} com sucesso.`, type: 'success' });
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : 'Erro ao atualizar status.', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Confirma a exclusão deste acesso?')) return;
    setActionLoading(id);
    try {
      await deleteAcesso(id);
      setAcessos(prev => prev.filter(a => a.id !== id));
      setToast({ msg: 'Acesso excluído.', type: 'success' });
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : 'Erro ao excluir.', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const exportCsv = () => {
    const header = ['Cliente', 'Assinatura', 'Nome Usuário', 'E-mail', 'Nível', 'Valor Diferenciado', 'Status', 'Último Acesso', 'Data Criação'];
    const rows = filtered.map(a => [
      a.erp_assinaturas?.erp_clientes?.nome ?? '—',
      a.erp_assinaturas?.erp_produtos?.nome ?? '—',
      a.nome_usuario,
      a.email,
      a.nivel,
      a.valor_diferenciado != null ? brl(a.valor_diferenciado) : '—',
      STATUS_META[a.status]?.label ?? a.status,
      fmtDateTime(a.ultimo_acesso),
      fmtDate(a.created_at),
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acessos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaved = (a: AssinaturaAcesso) => {
    setAcessos(prev => [a, ...prev]);
    setShowModal(false);
    setToast({ msg: 'Acesso criado com sucesso.', type: 'success' });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader /></div>;

  if (error) return (
    <div className="p-6 text-center text-red-600 text-sm">{error}</div>
  );

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Acessos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Todos os acessos vinculados às assinaturas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Acesso
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
          />
        </div>

        <div className="relative">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as '' | AssinaturaAcesso['status'])}
            className="appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
          >
            <option value="">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="suspenso">Suspenso</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>

        <button
          onClick={exportCsv}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors bg-white"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>

        <span className="text-xs text-slate-400 ml-1">
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
          <KeyRound className="w-12 h-12 text-slate-300" />
          <p className="text-sm font-medium">Nenhum acesso encontrado</p>
          {(search || filterStatus) && (
            <button
              onClick={() => { setSearch(''); setFilterStatus(''); }}
              className="text-xs text-violet-600 hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {[
                    'Cliente vinculado', 'Assinatura', 'Nome do usuário', 'E-mail',
                    'Nível', 'Valor diferenciado', 'Status', 'Último acesso', 'Criação', 'Ações',
                  ].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(acesso => {
                  const meta = STATUS_META[acesso.status];
                  const busy = actionLoading === acesso.id;
                  return (
                    <tr key={acesso.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap max-w-[140px] truncate">
                        {acesso.erp_assinaturas?.erp_clientes?.nome ?? <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap max-w-[140px] truncate">
                        {acesso.erp_assinaturas?.erp_produtos?.nome ?? <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-800 whitespace-nowrap max-w-[160px] truncate">
                        {acesso.nome_usuario}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap max-w-[180px] truncate">
                        {acesso.email}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                          {acesso.nivel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {acesso.valor_diferenciado != null ? brl(acesso.valor_diferenciado) : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${meta?.badge ?? ''}`}>
                          {meta?.label ?? acesso.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                        {fmtDateTime(acesso.ultimo_acesso)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                        {fmtDate(acesso.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {acesso.status === 'ativo' && (
                            <button
                              title="Suspender"
                              disabled={busy}
                              onClick={() => handleStatusChange(acesso, 'suspenso')}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 disabled:opacity-40 transition-colors"
                            >
                              <PauseCircle className="w-4 h-4" />
                            </button>
                          )}
                          {acesso.status === 'suspenso' && (
                            <button
                              title="Reativar"
                              disabled={busy}
                              onClick={() => handleStatusChange(acesso, 'ativo')}
                              className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-40 transition-colors"
                            >
                              <PlayCircle className="w-4 h-4" />
                            </button>
                          )}
                          {acesso.status !== 'cancelado' && (
                            <button
                              title="Cancelar"
                              disabled={busy}
                              onClick={() => handleStatusChange(acesso, 'cancelado')}
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          {acesso.status === 'cancelado' && (
                            <button
                              title="Reativar"
                              disabled={busy}
                              onClick={() => handleStatusChange(acesso, 'ativo')}
                              className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-40 transition-colors"
                            >
                              <PlayCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && <NovoAcessoModal onClose={() => setShowModal(false)} onSaved={handleSaved} />}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

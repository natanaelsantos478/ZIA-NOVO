import { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, Download, X, Loader2, CheckCircle, AlertCircle,
  FileText, Phone, MessageCircle, User, Calendar, DollarSign,
  Percent, RefreshCw, CreditCard, History, Settings, Plug,
  ChevronRight, Save, PauseCircle, PlayCircle, XCircle, StopCircle,
  AlertTriangle, Tag, Info, Trash2, Edit2,
} from 'lucide-react';
import {
  getAssinaturas, updateAssinatura, deleteAssinatura, createAssinatura,
  getAssinaturaHistorico, addAssinaturaHistorico, getAssinaturaCobrancas,
  getAcessos, createAcesso, updateAcesso, deleteAcesso,
  type ErpAssinatura, type ErpAssinaturaHistorico, type ErpAssinaturaCobranca,
  type AssinaturaStatus, type AssinaturaAcesso,
} from '../../../lib/assinaturas';
import {
  getClientes, getProdutos, getZiaUsuarios, getVendedorFilter,
  type ErpCliente, type ErpProduto, type ZiaUsuario,
} from '../../../lib/erp';

// ── Helpers ────────────────────────────────────────────────────────────────────
const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const DATE_FMT = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');

function monthsSince(dataInicio: string): number {
  const start = new Date(dataInicio + 'T00:00:00');
  const now = new Date();
  return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
}
function calcLiquido(v: number, pct: number) { return v * (1 - pct / 100); }
function fmtDuracao(meses: number): string {
  if (meses <= 0) return 'Menos de 1 mês';
  const anos = Math.floor(meses / 12);
  const m = meses % 12;
  if (anos > 0 && m > 0) return `${anos} ano${anos !== 1 ? 's' : ''} e ${m} mês${m !== 1 ? 'es' : ''}`;
  if (anos > 0) return `${anos} ano${anos !== 1 ? 's' : ''}`;
  return `${m} mês${m !== 1 ? 'es' : ''}`;
}

const STATUS_CONFIG: Record<AssinaturaStatus, { label: string; bg: string; text: string }> = {
  ativa:        { label: 'Ativa',        bg: 'bg-green-100',  text: 'text-green-700'  },
  pausada:      { label: 'Pausada',      bg: 'bg-yellow-100', text: 'text-yellow-700' },
  cancelada:    { label: 'Cancelada',    bg: 'bg-red-100',    text: 'text-red-700'    },
  encerrada:    { label: 'Encerrada',    bg: 'bg-slate-100',  text: 'text-slate-500'  },
  inadimplente: { label: 'Inadimplente', bg: 'bg-red-100',    text: 'text-red-700'    },
  em_trial:     { label: 'Em Trial',     bg: 'bg-amber-100',  text: 'text-amber-700'  },
};

const CICLO_LABEL: Record<string, string> = {
  mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual',
};

function StatusBadge({ status }: { status: AssinaturaStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="text-slate-400 shrink-0">{icon}</span>
      <span className="text-xs text-slate-500 w-32 shrink-0">{label}</span>
      <span className="text-sm text-slate-800 flex-1">{children}</span>
    </div>
  );
}

// ── Create Modal ───────────────────────────────────────────────────────────────
type AssForm = {
  cliente_id: string; produto_id: string; vendedor_id: string;
  valor_mensal: string; desconto_pct: string; data_inicio: string;
  data_fim: string; observacoes: string; status: AssinaturaStatus;
  ciclo_cobranca: string;
};
const EMPTY_FORM: AssForm = {
  cliente_id: '', produto_id: '', vendedor_id: '', valor_mensal: '',
  desconto_pct: '0', data_inicio: new Date().toISOString().slice(0, 10),
  data_fim: '', observacoes: '', status: 'ativa', ciclo_cobranca: 'mensal',
};

function CreateModal({ clientes, produtos, usuarios, onClose, onSaved, showToast }: {
  clientes: ErpCliente[]; produtos: ErpProduto[]; usuarios: ZiaUsuario[];
  onClose: () => void; onSaved: (a: ErpAssinatura) => void;
  showToast: (m: string, ok: boolean) => void;
}) {
  const [form, setForm] = useState<AssForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof AssForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.cliente_id || !form.produto_id || !form.valor_mensal) {
      showToast('Preencha cliente, plano e valor.', false); return;
    }
    setSaving(true);
    try {
      const ass = await createAssinatura({
        cliente_id: form.cliente_id, produto_id: form.produto_id,
        vendedor_id: form.vendedor_id || null,
        valor_mensal: parseFloat(form.valor_mensal),
        desconto_pct: parseFloat(form.desconto_pct) || 0,
        data_inicio: form.data_inicio, data_fim: form.data_fim || null,
        observacoes: form.observacoes || null, status: form.status,
        ciclo_cobranca: form.ciclo_cobranca as ErpAssinatura['ciclo_cobranca'],
        proximo_vencimento: null, motivo_cancelamento: null,
        motivo_pausa: null, data_retorno_previsto: null,
        desconto_motivo: null, desconto_validade: null, crm_negociacao_id: null,
      });
      onSaved(ass);
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally { setSaving(false); }
  }

  const planos = produtos.filter(p => p.is_subscription);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Nova Assinatura</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto p-5 space-y-3 flex-1 custom-scrollbar">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Cliente *</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)}>
              <option value="">Selecione...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Plano *</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.produto_id} onChange={e => { set('produto_id', e.target.value); const p = planos.find(x => x.id === e.target.value); if (p) set('valor_mensal', p.preco_venda.toString()); }}>
              <option value="">Selecione...</option>
              {planos.map(p => <option key={p.id} value={p.id}>{p.nome} — {BRL(p.preco_venda)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor Mensal *</label>
              <input type="number" min="0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.valor_mensal} onChange={e => set('valor_mensal', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Desconto %</label>
              <input type="number" min="0" max="100" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.desconto_pct} onChange={e => set('desconto_pct', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data de Início *</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.data_inicio} onChange={e => set('data_inicio', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data de Término</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.data_fim} onChange={e => set('data_fim', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ciclo de Cobrança</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.ciclo_cobranca} onChange={e => set('ciclo_cobranca', e.target.value)}>
              {Object.entries(CICLO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Vendedor</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.vendedor_id} onChange={e => set('vendedor_id', e.target.value)}>
              <option value="">Sem vendedor</option>
              {usuarios.filter(u => u.ativo).map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.status} onChange={e => set('status', e.target.value as AssinaturaStatus)}>
              {(Object.keys(STATUS_CONFIG) as AssinaturaStatus[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
            <textarea rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Criar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Visão Geral ───────────────────────────────────────────────────────────
function TabVisaoGeral({ ass, vendedor }: { ass: ErpAssinatura; vendedor: ZiaUsuario | undefined }) {
  const meses = monthsSince(ass.data_inicio);
  const liquido = calcLiquido(ass.valor_mensal, ass.desconto_pct);
  const acumulado = meses * liquido;

  return (
    <div className="p-5 space-y-5">
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Assinatura</p>
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          <DetailRow icon={<FileText className="w-3.5 h-3.5" />} label="Plano Contratado">{ass.erp_produtos?.nome ?? '—'}</DetailRow>
          {ass.ciclo_cobranca && <DetailRow icon={<RefreshCw className="w-3.5 h-3.5" />} label="Ciclo">{CICLO_LABEL[ass.ciclo_cobranca] ?? ass.ciclo_cobranca}</DetailRow>}
          <DetailRow icon={<DollarSign className="w-3.5 h-3.5" />} label="Valor Mensal">{BRL(ass.valor_mensal)}</DetailRow>
          <DetailRow icon={<Percent className="w-3.5 h-3.5" />} label="Desconto">
            {ass.desconto_pct > 0 ? `${ass.desconto_pct}%` : '—'}
            {ass.desconto_motivo && <span className="ml-2 text-xs text-slate-400 italic">({ass.desconto_motivo})</span>}
          </DetailRow>
          <DetailRow icon={<DollarSign className="w-3.5 h-3.5 text-green-600" />} label="Valor Líquido"><span className="font-bold text-slate-800">{BRL(liquido)}</span></DetailRow>
          <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Data de Início">{DATE_FMT(ass.data_inicio)}</DetailRow>
          <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Data de Término">{ass.data_fim ? DATE_FMT(ass.data_fim) : 'Indefinida'}</DetailRow>
          {ass.proximo_vencimento && <DetailRow icon={<Calendar className="w-3.5 h-3.5 text-amber-500" />} label="Próx. Vencimento"><span className="text-amber-700 font-medium">{DATE_FMT(ass.proximo_vencimento)}</span></DetailRow>}
          <DetailRow icon={<RefreshCw className="w-3.5 h-3.5" />} label="Tempo Ativo">{fmtDuracao(meses)}</DetailRow>
        </div>
      </div>
      {meses > 0 && (
        <div className="bg-slate-800 rounded-xl px-4 py-3 text-white grid grid-cols-3 gap-3 text-center">
          <div><p className="text-[10px] text-slate-400 uppercase tracking-wide">Meses ativos</p><p className="text-xl font-bold mt-0.5">{meses}</p></div>
          <div><p className="text-[10px] text-slate-400 uppercase tracking-wide">Valor líquido/mês</p><p className="text-sm font-bold mt-0.5">{BRL(liquido)}</p></div>
          <div><p className="text-[10px] text-slate-400 uppercase tracking-wide">Total acumulado</p><p className="text-sm font-bold mt-0.5 text-green-400">{BRL(acumulado)}</p></div>
        </div>
      )}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Vendedor</p>
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          <DetailRow icon={<User className="w-3.5 h-3.5" />} label="Nome">{vendedor ? vendedor.nome : <span className="text-slate-400 italic">Não atribuído</span>}</DetailRow>
          {vendedor && <DetailRow icon={<User className="w-3.5 h-3.5" />} label="Código"><span className="font-mono text-xs">{vendedor.codigo}</span></DetailRow>}
        </div>
      </div>
      {(ass.motivo_cancelamento || ass.motivo_pausa) && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">{ass.motivo_cancelamento ? 'Motivo de Cancelamento' : 'Motivo de Pausa'}</p>
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-800 whitespace-pre-wrap">{ass.motivo_cancelamento ?? ass.motivo_pausa}</p>
            {ass.data_retorno_previsto && <p className="text-xs text-red-600 mt-1.5">Retorno previsto: {DATE_FMT(ass.data_retorno_previsto)}</p>}
          </div>
        </div>
      )}
      {ass.observacoes && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Observações</p>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{ass.observacoes}</p>
          </div>
        </div>
      )}
      <p className="text-[11px] text-slate-400">Criada em {new Date(ass.created_at).toLocaleString('pt-BR')}</p>
    </div>
  );
}

// ── Tab: Acessos ───────────────────────────────────────────────────────────────
const ACESSO_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  ativo:     { label: 'Ativo',     bg: 'bg-green-100',  text: 'text-green-700'  },
  suspenso:  { label: 'Suspenso',  bg: 'bg-yellow-100', text: 'text-yellow-700' },
  cancelado: { label: 'Cancelado', bg: 'bg-slate-100',  text: 'text-slate-500'  },
};

type AcessoForm = { nome_usuario: string; email: string; nivel: string; status: 'ativo' | 'suspenso' | 'cancelado'; valor_diferenciado: string };
const EMPTY_ACESSO: AcessoForm = { nome_usuario: '', email: '', nivel: '', status: 'ativo', valor_diferenciado: '' };

function TabAcessos({ ass, showToast }: { ass: ErpAssinatura; showToast: (m: string, ok: boolean) => void }) {
  const [acessos, setAcessos] = useState<AssinaturaAcesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AcessoForm>(EMPTY_ACESSO);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);

  const setF = (k: keyof AcessoForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    setLoading(true);
    getAcessos(ass.id).then(data => { setAcessos(data); setLoading(false); });
  }, [ass.id]);

  async function handleSave() {
    if (!form.nome_usuario || !form.email) { showToast('Nome e e-mail são obrigatórios.', false); return; }
    setSaving(true);
    try {
      if (editId) {
        const updated = await updateAcesso(editId, { nome_usuario: form.nome_usuario, email: form.email, nivel: form.nivel, status: form.status, valor_diferenciado: form.valor_diferenciado ? parseFloat(form.valor_diferenciado) : null });
        setAcessos(prev => prev.map(a => a.id === editId ? updated : a));
        showToast('Acesso atualizado.', true);
      } else {
        const created = await createAcesso({ assinatura_id: ass.id, nome_usuario: form.nome_usuario, email: form.email, nivel: form.nivel, status: form.status, valor_diferenciado: form.valor_diferenciado ? parseFloat(form.valor_diferenciado) : null, ultimo_acesso: null, externo_id: null });
        setAcessos(prev => [created, ...prev]);
        showToast('Acesso criado.', true);
      }
      setForm(EMPTY_ACESSO); setShowForm(false); setEditId(null);
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    try { await deleteAcesso(id); setAcessos(prev => prev.filter(a => a.id !== id)); setDelId(null); showToast('Acesso removido.', true); }
    catch (e) { showToast('Erro: ' + (e as Error).message, false); }
  }

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  return (
    <div className="p-5 space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs font-semibold text-slate-600">{acessos.length} acesso(s)</p>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_ACESSO); }} className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg font-medium">
          <Plus className="w-3.5 h-3.5" /> Adicionar Acesso
        </button>
      </div>
      {(showForm || editId) && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-slate-600">{editId ? 'Editar Acesso' : 'Novo Acesso'}</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Nome *</label><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.nome_usuario} onChange={e => setF('nome_usuario', e.target.value)} /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">E-mail *</label><input type="email" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.email} onChange={e => setF('email', e.target.value)} /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Nível</label><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="admin, viewer..." value={form.nivel} onChange={e => setF('nivel', e.target.value)} /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Status</label><select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.status} onChange={e => setF('status', e.target.value as AcessoForm['status'])}><option value="ativo">Ativo</option><option value="suspenso">Suspenso</option><option value="cancelado">Cancelado</option></select></div>
            <div className="col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Valor diferenciado (opcional)</label><input type="number" min="0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.valor_diferenciado} onChange={e => setF('valor_diferenciado', e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_ACESSO); }} className="text-xs text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 text-xs bg-slate-800 text-white px-3 py-1.5 rounded-lg disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar
            </button>
          </div>
        </div>
      )}
      {acessos.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <User className="w-9 h-9 text-slate-200 mb-2" />
          <p className="text-sm text-slate-400">Nenhum acesso cadastrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {acessos.map(ac => {
            const cfg = ACESSO_STATUS[ac.status] ?? ACESSO_STATUS.cancelado;
            return (
              <div key={ac.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{ac.nome_usuario}</p>
                    <p className="text-xs text-slate-400 truncate">{ac.email}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setEditId(ac.id); setForm({ nome_usuario: ac.nome_usuario, email: ac.email, nivel: ac.nivel, status: ac.status, valor_diferenciado: ac.valor_diferenciado?.toString() ?? '' }); setShowForm(false); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                    {delId === ac.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(ac.id)} className="text-[10px] bg-red-600 text-white px-2 py-1 rounded-lg">Sim</button>
                        <button onClick={() => setDelId(null)} className="text-[10px] text-slate-500 border border-slate-200 px-2 py-1 rounded-lg">Não</button>
                      </div>
                    ) : (
                      <button onClick={() => setDelId(ac.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                  {ac.nivel && <span>Nível: <strong className="text-slate-600">{ac.nivel}</strong></span>}
                  {ac.valor_diferenciado != null && <span>Valor: <strong className="text-slate-600">{BRL(ac.valor_diferenciado)}</strong></span>}
                  {ac.ultimo_acesso && <span>Último acesso: {new Date(ac.ultimo_acesso).toLocaleDateString('pt-BR')}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab: Cobranças ─────────────────────────────────────────────────────────────
function TabCobrancas({ ass }: { ass: ErpAssinatura }) {
  const [cobrancas, setCobrancas] = useState<ErpAssinaturaCobranca[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); getAssinaturaCobrancas(ass.id).then(d => { setCobrancas(d); setLoading(false); }); }, [ass.id]);
  const COB_ST: Record<string, { label: string; bg: string; text: string }> = {
    pago: { label: 'Pago', bg: 'bg-green-100', text: 'text-green-700' },
    pendente: { label: 'Pendente', bg: 'bg-yellow-100', text: 'text-yellow-700' },
    atrasado: { label: 'Atrasado', bg: 'bg-red-100', text: 'text-red-700' },
    cancelado: { label: 'Cancelado', bg: 'bg-slate-100', text: 'text-slate-500' },
  };
  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  if (cobrancas.length === 0) return (
    <div className="p-5 space-y-4">
      <div className="flex flex-col items-center justify-center py-10 text-center"><CreditCard className="w-9 h-9 text-slate-200 mb-2" /><p className="text-sm text-slate-400">Nenhuma cobrança registrada</p></div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2.5"><Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" /><p className="text-xs text-blue-700">As cobranças serão geradas automaticamente após integração com o gateway de pagamento.</p></div>
    </div>
  );
  const totalPago = cobrancas.filter(c => c.status === 'pago').reduce((s, c) => s + c.valor_liquido, 0);
  const totalAberto = cobrancas.filter(c => c.status === 'pendente' || c.status === 'atrasado').reduce((s, c) => s + c.valor_liquido, 0);
  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center"><p className="text-[10px] font-bold text-green-600 uppercase">Total Pago</p><p className="text-base font-bold text-green-800">{BRL(totalPago)}</p></div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center"><p className="text-[10px] font-bold text-amber-600 uppercase">Em Aberto</p><p className="text-base font-bold text-amber-800">{BRL(totalAberto)}</p></div>
      </div>
      <div className="space-y-2">
        {cobrancas.map(cob => {
          const cfg = COB_ST[cob.status] ?? COB_ST.cancelado;
          return (
            <div key={cob.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1.5"><span className="text-sm font-semibold text-slate-800">{cob.referencia}</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span></div>
              <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
                <div><span className="block text-[10px] text-slate-400 uppercase">Vencimento</span><span className="font-medium text-slate-700">{DATE_FMT(cob.vencimento)}</span></div>
                <div><span className="block text-[10px] text-slate-400 uppercase">Valor Bruto</span><span className="font-medium text-slate-700">{BRL(cob.valor_bruto)}</span></div>
                <div><span className="block text-[10px] text-slate-400 uppercase">Valor Líquido</span><span className="font-bold text-slate-800">{BRL(cob.valor_liquido)}</span></div>
              </div>
              {cob.pago_em && <p className="text-[11px] text-green-600 mt-1">Pago em {new Date(cob.pago_em).toLocaleDateString('pt-BR')}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab: Histórico ─────────────────────────────────────────────────────────────
function TabHistorico({ ass }: { ass: ErpAssinatura }) {
  const [historico, setHistorico] = useState<ErpAssinaturaHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); getAssinaturaHistorico(ass.id).then(d => { setHistorico(d); setLoading(false); }); }, [ass.id]);
  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  if (historico.length === 0) return <div className="flex flex-col items-center justify-center py-14 text-center px-4"><History className="w-10 h-10 text-slate-200 mb-3" /><p className="text-sm text-slate-400">Nenhuma alteração registrada.</p></div>;
  return (
    <div className="p-5">
      <div className="relative">
        <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-200" />
        <div className="space-y-4">
          {historico.map(e => (
            <div key={e.id} className="flex gap-3 relative">
              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 z-10"><History className="w-3.5 h-3.5 text-slate-400" /></div>
              <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1"><span className="text-xs font-semibold text-slate-800">{e.acao}</span><span className="text-[10px] text-slate-400 shrink-0">{new Date(e.created_at).toLocaleString('pt-BR')}</span></div>
                {(e.valor_anterior || e.valor_novo) && (
                  <div className="flex items-center gap-2 text-xs mb-1">
                    {e.valor_anterior && <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded line-through">{e.valor_anterior}</span>}
                    {e.valor_anterior && e.valor_novo && <ChevronRight className="w-3 h-3 text-slate-400" />}
                    {e.valor_novo && <span className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-medium">{e.valor_novo}</span>}
                  </div>
                )}
                {e.motivo && <p className="text-xs text-slate-500 italic">{e.motivo}</p>}
                {e.usuario_nome && <p className="text-[10px] text-slate-400 mt-1">por {e.usuario_nome}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Gestão ────────────────────────────────────────────────────────────────
type GestaoAction = 'pausar' | 'reativar' | 'cancelar' | 'inadimplente' | 'encerrar' | 'trial' | null;

function TabGestao({ ass, usuarios, onUpdated, onDeleted, showToast }: {
  ass: ErpAssinatura; usuarios: ZiaUsuario[];
  onUpdated: (a: ErpAssinatura) => void; onDeleted: () => void;
  showToast: (m: string, ok: boolean) => void;
}) {
  const [expanded, setExpanded] = useState<GestaoAction>(null);
  const [motivo, setMotivo] = useState('');
  const [retorno, setRetorno] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [novoVendedor, setNovoVendedor] = useState(ass.vendedor_id ?? '');
  const [obs, setObs] = useState(ass.observacoes ?? '');
  const [descPct, setDescPct] = useState(ass.desconto_pct.toString());
  const [descMotivo, setDescMotivo] = useState(ass.desconto_motivo ?? '');
  const [savingVend, setSavingVend] = useState(false);
  const [savingObs, setSavingObs] = useState(false);
  const [savingDesc, setSavingDesc] = useState(false);
  const [savingCiclo, setSavingCiclo] = useState(false);

  useEffect(() => { setNovoVendedor(ass.vendedor_id ?? ''); setObs(ass.observacoes ?? ''); setDescPct(ass.desconto_pct.toString()); setDescMotivo(ass.desconto_motivo ?? ''); setExpanded(null); setConfirmDel(false); }, [ass.id]);

  type ActionDef = { id: GestaoAction; label: string; icon: React.ReactNode; color: string; nextStatus: AssinaturaStatus; shows: AssinaturaStatus[]; needsMotivo: boolean; hasRetorno: boolean; required: boolean };
  const ACTIONS: ActionDef[] = [
    { id: 'pausar',       label: 'Pausar',           icon: <PauseCircle className="w-4 h-4" />,    color: 'border-yellow-200 bg-yellow-50 text-yellow-800', nextStatus: 'pausada',      shows: ['ativa','inadimplente'],        needsMotivo: true,  hasRetorno: true,  required: true  },
    { id: 'reativar',     label: 'Reativar',          icon: <PlayCircle className="w-4 h-4" />,     color: 'border-green-200 bg-green-50 text-green-800',   nextStatus: 'ativa',        shows: ['pausada','cancelada','encerrada'], needsMotivo: false, hasRetorno: false, required: false },
    { id: 'cancelar',     label: 'Cancelar',          icon: <XCircle className="w-4 h-4" />,        color: 'border-red-200 bg-red-50 text-red-800',         nextStatus: 'cancelada',    shows: ['ativa','pausada','em_trial'],  needsMotivo: true,  hasRetorno: false, required: true  },
    { id: 'inadimplente', label: 'Inadimplente',      icon: <AlertTriangle className="w-4 h-4" />,  color: 'border-red-200 bg-red-50 text-red-800',         nextStatus: 'inadimplente', shows: ['ativa'],                       needsMotivo: true,  hasRetorno: false, required: false },
    { id: 'encerrar',     label: 'Encerrar contrato', icon: <StopCircle className="w-4 h-4" />,     color: 'border-slate-200 bg-slate-50 text-slate-800',   nextStatus: 'encerrada',    shows: ['ativa','pausada','cancelada'], needsMotivo: false, hasRetorno: false, required: false },
    { id: 'trial',        label: 'Iniciar Trial',     icon: <Tag className="w-4 h-4" />,            color: 'border-amber-200 bg-amber-50 text-amber-800',   nextStatus: 'em_trial',     shows: ['ativa'],                       needsMotivo: false, hasRetorno: false, required: false },
  ];

  async function handleAction(a: ActionDef) {
    if (a.required && !motivo.trim()) { showToast('Informe o motivo.', false); return; }
    setSaving(true);
    try {
      const payload: Partial<ErpAssinatura> = { status: a.nextStatus };
      if (a.id === 'pausar') { payload.motivo_pausa = motivo || null; payload.data_retorno_previsto = retorno || null; }
      if (a.id === 'cancelar') { payload.motivo_cancelamento = motivo || null; }
      const updated = await updateAssinatura(ass.id, payload);
      await addAssinaturaHistorico(ass.id, { acao: a.label, valor_anterior: STATUS_CONFIG[ass.status].label, valor_novo: STATUS_CONFIG[a.nextStatus].label, motivo: motivo || null, usuario_nome: null });
      showToast(`${a.label} realizado.`, true);
      onUpdated(updated); setExpanded(null); setMotivo(''); setRetorno('');
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSaving(false); }
  }

  async function handleVendedor() {
    setSavingVend(true);
    try {
      const updated = await updateAssinatura(ass.id, { vendedor_id: novoVendedor || null });
      const oldV = usuarios.find(u => u.id === ass.vendedor_id);
      const newV = usuarios.find(u => u.id === novoVendedor);
      await addAssinaturaHistorico(ass.id, { acao: 'Vendedor alterado', valor_anterior: oldV?.nome ?? 'Sem vendedor', valor_novo: newV?.nome ?? 'Sem vendedor', motivo: null, usuario_nome: null });
      showToast('Vendedor atualizado.', true); onUpdated(updated);
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSavingVend(false); }
  }

  async function handleObs() {
    setSavingObs(true);
    try { const updated = await updateAssinatura(ass.id, { observacoes: obs || null }); showToast('Observações salvas.', true); onUpdated(updated); }
    catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSavingObs(false); }
  }

  async function handleDesconto() {
    const pct = parseFloat(descPct) || 0;
    if (pct > 0 && !descMotivo.trim()) { showToast('Informe o motivo do desconto.', false); return; }
    setSavingDesc(true);
    try {
      const updated = await updateAssinatura(ass.id, { desconto_pct: pct, desconto_motivo: descMotivo || null });
      await addAssinaturaHistorico(ass.id, { acao: 'Desconto alterado', valor_anterior: `${ass.desconto_pct}%`, valor_novo: `${pct}%`, motivo: descMotivo || null, usuario_nome: null });
      showToast('Desconto atualizado.', true); onUpdated(updated);
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSavingDesc(false); }
  }

  async function handleCiclo(ciclo: 'mensal' | 'trimestral' | 'semestral' | 'anual') {
    setSavingCiclo(true);
    try {
      const updated = await updateAssinatura(ass.id, { ciclo_cobranca: ciclo });
      await addAssinaturaHistorico(ass.id, { acao: 'Ciclo alterado', valor_anterior: ass.ciclo_cobranca ?? 'Não definido', valor_novo: CICLO_LABEL[ciclo], motivo: null, usuario_nome: null });
      showToast('Ciclo atualizado.', true); onUpdated(updated);
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSavingCiclo(false); }
  }

  async function handleDelete() {
    setSaving(true);
    try { await deleteAssinatura(ass.id); showToast('Assinatura excluída.', true); onDeleted(); }
    catch (e) { showToast('Erro: ' + (e as Error).message, false); setSaving(false); }
  }

  const visibleActions = ACTIONS.filter(a => a.shows.includes(ass.status));

  return (
    <div className="p-5 space-y-6">
      {/* Status actions */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Ações de Status</p>
        <div className="space-y-2">
          {visibleActions.map(a => (
            <div key={a.id as string} className={`border rounded-xl overflow-hidden ${a.color}`}>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium" onClick={() => setExpanded(prev => prev === a.id ? null : a.id)}>
                {a.icon} <span>{a.label}</span>
              </button>
              {expanded === a.id && (
                <div className="px-4 pb-4 space-y-2 border-t border-current/10">
                  {a.needsMotivo && <div><label className="block text-xs font-medium mb-1">Motivo{a.required ? ' *' : ' (opcional)'}</label><input className="w-full border border-current/20 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none" value={motivo} onChange={e => setMotivo(e.target.value)} /></div>}
                  {a.hasRetorno && <div><label className="block text-xs font-medium mb-1">Retorno previsto (opcional)</label><input type="date" className="w-full border border-current/20 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none" value={retorno} onChange={e => setRetorno(e.target.value)} /></div>}
                  <button onClick={() => handleAction(a)} disabled={saving} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-60">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Confirmar
                  </button>
                </div>
              )}
            </div>
          ))}
          {visibleActions.length === 0 && <p className="text-xs text-slate-400 italic">Nenhuma ação disponível para o status atual.</p>}
        </div>
      </div>
      {/* Desconto */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Desconto</p>
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Desconto %</label><input type="number" min="0" max="100" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" value={descPct} onChange={e => setDescPct(e.target.value)} /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Motivo{parseFloat(descPct) > 0 ? ' *' : ''}</label><input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" value={descMotivo} onChange={e => setDescMotivo(e.target.value)} /></div>
          </div>
          <div className="flex justify-end"><button onClick={handleDesconto} disabled={savingDesc} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-60">{savingDesc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar</button></div>
        </div>
      </div>
      {/* Ciclo */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Ciclo de Cobrança</p>
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <p className="text-xs text-slate-500">Atual: <strong>{ass.ciclo_cobranca ? CICLO_LABEL[ass.ciclo_cobranca] : 'Não definido'}</strong></p>
          <div className="flex flex-wrap gap-2">
            {(['mensal','trimestral','semestral','anual'] as const).map(c => (
              <button key={c} onClick={() => handleCiclo(c)} disabled={savingCiclo || ass.ciclo_cobranca === c} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-60 ${ass.ciclo_cobranca === c ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>{CICLO_LABEL[c]}</button>
            ))}
          </div>
        </div>
      </div>
      {/* Vendedor */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Vendedor</p>
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" value={novoVendedor} onChange={e => setNovoVendedor(e.target.value)}>
            <option value="">Sem vendedor</option>
            {usuarios.filter(u => u.ativo).map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
          <div className="flex justify-end"><button onClick={handleVendedor} disabled={savingVend} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-60">{savingVend ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar</button></div>
        </div>
      </div>
      {/* Obs */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Observações Internas</p>
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <textarea rows={4} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none" value={obs} onChange={e => setObs(e.target.value)} />
          <div className="flex justify-end"><button onClick={handleObs} disabled={savingObs} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-60">{savingObs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar</button></div>
        </div>
      </div>
      {/* Delete */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Zona de Perigo</p>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">Excluir Assinatura</p>
              <p className="text-xs text-red-600 mt-0.5">Ação irreversível.</p>
              {!confirmDel ? (
                <button onClick={() => setConfirmDel(true)} className="mt-3 flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"><Trash2 className="w-3.5 h-3.5" /> Excluir</button>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-red-700 font-medium">Confirmar exclusão?</span>
                  <button onClick={handleDelete} disabled={saving} className="text-xs bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded-lg disabled:opacity-60">{saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sim, excluir'}</button>
                  <button onClick={() => setConfirmDel(false)} className="text-xs text-slate-500 border border-slate-200 bg-white px-3 py-1.5 rounded-lg">Cancelar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab Integrações (placeholder) ─────────────────────────────────────────────
function TabIntegracoes() {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-6 gap-4">
      <Plug className="w-10 h-10 text-slate-200" />
      <div>
        <p className="text-sm font-semibold text-slate-500">Integrações com Gateway</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">Configure as integrações de pagamento na seção "Integrações" do módulo.</p>
      </div>
    </div>
  );
}

// ── Detail Panel ───────────────────────────────────────────────────────────────
type Tab = 'visao-geral' | 'acessos' | 'cobrancas' | 'historico' | 'gestao' | 'integracoes';
const TABS: { id: Tab; label: string }[] = [
  { id: 'visao-geral',  label: 'Visão Geral'  },
  { id: 'acessos',      label: 'Acessos'      },
  { id: 'cobrancas',    label: 'Cobranças'    },
  { id: 'historico',    label: 'Histórico'    },
  { id: 'gestao',       label: 'Gestão'       },
  { id: 'integracoes',  label: 'Integrações'  },
];

function DetailPanel({ ass, usuarios, onUpdated, onDeleted, onClose, showToast }: {
  ass: ErpAssinatura; usuarios: ZiaUsuario[];
  onUpdated: (a: ErpAssinatura) => void; onDeleted: () => void;
  onClose: () => void; showToast: (m: string, ok: boolean) => void;
}) {
  const [tab, setTab] = useState<Tab>('visao-geral');
  const vendedor = usuarios.find(u => u.id === ass.vendedor_id);
  const phone = ass.erp_clientes?.telefone;

  useEffect(() => { setTab('visao-geral'); }, [ass.id]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-0 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-800 truncate">{ass.erp_clientes?.nome ?? '—'}</h2>
              <StatusBadge status={ass.status} />
            </div>
            <p className="text-xs text-slate-500 truncate">{ass.erp_produtos?.nome ?? '—'}</p>
            <div className="flex items-center gap-3 mt-1">
              {phone && (
                <>
                  <span className="flex items-center gap-1 text-xs text-slate-400"><Phone className="w-3 h-3" />{phone}</span>
                  <a href={`https://wa.me/55${phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"><MessageCircle className="w-3 h-3" />WhatsApp</a>
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg shrink-0"><X className="w-4 h-4" /></button>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto custom-scrollbar">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`shrink-0 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{t.label}</button>
          ))}
        </div>
      </div>
      {/* Tab content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {tab === 'visao-geral'  && <TabVisaoGeral ass={ass} vendedor={vendedor} />}
        {tab === 'acessos'      && <TabAcessos ass={ass} showToast={showToast} />}
        {tab === 'cobrancas'    && <TabCobrancas ass={ass} />}
        {tab === 'historico'    && <TabHistorico ass={ass} />}
        {tab === 'gestao'       && <TabGestao ass={ass} usuarios={usuarios} onUpdated={onUpdated} onDeleted={onDeleted} showToast={showToast} />}
        {tab === 'integracoes'  && <TabIntegracoes />}
      </div>
    </div>
  );
}

// ── CSV Export ─────────────────────────────────────────────────────────────────
function exportCSV(rows: ErpAssinatura[], usuarios: ZiaUsuario[]) {
  const headers = ['Cliente','Plano','Valor Mensal','Desconto %','Valor Líquido','Início','Tempo','Próx. Vencimento','Status','Vendedor'];
  const data = rows.map(a => {
    const liquido = calcLiquido(a.valor_mensal, a.desconto_pct);
    const meses = monthsSince(a.data_inicio);
    const vend = usuarios.find(u => u.id === a.vendedor_id);
    return [
      a.erp_clientes?.nome ?? '',
      a.erp_produtos?.nome ?? '',
      a.valor_mensal.toFixed(2),
      a.desconto_pct.toString(),
      liquido.toFixed(2),
      DATE_FMT(a.data_inicio),
      fmtDuracao(meses),
      a.proximo_vencimento ? DATE_FMT(a.proximo_vencimento) : '',
      STATUS_CONFIG[a.status].label,
      vend?.nome ?? '',
    ];
  });
  const csv = [headers, ...data].map(row => row.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'assinaturas.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ClientesAssinatura() {
  const [assinaturas, setAssinaturas] = useState<ErpAssinatura[]>([]);
  const [clientes, setClientes] = useState<ErpCliente[]>([]);
  const [produtos, setProdutos] = useState<ErpProduto[]>([]);
  const [usuarios, setUsuarios] = useState<ZiaUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [planoFilter, setPlanoFilter] = useState<string>('');
  const [vendedorFilter, setVendedorFilter] = useState<string>('');
  const [selected, setSelected] = useState<ErpAssinatura | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const vendedorId = getVendedorFilter();
  const isVendedor = vendedorId !== null;

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ass, cli, prod, usr] = await Promise.all([
        getAssinaturas({ vendedor_id: vendedorId ?? undefined, status: statusFilter as AssinaturaStatus || undefined }),
        getClientes(), getProdutos(), getZiaUsuarios(),
      ]);
      setAssinaturas(ass); setClientes(cli); setProdutos(prod); setUsuarios(usr);
    } catch (e) {
      showToast('Erro ao carregar: ' + (e as Error).message, false);
    } finally { setLoading(false); }
  }, [vendedorId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = assinaturas.filter(a => {
    if (search) {
      const s = search.toLowerCase();
      if (!(a.erp_clientes?.nome ?? '').toLowerCase().includes(s) && !(a.erp_produtos?.nome ?? '').toLowerCase().includes(s)) return false;
    }
    if (planoFilter && a.produto_id !== planoFilter) return false;
    if (vendedorFilter && a.vendedor_id !== vendedorFilter) return false;
    return true;
  });

  const planos = produtos.filter(p => p.is_subscription);

  function handleCreated(ass: ErpAssinatura) { setShowCreate(false); setAssinaturas(prev => [ass, ...prev]); setSelected(ass); }
  function handleUpdated(updated: ErpAssinatura) { setAssinaturas(prev => prev.map(a => a.id === updated.id ? updated : a)); setSelected(updated); }
  function handleDeleted(id: string) { setAssinaturas(prev => prev.filter(a => a.id !== id)); setSelected(null); }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && <CreateModal clientes={clientes} produtos={produtos} usuarios={usuarios} onClose={() => setShowCreate(false)} onSaved={handleCreated} showToast={showToast} />}

      {/* Left panel */}
      <div className={`${selected ? 'hidden lg:flex lg:w-[55%]' : 'flex-1'} flex-col border-r border-slate-200 bg-white overflow-hidden`}>
        {/* Filter bar */}
        <div className="px-4 py-3 border-b border-slate-100 space-y-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-40">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="Buscar cliente ou plano..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {!isVendedor && (
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-medium">
                <Plus className="w-3.5 h-3.5" /> Nova
              </button>
            )}
            <button onClick={() => exportCSV(filtered, usuarios)} className="flex items-center gap-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-lg text-xs">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Todos os status</option>
              {(Object.keys(STATUS_CONFIG) as AssinaturaStatus[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </select>
            <select className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" value={planoFilter} onChange={e => setPlanoFilter(e.target.value)}>
              <option value="">Todos os planos</option>
              {planos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            {!isVendedor && (
              <select className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" value={vendedorFilter} onChange={e => setVendedorFilter(e.target.value)}>
                <option value="">Todos os vendedores</option>
                {usuarios.filter(u => u.ativo).map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <FileText className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-sm text-slate-400 font-medium">Nenhuma assinatura encontrada</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Cliente','Plano','Valor/mês','Desconto','Líquido','Início','Tempo','Próx. Vcto','Status','Vendedor'].map(h => (
                    <th key={h} className="px-3 py-2.5 font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(a => {
                  const isSelected = selected?.id === a.id;
                  const cfg = STATUS_CONFIG[a.status];
                  const liquido = calcLiquido(a.valor_mensal, a.desconto_pct);
                  const meses = monthsSince(a.data_inicio);
                  const vend = usuarios.find(u => u.id === a.vendedor_id);
                  return (
                    <tr key={a.id} onClick={() => setSelected(isSelected ? null : a)} className={`cursor-pointer transition-colors ${isSelected ? 'bg-slate-800' : 'hover:bg-slate-50'}`}>
                      <td className={`px-3 py-2.5 font-semibold whitespace-nowrap max-w-[140px] truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>{a.erp_clientes?.nome ?? '—'}</td>
                      <td className={`px-3 py-2.5 whitespace-nowrap max-w-[120px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>{a.erp_produtos?.nome ?? '—'}</td>
                      <td className={`px-3 py-2.5 whitespace-nowrap ${isSelected ? 'text-slate-200' : 'text-slate-700'}`}>{BRL(a.valor_mensal)}</td>
                      <td className={`px-3 py-2.5 whitespace-nowrap ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{a.desconto_pct > 0 ? `${a.desconto_pct}%` : '—'}</td>
                      <td className={`px-3 py-2.5 whitespace-nowrap font-semibold ${isSelected ? 'text-green-300' : 'text-slate-800'}`}>{BRL(liquido)}</td>
                      <td className={`px-3 py-2.5 whitespace-nowrap ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{DATE_FMT(a.data_inicio)}</td>
                      <td className={`px-3 py-2.5 whitespace-nowrap ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{fmtDuracao(meses)}</td>
                      <td className={`px-3 py-2.5 whitespace-nowrap ${isSelected ? 'text-amber-300' : 'text-slate-500'}`}>{a.proximo_vencimento ? DATE_FMT(a.proximo_vencimento) : '—'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {isSelected ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-200`}>{cfg.label}</span>
                        ) : (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                        )}
                      </td>
                      <td className={`px-3 py-2.5 whitespace-nowrap ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{vend?.nome ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 shrink-0">
          <p className="text-[11px] text-slate-400">{filtered.length} assinatura(s)</p>
        </div>
      </div>

      {/* Right panel */}
      {selected && (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <DetailPanel
            ass={selected}
            usuarios={usuarios}
            onUpdated={handleUpdated}
            onDeleted={() => handleDeleted(selected.id)}
            onClose={() => setSelected(null)}
            showToast={showToast}
          />
        </div>
      )}

      {/* Empty state when no selection on desktop */}
      {!selected && (
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center text-center p-8 border-l border-slate-200 bg-slate-50">
          <FileText className="w-12 h-12 text-slate-200 mb-3" />
          <p className="font-semibold text-slate-400">Selecione uma assinatura</p>
          <p className="text-sm text-slate-300 mt-1">Clique em uma linha para ver os detalhes</p>
        </div>
      )}
    </div>
  );
}

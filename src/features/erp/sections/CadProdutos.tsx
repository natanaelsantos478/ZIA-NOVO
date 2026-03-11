import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Edit2, Trash2, X, Loader2, CheckCircle, AlertCircle, Package,
  ChevronRight, Save, FileText, GitBranch, DollarSign, Tag, ExternalLink,
  ShoppingCart, Calendar, User,
} from 'lucide-react';
import {
  getProdutos, createProduto, updateProduto, deleteProduto, getGruposProdutos,
  getVariacoesProduto, getOrcamentosPorProduto,
} from '../../../lib/erp';
import type { ErpProduto, ErpGrupoProduto } from '../../../lib/erp';

const UNITS = ['UN', 'KG', 'CX', 'L', 'M', 'M2', 'M3', 'PC', 'PAR', 'SC', 'FD', 'ROL'];
const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type ProdTab = 'cadastro' | 'variacoes' | 'orcamentos';

type ProdForm = {
  codigo_interno: string; codigo_barras: string; ncm: string;
  cst_icms: string; cst_pis: string; cst_cofins: string;
  nome: string; descricao: string; unidade_medida: string; grupo_id: string;
  preco_custo: string; preco_venda: string; estoque_minimo: string; peso_bruto_kg: string;
  ativo: boolean; produto_pai_id: string; variacao_nome: string;
};

const EMPTY_FORM: ProdForm = {
  codigo_interno: '', codigo_barras: '', ncm: '', cst_icms: '', cst_pis: '', cst_cofins: '',
  nome: '', descricao: '', unidade_medida: 'UN', grupo_id: '', preco_custo: '', preco_venda: '',
  estoque_minimo: '', peso_bruto_kg: '', ativo: true, produto_pai_id: '', variacao_nome: '',
};

type OrcRef = {
  orcamento_id: string;
  negociacao_id: string;
  quantidade: number;
  preco_unitario: number;
  total: number;
  negociacao?: { cliente_nome: string };
};

// ── Aba Cadastro ──────────────────────────────────────────────────────────────
function TabCadastro({
  form, setForm, grupos, editId, saving, onSave,
  isPai, variacoes,
}: {
  form: ProdForm;
  setForm: React.Dispatch<React.SetStateAction<ProdForm>>;
  grupos: ErpGrupoProduto[];
  editId: string | null;
  saving: boolean;
  onSave: () => void;
  isPai: boolean;
  variacoes: ErpProduto[];
}) {
  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full custom-scrollbar">
      {isPai && variacoes.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-blue-700">
          <GitBranch className="w-3.5 h-3.5 shrink-0" />
          Produto pai com {variacoes.length} variação(ões) cadastrada(s). Veja a aba <strong>Variações</strong>.
        </div>
      )}

      {/* Identificação */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Código Interno *</label>
          <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={form.codigo_interno} onChange={e => setForm(p => ({ ...p, codigo_interno: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Código de Barras (EAN)</label>
          <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={form.codigo_barras} onChange={e => setForm(p => ({ ...p, codigo_barras: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">NCM *</label>
          <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono"
            placeholder="0000.00.00" maxLength={10} value={form.ncm} onChange={e => setForm(p => ({ ...p, ncm: e.target.value }))} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Nome / Descrição *</label>
          <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Unidade *</label>
          <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={form.unidade_medida} onChange={e => setForm(p => ({ ...p, unidade_medida: e.target.value }))}>
            {UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Descrição Detalhada</label>
        <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
          placeholder="Informações adicionais sobre o produto..."
          value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Grupo</label>
          <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={form.grupo_id} onChange={e => setForm(p => ({ ...p, grupo_id: e.target.value }))}>
            <option value="">Sem grupo</option>
            {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Peso Bruto (kg)</label>
          <input type="number" min="0" step="0.001" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={form.peso_bruto_kg} onChange={e => setForm(p => ({ ...p, peso_bruto_kg: e.target.value }))} />
        </div>
      </div>

      {/* Preços */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Preços e Estoque</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Preço de Custo (R$)</label>
            <input type="number" min="0" step="0.0001" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.preco_custo} onChange={e => setForm(p => ({ ...p, preco_custo: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Preço de Venda (R$) *</label>
            <input type="number" min="0" step="0.0001" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.preco_venda} onChange={e => setForm(p => ({ ...p, preco_venda: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Estoque Mínimo</label>
            <input type="number" min="0" step="0.001" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.estoque_minimo} onChange={e => setForm(p => ({ ...p, estoque_minimo: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Fiscal */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Dados Fiscais</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">CST/CSOSN ICMS</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.cst_icms} onChange={e => setForm(p => ({ ...p, cst_icms: e.target.value }))} placeholder="000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">CST PIS</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.cst_pis} onChange={e => setForm(p => ({ ...p, cst_pis: e.target.value }))} placeholder="07" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">CST COFINS</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.cst_cofins} onChange={e => setForm(p => ({ ...p, cst_cofins: e.target.value }))} placeholder="07" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="pativo" checked={form.ativo} onChange={e => setForm(p => ({ ...p, ativo: e.target.checked }))} className="rounded" />
        <label htmlFor="pativo" className="text-sm text-slate-700">Produto ativo</label>
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={onSave} disabled={saving}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {editId ? 'Salvar Alterações' : 'Criar Produto'}
        </button>
      </div>
    </div>
  );
}

// ── Aba Variações ─────────────────────────────────────────────────────────────
function TabVariacoes({
  paiId, variacoes, grupos, loadingVar, onReload, showToast,
}: {
  paiId: string;
  variacoes: ErpProduto[];
  grupos: ErpGrupoProduto[];
  loadingVar: boolean;
  onReload: () => void;
  showToast: (msg: string, ok: boolean) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProdForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [editVar, setEditVar] = useState<string | null>(null);

  function openNew() {
    setForm({ ...EMPTY_FORM });
    setEditVar(null);
    setShowForm(true);
  }

  function openEdit(v: ErpProduto) {
    setForm({
      codigo_interno: v.codigo_interno, codigo_barras: v.codigo_barras ?? '',
      ncm: v.ncm, cst_icms: v.cst_icms ?? '', cst_pis: v.cst_pis ?? '',
      cst_cofins: v.cst_cofins ?? '', nome: v.nome, descricao: v.descricao ?? '',
      unidade_medida: v.unidade_medida, grupo_id: v.grupo_id ?? '',
      preco_custo: v.preco_custo?.toString() ?? '', preco_venda: v.preco_venda.toString(),
      estoque_minimo: v.estoque_minimo?.toString() ?? '', peso_bruto_kg: v.peso_bruto_kg?.toString() ?? '',
      ativo: v.ativo, produto_pai_id: paiId, variacao_nome: v.variacao_nome ?? '',
    });
    setEditVar(v.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.codigo_interno || !form.nome || !form.ncm) return showToast('Código, Nome e NCM são obrigatórios.', false);
    setSaving(true);
    try {
      const payload = {
        codigo_interno: form.codigo_interno, codigo_barras: form.codigo_barras || null,
        ncm: form.ncm, cst_icms: form.cst_icms || null, cst_pis: form.cst_pis || null,
        cst_cofins: form.cst_cofins || null, nome: form.nome, descricao: form.descricao || null,
        unidade_medida: form.unidade_medida, grupo_id: form.grupo_id || null,
        preco_custo: form.preco_custo ? +form.preco_custo : null,
        preco_venda: +form.preco_venda || 0,
        estoque_minimo: form.estoque_minimo ? +form.estoque_minimo : null,
        peso_bruto_kg: form.peso_bruto_kg ? +form.peso_bruto_kg : null,
        ativo: form.ativo, produto_pai_id: paiId,
        variacao_nome: form.variacao_nome || null,
      };
      if (editVar) { await updateProduto(editVar, payload); showToast('Variação atualizada.', true); }
      else { await createProduto(payload); showToast('Variação criada.', true); }
      setShowForm(false); onReload();
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta variação?')) return;
    try { await deleteProduto(id); showToast('Variação excluída.', true); onReload(); }
    catch (e) { showToast('Erro: ' + (e as Error).message, false); }
  }

  if (loadingVar) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 shrink-0 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-800">Variações do Produto</p>
          <p className="text-[11px] text-slate-400">{variacoes.length} variação(ões) · cada uma com código e estoque individual</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
          <Plus className="w-3.5 h-3.5" /> Nova Variação
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
        {variacoes.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <GitBranch className="w-10 h-10 text-slate-200 mb-3" />
            <p className="font-semibold text-slate-500">Nenhuma variação cadastrada</p>
            <p className="text-sm text-slate-400 mt-1">Clique em "Nova Variação" para adicionar sub-produtos.</p>
          </div>
        )}

        {/* Form inline para nova/editar variação */}
        {showForm && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-slate-700">{editVar ? 'Editar Variação' : 'Nova Variação'}</p>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Código Interno *</label>
                <input className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.codigo_interno} onChange={e => setForm(p => ({ ...p, codigo_interno: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Nome da Variação *</label>
                <input className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="ex: Azul, P, 500ml..."
                  value={form.variacao_nome} onChange={e => setForm(p => ({ ...p, variacao_nome: e.target.value, nome: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">NCM *</label>
                <input className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.ncm} onChange={e => setForm(p => ({ ...p, ncm: e.target.value }))} placeholder="0000.00.00" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Preço de Venda (R$)</label>
                <input type="number" min="0" step="0.01" className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.preco_venda} onChange={e => setForm(p => ({ ...p, preco_venda: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Estoque Mínimo</label>
                <input type="number" min="0" className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.estoque_minimo} onChange={e => setForm(p => ({ ...p, estoque_minimo: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Unidade</label>
                <select className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.unidade_medida} onChange={e => setForm(p => ({ ...p, unidade_medida: e.target.value }))}>
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-60">
                {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                {editVar ? 'Salvar' : 'Criar Variação'}
              </button>
            </div>
          </div>
        )}

        {/* Lista de variações */}
        {variacoes.map(v => (
          <div key={v.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{v.codigo_interno}</span>
                <span className="font-semibold text-sm text-slate-800">{v.variacao_nome || v.nome}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${v.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {v.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{BRL(v.preco_venda)}</span>
                <span className="flex items-center gap-1"><Tag className="w-3 h-3" />Estoque: <strong className={`${v.estoque_minimo && v.estoque_atual <= v.estoque_minimo ? 'text-red-600' : 'text-slate-700'}`}>{v.estoque_atual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</strong></span>
                <span>{v.unidade_medida}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => openEdit(v)} className="text-slate-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(v.id)} className="text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Aba Orçamentos Vinculados ─────────────────────────────────────────────────
function TabOrcamentosVinculados({ produtoId }: { produtoId: string }) {
  const [orcs, setOrcs] = useState<OrcRef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getOrcamentosPorProduto(produtoId)
      .then(setOrcs)
      .catch(() => setOrcs([]))
      .finally(() => setLoading(false));
  }, [produtoId]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  if (orcs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
        <ShoppingCart className="w-10 h-10 text-slate-200 mb-3" />
        <p className="font-semibold text-slate-500">Sem orçamentos vinculados</p>
        <p className="text-sm text-slate-400 mt-1">Este produto ainda não foi incluído em nenhum orçamento do CRM.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 overflow-y-auto h-full custom-scrollbar">
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{orcs.length} orçamento(s) com este produto</p>
      {orcs.map(o => (
        <div key={o.orcamento_id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 text-sm">Orçamento #{o.orcamento_id.slice(0, 8).toUpperCase()}</p>
              {o.negociacao?.cliente_nome && (
                <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1"><User className="w-3 h-3" />{o.negociacao.cliente_nome}</p>
              )}
            </div>
            <span className="text-xs font-bold text-slate-700 font-mono shrink-0">{BRL(o.total)}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" />Qtd: {o.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</span>
            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />Preço: {BRL(o.preco_unitario)}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              Acesse este orçamento em: CRM &rsaquo; Negociações &rsaquo; aba Orçamento
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function CadProdutos() {
  const [produtos, setProdutos] = useState<ErpProduto[]>([]);
  const [grupos, setGrupos] = useState<ErpGrupoProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ErpProduto | null>(null);
  const [form, setForm] = useState<ProdForm>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<ProdTab>('cadastro');
  const [variacoes, setVariacoes] = useState<ErpProduto[]>([]);
  const [loadingVar, setLoadingVar] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [p, g] = await Promise.all([getProdutos(search), getGruposProdutos()]);
      setProdutos(p); setGrupos(g);
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  // Carrega variações ao selecionar produto pai
  const loadVariacoes = useCallback(async (paiId: string) => {
    setLoadingVar(true);
    try {
      setVariacoes(await getVariacoesProduto(paiId));
    } catch { setVariacoes([]); }
    finally { setLoadingVar(false); }
  }, []);

  useEffect(() => {
    if (selected) loadVariacoes(selected.id);
    else setVariacoes([]);
  }, [selected, loadVariacoes]);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }

  function selectProduto(p: ErpProduto) {
    setSelected(p);
    setEditId(p.id);
    setForm({
      codigo_interno: p.codigo_interno, codigo_barras: p.codigo_barras ?? '',
      ncm: p.ncm, cst_icms: p.cst_icms ?? '', cst_pis: p.cst_pis ?? '',
      cst_cofins: p.cst_cofins ?? '', nome: p.nome, descricao: p.descricao ?? '',
      unidade_medida: p.unidade_medida, grupo_id: p.grupo_id ?? '',
      preco_custo: p.preco_custo?.toString() ?? '', preco_venda: p.preco_venda.toString(),
      estoque_minimo: p.estoque_minimo?.toString() ?? '', peso_bruto_kg: p.peso_bruto_kg?.toString() ?? '',
      ativo: p.ativo, produto_pai_id: '', variacao_nome: p.variacao_nome ?? '',
    });
    setActiveTab('cadastro');
  }

  function openNew() {
    setSelected(null); setForm(EMPTY_FORM); setEditId(null); setActiveTab('cadastro');
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir produto?')) return;
    try { await deleteProduto(id); showToast('Produto excluído.', true); if (selected?.id === id) setSelected(null); load(); }
    catch (e) { showToast('Erro: ' + (e as Error).message, false); }
  }

  async function handleSave() {
    if (!form.codigo_interno || !form.nome || !form.ncm) return showToast('Código, Nome e NCM são obrigatórios.', false);
    setSaving(true);
    try {
      const payload = {
        codigo_interno: form.codigo_interno, codigo_barras: form.codigo_barras || null,
        ncm: form.ncm, cst_icms: form.cst_icms || null, cst_pis: form.cst_pis || null,
        cst_cofins: form.cst_cofins || null, nome: form.nome, descricao: form.descricao || null,
        unidade_medida: form.unidade_medida, grupo_id: form.grupo_id || null,
        preco_custo: form.preco_custo ? +form.preco_custo : null,
        preco_venda: +form.preco_venda || 0,
        estoque_minimo: form.estoque_minimo ? +form.estoque_minimo : null,
        peso_bruto_kg: form.peso_bruto_kg ? +form.peso_bruto_kg : null,
        ativo: form.ativo, produto_pai_id: null, variacao_nome: null,
      };
      if (editId) { const up = await updateProduto(editId, payload); showToast('Produto atualizado.', true); setSelected(up); load(); }
      else { const cr = await createProduto(payload); showToast('Produto criado.', true); load(); selectProduto(cr); }
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSaving(false); }
  }

  const TABS: { id: ProdTab; label: string; icon: React.ReactNode }[] = [
    { id: 'cadastro', label: 'Cadastro', icon: <Tag className="w-3.5 h-3.5" /> },
    { id: 'variacoes', label: `Variações${variacoes.length > 0 ? ` (${variacoes.length})` : ''}`, icon: <GitBranch className="w-3.5 h-3.5" /> },
    { id: 'orcamentos', label: 'Orçamentos', icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Painel esquerdo — lista */}
      <div className="w-80 shrink-0 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-sm font-bold text-slate-800">Produtos</h1>
            <button onClick={openNew} className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" /> Novo
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
              placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : produtos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">Nenhum produto.</p>
            </div>
          ) : produtos.map(p => {
            const isSelected = selected?.id === p.id;
            const baixoEstoque = p.estoque_minimo != null && p.estoque_atual <= p.estoque_minimo;
            return (
              <div key={p.id} onClick={() => selectProduto(p)}
                className={`px-4 py-3 border-b border-slate-100 cursor-pointer transition-colors ${isSelected ? 'bg-slate-800 text-white' : 'hover:bg-white'}`}>
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-500'}`}>{p.codigo_interno}</span>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`} />
                </div>
                <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>{p.nome}</p>
                <div className={`flex items-center justify-between text-[11px] mt-1 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                  <span>{p.erp_grupo_produtos?.nome ?? 'Sem grupo'}</span>
                  <span className={`font-semibold ${baixoEstoque && !isSelected ? 'text-red-600' : ''}`}>
                    {p.preco_venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className={`flex items-center justify-between text-[10px] mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                  <span>Estoque: <span className={`font-semibold ${baixoEstoque && !isSelected ? 'text-red-600' : ''}`}>{p.estoque_atual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span> {p.unidade_medida}</span>
                  {baixoEstoque && <span className={`text-[9px] font-bold ${isSelected ? 'text-red-300' : 'text-red-500'}`}>BAIXO</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-2 border-t border-slate-200 bg-white">
          <p className="text-[11px] text-slate-400">{produtos.length} produto(s) pai</p>
        </div>
      </div>

      {/* Painel direito */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected && !editId ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 shrink-0">
              <h2 className="text-base font-bold text-slate-900">Novo Produto</h2>
              <p className="text-xs text-slate-400 mt-0.5">Produto pai — adicione variações depois de salvar</p>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <TabCadastro form={form} setForm={setForm} grupos={grupos} editId={null} saving={saving}
                onSave={handleSave} isPai={false} variacoes={[]} />
            </div>
          </div>
        ) : selected ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{selected.nome}</h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{selected.codigo_interno} · {selected.unidade_medida} · NCM {selected.ncm}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDelete(selected.id)}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-2.5 py-1.5 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 bg-white shrink-0">
              <div className="flex">
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${activeTab === tab.id ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'cadastro' && (
                <TabCadastro form={form} setForm={setForm} grupos={grupos} editId={editId} saving={saving}
                  onSave={handleSave} isPai={variacoes.length > 0} variacoes={variacoes} />
              )}
              {activeTab === 'variacoes' && (
                <TabVariacoes paiId={selected.id} variacoes={variacoes} grupos={grupos}
                  loadingVar={loadingVar} onReload={() => loadVariacoes(selected.id)} showToast={showToast} />
              )}
              {activeTab === 'orcamentos' && (
                <TabOrcamentosVinculados produtoId={selected.id} />
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Package className="w-12 h-12 text-slate-200 mb-3" />
            <p className="font-semibold text-slate-400">Selecione um produto</p>
            <p className="text-sm text-slate-300 mt-1">ou clique em "Novo" para cadastrar</p>
          </div>
        )}
      </div>
    </div>
  );
}

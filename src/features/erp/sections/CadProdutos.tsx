import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, X, Loader2, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { getProdutos, createProduto, updateProduto, deleteProduto, getGruposProdutos } from '../../../lib/erp';
import type { ErpProduto, ErpGrupoProduto } from '../../../lib/erp';

const UNITS = ['UN', 'KG', 'CX', 'L', 'M', 'M2', 'M3', 'PC', 'PAR', 'SC', 'FD', 'ROL'];

type ProdForm = {
  codigo_interno: string;
  codigo_barras: string;
  ncm: string;
  cst_icms: string;
  cst_pis: string;
  cst_cofins: string;
  nome: string;
  unidade_medida: string;
  grupo_id: string;
  preco_custo: string;
  preco_venda: string;
  estoque_minimo: string;
  peso_bruto_kg: string;
  ativo: boolean;
};

const EMPTY_FORM: ProdForm = {
  codigo_interno: '', codigo_barras: '', ncm: '', cst_icms: '', cst_pis: '', cst_cofins: '',
  nome: '', unidade_medida: 'UN', grupo_id: '', preco_custo: '', preco_venda: '', estoque_minimo: '', peso_bruto_kg: '', ativo: true,
};

export default function CadProdutos() {
  const [produtos, setProdutos] = useState<ErpProduto[]>([]);
  const [grupos, setGrupos] = useState<ErpGrupoProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProdForm>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [p, g] = await Promise.all([getProdutos(search), getGruposProdutos()]);
      setProdutos(p); setGrupos(g);
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }
  function openNew() { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); }
  function openEdit(p: ErpProduto) {
    setForm({
      codigo_interno: p.codigo_interno, codigo_barras: p.codigo_barras ?? '', ncm: p.ncm,
      cst_icms: p.cst_icms ?? '', cst_pis: p.cst_pis ?? '', cst_cofins: p.cst_cofins ?? '',
      nome: p.nome, unidade_medida: p.unidade_medida, grupo_id: p.grupo_id ?? '',
      preco_custo: p.preco_custo?.toString() ?? '', preco_venda: p.preco_venda.toString(),
      estoque_minimo: p.estoque_minimo?.toString() ?? '', peso_bruto_kg: p.peso_bruto_kg?.toString() ?? '',
      ativo: p.ativo,
    });
    setEditId(p.id); setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir produto?')) return;
    try { await deleteProduto(id); showToast('Produto excluído.', true); load(); }
    catch (e) { showToast('Erro: ' + (e as Error).message, false); }
  }

  async function handleSave() {
    if (!form.codigo_interno || !form.nome || !form.ncm) return showToast('Código, Nome e NCM são obrigatórios.', false);
    setSaving(true);
    try {
      const payload = {
        codigo_interno: form.codigo_interno,
        codigo_barras: form.codigo_barras || null,
        ncm: form.ncm,
        cst_icms: form.cst_icms || null,
        cst_pis: form.cst_pis || null,
        cst_cofins: form.cst_cofins || null,
        nome: form.nome,
        unidade_medida: form.unidade_medida,
        grupo_id: form.grupo_id || null,
        preco_custo: form.preco_custo ? +form.preco_custo : null,
        preco_venda: +form.preco_venda || 0,
        estoque_minimo: form.estoque_minimo ? +form.estoque_minimo : null,
        peso_bruto_kg: form.peso_bruto_kg ? +form.peso_bruto_kg : null,
        ativo: form.ativo,
      };
      if (editId) await updateProduto(editId, payload);
      else await createProduto(payload);
      showToast(editId ? 'Produto atualizado.' : 'Produto criado.', true);
      setShowForm(false); load();
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSaving(false); }
  }

  return (
    <div className="p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Cadastro de Produtos</h1>
          <p className="text-sm text-slate-500">{produtos.length} produtos cadastrados</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Novo Produto
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Código</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Produto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">NCM</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Grupo</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Preço Venda</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Estoque</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">UN</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></td></tr>
            ) : produtos.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400">Nenhum produto encontrado.</p>
              </td></tr>
            ) : produtos.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.codigo_interno}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{p.nome}</td>
                <td className="px-4 py-3 text-slate-600 font-mono text-xs">{p.ncm}</td>
                <td className="px-4 py-3 text-slate-600">{p.erp_grupo_produtos?.nome ?? '—'}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-800">
                  {p.preco_venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-medium ${p.estoque_minimo && p.estoque_atual <= p.estoque_minimo ? 'text-red-600' : 'text-slate-800'}`}>
                    {p.estoque_atual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{p.unidade_medida}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(p)} className="text-slate-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">{editId ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Identificação */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Código Interno *</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.codigo_interno} onChange={e => setForm(p => ({ ...p, codigo_interno: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Código de Barras (EAN)</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.codigo_barras} onChange={e => setForm(p => ({ ...p, codigo_barras: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">NCM *</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="0000.00.00" maxLength={10} value={form.ncm} onChange={e => setForm(p => ({ ...p, ncm: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nome / Descrição *</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Unidade *</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.unidade_medida} onChange={e => setForm(p => ({ ...p, unidade_medida: e.target.value }))}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Grupo</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.grupo_id} onChange={e => setForm(p => ({ ...p, grupo_id: e.target.value }))}>
                    <option value="">Sem grupo</option>
                    {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Peso Bruto (kg)</label>
                  <input type="number" min="0" step="0.001" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.peso_bruto_kg} onChange={e => setForm(p => ({ ...p, peso_bruto_kg: e.target.value }))} />
                </div>
              </div>

              {/* Preços */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Preços e Estoque</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Preço de Custo (R$)</label>
                    <input type="number" min="0" step="0.0001" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.preco_custo} onChange={e => setForm(p => ({ ...p, preco_custo: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Preço de Venda (R$) *</label>
                    <input type="number" min="0" step="0.0001" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.preco_venda} onChange={e => setForm(p => ({ ...p, preco_venda: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Estoque Mínimo</label>
                    <input type="number" min="0" step="0.0001" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.cst_icms} onChange={e => setForm(p => ({ ...p, cst_icms: e.target.value }))} placeholder="000" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">CST PIS</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.cst_pis} onChange={e => setForm(p => ({ ...p, cst_pis: e.target.value }))} placeholder="07" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">CST COFINS</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.cst_cofins} onChange={e => setForm(p => ({ ...p, cst_cofins: e.target.value }))} placeholder="07" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="pativo" checked={form.ativo} onChange={e => setForm(p => ({ ...p, ativo: e.target.checked }))} className="rounded" />
                <label htmlFor="pativo" className="text-sm text-slate-700">Produto ativo</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editId ? 'Salvar' : 'Criar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

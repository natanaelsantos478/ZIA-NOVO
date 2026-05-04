import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getFornecedores, createFornecedor, updateFornecedor, deleteFornecedor, consultarCNPJ, consultarCEP } from '../../../lib/erp';
import type { ErpFornecedor } from '../../../lib/erp';

type Endereco = { cep: string; logradouro: string; numero: string; bairro: string; cidade: string; uf: string };

const EMPTY_FORM: Omit<ErpFornecedor, 'id' | 'tenant_id' | 'created_at'> = {
  nome: '',
  cnpj_cpf: '',
  contato_nome: null,
  email: null,
  telefone: null,
  endereco_json: { cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '' },
  prazo_entrega_dias: null,
  is_transportadora: false,
  ativo: true,
};

export default function CadFornecedores() {
  const [fornecedores, setFornecedores] = useState<ErpFornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setFornecedores(await getFornecedores(search));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function openNew() { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); }
  function openEdit(f: ErpFornecedor) {
    setForm({ nome: f.nome, cnpj_cpf: f.cnpj_cpf, contato_nome: f.contato_nome, email: f.email, telefone: f.telefone,
      endereco_json: f.endereco_json as Endereco, prazo_entrega_dias: f.prazo_entrega_dias, is_transportadora: f.is_transportadora, ativo: f.ativo });
    setEditId(f.id); setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir fornecedor?')) return;
    try { await deleteFornecedor(id); showToast('Fornecedor excluído.', true); load(); }
    catch (e) { showToast('Erro: ' + (e as Error).message, false); }
  }

  async function handleSave() {
    if (!form.nome || !form.cnpj_cpf) return showToast('Nome e CNPJ/CPF obrigatórios.', false);
    setSaving(true);
    try {
      if (editId) await updateFornecedor(editId, form);
      else await createFornecedor(form);
      showToast(editId ? 'Atualizado.' : 'Criado.', true);
      setShowForm(false); load();
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSaving(false); }
  }

  async function handleCNPJLookup() {
    setLookingUp(true);
    try {
      const data = await consultarCNPJ(form.cnpj_cpf);
      if (!data || (data as { status?: string }).status === 'ERROR') return showToast('CNPJ não encontrado.', false);
      const d = data as Record<string, string>;
      setForm(prev => ({
        ...prev,
        nome: d.nome || prev.nome,
        email: d.email || prev.email,
        telefone: d.telefone || prev.telefone,
        contato_nome: (d.qsa as unknown as Array<{nome_socio?: string}> | undefined)?.[0]?.nome_socio || prev.contato_nome,
        endereco_json: { cep: d.cep?.replace(/\D/g, '') || '', logradouro: d.logradouro || '', numero: d.numero || '', bairro: d.bairro || '', cidade: d.municipio || '', uf: d.uf || '' },
      }));
      showToast('Dados preenchidos via CNPJ.', true);
    } finally { setLookingUp(false); }
  }

  async function handleCEPLookup() {
    const cep = (form.endereco_json as Endereco).cep;
    if (!cep || cep.replace(/\D/g, '').length < 8) return;
    setLookingUp(true);
    try {
      const data = await consultarCEP(cep);
      if (!data) return showToast('CEP não encontrado.', false);
      const d = data as Record<string, string>;
      setForm(prev => ({ ...prev, endereco_json: { ...(prev.endereco_json as Endereco), logradouro: d.logradouro || '', bairro: d.bairro || '', cidade: d.localidade || '', uf: d.uf || '' } }));
    } finally { setLookingUp(false); }
  }

  const addr = form.endereco_json as Endereco;

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
          <h1 className="text-xl font-bold text-slate-900">Cadastro de Fornecedores</h1>
          <p className="text-sm text-slate-500">{fornecedores.length} fornecedores cadastrados</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Novo Fornecedor
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
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">CNPJ/CPF</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Contato</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Cidade/UF</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Prazo (dias)</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></td></tr>
            ) : fornecedores.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">Nenhum fornecedor encontrado.</td></tr>
            ) : fornecedores.map(f => {
              const end = f.endereco_json as Endereco;
              return (
                <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{f.nome}</td>
                  <td className="px-4 py-3 text-slate-600">{f.cnpj_cpf}</td>
                  <td className="px-4 py-3 text-slate-600">{f.contato_nome || f.email || f.telefone || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{end.cidade ? `${end.cidade}/${end.uf}` : '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{f.prazo_entrega_dias ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(f)} className="text-slate-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(f.id)} className="text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">{editId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-700" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">CNPJ/CPF *</label>
                <div className="flex gap-2">
                  <input className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="00.000.000/0000-00" value={form.cnpj_cpf} onChange={e => setForm(p => ({ ...p, cnpj_cpf: e.target.value }))} />
                  <button onClick={handleCNPJLookup} disabled={lookingUp}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors">
                    {lookingUp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />} Buscar
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Razão Social / Nome *</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Pessoa de Contato</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.contato_nome ?? ''} onChange={e => setForm(p => ({ ...p, contato_nome: e.target.value || null }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Telefone</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.telefone ?? ''} onChange={e => setForm(p => ({ ...p, telefone: e.target.value || null }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">E-mail</label>
                  <input type="email" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.email ?? ''} onChange={e => setForm(p => ({ ...p, email: e.target.value || null }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Prazo Médio (dias)</label>
                  <input type="number" min="0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.prazo_entrega_dias ?? ''} onChange={e => setForm(p => ({ ...p, prazo_entrega_dias: e.target.value ? +e.target.value : null }))} />
                </div>
              </div>

              {/* Endereço */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Endereço</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">CEP</label>
                    <div className="flex gap-1">
                      <input className="flex-1 min-w-0 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={addr.cep} onChange={e => setForm(p => ({ ...p, endereco_json: { ...(p.endereco_json as Endereco), cep: e.target.value } }))} />
                      <button onClick={handleCEPLookup} disabled={lookingUp} className="px-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                        {lookingUp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3 text-slate-500" />}
                      </button>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Logradouro</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={addr.logradouro} onChange={e => setForm(p => ({ ...p, endereco_json: { ...(p.endereco_json as Endereco), logradouro: e.target.value } }))} />
                  </div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Número</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={addr.numero} onChange={e => setForm(p => ({ ...p, endereco_json: { ...(p.endereco_json as Endereco), numero: e.target.value } }))} /></div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Bairro</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={addr.bairro} onChange={e => setForm(p => ({ ...p, endereco_json: { ...(p.endereco_json as Endereco), bairro: e.target.value } }))} /></div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Cidade</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={addr.cidade} onChange={e => setForm(p => ({ ...p, endereco_json: { ...(p.endereco_json as Endereco), cidade: e.target.value } }))} /></div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editId ? 'Salvar' : 'Criar Fornecedor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

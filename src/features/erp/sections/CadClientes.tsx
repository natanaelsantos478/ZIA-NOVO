import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, X, MapPin, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getClientes, createCliente, updateCliente, deleteCliente, consultarCNPJ, consultarCEP } from '../../../lib/erp';
import type { ErpCliente } from '../../../lib/erp';

type Endereco = { cep: string; logradouro: string; numero: string; bairro: string; cidade: string; uf: string };

const EMPTY_FORM: Omit<ErpCliente, 'id' | 'tenant_id' | 'created_at'> = {
  tipo: 'PJ',
  nome: '',
  cpf_cnpj: '',
  inscricao_estadual: null,
  email: null,
  telefone: null,
  endereco_json: { cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '' },
  limite_credito: null,
  tabela_preco_id: null,
  vendedor_id: null,
  ativo: true,
};

function formatCpfCnpj(v: string, tipo: 'PF' | 'PJ'): string {
  const d = v.replace(/\D/g, '');
  if (tipo === 'PJ') {
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5');
  }
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, '$1.$2.$3-$4');
}

export default function CadClientes() {
  const [clientes, setClientes] = useState<ErpCliente[]>([]);
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
      setClientes(await getClientes(search));
    } catch (e) {
      showToast('Erro ao carregar clientes: ' + (e as Error).message, false);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(c: ErpCliente) {
    setForm({
      tipo: c.tipo,
      nome: c.nome,
      cpf_cnpj: c.cpf_cnpj,
      inscricao_estadual: c.inscricao_estadual,
      email: c.email,
      telefone: c.telefone,
      endereco_json: (c.endereco_json ?? EMPTY_FORM.endereco_json) as Endereco,
      limite_credito: c.limite_credito,
      tabela_preco_id: c.tabela_preco_id,
      vendedor_id: c.vendedor_id,
      ativo: c.ativo,
    });
    setEditId(c.id);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir cliente?')) return;
    try {
      await deleteCliente(id);
      showToast('Cliente excluído.', true);
      load();
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    }
  }

  async function handleSave() {
    if (!form.nome || !form.cpf_cnpj) return showToast('Nome e CPF/CNPJ obrigatórios.', false);
    setSaving(true);
    try {
      if (editId) {
        await updateCliente(editId, form);
        showToast('Cliente atualizado.', true);
      } else {
        await createCliente(form);
        showToast('Cliente criado.', true);
      }
      setShowForm(false);
      load();
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  async function handleCNPJLookup() {
    if (form.tipo !== 'PJ') return;
    setLookingUp(true);
    try {
      const data = await consultarCNPJ(form.cpf_cnpj);
      if (!data || (data as { status?: string }).status === 'ERROR') {
        showToast('CNPJ não encontrado.', false);
        return;
      }
      const d = data as Record<string, string>;
      setForm(prev => ({
        ...prev,
        nome: d.nome || prev.nome,
        email: d.email || prev.email,
        telefone: d.telefone || prev.telefone,
        endereco_json: {
          cep: d.cep?.replace(/\D/g, '') || '',
          logradouro: d.logradouro || '',
          numero: d.numero || '',
          bairro: d.bairro || '',
          cidade: d.municipio || '',
          uf: d.uf || '',
        },
      }));
      showToast('Dados preenchidos via CNPJ.', true);
    } catch {
      showToast('Erro ao consultar CNPJ.', false);
    } finally {
      setLookingUp(false);
    }
  }

  async function handleCEPLookup() {
    const cep = (form.endereco_json as Endereco).cep;
    if (!cep || cep.replace(/\D/g, '').length < 8) return;
    setLookingUp(true);
    try {
      const data = await consultarCEP(cep);
      if (!data) return showToast('CEP não encontrado.', false);
      const d = data as Record<string, string>;
      setForm(prev => ({
        ...prev,
        endereco_json: {
          ...(prev.endereco_json as Endereco),
          logradouro: d.logradouro || '',
          bairro: d.bairro || '',
          cidade: d.localidade || '',
          uf: d.uf || '',
        },
      }));
      showToast('Endereço preenchido.', true);
    } finally {
      setLookingUp(false);
    }
  }

  const addr = ((form.endereco_json ?? EMPTY_FORM.endereco_json) as Endereco);

  return (
    <div className="p-6" translate="no">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Cadastro de Clientes</h1>
          <p className="text-sm text-slate-500">{clientes.length} clientes cadastrados</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Buscar por nome..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">CPF/CNPJ</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Contato</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Cidade/UF</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
            ) : clientes.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-400">Nenhum cliente encontrado.</td></tr>
            ) : clientes.map(c => {
              // endereco_json pode ser null em registros antigos — usar fallback seguro
              const end = (c.endereco_json ?? {}) as Partial<Endereco>;
              return (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.nome}</td>
                  <td className="px-4 py-3 text-slate-600">{c.cpf_cnpj}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.tipo === 'PJ' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{c.tipo}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.email || c.telefone || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{end.cidade ? `${end.cidade}/${end.uf}` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(c)} className="text-slate-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(c.id)} className="text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">{editId ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-700" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Tipo */}
              <div className="flex gap-3">
                {(['PJ', 'PF'] as const).map(t => (
                  <button key={t} onClick={() => setForm(p => ({ ...p, tipo: t }))}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${form.tipo === t ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-400'}`}>
                    {t === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                  </button>
                ))}
              </div>

              {/* CPF/CNPJ */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{form.tipo === 'PJ' ? 'CNPJ' : 'CPF'} *</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={form.tipo === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                    value={form.cpf_cnpj}
                    onChange={e => setForm(p => ({ ...p, cpf_cnpj: formatCpfCnpj(e.target.value, p.tipo) }))}
                  />
                  {form.tipo === 'PJ' && (
                    <button onClick={handleCNPJLookup} disabled={lookingUp}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors">
                      {lookingUp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                      Buscar CNPJ
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nome / Razão Social *</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Insc. Estadual</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.inscricao_estadual ?? ''} onChange={e => setForm(p => ({ ...p, inscricao_estadual: e.target.value || null }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">E-mail</label>
                  <input type="email" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.email ?? ''} onChange={e => setForm(p => ({ ...p, email: e.target.value || null }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Telefone</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.telefone ?? ''} onChange={e => setForm(p => ({ ...p, telefone: e.target.value || null }))} />
                </div>
              </div>

              {/* Endereço */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1"><MapPin className="w-3 h-3" />Endereço</p>
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
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Número</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={addr.numero} onChange={e => setForm(p => ({ ...p, endereco_json: { ...(p.endereco_json as Endereco), numero: e.target.value } }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Bairro</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={addr.bairro} onChange={e => setForm(p => ({ ...p, endereco_json: { ...(p.endereco_json as Endereco), bairro: e.target.value } }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Cidade</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={addr.cidade} onChange={e => setForm(p => ({ ...p, endereco_json: { ...(p.endereco_json as Endereco), cidade: e.target.value } }))} />
                  </div>
                </div>
              </div>

              {/* Limite */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Limite de Crédito (R$)</label>
                <input type="number" min="0" step="0.01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.limite_credito ?? ''} onChange={e => setForm(p => ({ ...p, limite_credito: e.target.value ? +e.target.value : null }))} />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="ativo" checked={form.ativo} onChange={e => setForm(p => ({ ...p, ativo: e.target.checked }))} className="rounded" />
                <label htmlFor="ativo" className="text-sm text-slate-700">Cliente ativo</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editId ? 'Salvar Alterações' : 'Criar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

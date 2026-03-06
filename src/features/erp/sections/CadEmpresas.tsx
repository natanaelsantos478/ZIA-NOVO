import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, X, Loader2, CheckCircle, AlertCircle, Building2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { consultarCNPJ, consultarCEP } from '../../../lib/erp';
import type { ErpEmpresa } from '../../../lib/erp';
import { Search } from 'lucide-react';

type Endereco = { cep: string; logradouro: string; numero: string; bairro: string; cidade: string; uf: string };

async function getEmpresas(): Promise<ErpEmpresa[]> {
  const { data, error } = await supabase.from('erp_empresas').select('*').order('nome_fantasia');
  if (error) throw error;
  return data ?? [];
}

const EMPTY_FORM = {
  nome_fantasia: '', razao_social: '', cnpj: '', inscricao_estadual: '',
  telefone: '', email: '',
  endereco_json: { cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '' },
  ativo: true,
};

export default function CadEmpresas() {
  const [empresas, setEmpresas] = useState<ErpEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    try { setLoading(true); setEmpresas(await getEmpresas()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }

  function openEdit(e: ErpEmpresa) {
    setForm({
      nome_fantasia: e.nome_fantasia, razao_social: e.razao_social, cnpj: e.cnpj,
      inscricao_estadual: e.inscricao_estadual ?? '', telefone: e.telefone ?? '', email: e.email ?? '',
      endereco_json: (e.endereco_json as Endereco) ?? { cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '' },
      ativo: e.ativo,
    });
    setEditId(e.id); setShowForm(true);
  }

  async function handleCNPJLookup() {
    setLookingUp(true);
    try {
      const data = await consultarCNPJ(form.cnpj);
      if (!data || (data as { status?: string }).status === 'ERROR') return showToast('CNPJ não encontrado.', false);
      const d = data as Record<string, string>;
      setForm(prev => ({
        ...prev,
        razao_social: d.nome || prev.razao_social,
        nome_fantasia: d.fantasia || prev.nome_fantasia || d.nome,
        email: d.email || prev.email,
        telefone: d.telefone || prev.telefone,
        endereco_json: { cep: d.cep?.replace(/\D/g, '') || '', logradouro: d.logradouro || '', numero: d.numero || '', bairro: d.bairro || '', cidade: d.municipio || '', uf: d.uf || '' },
      }));
      showToast('Dados preenchidos.', true);
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

  async function handleSave() {
    if (!form.nome_fantasia || !form.razao_social || !form.cnpj) return showToast('Nome fantasia, razão social e CNPJ são obrigatórios.', false);
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const tenant_id = user?.id ?? '00000000-0000-0000-0000-000000000001';
      const payload = { ...form, inscricao_estadual: form.inscricao_estadual || null, telefone: form.telefone || null, email: form.email || null, tenant_id };
      if (editId) {
        const { error } = await supabase.from('erp_empresas').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('erp_empresas').insert(payload);
        if (error) throw error;
      }
      showToast(editId ? 'Empresa atualizada.' : 'Empresa criada.', true);
      setShowForm(false); load();
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSaving(false); }
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
          <h1 className="text-xl font-bold text-slate-900">Cadastro de Empresas</h1>
          <p className="text-sm text-slate-500">{empresas.length} empresa(s) cadastrada(s)</p>
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Nova Empresa
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div>
        ) : empresas.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <Building2 className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400">Nenhuma empresa cadastrada.</p>
          </div>
        ) : empresas.map(e => {
          const end = e.endereco_json as Endereco;
          return (
            <div key={e.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-violet-200 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-violet-600" />
                </div>
                <button onClick={() => openEdit(e)} className="text-slate-400 hover:text-violet-600 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-bold text-slate-800 mt-2">{e.nome_fantasia}</h3>
              <p className="text-xs text-slate-500">{e.razao_social}</p>
              <p className="text-xs text-slate-500 mt-0.5">{e.cnpj}</p>
              {end.cidade && <p className="text-xs text-slate-400 mt-2">{end.cidade}/{end.uf}</p>}
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">{editId ? 'Editar Empresa' : 'Nova Empresa'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">CNPJ *</label>
                <div className="flex gap-2">
                  <input className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="00.000.000/0000-00" value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))} />
                  <button onClick={handleCNPJLookup} disabled={lookingUp}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium flex items-center gap-1">
                    {lookingUp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />} Buscar
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Razão Social *</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={form.razao_social} onChange={e => setForm(p => ({ ...p, razao_social: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nome Fantasia *</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={form.nome_fantasia} onChange={e => setForm(p => ({ ...p, nome_fantasia: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Inscrição Estadual</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={form.inscricao_estadual} onChange={e => setForm(p => ({ ...p, inscricao_estadual: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Telefone</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">E-mail</label>
                  <input type="email" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>

              {/* Endereço */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Endereço</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">CEP</label>
                    <div className="flex gap-1">
                      <input className="flex-1 min-w-0 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        value={addr.cep} onChange={e => setForm(p => ({ ...p, endereco_json: { ...(p.endereco_json as Endereco), cep: e.target.value } }))} />
                      <button onClick={handleCEPLookup} disabled={lookingUp} className="px-2 bg-slate-100 rounded-lg">
                        {lookingUp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3 text-slate-500" />}
                      </button>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Logradouro</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      value={addr.logradouro} onChange={e => setForm(p => ({ ...p, endereco_json: { ...(p.endereco_json as Endereco), logradouro: e.target.value } }))} />
                  </div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Número</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      value={addr.numero} onChange={e => setForm(p => ({ ...p, endereco_json: { ...(p.endereco_json as Endereco), numero: e.target.value } }))} /></div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Bairro</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      value={addr.bairro} onChange={e => setForm(p => ({ ...p, endereco_json: { ...(p.endereco_json as Endereco), bairro: e.target.value } }))} /></div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Cidade</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      value={addr.cidade} onChange={e => setForm(p => ({ ...p, endereco_json: { ...(p.endereco_json as Endereco), cidade: e.target.value } }))} /></div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editId ? 'Salvar' : 'Criar Empresa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

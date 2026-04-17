/* eslint-disable @typescript-eslint/no-unused-expressions */
// ─────────────────────────────────────────────────────────────────────────────
// Empresas e Filiais — usa CompaniesContext (compartilhado com Perfis.tsx)
// Hierarquia: Holding → Matrizes → Filiais
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef } from 'react';
import {
  Building2, Plus, Edit2, PowerOff, Check, X, ChevronRight,
  ChevronDown, MapPin, Phone, Mail, Hash, Globe, Landmark,
  AlertCircle, ArrowRight, Upload, ImageIcon,
} from 'lucide-react';
import {
  useCompanies,
  type CompanyType,
  type Company,
} from '../../../context/CompaniesContext';
import { supabase } from '../../../lib/supabase';

// ── Helpers visuais ───────────────────────────────────────────────────────────

const TYPE_LABEL: Record<CompanyType, string> = {
  holding: 'Holding',
  matrix:  'Matriz',
  branch:  'Filial',
};

const TYPE_COLOR: Record<CompanyType, string> = {
  holding: 'bg-violet-100 text-violet-700 border-violet-200',
  matrix:  'bg-blue-100 text-blue-700 border-blue-200',
  branch:  'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const TYPE_ICON_BG: Record<CompanyType, string> = {
  holding: 'bg-violet-100',
  matrix:  'bg-blue-100',
  branch:  'bg-emerald-100',
};

const TYPE_ICON_COLOR: Record<CompanyType, string> = {
  holding: 'text-violet-600',
  matrix:  'text-blue-600',
  branch:  'text-emerald-600',
};

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO',
];

// ── Formulário ────────────────────────────────────────────────────────────────

interface FormState {
  type: CompanyType;
  parentId: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual: string;
  email: string;
  telefone: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
}

const BLANK: FormState = {
  type: 'matrix',
  parentId: '',
  razaoSocial: '',
  nomeFantasia: '',
  cnpj: '',
  inscricaoEstadual: '',
  email: '',
  telefone: '',
  endereco: '',
  cidade: '',
  estado: '',
  cep: '',
};

// ── Componente principal ──────────────────────────────────────────────────────

export default function Empresas() {
  const { holdings, matrices, branches, branchesOf, addCompany, updateCompany, removeCompany } = useCompanies();

  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState<FormState>(BLANK);
  const [saved, setSaved]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expandedIds, setExpandedIds]    = useState<Set<string>>(new Set(['holding-001', 'matrix-001']));
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview]    = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  function set(changes: Partial<FormState>) {
    setForm(prev => ({ ...prev, ...changes }));
  }

  async function handleSave() {
    if (!form.razaoSocial.trim() || !form.nomeFantasia.trim()) return;

    const payload = {
      type: form.type,
      parentId: form.parentId || undefined,
      razaoSocial: form.razaoSocial.trim(),
      nomeFantasia: form.nomeFantasia.trim(),
      cnpj: form.cnpj,
      inscricaoEstadual: form.inscricaoEstadual || undefined,
      email: form.email || undefined,
      telefone: form.telefone || undefined,
      endereco: form.endereco || undefined,
      cidade: form.cidade || undefined,
      estado: form.estado || undefined,
      cep: form.cep || undefined,
      status: 'ativa' as const,
    };

    if (editId) {
      await updateCompany(editId, payload).catch(console.error);
    } else {
      const created = await addCompany(payload).catch(console.error);
      if (created?.parentId) {
        setExpandedIds(prev => new Set([...prev, created.parentId!]));
      }
    }

    setShowForm(false);
    setEditId(null);
    setForm(BLANK);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleLogoUpload(file: File) {
    if (!editId) return;
    setLogoUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'png';
      const path = `logos/company/${editId}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('orcamento-assets')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage
        .from('orcamento-assets')
        .getPublicUrl(path);
      await updateCompany(editId, { logoUrl: publicUrl, logoStoragePath: path });
      setLogoPreview(publicUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('[Empresas] Logo upload error:', err);
    } finally {
      setLogoUploading(false);
    }
  }

  function handleEdit(c: Company) {
    setForm({
      type: c.type,
      parentId: c.parentId ?? '',
      razaoSocial: c.razaoSocial,
      nomeFantasia: c.nomeFantasia,
      cnpj: c.cnpj,
      inscricaoEstadual: c.inscricaoEstadual ?? '',
      email: c.email ?? '',
      telefone: c.telefone ?? '',
      endereco: c.endereco ?? '',
      cidade: c.cidade ?? '',
      estado: c.estado ?? '',
      cep: c.cep ?? '',
    });
    setEditId(c.id);
    setLogoPreview(c.logoUrl ?? null);
    setShowForm(true);
  }

  function handleNew(type: CompanyType, parentId?: string) {
    setForm({ ...BLANK, type, parentId: parentId ?? '' });
    setEditId(null);
    setShowForm(true);
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleStatus(id: string) {
    const allCompanies = [...holdings, ...matrices, ...branches];
    const c = allCompanies.find(x => x.id === id);
    if (c) updateCompany(id, { status: c.status === 'ativa' ? 'inativa' : 'ativa' }).catch(console.error);
  }

  // Opções de parent no formulário
  const parentOptions = form.type === 'matrix' ? holdings : form.type === 'branch' ? matrices : [];

  const counts = { holding: holdings.length, matrix: matrices.length, branch: branches.length };

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Empresas e Filiais</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Estrutura organizacional —
            <span className="text-violet-600 font-medium"> {counts.holding} holding</span> ·
            <span className="text-blue-600 font-medium"> {counts.matrix} matrizes</span> ·
            <span className="text-emerald-600 font-medium"> {counts.branch} filiais</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleNew('matrix')} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Nova Matriz
          </button>
          <button onClick={() => handleNew('branch')} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" /> Nova Filial
          </button>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 mb-6 text-xs text-slate-500">
        {(['holding','matrix','branch'] as CompanyType[]).map(t => (
          <span key={t} className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${TYPE_COLOR[t]}`}>
            <Building2 className="w-3 h-3" /> {TYPE_LABEL[t]}
          </span>
        ))}
      </div>

      {/* Toast */}
      {saved && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl mb-4 text-sm">
          <Check className="w-4 h-4" /> Empresa salva com sucesso!
        </div>
      )}

      {/* Formulário */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">
            {editId ? 'Editar empresa' : `Nova ${TYPE_LABEL[form.type]}`}
          </h3>

          {/* Tipo */}
          {!editId && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tipo de empresa *</label>
              <div className="flex gap-2 mt-1">
                {(['holding','matrix','branch'] as CompanyType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => set({ type: t, parentId: '' })}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                      form.type === t ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
              {form.type === 'holding' && (
                <div className="flex items-center gap-2 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Criar uma nova holding é uma operação importante. Recomenda-se apenas uma por conta.
                </div>
              )}
            </div>
          )}

          {/* Parent */}
          {parentOptions.length > 0 && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                {form.type === 'matrix' ? 'Holding pai *' : 'Matriz pai *'}
              </label>
              <select
                value={form.parentId}
                onChange={e => set({ parentId: e.target.value })}
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">Selecione...</option>
                {parentOptions.map(p => (
                  <option key={p.id} value={p.id}>{p.nomeFantasia} — {p.code}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Razão Social *</label>
              <input type="text" value={form.razaoSocial} onChange={e => set({ razaoSocial: e.target.value })} placeholder="Ex: Empresa XPTO LTDA" className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome Fantasia *</label>
              <input type="text" value={form.nomeFantasia} onChange={e => set({ nomeFantasia: e.target.value })} placeholder="Ex: Loja Centro SP" className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1"><Hash className="w-3 h-3" /> CNPJ</label>
              <input type="text" value={form.cnpj} onChange={e => set({ cnpj: e.target.value })} placeholder="00.000.000/0001-00" className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1"><Landmark className="w-3 h-3" /> Inscrição Estadual</label>
              <input type="text" value={form.inscricaoEstadual} onChange={e => set({ inscricaoEstadual: e.target.value })} placeholder="Isento ou número" className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1"><Mail className="w-3 h-3" /> E-mail</label>
              <input type="email" value={form.email} onChange={e => set({ email: e.target.value })} placeholder="empresa@email.com.br" className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1"><Phone className="w-3 h-3" /> Telefone</label>
              <input type="text" value={form.telefone} onChange={e => set({ telefone: e.target.value })} placeholder="(11) 99999-9999" className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1"><MapPin className="w-3 h-3" /> Endereço</label>
              <input type="text" value={form.endereco} onChange={e => set({ endereco: e.target.value })} placeholder="Rua, número, complemento, bairro" className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Cidade</label>
              <input type="text" value={form.cidade} onChange={e => set({ cidade: e.target.value })} placeholder="São Paulo" className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">UF</label>
                <select value={form.estado} onChange={e => set({ estado: e.target.value })} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
                  <option value="">—</option>
                  {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1"><Globe className="w-3 h-3" /> CEP</label>
                <input type="text" value={form.cep} onChange={e => set({ cep: e.target.value })} placeholder="00000-000" className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
            </div>
          </div>

          {/* Logo da empresa */}
          {editId && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                <ImageIcon className="w-3 h-3" /> Logo da Empresa
              </label>
              <p className="text-xs text-slate-400 mt-0.5 mb-3">
                Usada no sistema e nos documentos. Formatos: PNG, JPG, SVG. Recomendado: fundo transparente.
              </p>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-16 h-16 object-contain rounded-xl border border-slate-200 bg-slate-50 p-1" />
                ) : (
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50">
                    <ImageIcon className="w-6 h-6 text-slate-300" />
                  </div>
                )}
                <div>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {logoUploading ? 'Enviando...' : 'Enviar logo'}
                  </button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file);
                    }}
                  />
                  {logoPreview && (
                    <p className="text-xs text-slate-400 mt-1">Logo cadastrada. Clique para substituir.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!editId && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <ImageIcon className="w-3 h-3" /> Você poderá adicionar a logo após criar a empresa.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(BLANK); setLogoPreview(null); }} className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <X className="w-4 h-4" /> Cancelar
            </button>
            <button onClick={handleSave} disabled={!form.razaoSocial.trim() || !form.nomeFantasia.trim()} className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50">
              <Check className="w-4 h-4" />
              {editId ? 'Salvar alterações' : 'Criar empresa'}
            </button>
          </div>
        </div>
      )}

      {/* Árvore hierárquica */}
      <div className="space-y-3">
        {holdings.map(holding => {
          const holdingMatrices = matrices.filter(m => m.parentId === holding.id);
          const expanded = expandedIds.has(holding.id);

          return (
            <div key={holding.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              {/* Holding row */}
              <div className="flex items-center gap-4 p-4">
                <button onClick={() => toggleExpand(holding.id)} className="flex-shrink-0">
                  {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${TYPE_ICON_BG[holding.type]}`}>
                  <Building2 className={`w-5 h-5 ${TYPE_ICON_COLOR[holding.type]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">{holding.nomeFantasia}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${TYPE_COLOR[holding.type]}`}>{TYPE_LABEL[holding.type]}</span>
                    {holding.status === 'inativa' && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Inativa</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3 flex-wrap">
                    <span className="font-mono">{holding.code}</span>
                    {holding.cnpj && <span>{holding.cnpj}</span>}
                    {holding.cidade && holding.estado && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{holding.cidade} — {holding.estado}</span>}
                    <span className="text-slate-300">{holdingMatrices.length} matrizes</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleNew('matrix', holding.id)} className="p-2 rounded-lg text-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors text-xs flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Matriz
                  </button>
                  <button onClick={() => handleEdit(holding)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Matrizes */}
              {expanded && holdingMatrices.map(matrix => {
                const matrixBranches = branchesOf(matrix.id);
                const matrixExpanded = expandedIds.has(matrix.id);

                return (
                  <div key={matrix.id} className="border-t border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-4 p-4 pl-12">
                      <button onClick={() => toggleExpand(matrix.id)} className="flex-shrink-0">
                        {matrixExpanded ? <ChevronDown className="w-4 h-4 text-slate-300" /> : <ChevronRight className="w-4 h-4 text-slate-300" />}
                      </button>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${TYPE_ICON_BG[matrix.type]}`}>
                        <Building2 className={`w-4 h-4 ${TYPE_ICON_COLOR[matrix.type]}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-800 text-sm">{matrix.nomeFantasia}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${TYPE_COLOR[matrix.type]}`}>{TYPE_LABEL[matrix.type]}</span>
                          {matrix.status === 'inativa' && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Inativa</span>}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3 flex-wrap">
                          <span className="font-mono">{matrix.code}</span>
                          {matrix.cnpj && <span>{matrix.cnpj}</span>}
                          {matrix.cidade && matrix.estado && <span>{matrix.cidade} — {matrix.estado}</span>}
                          <span className="text-slate-300">{matrixBranches.length} filiais</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleNew('branch', matrix.id)} className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-xs flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5" /> Filial
                        </button>
                        <button onClick={() => handleEdit(matrix)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleStatus(matrix.id)} className="p-2 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors">
                          <PowerOff className="w-4 h-4" />
                        </button>
                        {confirmDelete === matrix.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => { removeCompany(matrix.id).catch(console.error); setConfirmDelete(null); }} className="px-2 py-1 text-[10px] bg-red-600 text-white rounded-lg font-semibold">Remover</button>
                            <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 text-[10px] bg-slate-100 rounded-lg">Cancelar</button>
                          </div>
                        ) : matrixBranches.length === 0 && (
                          <button onClick={() => setConfirmDelete(matrix.id)} className="p-2 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filiais */}
                    {matrixExpanded && matrixBranches.map(branch => (
                      <div key={branch.id} className="flex items-center gap-4 p-3 pl-24 border-t border-slate-100 bg-white hover:bg-slate-50/50">
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${TYPE_ICON_BG[branch.type]}`}>
                          <Building2 className={`w-3.5 h-3.5 ${TYPE_ICON_COLOR[branch.type]}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-700 text-sm">{branch.nomeFantasia}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${TYPE_COLOR[branch.type]}`}>{TYPE_LABEL[branch.type]}</span>
                            {branch.status === 'inativa' && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Inativa</span>}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                            <span className="font-mono">{branch.code}</span>
                            {branch.cnpj && <span>{branch.cnpj}</span>}
                            {branch.cidade && branch.estado && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{branch.cidade} — {branch.estado}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => handleEdit(branch)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => toggleStatus(branch.id)} className="p-2 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"><PowerOff className="w-4 h-4" /></button>
                          {confirmDelete === branch.id ? (
                            <div className="flex gap-1">
                              <button onClick={() => { removeCompany(branch.id).catch(console.error); setConfirmDelete(null); }} className="px-2 py-1 text-[10px] bg-red-600 text-white rounded-lg font-semibold">Remover</button>
                              <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 text-[10px] bg-slate-100 rounded-lg">Cancelar</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDelete(branch.id)} className="p-2 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                          )}
                        </div>
                      </div>
                    ))}

                    {matrixExpanded && (
                      <div className="pl-24 pb-3 pt-1 border-t border-slate-50">
                        <button onClick={() => handleNew('branch', matrix.id)} className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                          <Plus className="w-3.5 h-3.5" /> Adicionar filial em {matrix.nomeFantasia}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {expanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-12 py-3">
                  <button onClick={() => handleNew('matrix', holding.id)} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
                    <Plus className="w-3.5 h-3.5" /> Adicionar matriz em {holding.nomeFantasia}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-500">
        <p className="font-semibold text-slate-700 mb-1">Estrutura e separação de dados</p>
        <p className="text-xs leading-relaxed">
          As empresas cadastradas aqui aparecem automaticamente no formulário de criação de perfis.
          A hierarquia <strong>Holding → Matriz → Filial</strong> define o escopo de acesso:
          perfis de filial veem apenas dados da própria unidade, perfis de matriz veem todas as suas filiais,
          e perfis de holding têm acesso completo a toda a estrutura.
        </p>
      </div>
    </div>
  );
}

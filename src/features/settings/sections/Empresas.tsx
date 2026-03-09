// ─────────────────────────────────────────────────────────────────────────────
// Empresas e Filiais — Gestão da estrutura organizacional da Holding
// Hierarquia: Holding → Matrizes → Filiais
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  Building2, Plus, Edit2, PowerOff, Check, X, ChevronRight,
  ChevronDown, MapPin, Phone, Mail, Hash, Globe, Landmark,
  AlertCircle, ArrowRight,
} from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type EntityType = 'holding' | 'matrix' | 'branch';
type EntityStatus = 'ativa' | 'inativa';

interface Company {
  id: string;
  type: EntityType;
  parentId?: string;      // null = holding; matriz tem holding; filial tem matriz
  code: string;           // código gerado: H001, M001, F001...
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  status: EntityStatus;
  createdAt: string;
}

const TYPE_LABEL: Record<EntityType, string> = {
  holding: 'Holding',
  matrix:  'Matriz',
  branch:  'Filial',
};

const TYPE_COLOR: Record<EntityType, string> = {
  holding: 'bg-violet-100 text-violet-700 border-violet-200',
  matrix:  'bg-blue-100 text-blue-700 border-blue-200',
  branch:  'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const TYPE_ICON_BG: Record<EntityType, string> = {
  holding: 'bg-violet-100',
  matrix:  'bg-blue-100',
  branch:  'bg-emerald-100',
};

const TYPE_ICON_COLOR: Record<EntityType, string> = {
  holding: 'text-violet-600',
  matrix:  'text-blue-600',
  branch:  'text-emerald-600',
};

// Contadores para gerar códigos automáticos
const TYPE_PREFIX: Record<EntityType, string> = {
  holding: 'H',
  matrix:  'M',
  branch:  'F',
};

// ── Estado inicial mock ───────────────────────────────────────────────────────

const INITIAL: Company[] = [
  {
    id: 'h001',
    type: 'holding',
    code: 'H001',
    razaoSocial: 'ZIA Omnisystem Holding LTDA',
    nomeFantasia: 'ZIA Omnisystem Holding',
    cnpj: '00.000.000/0001-00',
    email: 'holding@zia.com.br',
    cidade: 'São Paulo',
    estado: 'SP',
    status: 'ativa',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'm001',
    type: 'matrix',
    parentId: 'h001',
    code: 'M001',
    razaoSocial: 'ZIA Operações Sudeste LTDA',
    nomeFantasia: 'Matriz Principal',
    cnpj: '00.000.000/0002-00',
    email: 'matriz@zia.com.br',
    cidade: 'São Paulo',
    estado: 'SP',
    status: 'ativa',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'f001',
    type: 'branch',
    parentId: 'm001',
    code: 'F001',
    razaoSocial: 'ZIA Operações SP LTDA',
    nomeFantasia: 'Filial São Paulo',
    cnpj: '00.000.000/0003-00',
    cidade: 'São Paulo',
    estado: 'SP',
    status: 'ativa',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'f002',
    type: 'branch',
    parentId: 'm001',
    code: 'F002',
    razaoSocial: 'ZIA Operações RJ LTDA',
    nomeFantasia: 'Filial Rio de Janeiro',
    cnpj: '00.000.000/0004-00',
    cidade: 'Rio de Janeiro',
    estado: 'RJ',
    status: 'ativa',
    createdAt: '2024-01-01T00:00:00Z',
  },
];

// ── Formulário em branco ──────────────────────────────────────────────────────

interface FormState {
  type: EntityType;
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

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO',
];

// ── Componente principal ──────────────────────────────────────────────────────

export default function Empresas() {
  const [companies, setCompanies] = useState<Company[]>(INITIAL);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['h001', 'm001']));

  function set(changes: Partial<FormState>) {
    setForm(prev => ({ ...prev, ...changes }));
  }

  function nextCode(type: EntityType): string {
    const prefix = TYPE_PREFIX[type];
    const existing = companies.filter(c => c.type === type);
    const max = existing.reduce((acc, c) => {
      const num = parseInt(c.code.slice(1), 10);
      return Math.max(acc, isNaN(num) ? 0 : num);
    }, 0);
    return `${prefix}${String(max + 1).padStart(3, '0')}`;
  }

  function handleSave() {
    if (!form.razaoSocial.trim() || !form.nomeFantasia.trim()) return;

    if (editId) {
      setCompanies(prev => prev.map(c =>
        c.id === editId
          ? {
              ...c,
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
            }
          : c
      ));
    } else {
      const newCompany: Company = {
        id: `${form.type}-${Date.now()}`,
        type: form.type,
        parentId: form.parentId || undefined,
        code: nextCode(form.type),
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
        status: 'ativa',
        createdAt: new Date().toISOString(),
      };
      setCompanies(prev => [...prev, newCompany]);
    }

    setShowForm(false);
    setEditId(null);
    setForm(BLANK);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
    setShowForm(true);
  }

  function handleNew(type: EntityType, parentId?: string) {
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
    setCompanies(prev => prev.map(c =>
      c.id === id ? { ...c, status: c.status === 'ativa' ? 'inativa' : 'ativa' } : c
    ));
  }

  function handleDelete(id: string) {
    // Verifica se tem filhos
    const hasChildren = companies.some(c => c.parentId === id);
    if (hasChildren) return; // Não remove se tiver filhos
    setCompanies(prev => prev.filter(c => c.id !== id));
    setConfirmDelete(null);
  }

  // ── Árvore hierárquica ──────────────────────────────────────────────────────

  const holdings = companies.filter(c => c.type === 'holding');
  const matrices  = companies.filter(c => c.type === 'matrix');
  const branches  = companies.filter(c => c.type === 'branch');

  const counts = {
    holding: holdings.length,
    matrix:  matrices.length,
    branch:  branches.length,
  };

  // Opções de parent no formulário
  const parentOptions = form.type === 'matrix'
    ? holdings
    : form.type === 'branch'
      ? matrices
      : [];

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Empresas e Filiais</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Estrutura organizacional da holding —
            <span className="text-violet-600 font-medium"> {counts.holding} holding</span> ·
            <span className="text-blue-600 font-medium"> {counts.matrix} matrizes</span> ·
            <span className="text-emerald-600 font-medium"> {counts.branch} filiais</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleNew('matrix')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Matriz
          </button>
          <button
            onClick={() => handleNew('branch')}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Filial
          </button>
        </div>
      </div>

      {/* Legenda visual */}
      <div className="flex items-center gap-4 mb-6 text-xs text-slate-500">
        {(['holding','matrix','branch'] as EntityType[]).map(t => (
          <span key={t} className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${TYPE_COLOR[t]}`}>
            <Building2 className="w-3 h-3" />
            {TYPE_LABEL[t]}
          </span>
        ))}
      </div>

      {/* Toast */}
      {saved && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl mb-4 text-sm">
          <Check className="w-4 h-4" />
          Empresa salva com sucesso!
        </div>
      )}

      {/* Formulário */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">
            {editId ? 'Editar empresa' : `Nova ${TYPE_LABEL[form.type]}`}
            {!editId && <span className="ml-2 text-xs font-mono text-slate-400">Código: {nextCode(form.type)}</span>}
          </h3>

          {/* Tipo */}
          {!editId && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tipo de empresa *</label>
              <div className="flex gap-2 mt-1">
                {(['holding','matrix','branch'] as EntityType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => set({ type: t, parentId: '' })}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                      form.type === t
                        ? 'border-slate-800 bg-slate-800 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
              {form.type === 'holding' && (
                <div className="flex items-center gap-2 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Criar uma nova holding é uma operação importante. Apenas uma holding por conta é recomendado.
                </div>
              )}
            </div>
          )}

          {/* Parent (matriz ou filial) */}
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
            {/* Razão Social */}
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Razão Social *</label>
              <input
                type="text"
                value={form.razaoSocial}
                onChange={e => set({ razaoSocial: e.target.value })}
                placeholder="Ex: Empresa XPTO LTDA"
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {/* Nome Fantasia */}
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome Fantasia *</label>
              <input
                type="text"
                value={form.nomeFantasia}
                onChange={e => set({ nomeFantasia: e.target.value })}
                placeholder="Ex: Loja Centro SP"
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {/* CNPJ */}
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                <Hash className="w-3 h-3" /> CNPJ
              </label>
              <input
                type="text"
                value={form.cnpj}
                onChange={e => set({ cnpj: e.target.value })}
                placeholder="00.000.000/0001-00"
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {/* Inscrição Estadual */}
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                <Landmark className="w-3 h-3" /> Inscrição Estadual
              </label>
              <input
                type="text"
                value={form.inscricaoEstadual}
                onChange={e => set({ inscricaoEstadual: e.target.value })}
                placeholder="Isento ou número"
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                <Mail className="w-3 h-3" /> E-mail
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => set({ email: e.target.value })}
                placeholder="empresa@email.com.br"
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {/* Telefone */}
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                <Phone className="w-3 h-3" /> Telefone
              </label>
              <input
                type="text"
                value={form.telefone}
                onChange={e => set({ telefone: e.target.value })}
                placeholder="(11) 99999-9999"
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {/* Endereço */}
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Endereço
              </label>
              <input
                type="text"
                value={form.endereco}
                onChange={e => set({ endereco: e.target.value })}
                placeholder="Rua, número, complemento, bairro"
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {/* Cidade */}
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Cidade</label>
              <input
                type="text"
                value={form.cidade}
                onChange={e => set({ cidade: e.target.value })}
                placeholder="São Paulo"
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {/* Estado + CEP */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">UF</label>
                <select
                  value={form.estado}
                  onChange={e => set({ estado: e.target.value })}
                  className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="">—</option>
                  {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                  <Globe className="w-3 h-3" /> CEP
                </label>
                <input
                  type="text"
                  value={form.cep}
                  onChange={e => set({ cep: e.target.value })}
                  placeholder="00000-000"
                  className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Ações do formulário */}
          <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => { setShowForm(false); setEditId(null); setForm(BLANK); }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" /> Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!form.razaoSocial.trim() || !form.nomeFantasia.trim()}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {editId ? 'Salvar alterações' : 'Criar empresa'}
            </button>
          </div>
        </div>
      )}

      {/* Árvore de empresas */}
      <div className="space-y-3">
        {holdings.map(holding => {
          const holdingMatrices = matrices.filter(m => m.parentId === holding.id);
          const holdingExpanded = expandedIds.has(holding.id);

          return (
            <div key={holding.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              {/* Holding row */}
              <div className="flex items-center gap-4 p-4">
                <button
                  onClick={() => toggleExpand(holding.id)}
                  className="flex-shrink-0"
                >
                  {holdingExpanded
                    ? <ChevronDown className="w-4 h-4 text-slate-400" />
                    : <ChevronRight className="w-4 h-4 text-slate-400" />
                  }
                </button>

                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${TYPE_ICON_BG[holding.type]}`}>
                  <Building2 className={`w-5 h-5 ${TYPE_ICON_COLOR[holding.type]}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">{holding.nomeFantasia}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${TYPE_COLOR[holding.type]}`}>
                      {TYPE_LABEL[holding.type]}
                    </span>
                    {holding.status === 'inativa' && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Inativa</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3 flex-wrap">
                    <span className="font-mono">{holding.code}</span>
                    {holding.cnpj && <span>{holding.cnpj}</span>}
                    {holding.cidade && holding.estado && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{holding.cidade} — {holding.estado}</span>}
                    <span className="text-slate-300">{holdingMatrices.length} matrizes</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleNew('matrix', holding.id)} title="Nova Matriz" className="p-2 rounded-lg text-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors text-xs flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Matriz
                  </button>
                  <button onClick={() => handleEdit(holding)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Matrizes */}
              {holdingExpanded && holdingMatrices.map(matrix => {
                const matrixBranches = branches.filter(b => b.parentId === matrix.id);
                const matrixExpanded = expandedIds.has(matrix.id);

                return (
                  <div key={matrix.id} className="border-t border-slate-100 bg-slate-50/50">
                    {/* Matriz row */}
                    <div className="flex items-center gap-4 p-4 pl-12">
                      <button onClick={() => toggleExpand(matrix.id)} className="flex-shrink-0">
                        {matrixExpanded
                          ? <ChevronDown className="w-4 h-4 text-slate-300" />
                          : <ChevronRight className="w-4 h-4 text-slate-300" />
                        }
                      </button>

                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${TYPE_ICON_BG[matrix.type]}`}>
                        <Building2 className={`w-4 h-4 ${TYPE_ICON_COLOR[matrix.type]}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-800 text-sm">{matrix.nomeFantasia}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${TYPE_COLOR[matrix.type]}`}>
                            {TYPE_LABEL[matrix.type]}
                          </span>
                          {matrix.status === 'inativa' && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Inativa</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3 flex-wrap">
                          <span className="font-mono">{matrix.code}</span>
                          {matrix.cnpj && <span>{matrix.cnpj}</span>}
                          {matrix.cidade && matrix.estado && <span>{matrix.cidade} — {matrix.estado}</span>}
                          <span className="text-slate-300">{matrixBranches.length} filiais</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleNew('branch', matrix.id)} title="Nova Filial" className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-xs flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5" /> Filial
                        </button>
                        <button onClick={() => handleEdit(matrix)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleStatus(matrix.id)} title={matrix.status === 'ativa' ? 'Desativar' : 'Ativar'} className="p-2 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors">
                          <PowerOff className="w-4 h-4" />
                        </button>
                        {confirmDelete === matrix.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleDelete(matrix.id)} className="px-2 py-1 text-[10px] bg-red-600 text-white rounded-lg font-semibold">Remover</button>
                            <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 text-[10px] bg-slate-100 rounded-lg">Cancelar</button>
                          </div>
                        ) : (
                          matrixBranches.length === 0 && (
                            <button onClick={() => setConfirmDelete(matrix.id)} className="p-2 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          )
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
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${TYPE_COLOR[branch.type]}`}>
                              {TYPE_LABEL[branch.type]}
                            </span>
                            {branch.status === 'inativa' && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Inativa</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3 flex-wrap">
                            <span className="font-mono">{branch.code}</span>
                            {branch.cnpj && <span>{branch.cnpj}</span>}
                            {branch.cidade && branch.estado && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />{branch.cidade} — {branch.estado}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => handleEdit(branch)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => toggleStatus(branch.id)} className="p-2 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors">
                            <PowerOff className="w-4 h-4" />
                          </button>
                          {confirmDelete === branch.id ? (
                            <div className="flex gap-1">
                              <button onClick={() => handleDelete(branch.id)} className="px-2 py-1 text-[10px] bg-red-600 text-white rounded-lg font-semibold">Remover</button>
                              <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 text-[10px] bg-slate-100 rounded-lg">Cancelar</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDelete(branch.id)} className="p-2 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Botão de nova filial dentro da matriz expandida */}
                    {matrixExpanded && (
                      <div className="pl-24 pb-3 pt-1 border-t border-slate-50">
                        <button
                          onClick={() => handleNew('branch', matrix.id)}
                          className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Adicionar filial em {matrix.nomeFantasia}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Botão de nova matriz */}
              {holdingExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-12 py-3">
                  <button
                    onClick={() => handleNew('matrix', holding.id)}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar matriz em {holding.nomeFantasia}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-500">
        <p className="font-semibold text-slate-700 mb-1">Estrutura organizacional</p>
        <p>
          A hierarquia <strong>Holding → Matriz → Filial</strong> define o contexto de acesso dos perfis.
          Perfis vinculados a uma filial só veem dados dessa unidade.
          Perfis de matriz veem todas as filiais da matriz. O Gestor Holding vê tudo.
        </p>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import {
  Search, User, Loader2, CheckCircle, AlertCircle, Save, Plus, Trash2,
  ChevronRight, DollarSign, TrendingUp, Clock, X,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Department {
  name: string;
}

interface Employee {
  id: string;
  full_name: string;
  position_title: string | null;
  department_id: string | null;
  status: string;
  departments: Department | null;
}

interface BankOption {
  ispb: string;
  name: string;
  code: number | null;
  fullName: string;
}

interface FinanceiroFuncionario {
  id?: string;
  employee_id: string;
  tenant_id: string;
  tipo_pessoa: 'PF' | 'MEI' | 'PJ';
  cnpj: string | null;
  razao_social: string | null;
  inscricao_municipal: string | null;
  regime_tributario: string | null;
  banco_codigo: string | null;
  agencia: string | null;
  conta: string | null;
  tipo_conta: 'CORRENTE' | 'POUPANCA' | 'PIX';
  chave_pix: string | null;
  tipo_chave_pix: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA' | null;
  comissao_padrao_pct: number | null;
  observacoes: string | null;
}

interface EscalonamentoFaixa {
  min_unidades?: number | null;
  max_unidades?: number | null;
  min_valor?: number | null;
  max_valor?: number | null;
  comissao_pct: number;
}

interface ComissaoRegra {
  id: string;
  employee_id: string;
  produto_id: string | null;
  grupo_id: string | null;
  employee_group_id: string | null;
  comissao_pct_base: number;
  tipo_escalonamento: 'NENHUM' | 'POR_UNIDADES' | 'POR_VALOR';
  regras_escalonamento: EscalonamentoFaixa[] | null;
  origem: string | null;
  erp_produtos: { nome: string; codigo_interno: string } | null;
  erp_grupo_produtos: { nome: string } | null;
  employee_groups: { name: string } | null;
}

interface ErpProdutoBasic {
  id: string;
  nome: string;
  codigo_interno: string;
}

interface ErpGrupoBasic {
  id: string;
  nome: string;
}

interface ComissaoLancamento {
  id: string;
  employee_id: string;
  pedido_id: string | null;
  produto_id: string | null;
  grupo_id: string | null;
  quantidade: number;
  valor_venda: number;
  comissao_pct: number;
  comissao_valor: number;
  regra_id: string | null;
  status: 'PENDENTE' | 'APROVADA' | 'PAGA' | 'CANCELADA';
  data_competencia: string;
  date_pagamento: string | null;
  erp_produtos: { nome: string } | null;
  erp_pedidos: { numero: number } | null;
  erp_grupo_produtos: { nome: string } | null;
}

const REGIMES = ['PF', 'MEI', 'SIMPLES', 'LUCRO_PRESUMIDO', 'LUCRO_REAL'];
const FALLBACK_BANKS = [
  { code: 1, name: 'Banco do Brasil' },
  { code: 33, name: 'Santander' },
  { code: 104, name: 'Caixa Econômica Federal' },
  { code: 237, name: 'Bradesco' },
  { code: 341, name: 'Itaú' },
  { code: 260, name: 'Nubank' },
  { code: 290, name: 'PagBank' },
  { code: 77, name: 'Inter' },
];

const STATUS_CONFIG = {
  PENDENTE:  { label: 'Pendente',  cls: 'bg-amber-100 text-amber-700' },
  APROVADA:  { label: 'Aprovada',  cls: 'bg-blue-100 text-blue-700' },
  PAGA:      { label: 'Paga',      cls: 'bg-emerald-100 text-emerald-700' },
  CANCELADA: { label: 'Cancelada', cls: 'bg-red-100 text-red-700' },
};

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${ok ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function FinanceiroCadastro() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filtered, setFiltered] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<'dados' | 'comissoes' | 'historico'>('dados');
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    async function loadEmployees() {
      setLoadingEmployees(true);
      let { data } = await supabase
        .from('employees')
        .select('id, full_name, position_title, department_id, status, departments(name)')
        .eq('status', 'Ativo')
        .order('full_name');

      if (!data || data.length === 0) {
        const res2 = await supabase
          .from('employees')
          .select('id, full_name, position_title, department_id, status, departments(name)')
          .order('full_name');
        data = res2.data;
      }

      const list = (data ?? []) as unknown as Employee[];
      setEmployees(list);
      setFiltered(list);
      setLoadingEmployees(false);
    }
    loadEmployees();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(employees.filter(e =>
      e.full_name.toLowerCase().includes(q) ||
      (e.position_title ?? '').toLowerCase().includes(q) ||
      (e.departments?.name ?? '').toLowerCase().includes(q)
    ));
  }, [search, employees]);

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* Left panel */}
      <div className="w-80 shrink-0 border-r border-slate-200 flex flex-col bg-white">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" /> Colaboradores
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Buscar colaborador..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingEmployees ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">Nenhum colaborador encontrado</div>
          ) : filtered.map(emp => (
            <button
              key={emp.id}
              onClick={() => { setSelected(emp); setActiveTab('dados'); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 ${selected?.id === emp.id ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : ''}`}
            >
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-sm flex items-center justify-center shrink-0">
                {initials(emp.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{emp.full_name}</div>
                <div className="text-xs text-slate-500 truncate">{emp.position_title ?? '—'}</div>
                <div className="text-xs text-emerald-600 truncate">{emp.departments?.name ?? '—'}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-slate-50">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <DollarSign className="w-12 h-12 text-slate-300" />
            <p className="text-sm">Selecione um colaborador para ver os dados financeiros</p>
          </div>
        ) : (
          <>
            {/* Employee header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 font-bold text-lg flex items-center justify-center">
                {initials(selected.full_name)}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">{selected.full_name}</h2>
                <p className="text-sm text-slate-500">{selected.position_title ?? '—'} · {selected.departments?.name ?? '—'}</p>
              </div>
              {/* Tabs */}
              <div className="ml-auto flex gap-1 bg-slate-100 rounded-lg p-1">
                {(['dados', 'comissoes', 'historico'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === tab ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    {tab === 'dados' ? 'Dados Financeiros' : tab === 'comissoes' ? 'Comissões' : 'Histórico'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {activeTab === 'dados' && (
                <TabDados employee={selected} showToast={showToast} />
              )}
              {activeTab === 'comissoes' && (
                <TabComissoes employee={selected} showToast={showToast} />
              )}
              {activeTab === 'historico' && (
                <TabHistorico employee={selected} showToast={showToast} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── TAB 1: Dados Financeiros ───────────────────────────────────────────────────

function TabDados({ employee, showToast }: { employee: Employee; showToast: (m: string, ok: boolean) => void }) {
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Omit<FinanceiroFuncionario, 'id' | 'employee_id' | 'tenant_id'>>({
    tipo_pessoa: 'PF',
    cnpj: null,
    razao_social: null,
    inscricao_municipal: null,
    regime_tributario: null,
    banco_codigo: null,
    agencia: null,
    conta: null,
    tipo_conta: 'CORRENTE',
    chave_pix: null,
    tipo_chave_pix: null,
    comissao_padrao_pct: null,
    observacoes: null,
  });

  const set = (field: string, value: string | number | null) =>
    setForm(f => ({ ...f, [field]: value }));

  // Load banks
  useEffect(() => {
    fetch('https://brasilapi.com.br/api/banks/v1')
      .then(r => r.json())
      .then((data: BankOption[]) => {
        setBanks(data.filter(b => b.code !== null).sort((a, b) => (a.code ?? 0) - (b.code ?? 0)));
      })
      .catch(() => {
        setBanks(FALLBACK_BANKS.map(b => ({ ispb: String(b.code), name: b.name, code: b.code, fullName: b.name })));
      });
  }, []);

  // Load existing record
  useEffect(() => {
    setLoading(true);
    supabase
      .from('erp_financeiro_funcionarios')
      .select('*')
      .eq('employee_id', employee.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            tipo_pessoa: data.tipo_pessoa ?? 'PF',
            cnpj: data.cnpj ?? null,
            razao_social: data.razao_social ?? null,
            inscricao_municipal: data.inscricao_municipal ?? null,
            regime_tributario: data.regime_tributario ?? null,
            banco_codigo: data.banco_codigo ?? null,
            agencia: data.agencia ?? null,
            conta: data.conta ?? null,
            tipo_conta: data.tipo_conta ?? 'CORRENTE',
            chave_pix: data.chave_pix ?? null,
            tipo_chave_pix: data.tipo_chave_pix ?? null,
            comissao_padrao_pct: data.comissao_padrao_pct ?? null,
            observacoes: data.observacoes ?? null,
          });
        }
        setLoading(false);
      });
  }, [employee.id]);

  async function handleSave() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const tenant_id = user?.id ?? '00000000-0000-0000-0000-000000000001';

      const payload = {
        ...form,
        employee_id: employee.id,
        tenant_id,
      };

      const { error } = await supabase
        .from('erp_financeiro_funcionarios')
        .upsert(payload, { onConflict: 'employee_id,tenant_id' });

      if (error) throw error;
      showToast('Dados financeiros salvos com sucesso.', true);
    } catch (e) {
      showToast('Erro ao salvar: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-3">Dados Cadastrais</h3>

        {/* Tipo pessoa */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Tipo de Pessoa</label>
          <div className="flex gap-3">
            {(['PF', 'MEI', 'PJ'] as const).map(tp => (
              <label key={tp} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="tipo_pessoa"
                  value={tp}
                  checked={form.tipo_pessoa === tp}
                  onChange={() => set('tipo_pessoa', tp)}
                  className="accent-emerald-600"
                />
                <span className="text-sm text-slate-700">{tp}</span>
              </label>
            ))}
          </div>
        </div>

        {/* PJ fields */}
        {(form.tipo_pessoa === 'PJ' || form.tipo_pessoa === 'MEI') && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="CNPJ" value={form.cnpj ?? ''} onChange={v => set('cnpj', v)} placeholder="00.000.000/0001-00" />
            <Field label="Razão Social" value={form.razao_social ?? ''} onChange={v => set('razao_social', v)} />
            {form.tipo_pessoa === 'PJ' && (
              <Field label="Inscrição Municipal" value={form.inscricao_municipal ?? ''} onChange={v => set('inscricao_municipal', v)} />
            )}
          </div>
        )}

        {/* Regime tributário */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Regime Tributário</label>
          <select
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={form.regime_tributario ?? ''}
            onChange={e => set('regime_tributario', e.target.value || null)}
          >
            <option value="">Selecione...</option>
            {REGIMES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-3">Dados Bancários</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Banco</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={form.banco_codigo ?? ''}
              onChange={e => set('banco_codigo', e.target.value || null)}
            >
              <option value="">Selecione...</option>
              {banks.map(b => (
                <option key={`${b.ispb}-${b.code}`} value={String(b.code)}>
                  {b.code} – {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Conta</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={form.tipo_conta}
              onChange={e => set('tipo_conta', e.target.value)}
            >
              <option value="CORRENTE">Conta Corrente</option>
              <option value="POUPANCA">Poupança</option>
              <option value="PIX">PIX</option>
            </select>
          </div>

          <Field label="Agência" value={form.agencia ?? ''} onChange={v => set('agencia', v)} placeholder="0000" />
          <Field label="Conta" value={form.conta ?? ''} onChange={v => set('conta', v)} placeholder="00000-0" />
        </div>

        {/* PIX */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo da Chave PIX</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={form.tipo_chave_pix ?? ''}
              onChange={e => set('tipo_chave_pix', e.target.value || null)}
            >
              <option value="">Selecione...</option>
              {['CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Field label="Chave PIX" value={form.chave_pix ?? ''} onChange={v => set('chave_pix', v)} placeholder="CPF, e-mail, telefone..." />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-3">Comissão e Observações</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Comissão Padrão (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={form.comissao_padrao_pct ?? ''}
              onChange={e => set('comissao_padrao_pct', e.target.value ? +e.target.value : null)}
              placeholder="0.0"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Observações</label>
          <textarea
            rows={3}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            value={form.observacoes ?? ''}
            onChange={e => set('observacoes', e.target.value || null)}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Dados Financeiros
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

// ── TAB 2: Comissões ──────────────────────────────────────────────────────────

function TabComissoes({ employee, showToast }: { employee: Employee; showToast: (m: string, ok: boolean) => void }) {
  const [regras, setRegras] = useState<ComissaoRegra[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('erp_comissoes_funcionario_produto')
      .select('*, erp_produtos(nome, codigo_interno), erp_grupo_produtos(nome), employee_groups(name)')
      .eq('employee_id', employee.id);
    setRegras((data ?? []) as ComissaoRegra[]);
    setLoading(false);
  }, [employee.id]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    const { error } = await supabase.from('erp_comissoes_funcionario_produto').delete().eq('id', id);
    if (error) { showToast('Erro ao excluir: ' + error.message, false); return; }
    showToast('Regra excluída.', true);
    load();
  }

  const escaloLabel = (tipo: string) => {
    if (tipo === 'POR_UNIDADES') return 'Por Unidades';
    if (tipo === 'POR_VALOR') return 'Por Valor';
    return '—';
  };

  const escopoLabel = (r: ComissaoRegra) => {
    if (r.produto_id) return r.erp_produtos?.nome ?? 'Produto';
    if (r.grupo_id) return r.erp_grupo_produtos?.nome ?? 'Grupo';
    if (r.employee_group_id) return r.employee_groups?.name ?? 'Grupo RH';
    return '—';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">Regras de Comissão</h3>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar Regra
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-emerald-500" /></div>
        ) : regras.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Nenhuma regra de comissão cadastrada</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Escopo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">% Base</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Escalonamento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Origem</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {regras.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{escopoLabel(r)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">{r.comissao_pct_base}%</td>
                  <td className="px-4 py-3 text-slate-600">{escaloLabel(r.tipo_escalonamento)}</td>
                  <td className="px-4 py-3">
                    {r.origem === 'GRUPO_RH' ? (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">Grupo RH</span>
                    ) : (
                      <span className="text-slate-500 text-xs">{r.origem ?? 'Manual'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.origem === 'GRUPO_RH' ? (
                      <span title="Originado de grupo RH — não pode ser excluído individualmente">
                        <Trash2 className="w-4 h-4 text-slate-300 cursor-not-allowed" />
                      </span>
                    ) : (
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="Excluir regra"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <ModalAdicionarRegra
          employeeId={employee.id}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); showToast('Regra salva com sucesso.', true); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ── Modal Adicionar Regra ──────────────────────────────────────────────────────

function ModalAdicionarRegra({
  employeeId,
  onClose,
  onSaved,
  showToast,
}: {
  employeeId: string;
  onClose: () => void;
  onSaved: () => void;
  showToast: (m: string, ok: boolean) => void;
}) {
  const [escopo, setEscopo] = useState<'produto' | 'grupo'>('produto');
  const [produtos, setProdutos] = useState<ErpProdutoBasic[]>([]);
  const [grupos, setGrupos] = useState<ErpGrupoBasic[]>([]);
  const [prodSearch, setProdSearch] = useState('');
  const [selectedProd, setSelectedProd] = useState<ErpProdutoBasic | null>(null);
  const [selectedGrupo, setSelectedGrupo] = useState('');
  const [pctBase, setPctBase] = useState('');
  const [tipoEscalo, setTipoEscalo] = useState<'NENHUM' | 'POR_UNIDADES' | 'POR_VALOR'>('NENHUM');
  const [faixas, setFaixas] = useState<EscalonamentoFaixa[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('erp_produtos').select('id, nome, codigo_interno').order('nome').then(({ data }) => setProdutos((data ?? []) as ErpProdutoBasic[]));
    supabase.from('erp_grupo_produtos').select('id, nome').order('nome').then(({ data }) => setGrupos((data ?? []) as ErpGrupoBasic[]));
  }, []);

  const filteredProds = produtos.filter(p =>
    p.nome.toLowerCase().includes(prodSearch.toLowerCase()) ||
    p.codigo_interno.toLowerCase().includes(prodSearch.toLowerCase())
  );

  function addFaixa() {
    if (tipoEscalo === 'POR_UNIDADES') {
      setFaixas(f => [...f, { min_unidades: 0, max_unidades: null, comissao_pct: 0 }]);
    } else {
      setFaixas(f => [...f, { min_valor: 0, max_valor: null, comissao_pct: 0 }]);
    }
  }

  function updateFaixa(idx: number, field: string, value: string) {
    setFaixas(f => f.map((row, i) => i === idx ? { ...row, [field]: value === '' ? null : Number(value) } : row));
  }

  function removeFaixa(idx: number) {
    setFaixas(f => f.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!pctBase || +pctBase < 0 || +pctBase > 100) {
      showToast('Informe a % base entre 0 e 100.', false);
      return;
    }
    if (escopo === 'produto' && !selectedProd) {
      showToast('Selecione um produto.', false);
      return;
    }
    if (escopo === 'grupo' && !selectedGrupo) {
      showToast('Selecione um grupo de produto.', false);
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const tenant_id = user?.id ?? '00000000-0000-0000-0000-000000000001';

      const payload = {
        employee_id: employeeId,
        tenant_id,
        produto_id: escopo === 'produto' ? selectedProd?.id ?? null : null,
        grupo_id: escopo === 'grupo' ? selectedGrupo || null : null,
        comissao_pct_base: +pctBase,
        tipo_escalonamento: tipoEscalo,
        regras_escalonamento: tipoEscalo !== 'NENHUM' ? faixas : null,
        origem: 'MANUAL',
      };

      const { error } = await supabase.from('erp_comissoes_funcionario_produto').insert(payload);
      if (error) throw error;
      onSaved();
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-800">Adicionar Regra de Comissão</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Escopo */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Escopo da Regra</label>
            <div className="flex gap-4">
              {(['produto', 'grupo'] as const).map(e => (
                <label key={e} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="escopo" value={e} checked={escopo === e} onChange={() => setEscopo(e)} className="accent-emerald-600" />
                  <span className="text-sm text-slate-700">{e === 'produto' ? 'Por produto específico' : 'Por grupo de produto'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Product search */}
          {escopo === 'produto' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Produto</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-2"
                placeholder="Buscar produto por nome ou código..."
                value={prodSearch}
                onChange={e => setProdSearch(e.target.value)}
              />
              {selectedProd && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-700 mb-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">{selectedProd.codigo_interno}</span> — {selectedProd.nome}
                  <button onClick={() => setSelectedProd(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}
              {prodSearch && !selectedProd && (
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                  {filteredProds.slice(0, 20).map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProd(p); setProdSearch(''); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-left border-b border-slate-100 last:border-0"
                    >
                      <span className="text-slate-500 text-xs font-mono">{p.codigo_interno}</span>
                      <span className="text-slate-800">{p.nome}</span>
                    </button>
                  ))}
                  {filteredProds.length === 0 && <div className="px-3 py-2 text-sm text-slate-400">Nenhum produto encontrado</div>}
                </div>
              )}
            </div>
          )}

          {/* Group select */}
          {escopo === 'grupo' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Grupo de Produto</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={selectedGrupo}
                onChange={e => setSelectedGrupo(e.target.value)}
              >
                <option value="">Selecione um grupo...</option>
                {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
              </select>
            </div>
          )}

          {/* Pct base */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Comissão % Base</label>
            <input
              type="number" min={0} max={100} step={0.1}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={pctBase}
              onChange={e => setPctBase(e.target.value)}
              placeholder="0.0"
            />
          </div>

          {/* Escalonamento */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Escalonamento</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={tipoEscalo}
              onChange={e => { setTipoEscalo(e.target.value as typeof tipoEscalo); setFaixas([]); }}
            >
              <option value="NENHUM">Nenhum</option>
              <option value="POR_UNIDADES">Por Unidades</option>
              <option value="POR_VALOR">Por Valor</option>
            </select>
          </div>

          {/* Faixas */}
          {tipoEscalo !== 'NENHUM' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-600">
                  Faixas de Escalonamento {tipoEscalo === 'POR_UNIDADES' ? '(unidades)' : '(valor R$)'}
                </label>
                <button onClick={addFaixa} className="text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-medium">
                  <Plus className="w-3.5 h-3.5" /> Adicionar Faixa
                </button>
              </div>
              {faixas.length === 0 ? (
                <div className="text-xs text-slate-400 py-2">Clique em "Adicionar Faixa" para criar uma faixa de escalonamento.</div>
              ) : (
                <div className="space-y-2">
                  {faixas.map((faixa, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                      {tipoEscalo === 'POR_UNIDADES' ? (
                        <>
                          <input type="number" placeholder="Mín un." className="w-20 border border-slate-200 rounded px-2 py-1 text-xs" value={faixa.min_unidades ?? ''} onChange={e => updateFaixa(idx, 'min_unidades', e.target.value)} />
                          <span className="text-xs text-slate-400">até</span>
                          <input type="number" placeholder="Máx un." className="w-20 border border-slate-200 rounded px-2 py-1 text-xs" value={faixa.max_unidades ?? ''} onChange={e => updateFaixa(idx, 'max_unidades', e.target.value)} />
                        </>
                      ) : (
                        <>
                          <input type="number" placeholder="Mín R$" className="w-24 border border-slate-200 rounded px-2 py-1 text-xs" value={faixa.min_valor ?? ''} onChange={e => updateFaixa(idx, 'min_valor', e.target.value)} />
                          <span className="text-xs text-slate-400">até</span>
                          <input type="number" placeholder="Máx R$" className="w-24 border border-slate-200 rounded px-2 py-1 text-xs" value={faixa.max_valor ?? ''} onChange={e => updateFaixa(idx, 'max_valor', e.target.value)} />
                        </>
                      )}
                      <span className="text-xs text-slate-400">→</span>
                      <input type="number" placeholder="%" min={0} max={100} step={0.1} className="w-16 border border-slate-200 rounded px-2 py-1 text-xs" value={faixa.comissao_pct} onChange={e => updateFaixa(idx, 'comissao_pct', e.target.value)} />
                      <span className="text-xs text-slate-500">%</span>
                      <button onClick={() => removeFaixa(idx)} className="ml-auto text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Regra
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TAB 3: Histórico de Comissões ─────────────────────────────────────────────

function TabHistorico({ employee, showToast }: { employee: Employee; showToast: (m: string, ok: boolean) => void }) {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [lancamentos, setLancamentos] = useState<ComissaoLancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());

    let q = supabase
      .from('erp_comissoes_lancamentos')
      .select('*, erp_produtos(nome), erp_pedidos(numero), erp_grupo_produtos(nome)')
      .eq('employee_id', employee.id)
      .order('data_competencia', { ascending: false });

    if (statusFilter) q = q.eq('status', statusFilter);

    const mesStr = String(mes).padStart(2, '0');
    q = q.gte('data_competencia', `${ano}-${mesStr}-01`)
         .lte('data_competencia', `${ano}-${mesStr}-31`);

    const { data } = await q;
    setLancamentos((data ?? []) as ComissaoLancamento[]);
    setLoading(false);
  }, [employee.id, mes, ano, statusFilter]);

  useEffect(() => { load(); }, [load]);

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const pendentes = lancamentos.filter(l => l.status === 'PENDENTE').map(l => l.id);
    if (pendentes.every(id => selected.has(id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendentes));
    }
  }

  async function handlePagar() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setPaying(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('erp_comissoes_lancamentos')
        .update({ status: 'PAGA', date_pagamento: today })
        .in('id', ids);
      if (error) throw error;

      // Create financial lancamento
      const { data: { user } } = await supabase.auth.getUser();
      const tenant_id = user?.id ?? '00000000-0000-0000-0000-000000000001';
      const totalVal = lancamentos.filter(l => ids.includes(l.id)).reduce((s, l) => s + l.comissao_valor, 0);
      const mesStr = String(mes).padStart(2, '0');

      await supabase.from('erp_financeiro_lancamentos').insert({
        tipo: 'DESPESA',
        categoria: 'OPERACIONAL',
        descricao: `Comissão de ${employee.full_name} - ${mesStr}/${ano}`,
        valor: totalVal,
        data_vencimento: today,
        data_pagamento: today,
        status: 'PAGO',
        nfe_id: null,
        pedido_id: null,
        conta_bancaria_id: null,
        tenant_id,
      });

      showToast(`${ids.length} comissão(ões) marcada(s) como PAGA.`, true);
      load();
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setPaying(false);
    }
  }

  const totalPendente = lancamentos.filter(l => l.status === 'PENDENTE').reduce((s, l) => s + l.comissao_valor, 0);
  const totalAprovada = lancamentos.filter(l => l.status === 'APROVADA').reduce((s, l) => s + l.comissao_valor, 0);
  const totalPaga = lancamentos.filter(l => l.status === 'PAGA').reduce((s, l) => s + l.comissao_valor, 0);
  const selectedPendentes = lancamentos.filter(l => selected.has(l.id) && l.status === 'PENDENTE');

  const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          value={mes}
          onChange={e => setMes(+e.target.value)}
        >
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          value={ano}
          onChange={e => setAno(+e.target.value)}
        >
          {[2023, 2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
        </select>
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="APROVADA">Aprovada</option>
          <option value="PAGA">Paga</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
        {selected.size > 0 && selectedPendentes.length > 0 && (
          <button
            onClick={handlePagar}
            disabled={paying}
            className="ml-auto flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Aprovar e Pagar ({selectedPendentes.length})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-emerald-500" /></div>
        ) : lancamentos.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Nenhum lançamento de comissão encontrado</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="rounded accent-emerald-600"
                    checked={lancamentos.filter(l => l.status === 'PENDENTE').length > 0 &&
                      lancamentos.filter(l => l.status === 'PENDENTE').every(l => selected.has(l.id))}
                    onChange={toggleAll}
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Pedido</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Produto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Grupo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Qtd</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Venda</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">%</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Comissão</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lancamentos.map(l => {
                const sc = STATUS_CONFIG[l.status];
                return (
                  <tr key={l.id} className={`hover:bg-slate-50 transition-colors ${selected.has(l.id) ? 'bg-emerald-50' : ''}`}>
                    <td className="px-4 py-3">
                      {l.status === 'PENDENTE' && (
                        <input
                          type="checkbox"
                          className="rounded accent-emerald-600"
                          checked={selected.has(l.id)}
                          onChange={() => toggleSelect(l.id)}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {l.erp_pedidos ? `#${l.erp_pedidos.numero}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{l.erp_produtos?.nome ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{l.erp_grupo_produtos?.nome ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{l.quantidade}</td>
                    <td className="px-4 py-3 text-right text-slate-700 font-medium">{fmtBRL(l.valor_venda)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{l.comissao_pct}%</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">{fmtBRL(l.comissao_valor)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(l.data_competencia + 'T00:00').toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer totals */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
          <span className="text-xs text-amber-600 font-semibold">Pendente</span>
          <span className="text-sm font-bold text-amber-700">{fmtBRL(totalPendente)}</span>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
          <span className="text-xs text-blue-600 font-semibold">Aprovada</span>
          <span className="text-sm font-bold text-blue-700">{fmtBRL(totalAprovada)}</span>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
          <span className="text-xs text-emerald-600 font-semibold">Paga</span>
          <span className="text-sm font-bold text-emerald-700">{fmtBRL(totalPaga)}</span>
        </div>
      </div>
    </div>
  );
}

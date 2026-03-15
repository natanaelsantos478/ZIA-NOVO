// ─────────────────────────────────────────────────────────────────────────────
// Comissoes.tsx — Cadastro financeiro de funcionários + regras de comissão
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Percent, Plus, Edit2, Trash2,
  X, Loader2, CheckCircle2, ChevronRight, Building2,
} from 'lucide-react';
import {
  getFuncionarioFinanceiro, upsertFuncionarioFinanceiro,
  getComissaoRegras, upsertComissaoRegra, deleteComissaoRegra,
  getComissaoLancamentos, aprovarComissoes,
  type FinFuncionarioFinanceiro, type FinComissaoRegra, type FinComissaoLancamento,
} from '../../../../lib/financeiro';
import { getProdutos, getGruposProdutos, type ErpProduto, type ErpGrupoProduto } from '../../../../lib/erp';
import { supabase } from '../../../../lib/supabase';

const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400';
const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Employee {
  id: string;
  nome: string;
  cargo?: string | null;
  departamento?: string | null;
  foto_url?: string | null;
  email?: string | null;
}

// ── Aba 1: Dados Financeiros ──────────────────────────────────────────────────
function TabDadosFinanceiros({ employeeId, onSaved }: { employeeId: string; onSaved?: () => void }) {
  const [form, setForm] = useState<FinFuncionarioFinanceiro>({
    tenant_id: '',
    employee_id: employeeId,
    banco_codigo: '',
    banco_nome: '',
    agencia: '',
    conta: '',
    tipo_conta: 'corrente',
    chave_pix: '',
    tipo_chave_pix: 'cpf',
    comissao_padrao_pct: 0,
    cnpj_pj: '',
    razao_social_pj: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bancos, setBancos] = useState<{ ispb: string; name: string; code?: string | null }[]>([]);

  useEffect(() => {
    getFuncionarioFinanceiro(employeeId).then(data => {
      if (data) setForm(data);
    }).finally(() => setLoading(false));

    fetch('https://brasilapi.com.br/api/banks/v1')
      .then(r => r.json())
      .then(data => setBancos((data as typeof bancos).sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {});
  }, [employeeId]);

  const upd = (p: Partial<FinFuncionarioFinanceiro>) => setForm(f => ({ ...f, ...p }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertFuncionarioFinanceiro(form);
      onSaved?.();
    } catch (e: unknown) { alert((e as Error).message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-emerald-500"/></div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Banco</label>
          <select value={form.banco_codigo ?? ''} onChange={e => {
            const b = bancos.find(x => x.code === e.target.value);
            upd({ banco_codigo: e.target.value, banco_nome: b?.name ?? '' });
          }} className={inp}>
            <option value="">Selecionar banco…</option>
            {bancos.map(b => <option key={b.ispb} value={b.code ?? ''}>{b.code ? `${b.code} — ` : ''}{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Tipo de Conta</label>
          <select value={form.tipo_conta ?? 'corrente'} onChange={e => upd({ tipo_conta: e.target.value as FinFuncionarioFinanceiro['tipo_conta'] })} className={inp}>
            <option value="corrente">Conta Corrente</option>
            <option value="poupanca">Conta Poupança</option>
            <option value="pix">Apenas PIX</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Agência</label>
          <input value={form.agencia ?? ''} onChange={e => upd({ agencia: e.target.value })} className={inp} placeholder="0001"/>
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Conta</label>
          <input value={form.conta ?? ''} onChange={e => upd({ conta: e.target.value })} className={inp} placeholder="12345-6"/>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Chave PIX</label>
          <input value={form.chave_pix ?? ''} onChange={e => upd({ chave_pix: e.target.value })} className={inp} placeholder="CPF, e-mail, telefone…"/>
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Tipo da Chave PIX</label>
          <select value={form.tipo_chave_pix ?? 'cpf'} onChange={e => upd({ tipo_chave_pix: e.target.value as FinFuncionarioFinanceiro['tipo_chave_pix'] })} className={inp}>
            <option value="cpf">CPF</option>
            <option value="cnpj">CNPJ</option>
            <option value="email">E-mail</option>
            <option value="telefone">Telefone</option>
            <option value="aleatoria">Chave Aleatória</option>
          </select>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Comissão Padrão (%)</label>
          <input type="number" step="0.01" min="0" max="100" value={form.comissao_padrao_pct ?? 0}
            onChange={e => upd({ comissao_padrao_pct: Number(e.target.value) })} className={inp}/>
          <p className="text-[10px] text-slate-400 mt-0.5">Fallback quando não há regra específica por produto/grupo</p>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1.5"><Building2 size={12}/> Dados PJ (opcional)</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">CNPJ</label>
            <input value={form.cnpj_pj ?? ''} onChange={e => upd({ cnpj_pj: e.target.value })} className={inp} placeholder="00.000.000/0001-00"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Razão Social</label>
            <input value={form.razao_social_pj ?? ''} onChange={e => upd({ razao_social_pj: e.target.value })} className={inp}/>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>} Salvar
        </button>
      </div>
    </div>
  );
}

// ── Aba 2: Regras de Comissão ─────────────────────────────────────────────────
function TabComissoes({ employeeId }: { employeeId: string }) {
  const [regras, setRegras] = useState<FinComissaoRegra[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<FinComissaoRegra | null>(null);
  const [produtos, setProdutos] = useState<ErpProduto[]>([]);
  const [grupos, setGrupos] = useState<ErpGrupoProduto[]>([]);

  const [form, setForm] = useState<Partial<FinComissaoRegra>>({
    escopo: 'produto',
    comissao_pct: 0,
    tipo_escalonamento: 'nenhum',
  });

  useEffect(() => {
    getComissaoRegras(employeeId).then(setRegras).finally(() => setLoading(false));
    getProdutos().then(setProdutos);
    getGruposProdutos().then(setGrupos);
  }, [employeeId]);

  const openModal = (r?: FinComissaoRegra) => {
    setEditando(r ?? null);
    setForm(r ? { ...r } : { escopo: 'produto', comissao_pct: 0, tipo_escalonamento: 'nenhum' });
    setModal(true);
  };

  const handleSave = async () => {
    try {
      await upsertComissaoRegra({ ...form, employee_id: employeeId } as FinComissaoRegra & { employee_id: string });
      const updated = await getComissaoRegras(employeeId);
      setRegras(updated);
      setModal(false);
    } catch (e: unknown) { alert((e as Error).message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir regra?')) return;
    try {
      await deleteComissaoRegra(id);
      setRegras(prev => prev.filter(r => r.id !== id));
    } catch (e: unknown) { alert((e as Error).message); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-emerald-500"/></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => openModal()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors">
          <Plus size={14}/> Nova Regra
        </button>
      </div>

      {regras.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <Percent size={28} className="mx-auto mb-2 opacity-30"/>
          <p className="text-sm">Nenhuma regra. O percentual padrão será usado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {regras.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Percent size={14} className="text-emerald-600"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  {r.escopo === 'produto'
                    ? (produtos.find(p => p.id === r.produto_id)?.nome ?? 'Produto')
                    : (grupos.find(g => g.id === r.grupo_id)?.nome ?? 'Grupo')}
                </p>
                <p className="text-xs text-slate-500">{r.comissao_pct}% · {r.tipo_escalonamento ?? 'nenhum'}</p>
              </div>
              <button onClick={() => openModal(r)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"><Edit2 size={13}/></button>
              <button onClick={() => handleDelete(r.id!)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 size={13}/></button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-slate-900 text-sm">{editando ? 'Editar Regra' : 'Nova Regra de Comissão'}</h3>
              <button onClick={() => setModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X size={16}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Escopo</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['produto', 'grupo'] as const).map(e => (
                    <label key={e} className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer ${form.escopo === e ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}>
                      <input type="radio" checked={form.escopo === e} onChange={() => setForm(f => ({ ...f, escopo: e, produto_id: undefined, grupo_id: undefined }))} className="accent-emerald-600"/>
                      <span className="text-sm font-medium text-slate-700">{e === 'produto' ? 'Produto' : 'Grupo'}</span>
                    </label>
                  ))}
                </div>
              </div>

              {form.escopo === 'produto' ? (
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Produto</label>
                  <select value={form.produto_id ?? ''} onChange={e => setForm(f => ({ ...f, produto_id: e.target.value || undefined }))} className={inp}>
                    <option value="">Selecione…</option>
                    {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Grupo de Produto</label>
                  <select value={form.grupo_id ?? ''} onChange={e => setForm(f => ({ ...f, grupo_id: e.target.value || undefined }))} className={inp}>
                    <option value="">Selecione…</option>
                    {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 block mb-1">Comissão (%)</label>
                <input type="number" step="0.01" min="0" max="100" value={form.comissao_pct ?? 0}
                  onChange={e => setForm(f => ({ ...f, comissao_pct: Number(e.target.value) }))} className={inp}/>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Tipo de Escalonamento</label>
                <select value={form.tipo_escalonamento ?? 'nenhum'} onChange={e => setForm(f => ({ ...f, tipo_escalonamento: e.target.value as FinComissaoRegra['tipo_escalonamento'] }))} className={inp}>
                  <option value="nenhum">Nenhum (% fixo)</option>
                  <option value="volume">Por Volume de Unidades</option>
                  <option value="valor">Por Valor de Vendas</option>
                  <option value="empresas">Por Número de Empresas</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t">
              <button onClick={() => setModal(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Aba 3: Histórico de Comissões ─────────────────────────────────────────────
function TabHistorico({ employeeId }: { employeeId: string }) {
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [lancamentos, setLancamentos] = useState<FinComissaoLancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [aprovando, setAprovando] = useState(false);

  const carregar = useCallback(() => {
    setLoading(true);
    getComissaoLancamentos(employeeId, ano, mes)
      .then(setLancamentos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [employeeId, ano, mes]);

  useEffect(() => { carregar(); }, [carregar]);

  const STATUS_COLOR: Record<string, string> = {
    PENDENTE: 'bg-amber-50 text-amber-700 border-amber-200',
    APROVADA: 'bg-blue-50 text-blue-700 border-blue-200',
    PAGA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELADA: 'bg-slate-50 text-slate-500 border-slate-200',
  };

  const pendentes = lancamentos.filter(l => l.status === 'PENDENTE');
  const totalPendente = pendentes.reduce((s, l) => s + l.valor_comissao, 0);
  const totalPago = lancamentos.filter(l => l.status === 'PAGA').reduce((s, l) => s + l.valor_comissao, 0);

  const handleAprovar = async () => {
    const ids = Array.from(selecionados);
    if (ids.length === 0) return;
    setAprovando(true);
    try {
      await aprovarComissoes(ids);
      carregar();
      setSelecionados(new Set());
    } catch (e: unknown) { alert((e as Error).message); }
    finally { setAprovando(false); }
  };

  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={mes} onChange={e => setMes(Number(e.target.value))}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={ano} onChange={e => setAno(Number(e.target.value))}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
          {[2023, 2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-500">Pendente: <span className="font-bold text-amber-600">{BRL(totalPendente)}</span></span>
          <span className="text-xs text-slate-500">Pago: <span className="font-bold text-emerald-600">{BRL(totalPago)}</span></span>
          {selecionados.size > 0 && (
            <button onClick={handleAprovar} disabled={aprovando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50">
              {aprovando ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle2 size={12}/>} Aprovar e Pagar ({selecionados.size})
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-emerald-500"/></div>
      ) : lancamentos.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">Nenhum lançamento no período</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b bg-slate-50">
                <th className="px-3 py-2 w-8"/>
                <th className="text-left px-4 py-2">Pedido</th>
                <th className="text-left px-3 py-2">Produto</th>
                <th className="text-right px-3 py-2">Qtd</th>
                <th className="text-right px-3 py-2">Venda</th>
                <th className="text-right px-3 py-2">%</th>
                <th className="text-right px-3 py-2">Comissão</th>
                <th className="text-right px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.map(l => (
                <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-3 py-2.5">
                    {l.status === 'PENDENTE' && (
                      <input type="checkbox"
                        checked={selecionados.has(l.id)}
                        onChange={e => setSelecionados(s => { const n = new Set(s); e.target.checked ? n.add(l.id) : n.delete(l.id); return n; })}
                        className="accent-emerald-600"/>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{l.pedido_id?.slice(-6) ?? '—'}</td>
                  <td className="px-3 py-2.5 font-medium text-slate-800 max-w-[120px] truncate">{l.produto_nome ?? '—'}</td>
                  <td className="text-right px-3 py-2.5 font-mono">{l.quantidade ?? '—'}</td>
                  <td className="text-right px-3 py-2.5 font-mono">{l.valor_venda != null ? BRL(l.valor_venda) : '—'}</td>
                  <td className="text-right px-3 py-2.5 font-mono">{l.comissao_pct != null ? `${l.comissao_pct}%` : '—'}</td>
                  <td className="text-right px-3 py-2.5 font-bold font-mono text-emerald-700">{BRL(l.valor_comissao)}</td>
                  <td className="text-right px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLOR[l.status] ?? ''}`}>{l.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-800 text-white text-xs">
                <td colSpan={6} className="px-4 py-2.5 font-bold">TOTAL</td>
                <td className="text-right px-3 py-2.5 font-bold font-mono">{BRL(lancamentos.reduce((s, l) => s + l.valor_comissao, 0))}</td>
                <td/>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Drawer de funcionário ─────────────────────────────────────────────────────
function FuncionarioDrawer({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const [aba, setAba] = useState<'financeiro' | 'comissoes' | 'historico'>('financeiro');

  const ABAS = [
    { id: 'financeiro', label: 'Dados Financeiros' },
    { id: 'comissoes',  label: 'Comissões por Produto' },
    { id: 'historico',  label: 'Histórico' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-end bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-xl h-full md:h-auto md:max-h-[90vh] flex flex-col rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          {employee.foto_url ? (
            <img src={employee.foto_url} alt="" className="w-10 h-10 rounded-full object-cover"/>
          ) : (
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-lg font-bold text-emerald-600">{employee.nome[0]}</span>
            </div>
          )}
          <div>
            <p className="font-bold text-slate-900">{employee.nome}</p>
            <p className="text-xs text-slate-500">{employee.cargo ?? ''}{employee.departamento ? ` · ${employee.departamento}` : ''}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18}/>
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-200 px-5 shrink-0">
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${aba === a.id ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {a.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-5">
          {aba === 'financeiro' && <TabDadosFinanceiros employeeId={employee.id}/>}
          {aba === 'comissoes'  && <TabComissoes employeeId={employee.id}/>}
          {aba === 'historico'  && <TabHistorico employeeId={employee.id}/>}
        </div>
      </div>
    </div>
  );
}

// ── Principal ─────────────────────────────────────────────────────────────────
export default function Comissoes() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selecionado, setSelecionado] = useState<Employee | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('hr_employees')
          .select('id, nome, cargo, departamento, foto_url, email')
          .eq('status', 'Ativo')
          .order('nome');
        setEmployees(data ?? []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtrados = employees.filter(e =>
    e.nome.toLowerCase().includes(search.toLowerCase()) ||
    (e.cargo ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Funcionários — Financeiro</h1>
          <p className="text-sm text-slate-500 mt-0.5">Dados bancários, PIX e regras de comissão</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 w-48"
              placeholder="Buscar funcionário…"/>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-emerald-500"/></div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users size={32} className="mx-auto mb-3 opacity-30"/>
          <p>{search ? 'Nenhum funcionário encontrado' : 'Nenhum funcionário ativo'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtrados.map(e => (
            <button key={e.id} onClick={() => setSelecionado(e)}
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 text-left hover:shadow-md hover:border-emerald-200 transition-all group">
              {e.foto_url ? (
                <img src={e.foto_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0"/>
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-base font-bold text-emerald-600">{e.nome[0]}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{e.nome}</p>
                <p className="text-xs text-slate-500 truncate">{e.cargo ?? '—'}</p>
                {e.email && (
                  <p className="text-xs text-slate-400 truncate">{e.email}</p>
                )}
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-emerald-400 transition-colors flex-shrink-0"/>
            </button>
          ))}
        </div>
      )}

      {selecionado && (
        <FuncionarioDrawer employee={selecionado} onClose={() => setSelecionado(null)}/>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CustosNegociacoes — Planilha de custos de CRM (compromissos e atividades)
// Todos os registros ficam vinculados a lançamentos DESPESA no financeiro
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Trash2, RefreshCw, Filter,
  TrendingDown, Calendar, Briefcase, ListTodo,
  ChevronDown, X, AlertCircle,
} from 'lucide-react';
import {
  getCrmCustos, deleteCrmCusto,
  CRM_CUSTO_CATEGORIAS,
  type CrmCusto, type CrmCustoCategoria,
} from '../../crm/data/crmData';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const CAT_COLORS: Record<CrmCustoCategoria, string> = {
  deslocamento: 'bg-blue-100 text-blue-700',
  material:     'bg-amber-100 text-amber-700',
  alimentacao:  'bg-orange-100 text-orange-700',
  hospedagem:   'bg-purple-100 text-purple-700',
  publicidade:  'bg-pink-100 text-pink-700',
  outros:       'bg-slate-100 text-slate-600',
};

// ── Linha da tabela ───────────────────────────────────────────────────────────

interface RowProps {
  custo: CrmCusto;
  onDelete: (id: string) => void;
}

function CustoRow({ custo, onDelete }: RowProps) {
  const [confirmDel, setConfirmDel] = useState(false);
  const catLabel = CRM_CUSTO_CATEGORIAS.find(c => c.value === custo.categoria)?.label ?? custo.categoria;

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 text-sm text-slate-700">{fmtDate(custo.data)}</td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-slate-800">{custo.descricao}</p>
        {custo.negociacao_id && (
          <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-[200px]">neg: {custo.negociacao_id}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CAT_COLORS[custo.categoria]}`}>
          {catLabel}
        </span>
      </td>
      <td className="px-4 py-3">
        {custo.atividade_id
          ? <span className="flex items-center gap-1 text-xs text-amber-700"><ListTodo className="w-3 h-3" /> Atividade</span>
          : custo.compromisso_id
          ? <span className="flex items-center gap-1 text-xs text-purple-700"><Calendar className="w-3 h-3" /> Compromisso</span>
          : <span className="text-xs text-slate-400">—</span>}
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-bold text-red-600">{fmt(custo.valor)}</span>
      </td>
      <td className="px-4 py-3 text-center">
        {custo.lancamento_id
          ? <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">FIN</span>
          : <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">—</span>}
      </td>
      <td className="px-4 py-3 text-center">
        {confirmDel ? (
          <div className="flex items-center gap-1 justify-center">
            <button
              onClick={() => { onDelete(custo.id); setConfirmDel(false); }}
              className="text-[11px] bg-red-600 text-white px-2 py-1 rounded font-semibold hover:bg-red-700"
            >
              Confirmar
            </button>
            <button onClick={() => setConfirmDel(false)} className="text-[11px] text-slate-500 hover:text-slate-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDel(true)} className="text-slate-300 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </td>
    </tr>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CustosNegociacoes() {
  const [custos, setCustos]       = useState<CrmCusto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [catFilter, setCatFilter] = useState<CrmCustoCategoria | ''>('');
  const [origemFilter, setOrigemFilter] = useState<'todos' | 'atividade' | 'compromisso'>('todos');
  const [search, setSearch]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCrmCustos();
      setCustos(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    await deleteCrmCusto(id);
    load();
  };

  // ── Filtros ──────────────────────────────────────────────────────────────────
  const filtered = custos.filter(c => {
    if (catFilter && c.categoria !== catFilter) return false;
    if (origemFilter === 'atividade'   && !c.atividade_id)   return false;
    if (origemFilter === 'compromisso' && !c.compromisso_id) return false;
    if (search && !c.descricao.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const total = filtered.reduce((sum, c) => sum + c.valor, 0);

  // Totais por categoria
  const porCategoria = CRM_CUSTO_CATEGORIAS.map(cat => ({
    ...cat,
    total: filtered.filter(c => c.categoria === cat.value).reduce((s, c) => s + c.valor, 0),
  })).filter(c => c.total > 0);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Custos de Negociações</h1>
            <p className="text-xs text-slate-500">Despesas vinculadas a compromissos e atividades de CRM</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-slate-400">Total filtrado</p>
              <p className="text-xl font-bold text-red-600">{fmt(total)}</p>
            </div>
            <button onClick={load} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
              <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Cards de resumo por categoria */}
      {porCategoria.length > 0 && (
        <div className="px-6 py-3 shrink-0 flex gap-2 overflow-x-auto">
          {porCategoria.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCatFilter(catFilter === cat.value ? '' : cat.value)}
              className={`shrink-0 px-3 py-2 rounded-xl border text-left transition-colors ${
                catFilter === cat.value
                  ? 'border-red-300 bg-red-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <p className="text-[10px] text-slate-400">{cat.label}</p>
              <p className="text-sm font-bold text-red-600">{fmt(cat.total)}</p>
            </button>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="px-6 py-2 border-b border-slate-200 bg-white shrink-0 flex items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por descrição..."
          className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
        />
        <div className="relative">
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value as CrmCustoCategoria | '')}
            className="appearance-none border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            <option value="">Todas categorias</option>
            {CRM_CUSTO_CATEGORIAS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={origemFilter}
            onChange={e => setOrigemFilter(e.target.value as typeof origemFilter)}
            className="appearance-none border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            <option value="todos">Todas origens</option>
            <option value="atividade">Atividades</option>
            <option value="compromisso">Compromissos</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        {(catFilter || origemFilter !== 'todos' || search) && (
          <button
            onClick={() => { setCatFilter(''); setOrigemFilter('todos'); setSearch(''); }}
            className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Limpar
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <AlertCircle className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Nenhum custo registrado</p>
            <p className="text-xs mt-1">Adicione custos diretamente na Agenda ou nas Atividades de CRM</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Descrição</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Categoria</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Origem</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Valor</th>
                <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Financeiro</th>
                <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <CustoRow key={c.id} custo={c} onDelete={handleDelete} />
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 bg-slate-50">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-slate-600">
                  {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
                </td>
                <td className="px-4 py-3 text-right text-base font-bold text-red-600">{fmt(total)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Rodapé informativo */}
      <div className="px-6 py-2.5 border-t border-slate-200 bg-white shrink-0 flex items-center gap-2 text-xs text-slate-500">
        <Briefcase className="w-3.5 h-3.5" />
        Cada custo gera automaticamente um lançamento <strong className="text-slate-700">DESPESA / CRM</strong> no módulo financeiro (Contas a Pagar).
      </div>
    </div>
  );
}

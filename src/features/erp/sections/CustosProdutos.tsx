// ─────────────────────────────────────────────────────────────────────────────
// CustosProdutos.tsx — Seção: Custos por Produto
//
// Permite visualizar e gerenciar os custos finais de cada produto:
//   • Custos herdados da categoria (grupo de produto)
//   • Custos específicos deste produto
//   • Custos da empresa (distribuídos)
//   • Impostos automáticos
//
// O usuário pode vincular custos da árvore diretamente nesta tela,
// sem precisar abrir o editor de árvore de custos.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  Package, Search, Layers, Tag, Plus, X, Save, Loader2,
  AlertCircle, CheckCircle, ChevronRight, DollarSign, TrendingUp,
  TrendingDown, Zap, RefreshCw, GitFork, Building2, Info,
} from 'lucide-react';
import { getProdutos, getGruposProdutos } from '../../../lib/erp';
import type { ErpProduto, ErpGrupoProduto } from '../../../lib/erp';
import { getNos, getImpostos, getGruposCusto, upsertNo } from '../../../lib/financeiro';
import type { FinNoCusto, FinImposto, FinGrupoCusto } from '../../../lib/financeiro';
import CustoFinalCard from './financeiro/CustoFinalCard';

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const PCT = (v: number) => `${v.toFixed(1)}%`;

// ── Custo rápido — tipos de custo que podem ser adicionados diretamente ───────

type TipoCustoRapido = 'FIXO_UNITARIO' | 'PERCENTUAL_RECEITA' | 'FIXO';

const TIPOS_CUSTO: { value: TipoCustoRapido; label: string; desc: string; icon: string }[] = [
  { value: 'FIXO_UNITARIO',      label: 'Fixo por Unidade',     desc: 'Ex: embalagem, frete por un', icon: '📦' },
  { value: 'PERCENTUAL_RECEITA', label: 'Percentual do Preço',  desc: 'Ex: comissão, royalty', icon: '📊' },
  { value: 'FIXO',               label: 'Custo Mensal Fixo',    desc: 'Distribuído pelo volume vendido', icon: '📅' },
];

// ── Modal para adicionar custo específico ─────────────────────────────────────

interface ModalCustoProps {
  produto: ErpProduto;
  onSalvar: (no: Partial<FinNoCusto>) => Promise<void>;
  onClose: () => void;
}

function ModalAdicionarCusto({ produto, onSalvar, onClose }: ModalCustoProps) {
  const [tipo, setTipo] = useState<TipoCustoRapido>('FIXO_UNITARIO');
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSalvar() {
    if (!nome.trim() || !valor) return;
    setSaving(true);
    try {
      const estrutura_valor: Record<string, unknown> = tipo === 'PERCENTUAL_RECEITA'
        ? { tipo, percentual: parseFloat(valor) }
        : { tipo, valor: parseFloat(valor), recorrencia: tipo === 'FIXO' ? 'MENSAL' : 'POR_UNIDADE' };

      await onSalvar({
        nome: nome.trim(),
        icone: TIPOS_CUSTO.find(t => t.value === tipo)?.icon ?? '💰',
        cor_display: '#6366f1',
        tipo_no: 'CUSTO_FOLHA',
        estrutura_valor,
        gatilho: { tipo: 'SEMPRE' },
        escopo: 'PRODUTO',
        produto_id: produto.id,
        ativo: true,
        ordem_calculo: 0,
      });
    } finally { setSaving(false); }
  }

  const tipoInfo = TIPOS_CUSTO.find(t => t.value === tipo)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Adicionar Custo Específico</h2>
            <p className="text-xs text-slate-500 mt-0.5">{produto.nome}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Tipo de custo */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Tipo de Custo</label>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS_CUSTO.map(t => (
                <button key={t.value} onClick={() => setTipo(t.value)}
                  className={`p-2.5 rounded-xl border-2 text-left transition-colors ${tipo === t.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <span className="text-base block mb-1">{t.icon}</span>
                  <p className="text-[11px] font-semibold text-slate-800 leading-tight">{t.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nome do Custo *</label>
            <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder={`Ex: ${tipoInfo.desc}`}
              value={nome} onChange={e => setNome(e.target.value)} />
          </div>

          {/* Valor */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {tipo === 'PERCENTUAL_RECEITA' ? 'Percentual (%)' : 'Valor (R$)'} *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                {tipo === 'PERCENTUAL_RECEITA' ? '%' : 'R$'}
              </span>
              <input type="number" min="0" step="0.01"
                className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="0,00" value={valor} onChange={e => setValor(e.target.value)} />
            </div>
            {tipo === 'PERCENTUAL_RECEITA' && valor && (
              <p className="text-[11px] text-slate-500 mt-1">
                = {BRL(produto.preco_venda * parseFloat(valor) / 100)} sobre o preço de venda de {BRL(produto.preco_venda)}
              </p>
            )}
          </div>

          {/* Info sobre custo mensal */}
          {tipo === 'FIXO' && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-xs text-blue-700">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Este custo será distribuído pelo volume mensal informado no card de análise.
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSalvar} disabled={!nome.trim() || !valor || saving}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-40">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Custo
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Item de produto na lista ──────────────────────────────────────────────────

function produtoMargem(
  produto: ErpProduto,
  nos: FinNoCusto[],
  gruposCusto: FinGrupoCusto[],
  impostos: FinImposto[],
): { custo: number; margem: number; pct: number; temCusto: boolean } {
  const base = produto.preco_custo ?? 0;

  // Custos da árvore aplicáveis — usando valor básico sem volume (FIXO_UNITARIO e PERCENTUAL)
  const nosAplicaveis = nos.filter(no => {
    if (!no.ativo) return false;
    switch (no.escopo) {
      case 'EMPRESA': return true;
      case 'PRODUTO': return no.produto_id === produto.id;
      case 'GRUPO_PRODUTO': return !!produto.grupo_id && no.grupo_produto_id === produto.grupo_id;
      case 'GRUPO_CUSTO': {
        const g = gruposCusto.find(gc => gc.id === no.grupo_custo_id);
        if (!g) return false;
        if (g.criterio === 'TODOS_PRODUTOS') return true;
        if (g.criterio === 'IS_SUBSCRIPTION') return produto.is_subscription;
        if (g.criterio === 'GRUPO_PRODUTO_ERP') return produto.grupo_id === g.criterio_params?.grupo_id;
        return false;
      }
      case 'FAIXA_PRECO':
        return produto.preco_venda >= (no.faixa_preco_min ?? 0) &&
               produto.preco_venda <= (no.faixa_preco_max ?? Infinity);
      default: return false;
    }
  });

  let custoArvore = 0;
  for (const no of nosAplicaveis) {
    const ev = no.estrutura_valor as { tipo?: string; valor?: number; percentual?: number };
    switch (ev.tipo) {
      case 'FIXO_UNITARIO': custoArvore += ev.valor ?? 0; break;
      case 'PERCENTUAL_RECEITA': custoArvore += produto.preco_venda * (ev.percentual ?? 0) / 100; break;
      // FIXO sem volume → ignorado no resumo rápido
    }
  }

  const custoImpostos = impostos.filter(i => i.ativo).reduce((s, i) => {
    if (i.tipo_calculo === 'ALIQUOTA_FIXA') return s + produto.preco_venda * (i.aliquota_pct ?? 0) / 100;
    return s;
  }, 0);

  const custo = base + custoArvore + custoImpostos;
  const margem = produto.preco_venda - custo;
  const pct = produto.preco_venda > 0 ? (margem / produto.preco_venda) * 100 : 0;
  return { custo, margem, pct, temCusto: nosAplicaveis.length > 0 || base > 0 };
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CustosProdutos() {
  const [produtos, setProdutos]         = useState<ErpProduto[]>([]);
  const [grupos, setGrupos]             = useState<ErpGrupoProduto[]>([]);
  const [nos, setNos]                   = useState<FinNoCusto[]>([]);
  const [impostos, setImpostos]         = useState<FinImposto[]>([]);
  const [gruposCusto, setGruposCusto]   = useState<FinGrupoCusto[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState<ErpProduto | null>(null);
  const [search, setSearch]             = useState('');
  const [filtroGrupo, setFiltroGrupo]   = useState('');
  const [filtroMargem, setFiltroMargem] = useState<'todos' | 'ok' | 'aviso' | 'critico'>('todos');
  const [showModal, setShowModal]       = useState(false);
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, g, n, i, gc] = await Promise.all([
        getProdutos(), getGruposProdutos(), getNos(), getImpostos(), getGruposCusto(),
      ]);
      setProdutos(p); setGrupos(g); setNos(n); setImpostos(i); setGruposCusto(gc);
    } catch { /* silently fail — mock data works */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const produtosFiltrados = produtos.filter(p => {
    if (search && !p.nome.toLowerCase().includes(search.toLowerCase()) &&
        !p.codigo_interno.toLowerCase().includes(search.toLowerCase())) return false;
    if (filtroGrupo && p.grupo_id !== filtroGrupo) return false;
    if (filtroMargem !== 'todos') {
      const { pct } = produtoMargem(p, nos, gruposCusto, impostos);
      if (filtroMargem === 'ok'      && pct < 30)  return false;
      if (filtroMargem === 'aviso'   && (pct < 15 || pct >= 30)) return false;
      if (filtroMargem === 'critico' && pct >= 15)  return false;
    }
    return true;
  });

  // Stats
  const stats = produtos.map(p => produtoMargem(p, nos, gruposCusto, impostos));
  const comCusto = stats.filter(s => s.temCusto).length;
  const avgMargem = stats.length > 0 ? stats.reduce((s, m) => s + m.pct, 0) / stats.length : 0;
  const criticos = stats.filter(s => s.pct < 15).length;

  async function handleAdicionarCusto(payload: Partial<FinNoCusto>) {
    await upsertNo(payload);
    showToast('Custo adicionado com sucesso!');
    setShowModal(false);
    await load();
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm text-white ${toast.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {showModal && selected && (
        <ModalAdicionarCusto produto={selected} onSalvar={handleAdicionarCusto} onClose={() => setShowModal(false)} />
      )}

      {/* Painel esquerdo — lista de produtos */}
      <div className="w-80 shrink-0 border-r border-slate-200 flex flex-col bg-slate-50">

        {/* Cabeçalho */}
        <div className="px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-sm font-bold text-slate-800">Custos por Produto</h1>
              <p className="text-[11px] text-slate-500">{produtos.length} produtos</p>
            </div>
            <button onClick={load} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>

          {/* Métricas rápidas */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <div className="bg-slate-50 rounded-lg p-2 text-center">
              <p className="text-[10px] text-slate-500">Com Custo</p>
              <p className="text-sm font-black text-slate-800">{comCusto}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2 text-center">
              <p className="text-[10px] text-slate-500">Margem Média</p>
              <p className={`text-sm font-black ${avgMargem >= 30 ? 'text-emerald-700' : avgMargem >= 15 ? 'text-amber-700' : 'text-red-700'}`}>{PCT(avgMargem)}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2 text-center">
              <p className="text-[10px] text-slate-500">Críticos</p>
              <p className={`text-sm font-black ${criticos > 0 ? 'text-red-700' : 'text-slate-800'}`}>{criticos}</p>
            </div>
          </div>

          {/* Busca */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
              placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Filtros */}
          <div className="flex gap-1.5">
            <select value={filtroGrupo} onChange={e => setFiltroGrupo(e.target.value)}
              className="flex-1 text-[11px] border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white text-slate-600">
              <option value="">Todos os grupos</option>
              {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
            <select value={filtroMargem} onChange={e => setFiltroMargem(e.target.value as typeof filtroMargem)}
              className="text-[11px] border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white text-slate-600">
              <option value="todos">Margem</option>
              <option value="ok">≥ 30%</option>
              <option value="aviso">15–30%</option>
              <option value="critico">&lt; 15%</option>
            </select>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : produtosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">Nenhum produto encontrado.</p>
            </div>
          ) : produtosFiltrados.map(p => {
            const { pct, temCusto } = produtoMargem(p, nos, gruposCusto, impostos);
            const grupoNome = grupos.find(g => g.id === p.grupo_id)?.nome;
            const isSelected = selected?.id === p.id;
            return (
              <div key={p.id} onClick={() => setSelected(p)}
                className={`px-4 py-3 border-b border-slate-100 cursor-pointer transition-colors ${isSelected ? 'bg-slate-800 text-white' : 'hover:bg-white'}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0 ${isSelected ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-500'}`}>{p.codigo_interno}</span>
                    {!temCusto && <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${isSelected ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-600'}`}>S/C</span>}
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`} />
                </div>
                <p className={`text-xs font-medium truncate mb-1 ${isSelected ? 'text-white' : 'text-slate-800'}`}>{p.nome}</p>
                {grupoNome && (
                  <p className={`text-[10px] truncate mb-1.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{grupoNome}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{BRL(p.preco_venda)}</span>
                  {temCusto && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      pct >= 30 ? (isSelected ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-700')
                      : pct >= 15 ? (isSelected ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-700')
                      : (isSelected ? 'bg-red-700 text-white' : 'bg-red-100 text-red-700')
                    }`}>
                      {pct >= 0 ? <TrendingUp className="w-2.5 h-2.5 inline mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 inline mr-0.5" />}
                      {PCT(pct)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Painel direito — detalhe do produto */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
              <GitFork className="w-8 h-8 text-emerald-300" />
            </div>
            <h2 className="text-base font-bold text-slate-700 mb-2">Selecione um Produto</h2>
            <p className="text-sm text-slate-400 max-w-xs">
              Clique em um produto na lista para visualizar e gerenciar seus custos vinculados.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-slate-50 rounded-xl">
                <Tag className="w-5 h-5 text-violet-400 mx-auto mb-1.5" />
                <p className="text-[11px] text-slate-600 font-medium">Custos Específicos</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Vinculados a este produto</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <Layers className="w-5 h-5 text-blue-400 mx-auto mb-1.5" />
                <p className="text-[11px] text-slate-600 font-medium">Custos do Grupo</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Herdados da categoria</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <Building2 className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                <p className="text-[11px] text-slate-600 font-medium">Custos da Empresa</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Overhead distribuído</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Header ações */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-800">Análise de Custo Final</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Adicionar Custo
                </button>
              </div>
            </div>

            {/* CustoFinalCard */}
            <CustoFinalCard
              produto={selected}
              grupos={grupos}
              nos={nos}
              impostos={impostos}
              gruposCusto={gruposCusto}
              onAdicionarCusto={() => setShowModal(true)}
            />

            {/* Legenda de origens */}
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[11px] font-semibold text-slate-600 mb-3 uppercase tracking-wider">Como os custos são herdados</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Tag,       label: 'Específico',   desc: `Custo vinculado direto a "${selected.nome}"`, color: 'text-violet-600' },
                  { icon: Layers,    label: 'Grupo/Categoria', desc: 'Todo produto desta categoria herda', color: 'text-blue-600' },
                  { icon: Building2, label: 'Empresa',      desc: 'Distribui entre todos os produtos', color: 'text-emerald-600' },
                  { icon: DollarSign,label: 'Faixa de Preço',desc: `Aplica a produtos entre R$ ${nos.filter(n=>n.escopo==='FAIXA_PRECO'&&n.ativo).length > 0 ? '—' : '—'}`, color: 'text-cyan-600' },
                ].map(({ icon: Icon, label, desc, color }) => (
                  <div key={label} className="flex items-start gap-2">
                    <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${color}`} />
                    <div>
                      <p className="text-[11px] font-semibold text-slate-700">{label}</p>
                      <p className="text-[10px] text-slate-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

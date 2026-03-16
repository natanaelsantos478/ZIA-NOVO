// ─────────────────────────────────────────────────────────────────────────────
// CustoFinalCard.tsx — Card de Custo Final por Produto
//
// Recebe um produto e as listas de nós de custo, impostos e grupos.
// Filtra quais custos se aplicam a este produto (por escopo) e calcula:
//   • Custo de Aquisição (preco_custo do cadastro)
//   • Custos da Árvore (escopo: PRODUTO, GRUPO_PRODUTO, EMPRESA, GRUPO_CUSTO, FAIXA_PRECO)
//   • Impostos automáticos (alíquota sobre preço de venda)
//   • Margem Bruta e %
//
// Para custos FIXO mensais, o usuário pode informar o volume mensal
// de unidades vendidas para calcular o impacto unitário.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  Package, TrendingUp, TrendingDown, Plus, ChevronDown, ChevronRight,
  Building2, Layers, Tag, DollarSign, Landmark, AlertCircle, Zap,
  GitFork, Info,
} from 'lucide-react';
import type { ErpProduto, ErpGrupoProduto } from '../../../../lib/erp';
import type { FinNoCusto, FinImposto, FinGrupoCusto } from '../../../../lib/financeiro';

// ── Tipos internos ─────────────────────────────────────────────────────────

type Origem = 'BASE' | 'PRODUTO_ESPECIFICO' | 'GRUPO_PRODUTO' | 'EMPRESA' | 'GRUPO_CUSTO' | 'FAIXA_PRECO' | 'IMPOSTO';

interface ItemCusto {
  id: string;
  nome: string;
  icone: string;
  cor: string;
  origem: Origem;
  tipo: 'FIXO_MENSAL' | 'FIXO_UNITARIO' | 'PERCENTUAL' | 'ESCALONADO';
  valor_unitario: number | null;   // null = requer volume para calcular
  requer_volume: boolean;
  descricao_valor: string;
}

const ORIGEM_CONFIG: Record<Origem, { label: string; icon: React.ComponentType<{ className?: string }>; bgClass: string; textClass: string }> = {
  BASE:              { label: 'Custo de Aquisição',   icon: Package,   bgClass: 'bg-slate-100',  textClass: 'text-slate-700' },
  PRODUTO_ESPECIFICO:{ label: 'Custo Específico',     icon: Tag,       bgClass: 'bg-violet-100', textClass: 'text-violet-700' },
  GRUPO_PRODUTO:     { label: 'Custo do Grupo',       icon: Layers,    bgClass: 'bg-blue-100',   textClass: 'text-blue-700' },
  EMPRESA:           { label: 'Custo da Empresa',     icon: Building2, bgClass: 'bg-emerald-100',textClass: 'text-emerald-700' },
  GRUPO_CUSTO:       { label: 'Custo Personalizado',  icon: GitFork,   bgClass: 'bg-amber-100',  textClass: 'text-amber-700' },
  FAIXA_PRECO:       { label: 'Custo por Faixa',      icon: DollarSign,bgClass: 'bg-cyan-100',   textClass: 'text-cyan-700' },
  IMPOSTO:           { label: 'Impostos',             icon: Landmark,  bgClass: 'bg-red-100',    textClass: 'text-red-700' },
};

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const PCT = (v: number) => `${v.toFixed(1)}%`;

// ── Filtro de nós aplicáveis ──────────────────────────────────────────────

function produtoNoGrupoCusto(produto: ErpProduto, grupo: FinGrupoCusto): boolean {
  switch (grupo.criterio) {
    case 'MANUAL':
      return ((grupo.criterio_params?.produtos_ids as string[]) ?? []).includes(produto.id);
    case 'GRUPO_PRODUTO_ERP':
      return produto.grupo_id === grupo.criterio_params?.grupo_id;
    case 'IS_SUBSCRIPTION':
      return produto.is_subscription;
    case 'TODOS_PRODUTOS':
      return true;
    case 'FAIXA_PRECO': {
      const min = (grupo.criterio_params?.preco_min as number) ?? 0;
      const max = (grupo.criterio_params?.preco_max as number) ?? Infinity;
      return produto.preco_venda >= min && produto.preco_venda <= max;
    }
    default: return false;
  }
}

function getNodesAplicaveis(nos: FinNoCusto[], produto: ErpProduto, gruposCusto: FinGrupoCusto[]): FinNoCusto[] {
  return nos.filter(no => {
    if (!no.ativo) return false;
    switch (no.escopo) {
      case 'EMPRESA':       return true;
      case 'PRODUTO':       return no.produto_id === produto.id;
      case 'GRUPO_PRODUTO': return !!produto.grupo_id && no.grupo_produto_id === produto.grupo_id;
      case 'GRUPO_CUSTO': {
        const grupo = gruposCusto.find(g => g.id === no.grupo_custo_id);
        return grupo ? produtoNoGrupoCusto(produto, grupo) : false;
      }
      case 'FAIXA_PRECO':   return (
        produto.preco_venda >= (no.faixa_preco_min ?? 0) &&
        produto.preco_venda <= (no.faixa_preco_max ?? Infinity)
      );
      default: return false;
    }
  });
}

// ── Cálculo por unidade ───────────────────────────────────────────────────

function calcularItens(
  nos: FinNoCusto[],
  impostos: FinImposto[],
  produto: ErpProduto,
  volMes: number,
): ItemCusto[] {
  const items: ItemCusto[] = [];

  // 1. Custo de Aquisição
  if ((produto.preco_custo ?? 0) > 0) {
    items.push({
      id: '__base__',
      nome: 'Custo de Aquisição',
      icone: '📦',
      cor: '#64748b',
      origem: 'BASE',
      tipo: 'FIXO_UNITARIO',
      valor_unitario: produto.preco_custo!,
      requer_volume: false,
      descricao_valor: `${BRL(produto.preco_custo!)} por unidade`,
    });
  }

  // 2. Nós da árvore de custos
  const origemMap: Record<string, Origem> = {
    EMPRESA: 'EMPRESA', PRODUTO: 'PRODUTO_ESPECIFICO',
    GRUPO_PRODUTO: 'GRUPO_PRODUTO', GRUPO_CUSTO: 'GRUPO_CUSTO', FAIXA_PRECO: 'FAIXA_PRECO',
  };

  for (const no of nos) {
    const ev = no.estrutura_valor as {
      tipo?: string; valor?: number; percentual?: number;
      faixas?: { de: number; ate: number | null; valor: number }[];
    };
    const origem = origemMap[no.escopo] ?? 'EMPRESA';
    const base = { id: no.id, nome: no.nome, icone: no.icone ?? '💰', cor: no.cor_display ?? '#6366f1', origem };

    switch (ev.tipo) {
      case 'FIXO': {
        const val = ev.valor ?? 0;
        const unitario = volMes > 0 ? val / volMes : null;
        items.push({
          ...base, tipo: 'FIXO_MENSAL', valor_unitario: unitario, requer_volume: volMes === 0,
          descricao_valor: volMes > 0
            ? `${BRL(val)}/mês ÷ ${volMes} un = ${BRL(unitario!)}/un`
            : `${BRL(val)}/mês — informe o volume`,
        });
        break;
      }
      case 'FIXO_UNITARIO': {
        const val = ev.valor ?? 0;
        items.push({
          ...base, tipo: 'FIXO_UNITARIO', valor_unitario: val, requer_volume: false,
          descricao_valor: `${BRL(val)} por unidade`,
        });
        break;
      }
      case 'PERCENTUAL_RECEITA': {
        const pct = ev.percentual ?? 0;
        const val = produto.preco_venda * pct / 100;
        items.push({
          ...base, tipo: 'PERCENTUAL', valor_unitario: val, requer_volume: false,
          descricao_valor: `${PCT(pct)} de ${BRL(produto.preco_venda)} = ${BRL(val)}`,
        });
        break;
      }
      case 'ESCALONADO_VOLUME': {
        const faixas = ev.faixas ?? [];
        const faixa = volMes > 0 ? faixas.find(f => volMes >= f.de && (f.ate === null || volMes <= f.ate)) : null;
        items.push({
          ...base, tipo: 'ESCALONADO',
          valor_unitario: faixa ? faixa.valor : null,
          requer_volume: !faixa,
          descricao_valor: faixa
            ? `${BRL(faixa.valor)}/un (faixa ${faixa.de}–${faixa.ate ?? '∞'} un)`
            : 'Informe o volume para calcular',
        });
        break;
      }
      default: {
        const val = ev.valor ?? 0;
        if (val > 0) items.push({
          ...base, tipo: 'FIXO_UNITARIO', valor_unitario: val, requer_volume: false,
          descricao_valor: BRL(val),
        });
      }
    }
  }

  // 3. Impostos
  for (const imp of impostos.filter(i => i.ativo)) {
    const base = { id: imp.id, nome: imp.nome, icone: '🏛️', cor: '#dc2626', origem: 'IMPOSTO' as const };
    switch (imp.tipo_calculo) {
      case 'ALIQUOTA_FIXA': {
        const pct = imp.aliquota_pct ?? 0;
        const val = produto.preco_venda * pct / 100;
        items.push({ ...base, tipo: 'PERCENTUAL', valor_unitario: val, requer_volume: false,
          descricao_valor: `${PCT(pct)} (${imp.sigla}) = ${BRL(val)}` });
        break;
      }
      case 'VALOR_FIXO_MENSAL': {
        const val = imp.valor_fixo ?? 0;
        const unitario = volMes > 0 ? val / volMes : null;
        items.push({ ...base, tipo: 'FIXO_MENSAL', valor_unitario: unitario, requer_volume: volMes === 0,
          descricao_valor: volMes > 0
            ? `${BRL(val)}/mês ÷ ${volMes} un = ${BRL(unitario!)} (${imp.sigla})`
            : `${BRL(val)}/mês (${imp.sigla}) — informe o volume` });
        break;
      }
      default: break;
    }
  }

  return items;
}

// ── Props e componente principal ──────────────────────────────────────────

interface CustoFinalCardProps {
  produto: ErpProduto;
  grupos: ErpGrupoProduto[];
  nos: FinNoCusto[];
  impostos: FinImposto[];
  gruposCusto: FinGrupoCusto[];
  onAdicionarCusto?: () => void;
  compact?: boolean; // Modo compacto para uso em listas
}

export default function CustoFinalCard({
  produto, grupos, nos, impostos, gruposCusto, onAdicionarCusto, compact = false,
}: CustoFinalCardProps) {
  const [volMes, setVolMes] = useState(0);
  const [expanded, setExpanded] = useState<Record<Origem, boolean>>({
    BASE: true, PRODUTO_ESPECIFICO: true, GRUPO_PRODUTO: true,
    EMPRESA: false, GRUPO_CUSTO: false, FAIXA_PRECO: false, IMPOSTO: true,
  });

  const nodesAplicaveis = getNodesAplicaveis(nos, produto, gruposCusto);
  const itens = calcularItens(nodesAplicaveis, impostos, produto, volMes);

  const totalCusto = itens.reduce((s, i) => s + (i.valor_unitario ?? 0), 0);
  const margem = produto.preco_venda - totalCusto;
  const margemPct = produto.preco_venda > 0 ? (margem / produto.preco_venda) * 100 : 0;
  const temRequerVolume = itens.some(i => i.requer_volume);

  const grupoNome = grupos.find(g => g.id === produto.grupo_id)?.nome;

  // Agrupa por origem
  const porOrigem = itens.reduce<Record<Origem, ItemCusto[]>>((acc, item) => {
    if (!acc[item.origem]) acc[item.origem] = [];
    acc[item.origem].push(item);
    return acc;
  }, {} as Record<Origem, ItemCusto[]>);

  const ordemOrigem: Origem[] = ['BASE', 'PRODUTO_ESPECIFICO', 'GRUPO_PRODUTO', 'EMPRESA', 'GRUPO_CUSTO', 'FAIXA_PRECO', 'IMPOSTO'];

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-xs text-slate-500">Custo Final</span>
          <p className="font-bold text-slate-800">{BRL(totalCusto)}</p>
        </div>
        <div>
          <span className="text-xs text-slate-500">Margem</span>
          <p className={`font-bold ${margemPct >= 30 ? 'text-emerald-600' : margemPct >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
            {PCT(margemPct)}
          </p>
        </div>
        <div className="text-xs text-slate-400">{nodesAplicaveis.length} custo(s) vinculado(s)</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho do produto */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-800">{produto.nome}</span>
            {grupoNome && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">{grupoNome}</span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {produto.codigo_interno} • Preço de Venda: <span className="font-semibold text-slate-700">{BRL(produto.preco_venda)}</span>
          </p>
        </div>

        {/* Volume mensal input */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <label className="block text-[10px] text-slate-500 mb-1">Volume/mês (un)</label>
            <input
              type="number" min="0" value={volMes || ''}
              placeholder="0"
              onChange={e => setVolMes(Number(e.target.value) || 0)}
              className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Aviso de volume pendente */}
      {temRequerVolume && volMes === 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Informe o volume mensal de unidades para calcular custos fixos distribuídos.
        </div>
      )}

      <div className="grid grid-cols-[1fr_200px] gap-4">

        {/* Breakdown de custos */}
        <div className="space-y-2">
          {itens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Info className="w-6 h-6 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500 font-medium">Nenhum custo vinculado</p>
              <p className="text-xs text-slate-400 mt-1">
                {produto.preco_custo ? '' : 'Defina o custo de aquisição no cadastro. '}
                Adicione custos da árvore ou específicos para este produto.
              </p>
            </div>
          ) : (
            ordemOrigem.map(origem => {
              const grupo = porOrigem[origem];
              if (!grupo?.length) return null;
              const cfg = ORIGEM_CONFIG[origem];
              const Icon = cfg.icon;
              const isOpen = expanded[origem] ?? true;

              return (
                <div key={origem} className="border border-slate-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpanded(p => ({ ...p, [origem]: !p[origem] }))}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`p-1 rounded-lg ${cfg.bgClass}`}>
                        <Icon className={`w-3 h-3 ${cfg.textClass}`} />
                      </span>
                      <span className="text-xs font-semibold text-slate-700">{cfg.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">{grupo.length}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-800">
                        {BRL(grupo.reduce((s, i) => s + (i.valor_unitario ?? 0), 0))}
                      </span>
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 divide-y divide-slate-50">
                      {grupo.map(item => (
                        <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-white text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base leading-none">{item.icone}</span>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-700 truncate">{item.nome}</p>
                              <p className="text-[10px] text-slate-400 truncate">{item.descricao_valor}</p>
                            </div>
                          </div>
                          <div className="shrink-0 ml-3 text-right">
                            {item.requer_volume ? (
                              <span className="text-amber-500 font-medium">—</span>
                            ) : (
                              <span className="font-bold text-slate-800">{BRL(item.valor_unitario ?? 0)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Adicionar custo */}
          {onAdicionarCusto && (
            <button
              onClick={onAdicionarCusto}
              className="w-full flex items-center justify-center gap-1.5 border border-dashed border-slate-300 rounded-xl py-2 text-xs text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Custo Específico
            </button>
          )}
        </div>

        {/* Resumo final */}
        <div className="space-y-3">
          {/* Card custo final */}
          <div className="bg-slate-800 rounded-xl p-4 text-white">
            <div className="flex items-center gap-1.5 mb-3 opacity-70">
              <Zap className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Custo Final</span>
            </div>
            <p className="text-2xl font-black mb-1">{BRL(totalCusto)}</p>
            <p className="text-[10px] opacity-60">por unidade</p>
            <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="opacity-70">Preço de Venda</span>
                <span className="font-semibold">{BRL(produto.preco_venda)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="opacity-70">Custo Total</span>
                <span className="font-semibold text-red-300">{BRL(totalCusto)}</span>
              </div>
            </div>
          </div>

          {/* Margem */}
          <div className={`rounded-xl p-4 ${margemPct >= 30 ? 'bg-emerald-50 border border-emerald-200' : margemPct >= 15 ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center gap-1.5 mb-2">
              {margemPct >= 15
                ? <TrendingUp className={`w-3.5 h-3.5 ${margemPct >= 30 ? 'text-emerald-600' : 'text-amber-600'}`} />
                : <TrendingDown className="w-3.5 h-3.5 text-red-600" />
              }
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Margem Bruta</span>
            </div>
            <p className={`text-2xl font-black ${margemPct >= 30 ? 'text-emerald-700' : margemPct >= 15 ? 'text-amber-700' : 'text-red-700'}`}>
              {PCT(margemPct)}
            </p>
            <p className={`text-xs mt-1 ${margemPct >= 30 ? 'text-emerald-600' : margemPct >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
              {BRL(margem)} por unidade
            </p>

            {/* Barra de progresso */}
            <div className="mt-3 bg-white/60 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${margemPct >= 30 ? 'bg-emerald-500' : margemPct >= 15 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, Math.max(0, margemPct))}%` }}
              />
            </div>
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-slate-500 mb-1">Custos<br />vinculados</p>
              <p className="text-lg font-black text-slate-800">{nodesAplicaveis.length}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-slate-500 mb-1">Impostos<br />ativos</p>
              <p className="text-lg font-black text-slate-800">{impostos.filter(i => i.ativo).length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

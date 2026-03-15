// ─────────────────────────────────────────────────────────────────────────────
// costEngine.ts — Motor de avaliação da árvore de custos (JS, espelha o SQL)
// ─────────────────────────────────────────────────────────────────────────────
import type {
  NoCusto, ArestaCusto, Gatilho, EstruturaValor,
  ContextoCalculo, ResultadoNo, ResultadoSimulacao,
} from './types';

// ── Avalia um gatilho dado um contexto ───────────────────────────────────────
export function avaliarGatilho(gatilho: Gatilho, ctx: ContextoCalculo): boolean {
  const { tipo, operador = '>=', valor_referencia = 0, valor_referencia_2 } = gatilho;
  if (tipo === 'SEMPRE') return true;

  let metrica = 0;
  switch (tipo) {
    case 'TOTAL_ASSINANTES':    metrica = ctx.total_assinantes; break;
    case 'FATURAMENTO_TOTAL':   metrica = ctx.receita_bruta; break;
    case 'TOTAL_PEDIDOS_MES':   metrica = ctx.total_pedidos; break;
    case 'VOLUME_PRODUTO':
      metrica = gatilho.produto_id ? (ctx.volume_por_produto[gatilho.produto_id] ?? 0) : 0; break;
    case 'FATURAMENTO_GRUPO':
      metrica = gatilho.grupo_id ? (ctx.receita_por_grupo[gatilho.grupo_id] ?? 0) : 0; break;
    default: return true;
  }

  switch (operador) {
    case '>':       return metrica > valor_referencia;
    case '>=':      return metrica >= valor_referencia;
    case '<':       return metrica < valor_referencia;
    case '<=':      return metrica <= valor_referencia;
    case '==':      return metrica === valor_referencia;
    case 'between': return metrica >= valor_referencia && metrica <= (valor_referencia_2 ?? valor_referencia);
    default:        return true;
  }
}

// ── Calcula valor de um nó FOLHA ─────────────────────────────────────────────
export function calcularValorFolha(estrutura: EstruturaValor, ctx: ContextoCalculo): { valor: number; faixa?: import('./types').Faixa } {
  const { tipo, valor = 0, faixas = [], percentual = 0 } = estrutura;

  switch (tipo) {
    case 'FIXO':
      return { valor };

    case 'FIXO_UNITARIO': {
      const total = ctx.total_assinantes;
      return { valor: valor * total };
    }

    case 'ESCALONADO_VOLUME': {
      const metrica = ctx.total_assinantes;
      const faixa = faixas.find(f => metrica >= f.de && (f.ate === null || metrica <= f.ate));
      return { valor: faixa ? faixa.valor * metrica : 0, faixa };
    }

    case 'ESCALONADO_FATURAMENTO': {
      const metrica = ctx.receita_bruta;
      const faixa = faixas.find(f => metrica >= f.de && (f.ate === null || metrica <= f.ate));
      return { valor: faixa ? faixa.valor : 0, faixa };
    }

    case 'PERCENTUAL_RECEITA':
      return { valor: ctx.receita_bruta * (percentual / 100) };

    default:
      return { valor };
  }
}

// ── Avalia um nó da árvore recursivamente ────────────────────────────────────
export function avaliarNo(
  noId: string,
  nosMap: Map<string, NoCusto>,
  arestasMap: Map<string, ArestaCusto[]>, // key = no_pai_id
  ctx: ContextoCalculo,
  profundidade = 0,
): ResultadoNo {
  if (profundidade > 20) {
    return { valor: 0, trace: 'ERRO: profundidade máxima atingida', filhos_avaliados: {}, gatilho_ativado: false, no_nome: '?', no_tipo: 'CUSTO_FOLHA' };
  }

  const no = nosMap.get(noId);
  if (!no || !no.ativo) {
    return { valor: 0, trace: 'nó não encontrado ou inativo', filhos_avaliados: {}, gatilho_ativado: false, no_nome: '?', no_tipo: 'CUSTO_FOLHA' };
  }

  const gatilhoOk = avaliarGatilho(no.gatilho, ctx);
  if (!gatilhoOk) {
    return {
      valor: 0,
      trace: `gatilho não ativado: ${no.gatilho.tipo}`,
      filhos_avaliados: {},
      gatilho_ativado: false,
      no_nome: no.nome,
      no_tipo: no.tipo_no,
    };
  }

  const filhosAvaliados: Record<string, ResultadoNo> = {};
  let valor = 0;
  let trace = '';

  const arestasFilhos = (arestasMap.get(noId) ?? []).filter(a => a.ativo).sort((a, b) => b.prioridade - a.prioridade);

  if (no.tipo_no === 'CUSTO_FOLHA') {
    const { valor: v, faixa } = calcularValorFolha(no.estrutura_valor, ctx);
    valor = v;
    trace = `FOLHA: tipo=${no.estrutura_valor.tipo} valor=${valor.toFixed(2)}${faixa ? ` faixa=[${faixa.de}-${faixa.ate ?? '∞'}]@${faixa.valor}` : ''}`;

  } else if (no.tipo_no === 'CUSTO_AGREGADOR') {
    for (const aresta of arestasFilhos) {
      if (!avaliarGatilho(aresta.condicao_aresta, ctx)) continue;
      const res = avaliarNo(aresta.no_filho_id, nosMap, arestasMap, ctx, profundidade + 1);
      filhosAvaliados[aresta.no_filho_id] = res;
      switch (aresta.tipo_relacao) {
        case 'SOMA':         valor += res.valor; break;
        case 'SUBTRAI':      valor -= res.valor; break;
        case 'MULTIPLICA_POR': valor *= (aresta.fator ?? 1) * res.valor; break;
        case 'DIVIDE_POR':   if (res.valor !== 0) valor /= res.valor; break;
        default:             valor += res.valor;
      }
    }
    trace = `AGREGADOR: total=${valor.toFixed(2)} filhos=${Object.keys(filhosAvaliados).length}`;

  } else if (no.tipo_no === 'CUSTO_CONDICIONAL') {
    const substituis = arestasFilhos.filter(a => a.tipo_relacao === 'SUBSTITUI');
    for (const aresta of substituis) {
      if (avaliarGatilho(aresta.condicao_aresta, ctx)) {
        const res = avaliarNo(aresta.no_filho_id, nosMap, arestasMap, ctx, profundidade + 1);
        valor = res.valor;
        filhosAvaliados[aresta.no_filho_id] = res;
        trace = `CONDICIONAL: filho escolhido (prio ${aresta.prioridade}) valor=${valor.toFixed(2)}`;
        break;
      }
    }
  } else if (no.tipo_no === 'CUSTO_MULTIPLICADOR') {
    let base = 0;
    for (const aresta of arestasFilhos) {
      const res = avaliarNo(aresta.no_filho_id, nosMap, arestasMap, ctx, profundidade + 1);
      filhosAvaliados[aresta.no_filho_id] = res;
      base += res.valor;
    }
    valor = base * (no.estrutura_valor.valor ?? 1);
    trace = `MULTIPLICADOR: base=${base.toFixed(2)} × ${no.estrutura_valor.valor} = ${valor.toFixed(2)}`;
  }

  return {
    valor,
    trace,
    filhos_avaliados: filhosAvaliados,
    gatilho_ativado: gatilhoOk,
    no_nome: no.nome,
    no_tipo: no.tipo_no,
  };
}

// ── Simula a árvore inteira ───────────────────────────────────────────────────
export function simularArvore(
  nos: NoCusto[],
  arestas: ArestaCusto[],
  ctx: ContextoCalculo,
): ResultadoSimulacao {
  const nosMap = new Map(nos.map(n => [n.id, n]));
  const arestasMap = new Map<string, ArestaCusto[]>();
  for (const a of arestas) {
    if (!arestasMap.has(a.no_pai_id)) arestasMap.set(a.no_pai_id, []);
    arestasMap.get(a.no_pai_id)!.push(a);
  }

  // Nós raiz = nós que não são filho de nenhum ativo
  const filhosIds = new Set(arestas.filter(a => a.ativo).map(a => a.no_filho_id));
  const nosRaiz = nos.filter(n => n.ativo && !filhosIds.has(n.id));

  const resultadoNos: Record<string, ResultadoNo> = {};
  let custoTotal = 0;

  for (const raiz of nosRaiz) {
    const res = avaliarNo(raiz.id, nosMap, arestasMap, ctx, 0);
    resultadoNos[raiz.id] = res;
    custoTotal += res.valor;
  }

  return {
    nos: resultadoNos,
    totais: {
      custo_total_empresa: custoTotal,
      por_produto: {},
      impostos_totais: 0,
    },
    margem_por_produto: {},
  };
}

// ── Deteta ciclos na árvore ───────────────────────────────────────────────────
export function detectarCiclos(nos: NoCusto[], arestas: ArestaCusto[]): string[] {
  const adjacencia = new Map<string, string[]>();
  for (const a of arestas.filter(a => a.ativo)) {
    if (!adjacencia.has(a.no_pai_id)) adjacencia.set(a.no_pai_id, []);
    adjacencia.get(a.no_pai_id)!.push(a.no_filho_id);
  }

  const visitados = new Set<string>();
  const emStack = new Set<string>();
  const ciclos: string[] = [];

  function dfs(noId: string) {
    if (emStack.has(noId)) { ciclos.push(noId); return; }
    if (visitados.has(noId)) return;
    visitados.add(noId);
    emStack.add(noId);
    for (const filho of adjacencia.get(noId) ?? []) dfs(filho);
    emStack.delete(noId);
  }

  for (const no of nos) dfs(no.id);
  return ciclos;
}

// ── Descrição legível de um gatilho ─────────────────────────────────────────
export function descricaoGatilho(g: Gatilho): string {
  if (g.tipo === 'SEMPRE') return 'Sempre ativo';
  const op = { '>': 'maior que', '>=': 'maior ou igual a', '<': 'menor que', '<=': 'menor ou igual a', '==': 'igual a', 'between': 'entre' }[g.operador ?? '>='] ?? '>=';
  const val = g.operador === 'between' ? `${g.valor_referencia} e ${g.valor_referencia_2}` : String(g.valor_referencia ?? 0);
  switch (g.tipo) {
    case 'TOTAL_ASSINANTES':  return `Assinantes ${op} ${val}`;
    case 'FATURAMENTO_TOTAL': return `Faturamento ${op} R$ ${Number(g.valor_referencia ?? 0).toLocaleString('pt-BR')}`;
    case 'TOTAL_PEDIDOS_MES': return `Pedidos/mês ${op} ${val}`;
    case 'VOLUME_PRODUTO':    return `Volume do produto ${op} ${val}`;
    case 'FATURAMENTO_GRUPO': return `Faturamento do grupo ${op} R$ ${val}`;
    default:                  return g.tipo;
  }
}

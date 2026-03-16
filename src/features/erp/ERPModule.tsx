// ERP Module — roteador de seções com lazy loading
import { lazy, Suspense, Component, type ReactNode, type ErrorInfo } from 'react';
import { Construction, AlertTriangle, RefreshCw } from 'lucide-react';
import Loader from '../../components/UI/Loader';

// ── ErrorBoundary — evita tela branca em erros de renderização ────────────────

interface EBState { hasError: boolean; message: string }

class SectionErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, message: error.message ?? String(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ERP] Erro na seção:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px] p-8">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Erro ao carregar seção</h2>
            <p className="text-sm text-slate-500 mb-4 font-mono bg-slate-50 px-3 py-2 rounded-lg">
              {this.state.message}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Sections implementadas ────────────────────────────────────────────────────
const Caixa             = lazy(() => import('./sections/Caixa'));
const CadClientes       = lazy(() => import('./sections/CadClientes'));
const CadFornecedores   = lazy(() => import('./sections/CadFornecedores'));
const CadProdutos       = lazy(() => import('./sections/CadProdutos'));
const CadGruposProdutos = lazy(() => import('./sections/CadGruposProdutos'));
const EstoqueConsulta   = lazy(() => import('./sections/EstoqueConsulta'));
const EntradaEstoque    = lazy(() => import('./sections/EntradaEstoque'));
const SaidaEstoque      = lazy(() => import('./sections/SaidaEstoque'));
const TransacaoProduto  = lazy(() => import('./sections/TransacaoProduto'));
const PedidoVenda       = lazy(() => import('./sections/PedidoVenda'));
const PedidosClientes   = lazy(() => import('./sections/PedidosClientes'));
const Atendimento       = lazy(() => import('./sections/Atendimento'));
const Caso              = lazy(() => import('./sections/Caso'));
const Faturamento       = lazy(() => import('./sections/Faturamento'));
const EntradaValores    = lazy(() => import('./sections/EntradaValores'));
const SaidaValores      = lazy(() => import('./sections/SaidaValores'));
const Relatorios        = lazy(() => import('./sections/Relatorios'));
const GestaoAtividades  = lazy(() => import('./sections/GestaoAtividades'));
const GerirTarefas      = lazy(() => import('./sections/GerirTarefas'));
const PerfilColaborador = lazy(() => import('./sections/PerfilColaborador'));
const CadEmpresas       = lazy(() => import('./sections/CadEmpresas'));
const Projetos          = lazy(() => import('./sections/Projetos'));
const MetricasProjetos  = lazy(() => import('./sections/MetricasProjetos'));
const GruposProjetos    = lazy(() => import('./sections/GruposProjetos'));
const VendasRealizadas  = lazy(() => import('./sections/VendasRealizadas'));
const ArvoreCustos      = lazy(() => import('./sections/financeiro/ArvoreCustos'));
const GruposCusto       = lazy(() => import('./sections/financeiro/GruposCusto'));
const Impostos          = lazy(() => import('./sections/financeiro/Impostos'));
const AnaliseMargem     = lazy(() => import('./sections/financeiro/AnaliseMargem'));
const Comissoes         = lazy(() => import('./sections/financeiro/Comissoes'));
// ── Novas seções implementadas ────────────────────────────────────────────────
const PedidoDevolucao   = lazy(() => import('./sections/PedidoDevolucao'));
const PedidoDemonstracao= lazy(() => import('./sections/PedidoDemonstracao'));
const RevendaProdutos   = lazy(() => import('./sections/RevendaProdutos'));
const TransacaoExterna  = lazy(() => import('./sections/TransacaoExterna'));
const OrdemServico      = lazy(() => import('./sections/OrdemServico'));
const Propostas         = lazy(() => import('./sections/Propostas'));
const PlanilhaVendas    = lazy(() => import('./sections/PlanilhaGeral').then(m => ({ default: m.PlanilhaVendas })));
const PlanilhaPedidos   = lazy(() => import('./sections/PlanilhaGeral').then(m => ({ default: m.PlanilhaPedidos })));
const PlanilhaFretes    = lazy(() => import('./sections/PlanilhaGeral').then(m => ({ default: m.PlanilhaFretes })));
const FaturamentoCargas = lazy(() => import('./sections/FaturamentoCargas'));
const ConsultaCargas    = lazy(() => import('./sections/ConsultaCargas'));
const MDFe              = lazy(() => import('./sections/MDFe'));
const ForcaVendas       = lazy(() => import('./sections/ForcaVendas'));
const FlexivelVendedores= lazy(() => import('./sections/FlexivelVendedores'));
const AgrupamentoOrcs   = lazy(() => import('./sections/AgrupamentoOrcs'));
const IntegracaoLoja    = lazy(() => import('./sections/IntegracaoLoja'));
const PDV               = lazy(() => import('./sections/PDV'));
const HospedagemValores = lazy(() => import('./sections/HospedagemValores'));
const CadeiasProjectos  = lazy(() => import('./sections/CadeiasProjectos'));
const MonitoramentoProjetos = lazy(() => import('./sections/MonitoramentoProjetos'));

// ── Seções em construção (nenhuma restante neste módulo) ──────────────────────
const EM_CONSTRUCAO_LABELS: Record<string, string> = {};

interface ERPModuleProps {
  activeSection: string;
  moduleColor: string;
}

function Section({ activeSection }: { activeSection: string }) {
  switch (activeSection) {
    // Operações — Cadastros
    case 'cad-clientes':      return <CadClientes />;
    case 'cad-fornecedores':  return <CadFornecedores />;
    case 'cad-produtos':      return <CadProdutos />;
    case 'cad-grupos-produtos': return <CadGruposProdutos />;
    case 'cad-empresas':      return <CadEmpresas />;
    // Operações — Estoque
    case 'estoque':           return <EstoqueConsulta />;
    case 'entrada-estoque':   return <EntradaEstoque />;
    case 'saida-estoque':     return <SaidaEstoque />;
    case 'transacao-produto': return <TransacaoProduto />;
    // Operações — Pedidos
    case 'pedido-venda':      return <PedidoVenda />;
    // Operações — Atendimento
    case 'atendimento':         return <Atendimento />;
    case 'caso':               return <Caso />;
    // Financeiro
    case 'vendas-realizadas': return <VendasRealizadas />;
    case 'faturamento':       return <Faturamento />;
    case 'pedidos-clientes':  return <PedidosClientes />;
    case 'entrada-valores':   return <EntradaValores />;
    case 'saida-valores':     return <SaidaValores />;
    case 'relatorios':        return <Relatorios />;
    // Administrativo
    case 'gestao-atividades': return <GestaoAtividades />;
    case 'gerir-tarefas':     return <GerirTarefas />;
    case 'perfil-colaborador':return <PerfilColaborador />;
    // Planejamento
    case 'projetos':          return <Projetos />;
    case 'metricas-projetos': return <MetricasProjetos />;
    case 'grupos-projetos':   return <GruposProjetos />;
    // Caixa
    case 'caixa':             return <Caixa />;
    // Financeiro — Custos
    case 'arvore-custos':     return <ArvoreCustos />;
    case 'grupos-custo':      return <GruposCusto />;
    case 'impostos-erp':      return <Impostos />;
    case 'analise-margem':    return <AnaliseMargem />;
    case 'funcionarios-fin':  return <Comissoes />;
    // Operações — variações de pedido
    case 'pedido-devolucao':      return <PedidoDevolucao />;
    case 'pedido-demonstracao':   return <PedidoDemonstracao />;
    case 'revenda-produtos':      return <RevendaProdutos />;
    case 'transacao-externa':     return <TransacaoExterna />;
    case 'ordem-servico':         return <OrdemServico />;
    // Financeiro — faturamento e propostas
    case 'propostas':             return <Propostas />;
    case 'planilha-vendas':       return <PlanilhaVendas />;
    case 'planilha-pedidos':      return <PlanilhaPedidos />;
    case 'planilha-fretes':       return <PlanilhaFretes />;
    // Fiscal Logística
    case 'faturamento-cargas':    return <FaturamentoCargas />;
    case 'consulta-cargas':       return <ConsultaCargas />;
    case 'mdfe':                  return <MDFe />;
    // Vendas
    case 'forca-vendas':          return <ForcaVendas />;
    case 'flexivel-vendedores':   return <FlexivelVendedores />;
    case 'agrupamento-orcs':      return <AgrupamentoOrcs />;
    case 'integracao-loja':       return <IntegracaoLoja />;
    case 'pdv':                   return <PDV />;
    // Financeiro extra
    case 'hospedagem-valores':    return <HospedagemValores />;
    // Planejamento extra
    case 'cadeias-projetos':      return <CadeiasProjectos />;
    case 'monitoramento-projetos':return <MonitoramentoProjetos />;
    // Em construção
    default:
      return <EmConstrucao label={EM_CONSTRUCAO_LABELS[activeSection] ?? activeSection} />;
  }
}

function EmConstrucao({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-96">
      <div className="text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Construction className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">{label}</h2>
        <p className="text-slate-500 max-w-sm text-sm">
          Este submodulo está em desenvolvimento e será disponibilizado em breve.
        </p>
      </div>
    </div>
  );
}

export default function ERPModule({ activeSection }: ERPModuleProps) {
  return (
    <SectionErrorBoundary>
      <Suspense fallback={<Loader />}>
        <Section activeSection={activeSection} />
      </Suspense>
    </SectionErrorBoundary>
  );
}

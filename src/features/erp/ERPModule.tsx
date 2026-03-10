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
const Atendimento         = lazy(() => import('./sections/Atendimento'));
const Caso                = lazy(() => import('./sections/Caso'));
const EscutaInteligente   = lazy(() => import('./sections/EscutaInteligente'));
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

// ── Seções em construção ──────────────────────────────────────────────────────
const EM_CONSTRUCAO_LABELS: Record<string, string> = {
  'pedido-devolucao':       'Pedido de Devolução',
  'pedido-demonstracao':    'Pedido de Demonstração',
  'revenda-produtos':       'Revenda de Produtos',
  'transacao-externa':      'Transação Externa',
  'ordem-servico':          'Ordem de Serviço',
  'propostas':              'Propostas',
  'planilha-vendas':        'Planilha Geral — Vendas',
  'planilha-pedidos':       'Planilha Geral — Pedidos',
  'planilha-propostas':     'Planilha Geral — Propostas',
  'planilha-fretes':        'Planilha Geral — Fretes',
  'faturamento-cargas':     'Faturamento de Cargas',
  'consulta-cargas':        'Consulta de Cargas',
  'mdfe':                   'MDF-e',
  'forca-vendas':           'Força de Vendas',
  'flexivel-vendedores':    'Flexível — Vendedores',
  'agrupamento-orcs':       'Agrupamento ORCs Abertos',
  'integracao-loja':        'Integração Loja Virtual',
  'pdv':                    'PDV — Ponto de Venda',
  'hospedagem-valores':     'Hospedagem de Valores',
  'cadeias-projetos':       'Cadeias de Projetos',
  'monitoramento-projetos': 'Monitoramento de Projetos',
};

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
    case 'escuta-inteligente': return <EscutaInteligente />;
    // Financeiro
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

export default function ERPModule({ activeSection, moduleColor: _moduleColor }: ERPModuleProps) {
  return (
    <SectionErrorBoundary>
      <Suspense fallback={<Loader />}>
        <Section activeSection={activeSection} />
      </Suspense>
    </SectionErrorBoundary>
  );
}

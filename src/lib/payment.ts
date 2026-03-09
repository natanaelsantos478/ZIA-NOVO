// ─────────────────────────────────────────────────────────────────────────────
// Payment — Estrutura de integração com maquininhas e meios de pagamento
// Pronto para Stone · Cielo · PagSeguro · Rede · Getnet
// Os dados de transação ficam disponíveis para TODOS os módulos (RH, ERP, etc.)
// ─────────────────────────────────────────────────────────────────────────────

// ── Provedores de maquininha suportados ──────────────────────────────────────

export type PaymentProvider =
  | 'stone'
  | 'cielo'
  | 'pagseguro'
  | 'rede'
  | 'getnet'
  | 'safrapay'
  | 'manual'; // fallback sem integração

export type PaymentMethod =
  | 'dinheiro'
  | 'credito'
  | 'debito'
  | 'pix'
  | 'voucher'
  | 'cheque'
  | 'crediario';

export type TransactionStatus =
  | 'PENDENTE'
  | 'APROVADA'
  | 'NEGADA'
  | 'CANCELADA'
  | 'ESTORNADA'
  | 'PROCESSANDO';

// ── Configuração do provedor ──────────────────────────────────────────────────

export interface PaymentProviderConfig {
  provider: PaymentProvider;
  apiKey?: string;
  merchantId?: string;
  terminalId?: string;
  storeId?: string;
  environment: 'sandbox' | 'production';
  webhookUrl?: string;
}

// ── Request de pagamento (TEF / API) ─────────────────────────────────────────

export interface PaymentRequest {
  amount: number;           // valor em centavos
  method: PaymentMethod;
  installments?: number;    // parcelas (crédito)
  description?: string;
  orderId: string;          // ID do pedido ZIA
  sessionId?: string;       // ID da sessão de caixa
  operatorId?: string;      // código do operador
  customerId?: string;      // ID do cliente (opcional)
  pixKey?: string;          // chave PIX da empresa (recebimento)
}

// ── Resposta de pagamento ─────────────────────────────────────────────────────

export interface PaymentResponse {
  transactionId: string;   // ID gerado pelo provedor
  provider: PaymentProvider;
  status: TransactionStatus;
  amount: number;          // valor aprovado em centavos
  method: PaymentMethod;
  installments?: number;
  authorizationCode?: string;
  nsu?: string;            // número sequencial único
  cardBrand?: string;      // Visa · Master · Elo · etc.
  cardLastFour?: string;
  pixQrCode?: string;      // QR code base64 para PIX
  pixTxid?: string;        // ID da transação PIX
  receiptCustomer?: string; // cupom para o cliente (texto)
  receiptMerchant?: string; // cupom para o estabelecimento
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Registro de transação (salvo no banco, visível por todos os módulos) ──────

export interface PaymentTransaction {
  id: string;
  orderId: string;          // erp_pedido.id ou outro módulo
  sourceModule: string;     // 'erp_caixa' | 'hr' | 'crm' | etc.
  provider: PaymentProvider;
  method: PaymentMethod;
  status: TransactionStatus;
  amountCents: number;
  installments: number;
  authorizationCode?: string;
  nsu?: string;
  cardBrand?: string;
  cardLastFour?: string;
  pixTxid?: string;
  sessionId?: string;
  operatorCode?: string;
  tenantId: string;
  createdAt: string;
}

// ── Sessão de caixa (PDV) ─────────────────────────────────────────────────────

export interface CashSession {
  id: string;
  operatorCode: string;
  operatorName: string;
  branchId: string;
  branchName: string;
  openedAt: string;
  closedAt?: string;
  status: 'ABERTA' | 'FECHADA';
  initialCash: number;      // fundo de troco (em centavos)
  totalSales: number;       // total de vendas (centavos)
  totalCash: number;
  totalCredit: number;
  totalDebit: number;
  totalPix: number;
  totalVoucher: number;
  totalOther: number;
  saleCount: number;
  tenantId: string;
}

// ── Item de venda ─────────────────────────────────────────────────────────────

export interface SaleItem {
  productId: string;
  productCode: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;        // centavos
  discountPct: number;
  totalPrice: number;       // centavos
}

// ── Venda completa ────────────────────────────────────────────────────────────

export interface Sale {
  id: string;
  sessionId: string;
  operatorCode: string;
  customerId?: string;
  items: SaleItem[];
  subtotal: number;         // centavos
  discount: number;
  total: number;
  payments: PaymentSplit[];
  status: 'PENDENTE' | 'FINALIZADA' | 'CANCELADA';
  createdAt: string;
}

export interface PaymentSplit {
  method: PaymentMethod;
  amount: number;           // centavos
  installments?: number;
  change?: number;          // troco (dinheiro)
  transactionId?: string;
}

// ── Serviço de pagamento (TEF stub) ──────────────────────────────────────────
// Quando integração real for configurada, substituir por chamada à API

export class PaymentService {
  private config: PaymentProviderConfig;

  constructor(config: PaymentProviderConfig) {
    this.config = config;
  }

  async processPayment(req: PaymentRequest): Promise<PaymentResponse> {
    // Stub: simula aprovação após 1.5s
    // Substituir pelo SDK real de cada provedor:
    //   Stone: stone-node-sdk
    //   Cielo: cielo-sdk
    //   PagSeguro: pagseguro-sdk
    await new Promise(r => setTimeout(r, 1500));

    const now = new Date().toISOString();

    if (this.config.provider === 'manual') {
      return {
        transactionId: `MANUAL-${Date.now()}`,
        provider: 'manual',
        status: 'APROVADA',
        amount: req.amount,
        method: req.method,
        installments: req.installments ?? 1,
        authorizationCode: `AUTH-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        nsu: String(Date.now()).slice(-6),
        receiptCustomer: this.buildReceipt(req, 'APROVADA'),
        createdAt: now,
        updatedAt: now,
      };
    }

    // TODO: integrar com provedor real via API REST
    // Exemplo Stone:
    //   POST https://api.stone.com.br/v1/transactions
    //   Headers: Authorization: Bearer {apiKey}
    //   Body: { amount, payment_type, capture, ... }

    // Retorno mock para não bloquear o desenvolvimento
    return {
      transactionId: `${this.config.provider.toUpperCase()}-${Date.now()}`,
      provider: this.config.provider,
      status: 'APROVADA',
      amount: req.amount,
      method: req.method,
      installments: req.installments ?? 1,
      authorizationCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      nsu: String(Date.now()).slice(-6),
      cardBrand: req.method === 'credito' || req.method === 'debito' ? 'Visa' : undefined,
      cardLastFour: req.method === 'credito' || req.method === 'debito' ? '1234' : undefined,
      pixQrCode: req.method === 'pix' ? 'data:image/png;base64,MOCK_PIX_QRCODE' : undefined,
      receiptCustomer: this.buildReceipt(req, 'APROVADA'),
      createdAt: now,
      updatedAt: now,
    };
  }

  async cancelTransaction(transactionId: string): Promise<boolean> {
    // TODO: implementar cancelamento via API do provedor
    console.log(`[PaymentService] Cancel: ${transactionId} via ${this.config.provider}`);
    return true;
  }

  async checkTransactionStatus(transactionId: string): Promise<TransactionStatus> {
    // TODO: consultar status via API do provedor
    console.log(`[PaymentService] Status check: ${transactionId}`);
    return 'APROVADA';
  }

  private buildReceipt(req: PaymentRequest, status: TransactionStatus): string {
    const lines = [
      '================================',
      '         ZIA OMNISYSTEM         ',
      '================================',
      `Data: ${new Date().toLocaleString('pt-BR')}`,
      `Pedido: ${req.orderId}`,
      `Valor: R$ ${(req.amount / 100).toFixed(2)}`,
      `Forma: ${req.method.toUpperCase()}`,
      req.installments && req.installments > 1 ? `Parcelas: ${req.installments}x` : '',
      `Status: ${status}`,
      '================================',
    ].filter(Boolean);
    return lines.join('\n');
  }
}

// ── Instância padrão (manual — sem integração real ainda) ────────────────────

export const defaultPaymentService = new PaymentService({
  provider: 'manual',
  environment: 'sandbox',
});

// ── Utilitários ───────────────────────────────────────────────────────────────

export function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function BRLToCents(value: number): number {
  return Math.round(value * 100);
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  dinheiro:   'Dinheiro',
  credito:    'Cartão de Crédito',
  debito:     'Cartão de Débito',
  pix:        'PIX',
  voucher:    'Voucher / Vale',
  cheque:     'Cheque',
  crediario:  'Crediário',
};

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProvider, string> = {
  stone:      'Stone',
  cielo:      'Cielo',
  pagseguro:  'PagSeguro',
  rede:       'Rede',
  getnet:     'Getnet',
  safrapay:   'SafraPay',
  manual:     'Manual (sem maquininha)',
};

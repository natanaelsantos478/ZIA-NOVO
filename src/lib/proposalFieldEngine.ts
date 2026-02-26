import _ from 'lodash';
import { evaluate } from 'mathjs';

const { get } = _;

// ---- TYPES ----

export type FieldOutputType = 'currency' | 'number' | 'percent' | 'text' | 'date';

export type FieldDefinition = {
  id: string;
  label: string;
  type: 'base' | 'calculated' | 'conditional';
  sourceKey?: string; // ex: "client.name", "items[0].price"
  formula?: string; // ex: "{qty} * {price}"
  dependsOn?: string[]; // ids dos campos que a fórmula usa
  outputType: FieldOutputType;
  conditionalConfig?: {
    if: string; // ex: "{discount} > 0"
    then: string; // ex: "{discount_value}"
    else: string; // ex: "0"
  };
};

export type ProposalItem = {
  id: string;
  description: string;
  qty: number;
  price: number;
  discount?: number;
};

export type ProposalData = {
  id: string;
  client: {
    name: string;
    company: string;
    email: string;
    phone: string;
    address?: string;
  };
  company: {
    name: string;
    cnpj: string;
    address: string;
    phone: string;
    email: string;
  };
  items: ProposalItem[];
  discount: number; // % global
  validUntil: string; // ISO date
  paymentConditions: string;
  notes?: string;
  createdAt: string;
};

// ---- HELPER FUNCTIONS ----

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function formatFieldValue(value: number | string | undefined, type: FieldOutputType): string {
  if (value === undefined || value === null) return '';

  switch (type) {
    case 'currency':
      const numCurrency = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(numCurrency)
        ? 'R$ 0,00'
        : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numCurrency);

    case 'percent':
      const numPercent = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(numPercent) ? '0%' : `${numPercent}%`;

    case 'number':
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(num) ? '0' : new Intl.NumberFormat('pt-BR').format(num);

    case 'date':
      try {
        const date = new Date(value as string);
        return isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('pt-BR');
      } catch {
        return String(value);
      }

    case 'text':
    default:
      return String(value);
  }
}

// ---- RESOLUTION FUNCTIONS ----

// Retorna o valor numérico cru (para cálculos) ou o valor string (para base text/date)
export function resolveFieldRaw(
  field: FieldDefinition,
  allFields: FieldDefinition[],
  data: ProposalData,
  resolvedCache: Record<string, number | string> = {}
): number | string {
  // Se já resolvemos, retorna do cache
  if (resolvedCache[field.id] !== undefined) {
    return resolvedCache[field.id];
  }

  try {
    // 1. Campos BASE (vêm direto do objeto data)
    if (field.type === 'base') {
      if (!field.sourceKey) return 0;
      const val = get(data, field.sourceKey);

      // Se for numérico, retorna número. Se for string (data/texto), retorna string.
      if (typeof val === 'number') return val;
      if (!isNaN(parseFloat(val)) && field.outputType !== 'text' && field.outputType !== 'date') return parseFloat(val);
      return val || '';
    }

    // 2. Campos CALCULATED (usam mathjs)
    if (field.type === 'calculated') {
      // Casos especiais agregados (ex: items_subtotal) que não dependem de fórmula simples de campo x campo
      // mas sim de iteração sobre arrays.
      if (field.id === 'items_subtotal') {
        const subtotal = data.items.reduce((acc, item) => acc + (item.qty * item.price), 0);
        resolvedCache[field.id] = subtotal;
        return subtotal;
      }

      if (!field.formula) return 0;

      // Resolver dependências recursivamente
      const scope: Record<string, number> = {};
      if (field.dependsOn) {
        for (const depId of field.dependsOn) {
          const depField = allFields.find(f => f.id === depId);
          if (depField) {
            const rawVal = resolveFieldRaw(depField, allFields, data, resolvedCache);
            scope[depId] = typeof rawVal === 'number' ? rawVal : 0; // Fórmulas matemáticas só aceitam números
          }
        }
      }

      // Substituir placeholders {fieldId} por valores do scope para o mathjs avaliar

      let parsedFormula = field.formula;
      // Substituição simples de string para garantir compatibilidade
      for (const [key, val] of Object.entries(scope)) {
        parsedFormula = parsedFormula.replace(new RegExp(`{${escapeRegExp(key)}}`, 'g'), String(val));
      }

      const result = evaluate(parsedFormula);
      resolvedCache[field.id] = result;
      return result;
    }

    // 3. Campos CONDITIONAL
    if (field.type === 'conditional' && field.conditionalConfig) {
      const { if: condition, then: thenVal, else: elseVal } = field.conditionalConfig;

      // Resolver dependências para o escopo da condição
      const scope: Record<string, number> = {};
      if (field.dependsOn) {
        for (const depId of field.dependsOn) {
          const depField = allFields.find(f => f.id === depId);
          if (depField) {
            const rawVal = resolveFieldRaw(depField, allFields, data, resolvedCache);
            scope[depId] = typeof rawVal === 'number' ? rawVal : 0;
          }
        }
      }

      let parsedCondition = condition;
      for (const [key, val] of Object.entries(scope)) {
        parsedCondition = parsedCondition.replace(new RegExp(`{${escapeRegExp(key)}}`, 'g'), String(val));
      }

      let result;
      try {
        if (evaluate(parsedCondition)) {
           // Avaliar o valor 'then' (pode ser fórmula ou valor fixo)
           let parsedThen = thenVal;
           for (const [key, val] of Object.entries(scope)) {
             parsedThen = parsedThen.replace(new RegExp(`{${escapeRegExp(key)}}`, 'g'), String(val));
           }
           // Tenta avaliar como math, se falhar retorna a string
           try { result = evaluate(parsedThen); } catch { result = parsedThen; }
        } else {
           // Avaliar o valor 'else'
           let parsedElse = elseVal;
           for (const [key, val] of Object.entries(scope)) {
             parsedElse = parsedElse.replace(new RegExp(`{${escapeRegExp(key)}}`, 'g'), String(val));
           }
           try { result = evaluate(parsedElse); } catch { result = parsedElse; }
        }
      } catch (e) {
        console.warn(`Erro ao avaliar condição do campo ${field.id}:`, e);
        result = 0;
      }

      resolvedCache[field.id] = result;
      return result;
    }

    return 0;

  } catch (error) {
    console.warn(`Erro ao resolver campo ${field.id}:`, error);
    return 0;
  }
}

export function resolveField(
  fieldId: string,
  allFields: FieldDefinition[],
  data: ProposalData
): string {
  const field = allFields.find(f => f.id === fieldId);
  if (!field) return '';

  const rawValue = resolveFieldRaw(field, allFields, data);
  return formatFieldValue(rawValue, field.outputType);
}

export function resolveAllFields(
  allFields: FieldDefinition[],
  data: ProposalData
): Record<string, string> {
  const result: Record<string, string> = {};
  const resolvedCache: Record<string, number | string> = {};

  allFields.forEach(field => {
    const rawValue = resolveFieldRaw(field, allFields, data, resolvedCache);
    result[field.id] = formatFieldValue(rawValue, field.outputType);
  });

  return result;
}

export function resolveAllFieldsNumeric(
  allFields: FieldDefinition[],
  data: ProposalData
): Record<string, number> {
  const result: Record<string, number> = {};
  const resolvedCache: Record<string, number | string> = {};

  allFields.forEach(field => {
    const rawValue = resolveFieldRaw(field, allFields, data, resolvedCache);
    result[field.id] = typeof rawValue === 'number' ? rawValue : 0;
  });

  return result;
}

// ---- DEFAULT CONSTANTS ----

export const DEFAULT_BASE_FIELDS: FieldDefinition[] = [
  { id: 'client_name', label: 'Nome do Cliente', type: 'base', sourceKey: 'client.name', outputType: 'text' },
  { id: 'client_company', label: 'Empresa do Cliente', type: 'base', sourceKey: 'client.company', outputType: 'text' },
  { id: 'client_email', label: 'Email do Cliente', type: 'base', sourceKey: 'client.email', outputType: 'text' },
  { id: 'company_name', label: 'Nome da Empresa', type: 'base', sourceKey: 'company.name', outputType: 'text' },
  { id: 'proposal_discount', label: 'Desconto Global', type: 'base', sourceKey: 'discount', outputType: 'percent' },
  { id: 'proposal_validade', label: 'Validade', type: 'base', sourceKey: 'validUntil', outputType: 'date' },
  { id: 'proposal_conditions', label: 'Condições de Pagamento', type: 'base', sourceKey: 'paymentConditions', outputType: 'text' },
  { id: 'proposal_notes', label: 'Observações', type: 'base', sourceKey: 'notes', outputType: 'text' },
];

export const DEFAULT_CALCULATED_FIELDS: FieldDefinition[] = [
  {
    id: 'items_subtotal',
    label: 'Subtotal dos Itens',
    type: 'calculated',
    // formula: custom logic in resolveFieldRaw
    outputType: 'currency'
  },
  {
    id: 'discount_value',
    label: 'Valor do Desconto',
    type: 'calculated',
    formula: "{items_subtotal} * {proposal_discount} / 100",
    dependsOn: ['items_subtotal', 'proposal_discount'],
    outputType: 'currency'
  },
  {
    id: 'total_liquido',
    label: 'Total Líquido',
    type: 'calculated',
    formula: "{items_subtotal} - {discount_value}",
    dependsOn: ['items_subtotal', 'discount_value'],
    outputType: 'currency'
  },
  {
    id: 'tax_value',
    label: 'Impostos (9.25%)',
    type: 'calculated',
    formula: "{total_liquido} * 0.0925",
    dependsOn: ['total_liquido'],
    outputType: 'currency'
  },
  {
    id: 'total_final',
    label: 'Total Final',
    type: 'calculated',
    formula: "{total_liquido} + {tax_value}",
    dependsOn: ['total_liquido', 'tax_value'],
    outputType: 'currency'
  }
];

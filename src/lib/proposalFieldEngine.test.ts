import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { formatFieldValue, resolveFieldRaw } from './proposalFieldEngine.ts';
import type { FieldDefinition, ProposalData } from './proposalFieldEngine.ts';

// Helper to normalize non-breaking spaces for cross-environment consistency
const normalizeSpaces = (str: string) => str.replace(/\u00A0/g, ' ');

describe('formatFieldValue', () => {
  test('should format currency correctly', () => {
    const result = formatFieldValue(1234.56, 'currency');
    assert.strictEqual(normalizeSpaces(result), 'R$ 1.234,56');
  });

  test('should format percent correctly', () => {
    assert.strictEqual(formatFieldValue(15.5, 'percent'), '15.5%');
    assert.strictEqual(formatFieldValue('10', 'percent'), '10%');
  });

  test('should format number correctly', () => {
    assert.strictEqual(formatFieldValue(1234.56, 'number'), '1.234,56');
    assert.strictEqual(formatFieldValue('1000', 'number'), '1.000');
  });

  test('should format date correctly', () => {
    // Note: LocaleDateString output can vary, but we expect pt-BR format DD/MM/YYYY
    const dateStr = '2023-12-25T00:00:00Z';
    const result = formatFieldValue(dateStr, 'date');
    assert.match(result, /^\d{2}\/\d{2}\/\d{4}$/);
  });

  test('should return original value for invalid date', () => {
    assert.strictEqual(formatFieldValue('not-a-date', 'date'), 'not-a-date');
  });

  test('should format text correctly', () => {
    assert.strictEqual(formatFieldValue('Hello', 'text'), 'Hello');
    assert.strictEqual(formatFieldValue(123, 'text'), '123');
  });

  test('should handle undefined and null', () => {
    assert.strictEqual(formatFieldValue(undefined, 'currency'), '');
    assert.strictEqual(formatFieldValue(null as any, 'currency'), '');
  });

  test('should handle NaN for numeric types', () => {
    assert.strictEqual(formatFieldValue('abc', 'currency'), 'R$ 0,00');
    assert.strictEqual(formatFieldValue('abc', 'percent'), '0%');
    assert.strictEqual(formatFieldValue('abc', 'number'), '0');
  });
});

describe('resolveFieldRaw', () => {
  let mockData: ProposalData;

  beforeEach(() => {
    mockData = {
      id: 'prop-1',
      client: {
        name: 'John Doe',
        company: 'ACME Corp',
        email: 'john@acme.com',
        phone: '123456789'
      },
      company: {
        name: 'My Company',
        cnpj: '00.000.000/0001-00',
        address: 'Main St, 123',
        phone: '987654321',
        email: 'contact@mycompany.com'
      },
      items: [
        { id: '1', description: 'Item 1', qty: 2, price: 100 },
        { id: '2', description: 'Item 2', qty: 1, price: 50 },
      ],
      discount: 10,
      validUntil: '2023-12-31',
      paymentConditions: 'Net 30',
      createdAt: '2023-01-01'
    };
  });

  describe('Base Fields', () => {
    test('should resolve simple base field', () => {
      const field: FieldDefinition = {
        id: 'client_name',
        label: 'Client Name',
        type: 'base',
        sourceKey: 'client.name',
        outputType: 'text'
      };
      const result = resolveFieldRaw(field, [], mockData);
      assert.strictEqual(result, 'John Doe');
    });

    test('should resolve numeric base field', () => {
      const field: FieldDefinition = {
        id: 'discount',
        label: 'Discount',
        type: 'base',
        sourceKey: 'discount',
        outputType: 'number'
      };
      const result = resolveFieldRaw(field, [], mockData);
      assert.strictEqual(result, 10);
    });

    test('should return 0 if sourceKey is missing', () => {
      const field: FieldDefinition = {
        id: 'missing',
        label: 'Missing',
        type: 'base',
        outputType: 'text'
      };
      const result = resolveFieldRaw(field, [], mockData);
      assert.strictEqual(result, 0);
    });

    test('should return empty string if data is missing at path', () => {
      const field: FieldDefinition = {
        id: 'missing_path',
        label: 'Missing Path',
        type: 'base',
        sourceKey: 'client.nonexistent',
        outputType: 'text'
      };
      const result = resolveFieldRaw(field, [], mockData);
      assert.strictEqual(result, '');
    });

    test('should handle nested items access', () => {
       const field: FieldDefinition = {
        id: 'item_price',
        label: 'Item Price',
        type: 'base',
        sourceKey: 'items[0].price',
        outputType: 'number'
      };
      const result = resolveFieldRaw(field, [], mockData);
      assert.strictEqual(result, 100);
    });
  });

  describe('Special Case: items_subtotal', () => {
    test('should calculate items_subtotal correctly', () => {
      const field: FieldDefinition = {
        id: 'items_subtotal',
        label: 'Subtotal',
        type: 'calculated',
        outputType: 'currency'
      };
      const result = resolveFieldRaw(field, [], mockData);
      assert.strictEqual(result, 250); // (2 * 100) + (1 * 50)
    });
  });

  describe('Calculated Fields', () => {
    test('should resolve simple calculated field with formula', () => {
      const field: FieldDefinition = {
        id: 'double_discount',
        label: 'Double Discount',
        type: 'calculated',
        formula: '{discount} * 2',
        dependsOn: ['discount'],
        outputType: 'number'
      };
      const discountField: FieldDefinition = {
        id: 'discount',
        label: 'Discount',
        type: 'base',
        sourceKey: 'discount',
        outputType: 'number'
      };

      const result = resolveFieldRaw(field, [field, discountField], mockData);
      assert.strictEqual(result, 20);
    });

    test('should resolve recursive dependencies', () => {
      const allFields: FieldDefinition[] = [
        {
          id: 'total',
          label: 'Total',
          type: 'calculated',
          formula: '{subtotal} + {tax}',
          dependsOn: ['subtotal', 'tax'],
          outputType: 'number'
        },
        {
          id: 'subtotal',
          label: 'Subtotal',
          type: 'base',
          sourceKey: 'discount', // Using discount as a proxy for subtotal for simplicity
          outputType: 'number'
        },
        {
          id: 'tax',
          label: 'Tax',
          type: 'calculated',
          formula: '{subtotal} * 0.1',
          dependsOn: ['subtotal'],
          outputType: 'number'
        }
      ];

      const result = resolveFieldRaw(allFields[0], allFields, mockData);
      // subtotal = 10 (mockData.discount)
      // tax = 10 * 0.1 = 1
      // total = 10 + 1 = 11
      assert.strictEqual(result, 11);
    });

    test('should use resolvedCache', () => {
      const field: FieldDefinition = {
        id: 'cached_field',
        label: 'Cached',
        type: 'base',
        sourceKey: 'discount',
        outputType: 'number'
      };
      const cache = { 'cached_field': 99 };
      const result = resolveFieldRaw(field, [field], mockData, cache);
      assert.strictEqual(result, 99);
    });

    test('should handle missing formula by returning 0', () => {
      const field: FieldDefinition = {
        id: 'no_formula',
        label: 'No Formula',
        type: 'calculated',
        outputType: 'number'
      };
      const result = resolveFieldRaw(field, [field], mockData);
      assert.strictEqual(result, 0);
    });
  });

  describe('Conditional Fields', () => {
    test('should resolve "then" branch if condition is true', () => {
      const field: FieldDefinition = {
        id: 'promo',
        label: 'Promotion',
        type: 'conditional',
        dependsOn: ['discount'],
        conditionalConfig: {
          if: '{discount} > 5',
          then: '100',
          else: '0'
        },
        outputType: 'number'
      };
      const discountField: FieldDefinition = {
        id: 'discount',
        label: 'Discount',
        type: 'base',
        sourceKey: 'discount',
        outputType: 'number'
      };

      const result = resolveFieldRaw(field, [field, discountField], mockData);
      assert.strictEqual(result, 100);
    });

    test('should resolve "else" branch if condition is false', () => {
      const field: FieldDefinition = {
        id: 'promo',
        label: 'Promotion',
        type: 'conditional',
        dependsOn: ['discount'],
        conditionalConfig: {
          if: '{discount} > 15',
          then: '100',
          else: '50'
        },
        outputType: 'number'
      };
      const discountField: FieldDefinition = {
        id: 'discount',
        label: 'Discount',
        type: 'base',
        sourceKey: 'discount',
        outputType: 'number'
      };

      const result = resolveFieldRaw(field, [field, discountField], mockData);
      assert.strictEqual(result, 50);
    });

    test('should evaluate formulas in "then" and "else" branches', () => {
       const field: FieldDefinition = {
        id: 'promo',
        label: 'Promotion',
        type: 'conditional',
        dependsOn: ['discount'],
        conditionalConfig: {
          if: '{discount} > 5',
          then: '{discount} * 10',
          else: '0'
        },
        outputType: 'number'
      };
      const discountField: FieldDefinition = {
        id: 'discount',
        label: 'Discount',
        type: 'base',
        sourceKey: 'discount',
        outputType: 'number'
      };

      const result = resolveFieldRaw(field, [field, discountField], mockData);
      assert.strictEqual(result, 100); // 10 * 10
    });

    test('should return 0 and warn on invalid condition', () => {
       const field: FieldDefinition = {
        id: 'invalid_cond',
        label: 'Invalid',
        type: 'conditional',
        conditionalConfig: {
          if: '!!!invalid syntax!!!',
          then: '1',
          else: '0'
        },
        outputType: 'number'
      };
      const result = resolveFieldRaw(field, [field], mockData);
      assert.strictEqual(result, 0);
    });
  });
});

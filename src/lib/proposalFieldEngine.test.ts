import { test, describe } from 'node:test';
import assert from 'node:assert';
import { resolveAllFields, resolveAllFieldsNumeric, type FieldDefinition, type ProposalData } from './proposalFieldEngine.ts';

const SAMPLE_DATA: ProposalData = {
  id: 'prop_1',
  client: {
    name: 'John Doe',
    company: 'ACME Corp',
    email: 'john@acme.com',
    phone: '123456789'
  },
  company: {
    name: 'My Company',
    cnpj: '00.000.000/0000-00',
    address: 'Street 1',
    phone: '987654321',
    email: 'contact@mycompany.com'
  },
  items: [
    { id: '1', description: 'Item 1', qty: 2, price: 100 },
    { id: '2', description: 'Item 2', qty: 1, price: 50 }
  ],
  discount: 10,
  validUntil: '2025-12-31',
  paymentConditions: 'Net 30',
  createdAt: '2025-01-01'
};

const ADJUSTED_FIELDS: FieldDefinition[] = [
  { id: 'client_name', label: 'Client', type: 'base', sourceKey: 'client.name', outputType: 'text' },
  { id: 'items_subtotal', label: 'Subtotal', type: 'calculated', outputType: 'currency' },
  { id: 'discount_val', label: 'Discount', type: 'calculated', formula: '{items_subtotal} * 0.1', dependsOn: ['items_subtotal'], outputType: 'currency' },
  { id: 'total', label: 'Total', type: 'calculated', formula: '{items_subtotal} - {discount_val}', dependsOn: ['items_subtotal', 'discount_val'], outputType: 'currency' },
  { id: 'is_big', label: 'Big?', type: 'conditional', conditionalConfig: { if: '{total} > 100', then: 'BIG', else: 'SMALL' }, dependsOn: ['total'], outputType: 'text' }
];

describe('resolveAllFields', () => {
  test('should resolve all fields correctly', () => {
    const results = resolveAllFields(ADJUSTED_FIELDS, SAMPLE_DATA);

    // client_name: John Doe
    assert.strictEqual(results['client_name'], 'John Doe');

    // items_subtotal: 2*100 + 1*50 = 250
    assert.ok(results['items_subtotal'].includes('250,00'));

    // discount_val: 250 * 0.1 = 25
    assert.ok(results['discount_val'].includes('25,00'));

    // total: 250 - 25 = 225
    assert.ok(results['total'].includes('225,00'));

    // is_big: 225 > 100 -> BIG
    assert.strictEqual(results['is_big'], 'BIG');
  });

  test('should handle missing sourceKey for base fields', () => {
    const fields: FieldDefinition[] = [
      { id: 'bad_base', label: 'Bad', type: 'base', outputType: 'text' }
    ];
    const results = resolveAllFields(fields, SAMPLE_DATA);
    assert.strictEqual(results['bad_base'], '0');
  });

  test('should handle invalid formulas gracefully', () => {
    const fields: FieldDefinition[] = [
      { id: 'bad_calc', label: 'Bad', type: 'calculated', formula: 'invalid +++ 1', outputType: 'number' }
    ];
    const results = resolveAllFields(fields, SAMPLE_DATA);
    assert.strictEqual(results['bad_calc'], '0');
  });

  test('should resolve recursive dependencies correctly', () => {
    const fields: FieldDefinition[] = [
      { id: 'a', label: 'A', type: 'calculated', formula: '10', outputType: 'number' },
      { id: 'b', label: 'B', type: 'calculated', formula: '{a} * 2', dependsOn: ['a'], outputType: 'number' },
      { id: 'c', label: 'C', type: 'calculated', formula: '{b} + 5', dependsOn: ['b'], outputType: 'number' }
    ];
    const results = resolveAllFields(fields, SAMPLE_DATA);
    assert.strictEqual(results['a'], '10');
    assert.strictEqual(results['b'], '20');
    assert.strictEqual(results['c'], '25');
  });

  test('should format different output types correctly', () => {
    const fields: FieldDefinition[] = [
      { id: 'curr', label: 'Curr', type: 'base', sourceKey: 'discount', outputType: 'currency' },
      { id: 'perc', label: 'Perc', type: 'base', sourceKey: 'discount', outputType: 'percent' },
      { id: 'num', label: 'Num', type: 'base', sourceKey: 'discount', outputType: 'number' },
      { id: 'date', label: 'Date', type: 'base', sourceKey: 'validUntil', outputType: 'date' },
      { id: 'txt', label: 'Txt', type: 'base', sourceKey: 'client.name', outputType: 'text' }
    ];
    const results = resolveAllFields(fields, SAMPLE_DATA);

    assert.ok(results['curr'].includes('10,00'));
    assert.strictEqual(results['perc'], '10%');
    assert.strictEqual(results['num'], '10');
    assert.strictEqual(results['date'], '31/12/2025');
    assert.strictEqual(results['txt'], 'John Doe');
  });
});

describe('resolveAllFieldsNumeric', () => {
  test('should resolve all fields to numeric values', () => {
    const results = resolveAllFieldsNumeric(ADJUSTED_FIELDS, SAMPLE_DATA);

    assert.strictEqual(results['items_subtotal'], 250);
    assert.strictEqual(results['discount_val'], 25);
    assert.strictEqual(results['total'], 225);
    // Non-numeric fields should resolve to 0 in resolveAllFieldsNumeric if they don't return numbers
    assert.strictEqual(results['client_name'], 0);
    assert.strictEqual(results['is_big'], 0);
  });
});

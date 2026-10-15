import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../packages/api-contracts/types/index.ts',
);

const ACTION_OPS = [
  ['Invoices.addPayment', 'InvoiceResponseDto'],
  ['Invoices.postInvoice', 'InvoiceResponseDto'],
  ['Invoices.cancelInvoice', 'InvoiceResponseDto'],
  ['Payments.post', 'PaymentResponseDto'],
  ['Payments.cancel', 'PaymentResponseDto'],
  ['Payments.allocate', 'PaymentResponseDto'],
  ['Payments.removeAllocation', 'PaymentResponseDto'],
];

function operationBlock(source, opId) {
  const marker = `    "${opId}": {`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing operation ${opId}`);
  const next = source.indexOf('\n    "', start + marker.length);
  return source.slice(start, next === -1 ? undefined : next);
}

test('invoice and payment actions document one typed 200 and no injected 201', () => {
  const source = readFileSync(TYPES_PATH, 'utf8');

  for (const [opId, dto] of ACTION_OPS) {
    const block = operationBlock(source, opId);
    assert.match(block, /200:\s*\{/, `${opId} must document 200`);
    assert.match(
      block,
      new RegExp(`"application/json":[\\s\\S]*${dto}`),
      `${opId} must type its payload as ${dto}`,
    );
    assert.doesNotMatch(block, /201:\s*\{/, `${opId} must not document an injected 201`);
    assert.doesNotMatch(
      block,
      /"application\/json":\s*unknown/,
      `${opId} must not leave the success body unknown`,
    );
  }
});

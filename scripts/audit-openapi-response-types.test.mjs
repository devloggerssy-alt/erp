import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditOpenApiResponseTypes } from './audit-openapi-response-types.mjs';

const SOURCE = `
export interface paths {
    "/things": {
        get: operations["Things.findAll"];
    };
    "/things/{id}": {
        get: operations["Things.findOne"];
        delete: operations["Things.delete"];
    };
    "/things/{id}/post": {
        post: operations["Things.post"];
    };
    "/summary": {
        get: operations["Things.summary"];
    };
}

export interface operations {
    "Things.findAll": {
        responses: {
            200: {
                content: {
                    "application/json": components["schemas"]["Thing"];
                };
            };
        };
    };
    "Things.findOne": {
        responses: {
            200: {
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
    "Things.delete": {
        responses: {
            204: {
                content?: never;
            };
        };
    };
    "Things.post": {
        responses: {
            200: {
                content: {
                    "application/json": components["schemas"]["Thing"];
                };
            };
            201: {
                content?: never;
            };
        };
    };
    "Things.summary": {
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
}
`;

test('classifies typed, no-content and untyped 2xx responses', () => {
  const result = auditOpenApiResponseTypes(SOURCE);

  assert.equal(result.total2xx, 6);
  assert.equal(result.typed, 2);
  assert.equal(result.noContent, 2, 'the 204 and the injected empty 201 are excluded');
  assert.equal(result.untyped, 2, 'the unknown body and the lone bodyless 200 are gaps');
});

test('names the operation ID behind each real gap', () => {
  const result = auditOpenApiResponseTypes(SOURCE);

  assert.deepEqual(result.untypedOps, [
    'GET /things/{id} → 200 [Things.findOne]',
    'GET /summary → 200 (never) [Things.summary]',
  ]);
});

test('an empty 201 injected beside a documented 200 is not a gap', () => {
  const result = auditOpenApiResponseTypes(SOURCE);
  assert.ok(!result.untypedOps.some((op) => op.includes('Things.post')));
});

test('a lone bodyless 200 is a gap, not intended no-content', () => {
  const result = auditOpenApiResponseTypes(SOURCE);
  assert.ok(result.untypedOps.some((op) => op.includes('Things.summary')));
});

test('a 204 delete is always intended no-content', () => {
  const result = auditOpenApiResponseTypes(SOURCE);
  assert.ok(!result.untypedOps.some((op) => op.includes('Things.delete')));
});

test('every expense success response is typed in the committed contract', () => {
  const typesPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../packages/api-contracts/types/index.ts',
  );
  const { untypedOps } = auditOpenApiResponseTypes(readFileSync(typesPath, 'utf8'));
  const expenseGaps = untypedOps.filter((op) => op.includes('/expenses'));
  assert.deepEqual(expenseGaps, []);
});

test('a concrete text/event-stream body is a typed response, not a gap', () => {
  const stream = `
export interface paths {
    "/chat": {
        post: operations["Chat.stream"];
    };
}

export interface operations {
    "Chat.stream": {
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/event-stream": string;
                };
            };
        };
    };
}
`;
  const result = auditOpenApiResponseTypes(stream);

  assert.equal(result.typed, 1);
  assert.equal(result.untyped, 0);
});

test('a concrete binary body (file download) is a typed response, not a gap', () => {
  const download = `
export interface paths {
    "/settings/danger/export-database": {
        get: operations["DatabaseBackup.exportDatabase"];
    };
}

export interface operations {
    "DatabaseBackup.exportDatabase": {
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/gzip": string;
                };
            };
        };
    };
}
`;
  const result = auditOpenApiResponseTypes(download);

  assert.equal(result.typed, 1);
  assert.equal(result.untyped, 0);
});

test('the committed contract has no untyped success responses', () => {
  const typesPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../packages/api-contracts/types/index.ts',
  );
  const { untypedOps } = auditOpenApiResponseTypes(readFileSync(typesPath, 'utf8'));
  assert.deepEqual(untypedOps, []);
});

test('report and dashboard success responses are typed in the committed contract', () => {
  const typesPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../packages/api-contracts/types/index.ts',
  );
  const { typedOps, untypedOps } = auditOpenApiResponseTypes(readFileSync(typesPath, 'utf8'));
  const gaps = untypedOps.filter((op) => /\/reports\/|\/dashboard\//.test(op));
  assert.deepEqual(gaps, []);

  // Guard against the endpoints disappearing from the contract entirely: an
  // absent operation is neither typed nor untyped, so the gap check alone
  // would pass vacuously.
  const expected = [
    'Reports.stockBalance',
    'Reports.salesSummary',
    'Reports.purchaseSummary',
    'Reports.customerStatement',
    'Reports.supplierStatement',
    'Reports.profitSummary',
    'Dashboard.summary',
    'Dashboard.chartData',
    'Dashboard.expenseBreakdown',
    'Dashboard.topItems',
  ];
  for (const operationId of expected) {
    assert.ok(
      typedOps.some((op) => op.endsWith(`[${operationId}]`)),
      `${operationId} has no typed success response`,
    );
  }
});

test('AI chat, audit, files and tag-assignment success responses are typed in the generated contract', () => {
  const typesPath = resolve(dirname(fileURLToPath(import.meta.url)), '../packages/api-contracts/types/index.ts');
  const { untypedOps } = auditOpenApiResponseTypes(readFileSync(typesPath, 'utf8'));
  const gaps = untypedOps.filter((op) =>
    /\/ai\/|\/audit-logs|\/files\/|\/tag-assignments/.test(op),
  );
  assert.deepEqual(gaps, []);
});

test('POST /auth/logout success response is typed', () => {
  const typesPath = resolve(dirname(fileURLToPath(import.meta.url)), '../packages/api-contracts/types/index.ts');
  const result = auditOpenApiResponseTypes(readFileSync(typesPath, 'utf8'));
  const gaps = result.untypedOps.filter((op) => op.includes('Auth.logout'));
  assert.deepEqual(gaps, []);
});

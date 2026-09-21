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

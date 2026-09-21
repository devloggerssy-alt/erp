#!/usr/bin/env node
/**
 * OpenAPI response-type audit.
 *
 * Reads the generated contract (`packages/api-contracts/types/index.ts`) and
 * classifies every 2xx response:
 *
 *   - typed      — declares a concrete JSON schema.
 *   - untyped    — declares a JSON body typed as `unknown`, OR declares no body
 *                  at all when the operation has no other success response to
 *                  carry one. These are real gaps and count toward the ratchet.
 *   - no-content — a bodyless response that is intended or redundant:
 *                    • every 204 (deletes are honestly bodyless), and
 *                    • any other bodyless 2xx that sits beside a sibling success
 *                      response which does carry a body — i.e. the empty `201`
 *                      Nest injects next to a documented `200`. D6 removes those
 *                      by fixing the status code, so they are not typing gaps.
 *
 * Only `untyped` responses count toward `.untyped-ratchet`. The failing
 * operation IDs are printed so the gap is actionable.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_TYPES_PATH = resolve(__dirname, '../packages/api-contracts/types/index.ts');
const RATCHET_FILE = resolve(__dirname, '.untyped-ratchet');

const NEVER_RE = /content\??:\s*never/;
const UNKNOWN_RE = /"application\/json":\s*unknown/;
const JSON_CONTENT_RE = /"application\/json"\s*:/;

/** Operation IDs are declared as `    "<id>": {` in the `operations` interface. */
const OPERATION_RE = /^\s{4}"([^"]+)":\s*\{/;
const OP_REF_RE = /\b(get|post|put|patch|delete):\s*operations\["([^"]+)"\]/;
const STATUS_RE = /^(\s+)(\d{3}):\s*\{/;

function indentOf(line) {
  return line.length - line.trimStart().length;
}

/**
 * @param {string} source generated OpenAPI TypeScript
 * @returns {{ total2xx: number, typed: number, noContent: number, untyped: number, untypedOps: string[] }}
 */
export function auditOpenApiResponseTypes(source) {
  const lines = source.split('\n');

  const opMap = new Map();
  let currentPath = '';
  for (const line of lines) {
    const pathMatch = line.match(/^\s{4}"(\/[^"]+)":\s*\{/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      continue;
    }
    const opRef = line.match(OP_REF_RE);
    if (opRef) {
      opMap.set(opRef[2], { method: opRef[1].toUpperCase(), path: currentPath });
    }
    if (line.includes('export interface operations')) break;
  }

  // Pass 1 — collect every 2xx response per operation.
  /** @type {Map<string, Array<{ status: string, block: string }>>} */
  const responsesByOp = new Map();
  let currentOpId = '';

  for (let i = 0; i < lines.length; i++) {
    const opIdMatch = lines[i].match(OPERATION_RE);
    if (opIdMatch && opMap.has(opIdMatch[1])) {
      currentOpId = opIdMatch[1];
      continue;
    }

    const statusMatch = lines[i].match(STATUS_RE);
    if (!statusMatch) continue;

    const status = statusMatch[2];
    const statusNum = Number.parseInt(status, 10);
    if (statusNum < 200 || statusNum >= 300) continue;

    const statusIndent = statusMatch[1].length;
    let block = '';
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j];
      if (line.trim() !== '' && indentOf(line) <= statusIndent) break;
      block += line + '\n';
    }

    if (!responsesByOp.has(currentOpId)) responsesByOp.set(currentOpId, []);
    responsesByOp.get(currentOpId).push({ status, block });
  }

  // Pass 2 — classify. An empty response is only "no-content" when a sibling
  // success response already carries a body (Nest's injected empty 201).
  let total2xx = 0;
  let typed = 0;
  let noContent = 0;
  const untypedOps = [];

  for (const [opId, responses] of responsesByOp) {
    const op = opMap.get(opId) ?? { method: '?', path: '?' };
    const operationHasBody = responses.some(({ block }) => JSON_CONTENT_RE.test(block));

    for (const { status, block } of responses) {
      total2xx++;

      if (UNKNOWN_RE.test(block)) {
        untypedOps.push(`${op.method} ${op.path} → ${status} [${opId}]`);
      } else if (JSON_CONTENT_RE.test(block)) {
        typed++;
      } else if (status === '204' || operationHasBody) {
        // Bodyless 204, or a redundant empty response beside a documented body.
        noContent++;
      } else {
        const bodyless = NEVER_RE.test(block) ? 'never' : 'no-content';
        untypedOps.push(`${op.method} ${op.path} → ${status} (${bodyless}) [${opId}]`);
      }
    }
  }

  return { total2xx, typed, noContent, untyped: untypedOps.length, untypedOps };
}

function readRatchet() {
  try {
    const value = Number.parseInt(readFileSync(RATCHET_FILE, 'utf8').trim(), 10);
    return Number.isNaN(value) ? Infinity : value;
  } catch {
    return Infinity;
  }
}

function main() {
  const typesPath = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_TYPES_PATH;
  const { total2xx, typed, noContent, untyped, untypedOps } = auditOpenApiResponseTypes(
    readFileSync(typesPath, 'utf8'),
  );

  console.log('\n=== OpenAPI Response Type Audit ===');
  console.log(`Total 2xx responses:  ${total2xx}`);
  console.log(`Typed:                ${typed}`);
  console.log(`No-content (excluded): ${noContent}`);
  console.log(`Untyped (real gaps):  ${untyped}`);

  if (untypedOps.length > 0) {
    console.log('\nUntyped operations:');
    for (const op of untypedOps) {
      console.log(`  - ${op}`);
    }
  }

  const ratchetMax = readRatchet();
  if (untyped > ratchetMax) {
    console.error(`\nFAILED: untyped count ${untyped} exceeds ratchet ${ratchetMax}`);
    process.exit(1);
  }

  if (ratchetMax !== Infinity) {
    console.log(`\nRatchet: ${ratchetMax} (current: ${untyped}) — OK`);
  }

  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TYPES_PATH = resolve(__dirname, '../packages/api-contracts/types/index.ts');
const RATCHET_FILE = resolve(__dirname, '.untyped-ratchet');

const src = readFileSync(TYPES_PATH, 'utf8');
const lines = src.split('\n');

const opMap = new Map();
let currentPath = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const pathMatch = line.match(/^\s{4}"(\/[^"]+)":\s*\{/);
  if (pathMatch) { currentPath = pathMatch[1]; continue; }
  const opRef = line.match(/\b(get|post|put|patch|delete):\s*operations\["([^"]+)"\]/);
  if (opRef) {
    opMap.set(opRef[2], { method: opRef[1].toUpperCase(), path: currentPath });
  }
  if (line.match(/^export interface operations/)) break;
}

const contentNeverRegex = /content\?:\s*never/;
const contentUnknownRegex = /"application\/json":\s*unknown/;

let total2xx = 0;
let untypedUnknown = 0;
let untypedNever = 0;
const untypedOps = [];

let currentOpId = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  const opIdMatch = line.match(/^\s{4}"([^"]+)":\s*\{/);
  if (opIdMatch && opMap.has(opIdMatch[1])) {
    currentOpId = opIdMatch[1];
    continue;
  }

  const statusMatch = line.match(/^\s+(\d{3}):\s*\{/);
  if (statusMatch) {
    const status = statusMatch[1];
    const statusNum = parseInt(status, 10);
    if (statusNum >= 200 && statusNum < 300) {
      total2xx++;
      let block = '';
      for (let j = i; j < Math.min(i + 12, lines.length); j++) {
        block += lines[j] + '\n';
      }
      const opInfo = opMap.get(currentOpId) || { method: '?', path: '?' };
      if (contentNeverRegex.test(block)) {
        untypedNever++;
        untypedOps.push(`${opInfo.method} ${opInfo.path} → ${status} (never) [${currentOpId}]`);
      } else if (contentUnknownRegex.test(block)) {
        untypedUnknown++;
        untypedOps.push(`${opInfo.method} ${opInfo.path} → ${status} (unknown) [${currentOpId}]`);
      }
    }
  }
}

const totalUntyped = untypedUnknown + untypedNever;
const typed = total2xx - totalUntyped;

console.log(`\n=== OpenAPI Response Type Audit ===`);
console.log(`Total 2xx responses: ${total2xx}`);
console.log(`Typed:               ${typed}`);
console.log(`Untyped (unknown):   ${untypedUnknown}`);
console.log(`Untyped (never):     ${untypedNever}`);
console.log(`Total untyped:       ${totalUntyped}`);

if (untypedOps.length > 0) {
  console.log(`\nUntyped operations:`);
  for (const op of untypedOps) {
    console.log(`  - ${op}`);
  }
}

let ratchetMax = Infinity;
try {
  const ratchetVal = readFileSync(RATCHET_FILE, 'utf8').trim();
  ratchetMax = parseInt(ratchetVal, 10);
  if (isNaN(ratchetMax)) ratchetMax = Infinity;
} catch {}

if (totalUntyped > ratchetMax) {
  console.error(`\nFAILED: untyped count ${totalUntyped} exceeds ratchet ${ratchetMax}`);
  process.exit(1);
}

if (ratchetMax !== Infinity) {
  console.log(`\nRatchet: ${ratchetMax} (current: ${totalUntyped}) — OK`);
}

process.exit(0);

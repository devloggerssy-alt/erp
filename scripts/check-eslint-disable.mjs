#!/usr/bin/env node
/**
 * Phase 0.3.2 — fail the build on any `eslint-disable` under apps/api/src/modules/**.
 *
 * That tree is at zero today, so this is a hard gate rather than a ratchet: it
 * cannot regress silently. Suppressing a rule there means either the rule is
 * wrong (fix the config) or the code is wrong (fix the code).
 *
 * Scope is deliberately narrow. The 15 pre-existing suppressions elsewhere in
 * the repo are inventoried, not blocked — widening this gate is Phase 2 work.
 *
 * Usage: node scripts/check-eslint-disable.mjs [--report]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const GATED_DIR = 'apps/api/src/modules';
const INVENTORY_DIRS = ['apps', 'packages'];
const PATTERN = /eslint-disable(?:-next-line|-line)?/;
const SKIP = new Set(['node_modules', 'dist', '.next', '.turbo', 'generated', 'coverage']);
const EXTS = ['.ts', '.tsx', '.mts', '.cts'];

function* walk(dir) {
    let entries;
    try {
        entries = readdirSync(dir);
    } catch {
        return;
    }
    for (const entry of entries) {
        if (SKIP.has(entry)) continue;
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) yield* walk(full);
        else if (EXTS.some((ext) => entry.endsWith(ext))) yield full;
    }
}

function findSuppressions(dir) {
    const hits = [];
    for (const file of walk(dir)) {
        const lines = readFileSync(file, 'utf8').split(/\r?\n/);
        lines.forEach((line, i) => {
            if (PATTERN.test(line)) {
                hits.push({ file: relative(process.cwd(), file), line: i + 1, text: line.trim() });
            }
        });
    }
    return hits;
}

const gated = findSuppressions(GATED_DIR);

if (process.argv.includes('--report')) {
    const all = INVENTORY_DIRS.flatMap(findSuppressions);
    console.log(`eslint-disable inventory (repo-wide, informational): ${all.length}`);
    for (const hit of all) console.log(`  ${hit.file}:${hit.line}`);
    console.log('');
}

if (gated.length > 0) {
    console.error(`✖ ${gated.length} eslint-disable found under ${GATED_DIR} — this tree must stay at zero.\n`);
    for (const hit of gated) console.error(`  ${hit.file}:${hit.line}\n    ${hit.text}`);
    console.error('\nFix the code or the rule config rather than suppressing it.');
    console.error('If a suppression is genuinely warranted, raise it in review and update this gate deliberately.');
    process.exit(1);
}

console.log(`✓ no eslint-disable under ${GATED_DIR}`);

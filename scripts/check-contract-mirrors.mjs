#!/usr/bin/env node
/**
 * Contract-mirror guard.
 *
 * One source per shape (.ai/rules/packages.md): the NestJS DTOs/controllers are
 * the runtime source, `packages/api-contracts/types/index.ts` holds the generated
 * component shapes, and the contracts package re-exports them (see
 * `src/dto/generated-schemas.ts`) instead of hand-writing a mirror.
 *
 * This check fails when `packages/api-contracts/src/**` declares a hand-written
 * shape whose name matches a generated component:
 *
 *   - `export interface CreatePartyDto { ... }`            → violation
 *   - `export type CreatePartyDto = { ... }`               → violation
 *   - `export type CreatePartyDto = components["schemas"]["CreatePartyDto"]`
 *                                                          → allowed (re-export)
 *
 * The permitted form is a pure reference to the generated component, so the
 * shape still has exactly one definition. The match is by name: a hand-written
 * declaration and a generated component that share a name. Differently named
 * duplicates (the response envelope, import/bulk result types) are owned by the
 * envelope (D3) and dead-surface (D9) work, not this guard.
 *
 * Usage: node scripts/check-contract-mirrors.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_TYPES_PATH = resolve(__dirname, '../packages/api-contracts/types/index.ts');
const DEFAULT_SRC_DIR = resolve(__dirname, '../packages/api-contracts/src');

/** `    Name: {` (object) or `    Name: "A" | "B"` (enum) inside `components.schemas`. */
const SCHEMA_RE = /^ {8}([A-Za-z0-9_$]+):/;
const SCHEMAS_START_RE = /^ {4}schemas:\s*\{$/;
const SCHEMAS_END_RE = /^ {4}\}/;
const DECL_RE = /^export\s+(interface|type)\s+([A-Za-z0-9_$]+)\s*(=[^\S\n]*)?/gm;
const COMPONENT_REF_RE = /^components\s*\[\s*["']schemas["']\s*\]/;

/**
 * @param {string} typesSource generated `types/index.ts`
 * @returns {Set<string>} generated component names
 */
export function extractGeneratedComponentNames(typesSource) {
    const names = new Set();
    const componentsStart = typesSource.indexOf('export interface components');
    if (componentsStart < 0) return names;

    const lines = typesSource.slice(componentsStart).split('\n');
    const schemasStart = lines.findIndex((line) => SCHEMAS_START_RE.test(line));
    if (schemasStart < 0) return names;

    for (const line of lines.slice(schemasStart + 1)) {
        if (SCHEMAS_END_RE.test(line)) break;
        const match = SCHEMA_RE.exec(line);
        if (match) names.add(match[1]);
    }
    return names;
}

/**
 * @param {string} source file contents
 * @param {Set<string>} componentNames generated component names
 * @returns {Array<{ name: string, line: number, kind: 'interface' | 'type' }>}
 */
export function findMirrors(source, componentNames) {
    const violations = [];
    for (const match of source.matchAll(DECL_RE)) {
        const [full, kind, name, equals] = match;
        if (!componentNames.has(name)) continue;
        if (kind === 'interface') {
            violations.push({ name, line: lineOf(source, match.index), kind });
            continue;
        }
        if (equals === undefined) continue; // `export type { X }` re-export
        const rest = source.slice(match.index + full.length);
        const firstToken = rest.trimStart();
        if (!COMPONENT_REF_RE.test(firstToken)) {
            violations.push({ name, line: lineOf(source, match.index), kind });
        }
    }
    return violations;
}

function lineOf(source, index) {
    return source.slice(0, index).split('\n').length;
}

function listTsFiles(dir) {
    const files = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) files.push(...listTsFiles(full));
        else if (full.endsWith('.ts')) files.push(full);
    }
    return files;
}

function main() {
    const typesPath = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_TYPES_PATH;
    const srcDir = process.argv[3] ? resolve(process.argv[3]) : DEFAULT_SRC_DIR;
    const componentNames = extractGeneratedComponentNames(readFileSync(typesPath, 'utf8'));

    if (componentNames.size === 0) {
        console.error(
            `\nFAILED: no generated components found in ${relative(process.cwd(), typesPath)}.\n` +
                'The generator output shape changed — fix this check rather than disabling it.',
        );
        process.exit(1);
    }

    const violations = [];
    for (const file of listTsFiles(srcDir)) {
        // Test files may declare local helpers, not shipped contract shapes.
        if (/\.(test|spec|type-test)\.ts$/.test(file)) continue;
        for (const mirror of findMirrors(readFileSync(file, 'utf8'), componentNames)) {
            violations.push({ ...mirror, file: relative(process.cwd(), file) });
        }
    }

    console.log(`\n=== Contract mirror audit (${componentNames.size} generated components) ===`);
    if (violations.length === 0) {
        console.log('No hand-written declaration mirrors a generated component.');
        process.exit(0);
    }

    console.error('Hand-written declarations duplicating generated components:');
    for (const v of violations) {
        console.error(`  - ${v.file}:${v.line}  ${v.kind} ${v.name}`);
    }
    console.error(
        '\nRe-export the generated component instead (see packages/api-contracts/src/dto/generated-schemas.ts).',
    );
    process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}

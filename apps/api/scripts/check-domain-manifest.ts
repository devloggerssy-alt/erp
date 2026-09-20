#!/usr/bin/env ts-node
/**
 * Phase 8.1.2 — fail when the capability manifest drifts from the code:
 *
 *   1. every domain directory has a manifest entry and vice versa
 *   2. the production import graph matches `dependsOn` exactly
 *      (edges targeting the shared kernel `identity` are ignored)
 *   3. every declared `routes` prefix matches a `@Controller('...')` in the
 *      domain, and every controller route is declared
 *   4. every name in `provides` is exported by one of the domain's barrels
 *
 * Usage: pnpm --filter @devloggers/api lint:manifest
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import * as ts from 'typescript';
import { DOMAIN_MANIFESTS, SHARED_KERNEL, type DomainKey } from '../src/domain/manifest';

const API_DIR = resolve(__dirname, '..');
const SRC_DIR = join(API_DIR, 'src');
const MODULES_DIR = join(SRC_DIR, 'modules');
const SPEC_FILE = /\.(spec|spec-fixtures)\.ts$/;

let failures = 0;
const fail = (message: string): void => {
    failures += 1;
    console.error(`✗ ${message}`);
};
const pass = (message: string): void => console.log(`✓ ${message}`);

function walk(dir: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === '__tests__') continue;
            files.push(...walk(full));
        } else if (entry.name.endsWith('.ts') && !SPEC_FILE.test(entry.name)) {
            files.push(full);
        }
    }
    return files;
}

const domains = readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();

const manifestsByKey = new Map(DOMAIN_MANIFESTS.map((manifest) => [manifest.key, manifest]));

// ── 1. domain directories ↔ manifest entries ────────────────────────────────
for (const domain of domains) {
    if (!manifestsByKey.has(domain as DomainKey)) {
        fail(`domain '${domain}' has no entry in src/domain/manifest.ts (add one; see the drift script header)`);
    }
}
for (const manifest of DOMAIN_MANIFESTS) {
    if (!domains.includes(manifest.key)) {
        fail(`manifest declares '${manifest.key}' but src/modules/${manifest.key} does not exist`);
    }
}
if (failures === 0) pass('every domain directory has a manifest entry');

// ── 2. import graph ↔ dependsOn ─────────────────────────────────────────────
function domainOfSpecifier(importingFile: string, specifier: string): DomainKey | null {
    let target: string;
    if (specifier.startsWith('@/')) target = join(SRC_DIR, specifier.slice(2));
    else if (specifier.startsWith('.')) target = resolve(dirname(importingFile), specifier);
    else return null;

    const rel = relative(MODULES_DIR, target).replace(/\\/g, '/');
    if (rel.startsWith('..')) return null;
    const first = rel.split('/')[0] ?? '';
    return domains.includes(first) ? (first as DomainKey) : null;
}

const actualEdges = new Set<string>();
const edgeEvidence = new Map<string, string[]>();

for (const domain of domains) {
    for (const file of walk(join(MODULES_DIR, domain))) {
        const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
        for (const statement of source.statements) {
            const specifiers: string[] = [];
            if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
                specifiers.push(statement.moduleSpecifier.text);
            }
            if (
                ts.isExportDeclaration(statement) &&
                statement.moduleSpecifier &&
                ts.isStringLiteral(statement.moduleSpecifier)
            ) {
                specifiers.push(statement.moduleSpecifier.text);
            }

            for (const specifier of specifiers) {
                const target = domainOfSpecifier(file, specifier);
                if (!target || target === domain || target === SHARED_KERNEL) continue;
                const edge = `${domain}->${target}`;
                actualEdges.add(edge);
                edgeEvidence.set(edge, [
                    ...(edgeEvidence.get(edge) ?? []),
                    `${relative(API_DIR, file).replace(/\\/g, '/')} imports '${specifier}'`,
                ]);
            }
        }
    }
}

const declaredEdges = new Set<string>();
for (const manifest of DOMAIN_MANIFESTS) {
    for (const dependency of manifest.dependsOn) declaredEdges.add(`${manifest.key}->${dependency}`);
}

for (const edge of actualEdges) {
    if (!declaredEdges.has(edge)) {
        fail(
            `import graph has undeclared dependency ${edge}\n    ${(edgeEvidence.get(edge) ?? []).join('\n    ')}\n` +
                `    → add '${edge.split('->')[1]}' to dependsOn of '${edge.split('->')[0]}' in src/domain/manifest.ts`,
        );
    }
}
for (const edge of declaredEdges) {
    if (!actualEdges.has(edge)) {
        fail(`manifest declares ${edge} but no production file imports it — remove it or fix the import`);
    }
}
if (actualEdges.size === declaredEdges.size && [...actualEdges].every((edge) => declaredEdges.has(edge))) {
    pass(`import graph matches dependsOn (${actualEdges.size} cross-domain edges)`);
}

// ── 3. controllers ↔ routes ─────────────────────────────────────────────────
const CONTROLLER = /@Controller\(\s*(['"])(.*?)\1\s*\)/g;
const failuresBeforeRoutes = failures;

for (const manifest of DOMAIN_MANIFESTS) {
    const discovered = new Set<string>();
    for (const file of walk(join(MODULES_DIR, manifest.key))) {
        const text = readFileSync(file, 'utf8');
        let match: RegExpExecArray | null;
        while ((match = CONTROLLER.exec(text))) {
            if (match[2]) discovered.add(match[2]);
        }
        CONTROLLER.lastIndex = 0;
    }

    const declared = new Set(manifest.routes);
    for (const route of discovered) {
        if (!declared.has(route)) {
            fail(`'${manifest.key}' has a controller for '${route}' that routes[] does not declare`);
        }
    }
    for (const route of declared) {
        if (!discovered.has(route)) {
            fail(`routes[] of '${manifest.key}' declares '${route}' but no controller matches`);
        }
    }
}
if (failures === failuresBeforeRoutes) pass('controller routes match routes[]');

// ── 4. barrels ↔ provides ───────────────────────────────────────────────────
function localModulePath(fromFile: string, specifier: string): string | null {
    if (!specifier.startsWith('.')) return null;
    const base = resolve(dirname(fromFile), specifier);
    for (const candidate of [base, `${base}.ts`, join(base, 'index.ts')]) {
        try {
            if (statSync(candidate).isFile()) return candidate;
        } catch {
            // keep trying
        }
    }
    return null;
}

const failuresBeforeProvides = failures;

function collectExportNames(file: string, into: Set<string>, visited: Set<string>): void {
    if (visited.has(file)) return;
    visited.add(file);

    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    for (const node of source.statements) {
        if (ts.isExportDeclaration(node)) {
            if (node.exportClause && ts.isNamedExports(node.exportClause)) {
                for (const element of node.exportClause.elements) into.add(element.name.text);
            } else if (!node.exportClause && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
                const target = localModulePath(file, node.moduleSpecifier.text);
                if (target) collectExportNames(target, into, visited);
            }
            continue;
        }

        const exported =
            ts.canHaveModifiers(node) &&
            ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
        if (!exported) continue;

        const named = node as { name?: ts.Identifier };
        if (named.name && ts.isIdentifier(named.name)) into.add(named.name.text);
        if (ts.isVariableStatement(node)) {
            for (const declaration of node.declarationList.declarations) {
                if (ts.isIdentifier(declaration.name)) into.add(declaration.name.text);
            }
        }
    }
}

for (const manifest of DOMAIN_MANIFESTS) {
    if (manifest.provides.length === 0) continue;

    const barrels = walk(join(MODULES_DIR, manifest.key)).filter((file) => file.endsWith('index.ts'));
    if (barrels.length === 0) {
        fail(`'${manifest.key}' provides ${manifest.provides.join(', ')} but has no index.ts barrel`);
        continue;
    }

    const exported = new Set<string>();
    const visited = new Set<string>();
    for (const barrel of barrels) collectExportNames(barrel, exported, visited);

    for (const name of manifest.provides) {
        if (!exported.has(name)) {
            fail(`'${manifest.key}' provides '${name}' but no barrel exports that name`);
        }
    }
}
if (failures === failuresBeforeProvides) pass('barrel exports cover provides[]');

if (failures > 0) {
    console.error(`\n${failures} domain-manifest drift failure(s).`);
    process.exit(1);
}
console.log('\nDomain manifest is in sync with the code.');

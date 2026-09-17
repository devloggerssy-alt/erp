#!/usr/bin/env node
/**
 * Phase 5.2.3 — prove the architecture lint rules actually fire.
 *
 * `lint:ci` only shows that today's code has no violations, and that stays
 * true if a rule quietly stops matching (a glob typo, an ESLint upgrade, a
 * later config object overriding an earlier one). This script lints small
 * probe snippets through the real apps/api ESLint config, using real files as
 * the host path so file-scoped blocks apply, and asserts which ones error.
 *
 * Usage: pnpm --filter @devloggers/api lint:architecture
 */
import { ESLint } from 'eslint';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const API_DIR = resolve(import.meta.dirname, '..');

/**
 * @typedef {{ name: string; file: string; code: string; rule: string; expect: 'error' | 'clean' }} Case
 */

/**
 * @param {string} file
 * @param {string} specifier
 * @param {'error' | 'clean'} expect
 * @returns {Case}
 */
function importCase(file, specifier, expect) {
    return {
        name: `${file} imports '${specifier}'`,
        file,
        code: `import * as probe from '${specifier}';\nexport const used = probe;\n`,
        rule: 'no-restricted-imports',
        expect,
    };
}

const INVOICE_POSTING = 'src/modules/invoicing/invoices/invoice-posting.service.ts';
const ONBOARDING = 'src/modules/identity/onboarding/services/onboarding.service.ts';
const POSTING_FACADE = 'src/modules/accounting/posting/accounting-posting.facade.ts';

/** @type {Case[]} */
const CASES = [
    // ── Phase 1 accounting boundary (must keep behaving exactly as before) ──
    importCase(INVOICE_POSTING, '../../accounting/accounts/services/journal-posting.service', 'error'),
    importCase(INVOICE_POSTING, '../../accounting/accounts/accounts.module', 'error'),
    importCase(INVOICE_POSTING, '../../accounting/posting/posting-policy.registry', 'clean'),
    importCase(INVOICE_POSTING, '../../accounting/posting', 'clean'),
    importCase(INVOICE_POSTING, '../../accounting/accounts/utils/assert-period-open', 'clean'),
    importCase(ONBOARDING, '../../../accounting/fiscal-periods/services/fiscal-periods.service', 'clean'),
    importCase(ONBOARDING, '../../../accounting/financial-settings/financial-settings.module', 'clean'),
    importCase(ONBOARDING, '@/modules/accounting/accounts/services/journal-posting.service', 'error'),
    // A domain may deep-import itself.
    importCase(POSTING_FACADE, '../accounts/services/journal-posting.service', 'clean'),
];

async function main() {
    const eslint = new ESLint({ cwd: API_DIR });
    let failures = 0;

    for (const c of CASES) {
        const filePath = join(API_DIR, c.file);
        if (!existsSync(filePath)) {
            console.error(`✗ ${c.name}\n    probe host file does not exist: ${c.file}`);
            failures++;
            continue;
        }
        const [result] = await eslint.lintText(c.code, { filePath });
        const fatal = result.messages.find((m) => m.fatal);
        if (fatal) {
            console.error(`✗ ${c.name}\n    parse error: ${fatal.message}`);
            failures++;
            continue;
        }
        const fired = result.messages.some((m) => m.ruleId === c.rule && m.severity === 2);
        const ok = c.expect === 'error' ? fired : !fired;
        console.log(`${ok ? '✓' : '✗'} [expect ${c.expect}] ${c.name}`);
        if (!ok) failures++;
    }

    if (failures > 0) {
        console.error(`\n${failures} architecture-rule case(s) failed.`);
        process.exit(1);
    }
    console.log(`\nAll ${CASES.length} architecture-rule cases passed.`);
}

await main();

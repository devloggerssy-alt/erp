#!/usr/bin/env node
/**
 * Prove the custom eslint rules actually fire.
 *
 * `lint:ci` only shows that today's code has no violations, and that stays
 * true if a rule quietly stops matching (a selector typo, an ESLint upgrade).
 * This script lints small probe snippets through the real apps/api ESLint
 * config, using real files as the host path so file-scoped blocks apply, and
 * asserts which ones error.
 *
 * Domain boundaries are not probed here: they are declared in
 * `src/domain/manifest.ts` and proven by `lint:manifest` against the real
 * import graph.
 *
 * Usage: pnpm --filter @devloggers/api lint:rules
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
 * @param {string} call e.g. 'tx.payment.delete'
 * @param {'error' | 'clean'} expect
 * @returns {Case}
 */
function deleteCase(file, call, expect) {
    return {
        name: `${file} calls ${call}(...)`,
        file,
        code: `export async function probe(tx: any): Promise<void> {\n    await ${call}({ where: { id: 'x' } });\n}\n`,
        rule: 'no-restricted-syntax',
        expect,
    };
}

const ITEMS_SERVICE = 'src/modules/catalog/items/services/items.service.ts';
const STOCK_COUNTS_SERVICE = 'src/modules/inventory/stock-counts/stock-counts.service.ts';
const PAYMENTS_SERVICE = 'src/modules/invoicing/payments/payments.service.ts';
const EXPENSES_SERVICE = 'src/modules/invoicing/expenses/expenses.service.ts';
const DATA_RESET_SERVICE = 'src/modules/identity/settings/services/data-reset.service.ts';

/** @type {Case[]} */
const CASES = [
    // ── Phase 5.3.4: financial documents are never hard-deleted outside the allowlist ──
    deleteCase(PAYMENTS_SERVICE, 'tx.payment.delete', 'error'),
    deleteCase(PAYMENTS_SERVICE, 'this.prisma.journalEntry.deleteMany', 'error'),
    deleteCase(STOCK_COUNTS_SERVICE, 'tx.stockMovement.deleteMany', 'error'),
    deleteCase(ITEMS_SERVICE, 'tx.invoice.delete', 'error'),
    deleteCase(PAYMENTS_SERVICE, 'tx.invoiceLine.deleteMany', 'clean'),
    deleteCase(PAYMENTS_SERVICE, 'tx.paymentAllocation.delete', 'clean'),
    // allowlisted: DRAFT-guarded deletes and the phrase-confirmed tenant reset
    deleteCase(EXPENSES_SERVICE, 'this.prisma.expense.delete', 'clean'),
    deleteCase(DATA_RESET_SERVICE, 'tx.journalEntry.deleteMany', 'clean'),
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
        console.error(`\n${failures} eslint-rule case(s) failed.`);
        process.exit(1);
    }
    console.log(`\nAll ${CASES.length} eslint-rule cases passed.`);
}

await main();

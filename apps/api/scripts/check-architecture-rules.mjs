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
import { DOMAINS, DOMAIN_RESTRICTIONS } from '../eslint/domain-boundaries.mjs';

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

const INVOICE_POSTING = 'src/modules/invoicing/invoices/invoice-posting.service.ts';
const ONBOARDING = 'src/modules/identity/onboarding/services/onboarding.service.ts';
const BUSINESS_SETUP_ORCHESTRATOR = 'src/modules/identity/business-setup/services/business-setup-orchestrator.service.ts';
const POSTING_FACADE = 'src/modules/accounting/posting/accounting-posting.facade.ts';
const ITEMS_SERVICE = 'src/modules/catalog/items/services/items.service.ts';
const REPORTS_SERVICE = 'src/modules/reports/reports.service.ts';
const PARTIES_CONTROLLER = 'src/modules/parties/parties.controller.ts';
const STOCK_COUNTS_SERVICE = 'src/modules/inventory/stock-counts/stock-counts.service.ts';
const PAYMENTS_SERVICE = 'src/modules/invoicing/payments/payments.service.ts';
const EXPENSES_SERVICE = 'src/modules/invoicing/expenses/expenses.service.ts';
const DATA_RESET_SERVICE = 'src/modules/identity/settings/services/data-reset.service.ts';

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
    importCase(BUSINESS_SETUP_ORCHESTRATOR, '../../../accounting/currencies', 'clean'),
    importCase(BUSINESS_SETUP_ORCHESTRATOR, '../../../accounting/opening-balances', 'clean'),
    importCase(BUSINESS_SETUP_ORCHESTRATOR, '../../../accounting/reconciliation', 'clean'),
    importCase(BUSINESS_SETUP_ORCHESTRATOR, '../../../invoicing', 'clean'),
    importCase(BUSINESS_SETUP_ORCHESTRATOR, '../../../invoicing/cashboxes/services/cashboxes.service', 'error'),
    importCase(BUSINESS_SETUP_ORCHESTRATOR, '@/modules/accounting/accounts/services/accounts.service', 'error'),
    // A domain may deep-import itself.
    importCase(POSTING_FACADE, '../accounts/services/journal-posting.service', 'clean'),
    // ── Phase 5.2: every domain is reachable only through its public entry point ──
    importCase(INVOICE_POSTING, '../../inventory', 'clean'),
    importCase(INVOICE_POSTING, '../../inventory/inventory.service', 'error'),
    importCase(INVOICE_POSTING, '../../inventory/movements', 'error'),
    importCase(ITEMS_SERVICE, '@/modules/inventory', 'clean'),
    importCase(ITEMS_SERVICE, '@/modules/inventory/movements/stock-movement.writer', 'error'),
    importCase(ITEMS_SERVICE, '@/modules/custom-fields', 'clean'),
    importCase(ITEMS_SERVICE, '@/modules/custom-fields/services/custom-field-values.service', 'error'),
    importCase(REPORTS_SERVICE, '../invoicing', 'clean'),
    importCase(REPORTS_SERVICE, '../invoicing/invoices/presenters/invoice.presenter', 'error'),
    importCase(STOCK_COUNTS_SERVICE, '../../catalog/items/services/items.service', 'error'),
    importCase(STOCK_COUNTS_SERVICE, '../../parties/repositories/parties.repository', 'error'),
    // identity publishes only its auth kernel
    importCase(PARTIES_CONTROLLER, '../identity/auth/guards', 'clean'),
    importCase(PARTIES_CONTROLLER, '../identity/auth/decorators', 'clean'),
    importCase(PARTIES_CONTROLLER, '../identity/auth/auth.module', 'error'),
    importCase(PARTIES_CONTROLLER, '../identity/users/users.service', 'error'),
    // a domain may still deep-import itself
    importCase(STOCK_COUNTS_SERVICE, '../movements/stock-movement.writer', 'clean'),
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

    const unrestricted = DOMAINS.filter((domain) => !(domain in DOMAIN_RESTRICTIONS));
    if (unrestricted.length > 0) {
        console.error(`✗ domains with no entry in eslint/domain-boundaries.mjs DOMAIN_RESTRICTIONS: ${unrestricted.join(', ')}`);
        failures++;
    }

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

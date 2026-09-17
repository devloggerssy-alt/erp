// @ts-check
/**
 * Domain boundaries for apps/api (Phase 1 accounting rule, generalized in Phase 5.2).
 *
 * Every directory directly under src/modules is a domain. DOMAIN_RESTRICTIONS
 * says, per domain, which import paths OTHER domains may not use. A domain may
 * always deep-import itself.
 *
 * Why one config block per *importing* domain: flat config does not merge
 * options for the same rule — a later block setting no-restricted-imports for
 * a file replaces an earlier one. So each importer gets a single block that
 * lists every other domain's restrictions.
 *
 * Pattern semantics are gitignore's (the `ignore` package): a negation cannot
 * re-include a path whose parent directory is still excluded, so to publish a
 * sub-path you must first un-block its parent, then re-block the parent's
 * other children. See the accounting entry.
 *
 * Proven by scripts/check-architecture-rules.mjs (CI: lint:architecture).
 * Documented in .ai/rules/api.md § Domain boundaries.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const MODULES_DIR = join(import.meta.dirname, '..', 'src', 'modules');
const TEST_IGNORES = ['**/*.spec.ts', '**/*.spec-fixtures.ts', '**/__tests__/**'];

/** @type {string[]} */
export const DOMAINS = readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

/** @type {Record<string, { group: string[]; message: string }>} */
export const DOMAIN_RESTRICTIONS = {
    // Phase 1 boundary (F1): GL account-resolution / journal-posting internals
    // (accounting/accounts/services — JournalPostingService, OpeningBalancesService,
    // AccountsService, ...) may only be reached from outside accounting via the
    // accounting/posting barrel (AccountingPostingFacade + PostingIntent types).
    // Exempted as NOT GL-policy, and confirmed still legitimately imported directly
    // as of Phase 1: document-sequences (document numbering, unrelated to which GL
    // account gets hit), financial-settings + fiscal-periods (onboarding writes tenant
    // setup config, doesn't consume it for posting), accounts/utils (assertFiscalPeriodOpen /
    // assertAccountFitsSlot — shared guards, not account resolution). See
    // docs/superpowers/plans/2026-07-26-phase-1-gl-posting-port.md Task 18.
    accounting: {
        group: [
            '**/accounting/*',
            '**/accounting/*/**',
            '!**/accounting/posting',
            '!**/accounting/posting/**',
            '!**/accounting/document-sequences',
            '!**/accounting/document-sequences/**',
            '!**/accounting/financial-settings',
            '!**/accounting/financial-settings/**',
            '!**/accounting/fiscal-periods',
            '!**/accounting/fiscal-periods/**',
            '!**/accounting/accounts',
            '!**/accounting/accounts/**',
            '**/accounting/accounts/accounts.module',
            '**/accounting/accounts/services',
            '**/accounting/accounts/services/**',
            '**/accounting/accounts/repositories',
            '**/accounting/accounts/repositories/**',
            '**/accounting/accounts/presenters',
            '**/accounting/accounts/presenters/**',
            '**/accounting/accounts/controllers',
            '**/accounting/accounts/controllers/**',
            '**/accounting/accounts/dto',
            '**/accounting/accounts/dto/**',
            '**/accounting/accounts/events',
            '**/accounting/accounts/events/**',
        ],
        message:
            'Import GL account-resolution / journal-posting internals only via the ' +
            'accounting/posting barrel (AccountingPostingFacade + PostingIntent types). ' +
            'accounting/accounts/services (JournalPostingService, OpeningBalancesService, ' +
            'AccountsService, ...) is GL-internal as of Phase 1.',
    },
};

/** One flat-config block per importing domain, restricting every other domain. */
export function domainBoundaryConfigs() {
    return DOMAINS.map((importer) => ({
        files: [`src/modules/${importer}/**/*.ts`],
        ignores: TEST_IGNORES,
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: Object.entries(DOMAIN_RESTRICTIONS)
                        .filter(([domain]) => domain !== importer)
                        .map(([, restriction]) => restriction),
                },
            ],
        },
    }));
}

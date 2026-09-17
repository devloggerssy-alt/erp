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
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();

/**
 * The default shape: other domains may import only the domain's barrel
 * (`modules/<domain>`, i.e. its index.ts). Any deeper path is an error.
 * @param {string} domain
 * @param {string} publicApi human description of what the barrel exposes
 */
function barrelOnly(domain, publicApi) {
    return {
        group: [`**/${domain}/*`, `**/${domain}/*/**`],
        message:
            `'${domain}' is a separate domain — import it only via its barrel 'modules/${domain}' ` +
            `(${publicApi}). See .ai/rules/api.md § Domain boundaries.`,
    };
}

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
    // Shared kernel: every controller needs JwtAuthGuard and @CurrentUser.
    // Everything else in identity (users, tenants, settings, onboarding) is internal.
    identity: {
        group: [
            '**/identity/*',
            '**/identity/*/**',
            '!**/identity/auth',
            '!**/identity/auth/**',
            '**/identity/auth/*',
            '**/identity/auth/*/**',
            '!**/identity/auth/guards',
            '!**/identity/auth/guards/**',
            '!**/identity/auth/decorators',
            '!**/identity/auth/decorators/**',
        ],
        message:
            "Outside identity, import only 'identity/auth/guards' and 'identity/auth/decorators'. " +
            'Users, tenants, settings and onboarding are identity internals. See .ai/rules/api.md § Domain boundaries.',
    },
    inventory: barrelOnly('inventory', 'InventoryModule, InventoryService, InventoryMovementFacade + MovementIntent types'),
    invoicing: barrelOnly('invoicing', 'computeInvoicePaidState'),
    'custom-fields': barrelOnly('custom-fields', 'CustomFieldsModule, CustomFieldValuesService, CustomFieldsRepository'),
    catalog: barrelOnly('catalog', 'nothing yet — add an index.ts before depending on catalog'),
    parties: barrelOnly('parties', 'nothing yet — add an index.ts before depending on parties'),
    reports: barrelOnly('reports', 'nothing yet — reports is a leaf'),
    files: barrelOnly('files', 'nothing yet — add an index.ts before depending on files'),
    audit: barrelOnly('audit', 'AuditWriter (record/recordInTx) + SYSTEM_USER_ID'),
    'ai-chat': barrelOnly('ai-chat', 'nothing yet — ai-chat is a leaf'),
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

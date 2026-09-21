/**
 * Phase 8.1 — capability manifest: the single source of truth for domain
 * modularity. Consumed by:
 *
 *   - AppModule composition (`domain-modules.ts`, task 8.2.1)
 *   - `scripts/check-domain-manifest.ts` — CI drift check against the real
 *     import graph, controller routes and barrel exports (8.1.2)
 *   - the disabled-domain guard/filter (8.2.2)
 *
 * A domain is any directory directly under `src/modules/`.
 *
 * `identity` is the shared auth kernel (JwtAuthGuard + @CurrentUser) and is
 * deliberately omitted from every `dependsOn` list: every domain may import
 * it, exactly as `eslint/domain-boundaries.mjs` always allows. The drift
 * script ignores import edges targeting it.
 */

export const SHARED_KERNEL = 'identity' as const;

export type DomainKey =
    | 'accounting'
    | 'ai-chat'
    | 'audit'
    | 'catalog'
    | 'custom-fields'
    | 'files'
    | 'identity'
    | 'inventory'
    | 'invoicing'
    | 'parties'
    | 'reports';

export interface DomainManifest {
    readonly key: DomainKey;
    /**
     * Cross-domain runtime dependencies (import-graph edges, `identity`
     * excluded). Must match the production import graph exactly — the drift
     * script fails CI on any difference in either direction.
     */
    readonly dependsOn: readonly DomainKey[];
    /** Names other domains may rely on; each must be exported by a barrel of this domain. */
    readonly provides: readonly string[];
    /** HTTP route prefixes owned by this domain's controllers (longest-prefix match). */
    readonly routes: readonly string[];
    /** `false` — the domain can never be disabled. A `rationale` is then mandatory (8.1.3). */
    readonly optional: boolean;
    readonly rationale?: string;
}

export const DOMAIN_MANIFESTS: readonly DomainManifest[] = Object.freeze([
    {
        key: 'accounting',
        dependsOn: ['audit'],
        provides: ['AccountingPostingFacade', 'PostingModule'],
        routes: [
            'accounting/chart-of-accounts',
            'accounting/account-balances',
            'accounting/opening-balance-sessions',
            'accounting/journal-entries',
            'accounting/reconciliation',
            'currencies',
            'fiscal-periods',
            'document-sequences',
            'settings/financial',
        ],
        optional: false,
        rationale:
            'Phase 8.1.3: every money-document domain posts to the GL through AccountingPostingFacade; ' +
            'without accounting, invoicing and inventory cannot boot or operate.',
    },
    {
        key: 'ai-chat',
        dependsOn: [],
        provides: [],
        routes: ['ai'],
        optional: true,
    },
    {
        key: 'audit',
        dependsOn: [],
        provides: ['AuditWriter'],
        routes: ['audit-logs'],
        optional: false,
        rationale:
            'AuditModule is @Global and every GL posting writes AuditLog through AuditWriter in the same ' +
            'transaction — disabling audit breaks accounting at DI time.',
    },
    {
        key: 'catalog',
        dependsOn: ['custom-fields', 'inventory'],
        provides: ['UnitsModule', 'UnitsService'],
        routes: [
            'units',
            'brands',
            'tags',
            'tag-assignments',
            'items',
            'item-categories',
            'item-relations',
            'catalog-entities',
            'item-catalog-entities',
        ],
        optional: false,
        rationale:
            'Onboarding (identity, non-optional) bootstraps the standard units of measure through ' +
            'UnitsService — disabling catalog would break every new tenant registration.',
    },
    {
        key: 'custom-fields',
        dependsOn: [],
        provides: ['CustomFieldsModule', 'CustomFieldValuesService', 'CustomFieldsRepository'],
        routes: ['custom-fields'],
        optional: true,
    },
    {
        key: 'files',
        dependsOn: [],
        provides: [],
        routes: ['files'],
        optional: true,
    },
    {
        key: 'identity',
        dependsOn: ['accounting', 'catalog', 'invoicing'],
        provides: ['JwtAuthGuard', 'CurrentUser'],
        routes: ['auth', 'users', 'tenants', 'roles', 'onboarding', 'business-setup', 'settings', 'settings/danger'],
        optional: false,
        rationale:
            'Shared auth kernel: every controller uses JwtAuthGuard/@CurrentUser, and Business Setup ' +
            'orchestrates accounting and invoicing resources.',
    },
    {
        key: 'inventory',
        dependsOn: ['accounting'],
        provides: ['InventoryModule', 'InventoryService', 'InventoryMovementFacade', 'InventoryMovementsModule'],
        routes: ['inventory', 'warehouses', 'stock-ledger', 'stock-counts'],
        optional: false,
        rationale:
            'Invoicing (non-optional) issues/receives stock through InventoryMovementFacade, and catalog ' +
            'depends on InventoryService — disabling inventory would break an enabled domain.',
    },
    {
        key: 'invoicing',
        dependsOn: ['accounting', 'inventory'],
        provides: [
            'computeInvoicePaidState',
            'CashboxesModule',
            'CashboxesService',
            'BankAccountsModule',
            'BankAccountsService',
        ],
        routes: ['invoices', 'payments', 'expenses', 'cashboxes', 'bank-accounts', 'invoice-types'],
        optional: false,
        rationale:
            'Identity Business Setup imports cashboxes/bank-accounts from the invoicing barrel and posts ' +
            'opening balances through invoicing resources.',
    },
    {
        key: 'parties',
        dependsOn: [],
        provides: [],
        routes: ['parties'],
        optional: true,
    },
    {
        key: 'reports',
        dependsOn: ['invoicing'],
        provides: [],
        routes: ['reports', 'dashboard'],
        optional: true,
    },
]);

const MANIFEST_BY_KEY = new Map<DomainKey, DomainManifest>(
    DOMAIN_MANIFESTS.map((manifest) => [manifest.key, manifest]),
);

export function domainKeys(): DomainKey[] {
    return DOMAIN_MANIFESTS.map((manifest) => manifest.key);
}

export function manifestByKey(key: DomainKey): DomainManifest {
    const manifest = MANIFEST_BY_KEY.get(key);
    if (!manifest) {
        throw new Error(`Unknown domain "${key}". Known domains: ${domainKeys().join(', ')}`);
    }
    return manifest;
}

export function parseDisabledDomains(raw: string | undefined): DomainKey[] {
    const parts = (raw ?? '')
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);

    const seen = new Set<DomainKey>();
    for (const part of parts) {
        if (!MANIFEST_BY_KEY.has(part as DomainKey)) {
            throw new Error(`Unknown domain in DISABLED_DOMAINS: "${part}". Known domains: ${domainKeys().join(', ')}`);
        }
        seen.add(part as DomainKey);
    }
    return [...seen];
}

export interface DomainResolution {
    readonly enabled: DomainKey[];
    readonly disabled: DomainKey[];
}

/** Every domain that transitively depends on `root`. */
function dependentsOf(root: DomainKey): Set<DomainKey> {
    const dependents = new Set<DomainKey>();
    let grew = true;
    while (grew) {
        grew = false;
        for (const manifest of DOMAIN_MANIFESTS) {
            if (manifest.key === root || dependents.has(manifest.key)) continue;
            if (manifest.dependsOn.includes(root) || manifest.dependsOn.some((dep) => dependents.has(dep))) {
                dependents.add(manifest.key);
                grew = true;
            }
        }
    }
    return dependents;
}

/**
 * Resolves `DISABLED_DOMAINS` (comma-separated keys) into the enabled/disabled
 * sets, refusing configurations that cannot boot:
 *   - unknown key
 *   - non-optional domain (its rationale explains why)
 *   - a disabled domain that an enabled domain depends on, directly or transitively
 */
export function resolveEnabledDomains(raw: string | undefined): DomainResolution {
    const disabledKeys = parseDisabledDomains(raw);
    const disabledSet = new Set(disabledKeys);

    for (const key of disabledKeys) {
        const manifest = manifestByKey(key);
        if (!manifest.optional) {
            throw new Error(`Domain "${key}" cannot be disabled: ${manifest.rationale ?? 'not optional'}`);
        }
    }

    for (const key of disabledKeys) {
        const dependents = [...dependentsOf(key)].filter((candidate) => !disabledSet.has(candidate)).sort();
        if (dependents.length > 0) {
            throw new Error(
                `Cannot disable domain "${key}": enabled domain(s) depend on it: ${dependents.join(', ')}. ` +
                    `Disable them too or leave "${key}" enabled.`,
            );
        }
    }

    return {
        enabled: domainKeys().filter((key) => !disabledSet.has(key)),
        disabled: disabledKeys,
    };
}

/**
 * Maps a request path to the domain that owns it, using the longest matching
 * declared route (so `settings/financial` belongs to accounting while
 * `settings` belongs to identity).
 */
export function resolveDomainForPath(path: string): DomainKey | null {
    const withoutQuery = path.split('?')[0] ?? '';
    const normalized = withoutQuery.replace(/^\/+|\/+$/g, '');
    if (normalized.length === 0) return null;

    let best: { key: DomainKey; length: number } | null = null;
    for (const manifest of DOMAIN_MANIFESTS) {
        for (const route of manifest.routes) {
            if (normalized === route || normalized.startsWith(`${route}/`)) {
                if (!best || route.length > best.length) best = { key: manifest.key, length: route.length };
            }
        }
    }
    return best?.key ?? null;
}

export function disabledDomainMessage(key: DomainKey): string {
    return `The "${key}" module is disabled in this deployment.`;
}

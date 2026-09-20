# Phase 8 — Modularity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each API domain independently loadable and testable, machine-check the capability manifest against the real import graph, and add an off-by-default dual-write outbox seam for future async GL.

**Architecture:** A single TypeScript capability manifest (`apps/api/src/domain/manifest.ts`) declares `{ key, dependsOn[], provides[], routes[], optional, rationale? }` per domain. It drives AppModule composition, a disabled-domain 404 guard/filter, and a CI drift script that compares the manifest to the TypeScript import graph, controller routes, and barrel exports. The outbox is new infrastructure under `apps/api/src/outbox/` (not a domain): `AccountingPostingFacade` dual-writes a durable outbox event inside the caller's transaction only when `OUTBOX_ENABLED=true`; a poll worker delivers via a topic→handler registry with retry and dead-letter. Default stays sync.

**Tech Stack:** NestJS 11, Prisma 7 (multi-file schema, `packages/db-prisma/src/schema/*.prisma`), Jest 30 + ts-jest (inline config in `apps/api/package.json`), ts-node, pnpm 9 workspaces, Turborepo.

## Global Constraints

- **F3 decision (Phase 8.4.5, user-approved):** keep emitting `EventEmitter2` events; add a real consumer (`CrudEventsListener`, structured debug logging). Do **not** delete emitter plumbing from `packages/backend-core` or the 19 CRUD services.
- **Outbox decision (Phase 8.4.2, user-approved):** dual-write seam. Sync posting stays the only production path; call sites and the facade's public return type (`{ journalEntryId: string }`) do not change. Outbox is **off by default**: `OUTBOX_ENABLED` Joi default `'false'`.
- **Accounting is non-optional (8.1.3)** with the rationale recorded in the manifest. `identity`, `audit`, `inventory`, `invoicing` are also non-optional because they are dependencies of always-enabled domains (rationale strings required).
- **`identity` is the shared auth kernel** (`JwtAuthGuard`, `@CurrentUser`): omitted from every `dependsOn` list; the drift script ignores import edges targeting it.
- **Do not weaken Phase 5 lint:** `apps/api/eslint/domain-boundaries.mjs` stays as-is; every new file under `src/modules/**` must obey it. New cross-domain files (`src/outbox/`, `src/domain/`, `src/common/`) live outside `src/modules`.
- **Never add `eslint-disable` under `apps/api/src/modules`** (`scripts/check-eslint-disable.mjs` gate). Avoid `as any` / `as never` in `apps/api` (dashboard-only lint bans them, but the repo convention applies).
- **New API files use 4-space indentation**, single quotes, trailing semicolons (match neighboring files).
- **After any change to `app.module.ts`, controllers, or DTOs** run `pnpm generate` (root) — it writes `apps/api/openapi.yaml` and `packages/api-contracts/types/index.ts`; commit any diff.
- **Prisma rules:** new model goes in a new `packages/db-prisma/src/schema/<name>.prisma`; tenant-scoped models need `id @default(uuid())`, `tenantId @map("tenant_id")` + `tenant` FK `onDelete: Cascade`, `createdAt`, `updatedAt`, snake_case `@map`/`@@map`; schema changes ship with a migration.
- **Verification commands (blocking, mirror CI):**
  - `pnpm --filter @devloggers/api typecheck`
  - `pnpm --filter @devloggers/api lint:ci`
  - `pnpm --filter @devloggers/api lint:architecture`
  - `pnpm --filter @devloggers/api test`
  - `pnpm turbo run build --filter=@devloggers/api`
- **Commit style:** `feat(scope): description (Phase 8.x)` / `test(scope): ...` / `chore(scope): ...`, matching `git log`.
- **Working tree:** repo root `C:\Users\LOQ\Desktop\workspace\devloggers\erp`. Do not commit `.env*` files.

---

## File Structure

| File | Responsibility |
|---|---|
| `apps/api/src/domain/manifest.ts` (new) | Capability manifest data + pure resolution/validation/path helpers. No Nest imports. |
| `apps/api/src/domain/manifest.spec.ts` (new) | Unit tests for manifest invariants + resolution. |
| `apps/api/src/domain/domain-modules.ts` (new) | `key → Nest module class(es)` map + `enabledModuleImports()`. |
| `apps/api/src/domain/domain-modules.spec.ts` (new) | Registry coverage + disable behavior tests. |
| `apps/api/src/domain/domain-availability.guard.ts` (new) | `APP_GUARD` → 404 clear message for disabled domains. |
| `apps/api/src/domain/disabled-domain.filter.ts` (new) | `APP_FILTER` → rewrite unregistered disabled-domain router 404s. |
| `apps/api/src/app.module.ts` (modify) | Registry-driven imports, global guard/filter/listener, wildcard events. |
| `apps/api/scripts/check-domain-manifest.ts` (new) | CI drift check: imports ↔ `dependsOn`, controllers ↔ `routes`, barrels ↔ `provides`. |
| `apps/api/package.json` (modify) | `lint:manifest` script; `lint:architecture` chains it. |
| `apps/api/src/config/envValidator.ts` (modify) | `OUTBOX_ENABLED` Joi entry. |
| `packages/db-prisma/src/schema/outbox.prisma` (new) | `OutboxStatus` enum + `OutboxEvent` model. |
| `packages/db-prisma/src/schema/tenant.prisma` (modify) | `outboxEvents` back-relation. |
| `apps/api/src/outbox/outbox.types.ts` (new) | Topics, event DTO types, handler contract, constants. |
| `apps/api/src/outbox/outbox.repository.ts` (new) | `enqueue` / `claimPending` / `markDelivered` / `markFailed`. |
| `apps/api/src/outbox/outbox-handler.registry.ts` (new) | topic → handler map. |
| `apps/api/src/outbox/outbox-worker.service.ts` (new) | `@Interval` poll + `drainOnce()` with retry/dead-letter. |
| `apps/api/src/outbox/logging-outbox.handler.ts` (new) | Default handler: structured debug delivery log. |
| `apps/api/src/outbox/outbox.module.ts` (new) | Wires outbox providers; exports `OutboxRepository`. |
| `apps/api/src/modules/accounting/posting/accounting-posting.facade.ts` (modify) | Extract `execute*` internals + conditional dual-write `publish()`. |
| `apps/api/src/modules/accounting/posting/posting.module.ts` (modify) | Import `OutboxModule`. |
| `apps/api/src/common/events/crud-events.listener.ts` (new) | F3 consumer: wildcard `@OnEvent` debug logging. |
| `apps/api/src/common/testing/module-isolation.ts` (new) | Shared isolation harness (globals + fake Prisma). |
| `apps/api/src/modules/accounting/posting/__tests__/posting-module.isolation.spec.ts` (new) | 8.3.1 |
| `apps/api/src/modules/inventory/movements/__tests__/movements-module.isolation.spec.ts` (new) | 8.3.2 |
| `apps/api/src/domain/domain-modules.isolation.spec.ts` (new) | Every domain boots without AppModule. |
| `.ai/rules/api.md` (modify) | Document machine-checked graph, `DISABLED_DOMAINS`, outbox, F3 consumer. |
| `docs/superpowers/specs/2026-08-20-erp-roadmap/phase-08-modularity.md` (modify) | Status + checkboxes. |
| `docs/superpowers/specs/2026-08-20-erp-roadmap/README.md` (modify) | Phase table status. |
| `docs/superpowers/specs/2026-08-20-erp-roadmap/00-open-issues.md` (modify) | Mark modularity/F3 rows resolved. |

**Reference data for the manifest (computed from the real import graph on 2026-09-20, excluding `identity` edges):**

```
accounting   -> audit
identity     -> accounting, invoicing
inventory    -> accounting
invoicing    -> accounting, inventory
catalog      -> custom-fields, inventory
reports      -> invoicing
ai-chat, audit, custom-fields, files, parties -> (none)
```

**Controller routes (all 47 controllers):** `accounting/*` (chart-of-accounts, account-balances, opening-balances, opening-balance-sessions, journal-entries, reconciliation), `currencies`, `fiscal-periods`, `document-sequences`, `settings/financial`; `identity`: auth, users, tenants, roles, onboarding, business-setup, settings, settings/danger; `inventory`: inventory, warehouses, stock-ledger, stock-counts; `invoicing`: invoices, payments, expenses, cashboxes, bank-accounts, invoice-types; `catalog`: units, brands, tags, tag-assignments, items, item-categories, item-relations, catalog-entities, item-catalog-entities; `custom-fields`; `files`; `reports` + `dashboard`; `parties`; `audit` (audit-logs); `ai-chat` (ai).

---

### Task 1: Capability manifest + resolution helpers (8.1.1, 8.1.3)

**Files:**
- Create: `apps/api/src/domain/manifest.ts`
- Test: `apps/api/src/domain/manifest.spec.ts`

**Interfaces:**
- Consumes: nothing (pure TypeScript).
- Produces: `DomainKey`, `SHARED_KERNEL = 'identity'`, `DomainManifest`, `DOMAIN_MANIFESTS: readonly DomainManifest[]`, `domainKeys(): DomainKey[]`, `manifestByKey(key: DomainKey): DomainManifest`, `parseDisabledDomains(raw: string | undefined): DomainKey[]`, `resolveEnabledDomains(raw: string | undefined): DomainResolution`, `resolveDomainForPath(path: string): DomainKey | null`, `disabledDomainMessage(key: DomainKey): string`, `interface DomainResolution { enabled: DomainKey[]; disabled: DomainKey[] }`.

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/domain/manifest.spec.ts`:

```typescript
import {
    DOMAIN_MANIFESTS,
    SHARED_KERNEL,
    disabledDomainMessage,
    manifestByKey,
    resolveDomainForPath,
    resolveEnabledDomains,
    type DomainKey,
} from './manifest';

describe('domain manifest', () => {
    it('declares every key exactly once with valid dependencies', () => {
        const keys = DOMAIN_MANIFESTS.map((manifest) => manifest.key);
        expect(new Set(keys).size).toBe(keys.length);

        for (const manifest of DOMAIN_MANIFESTS) {
            expect(manifest.dependsOn).not.toContain(manifest.key);
            expect(manifest.dependsOn).not.toContain(SHARED_KERNEL);
            for (const dependency of manifest.dependsOn) {
                expect(() => manifestByKey(dependency)).not.toThrow();
            }
        }
    });

    it('requires a documented rationale for every non-optional domain (8.1.3)', () => {
        for (const manifest of DOMAIN_MANIFESTS.filter((candidate) => !candidate.optional)) {
            expect((manifest.rationale ?? '').trim().length).toBeGreaterThan(0);
        }
        expect(manifestByKey('accounting').optional).toBe(false);
        expect(manifestByKey('accounting').rationale).toContain('Phase 8.1.3');
    });

    it('has no dependency cycle outside the shared kernel', () => {
        const visiting = new Set<string>();
        const visited = new Set<string>();

        const visit = (key: DomainKey): void => {
            if (visited.has(key)) return;
            expect(visiting.has(key)).toBe(false);
            visiting.add(key);
            for (const dependency of manifestByKey(key).dependsOn) visit(dependency);
            visiting.delete(key);
            visited.add(key);
        };

        for (const manifest of DOMAIN_MANIFESTS) visit(manifest.key);
    });
});

describe('resolveEnabledDomains', () => {
    it('enables everything by default', () => {
        const { enabled, disabled } = resolveEnabledDomains(undefined);
        expect(disabled).toEqual([]);
        expect(enabled).toEqual(DOMAIN_MANIFESTS.map((manifest) => manifest.key));
    });

    it('disables optional leaf domains', () => {
        expect(resolveEnabledDomains('files, ai-chat').disabled).toEqual(['files', 'ai-chat']);
    });

    it('rejects unknown domains with a clear error', () => {
        expect(() => resolveEnabledDomains('bogus')).toThrow('Unknown domain in DISABLED_DOMAINS: "bogus"');
    });

    it('refuses to disable a non-optional domain', () => {
        expect(() => resolveEnabledDomains('accounting')).toThrow(/cannot be disabled.*Phase 8.1.3/s);
    });

    it('refuses to disable a domain an enabled domain depends on', () => {
        expect(() => resolveEnabledDomains('custom-fields')).toThrow(/enabled domain\(s\) depend on it: catalog/);
    });

    it('allows disabling a dependency together with its dependent', () => {
        expect(resolveEnabledDomains('custom-fields,catalog').disabled).toEqual(['custom-fields', 'catalog']);
    });
});

describe('resolveDomainForPath', () => {
    it('matches exact and nested routes', () => {
        expect(resolveDomainForPath('/files')).toBe('files');
        expect(resolveDomainForPath('/files/42/download')).toBe('files');
    });

    it('prefers the longest route when prefixes overlap', () => {
        expect(resolveDomainForPath('/settings/financial')).toBe('accounting');
        expect(resolveDomainForPath('/settings/danger')).toBe('identity');
        expect(resolveDomainForPath('/settings')).toBe('identity');
    });

    it('returns null for infrastructure and unknown paths', () => {
        expect(resolveDomainForPath('/docs')).toBeNull();
        expect(resolveDomainForPath('/')).toBeNull();
    });
});

describe('disabledDomainMessage', () => {
    it('names the domain', () => {
        expect(disabledDomainMessage('files')).toBe('The "files" module is disabled in this deployment.');
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @devloggers/api test -- manifest`

Expected: FAIL — `Cannot find module './manifest'`.

- [ ] **Step 3: Implement the manifest**

Create `apps/api/src/domain/manifest.ts`:

```typescript
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
            'accounting/opening-balances',
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
        provides: [],
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
        optional: true,
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
        dependsOn: ['accounting', 'invoicing'],
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @devloggers/api test -- manifest`

Expected: PASS — 11 tests (manifest suite + resolvers).

- [ ] **Step 5: Typecheck and commit**

```bash
pnpm --filter @devloggers/api typecheck
git add apps/api/src/domain/manifest.ts apps/api/src/domain/manifest.spec.ts
git commit -m "feat(domain): add capability manifest with dependsOn/provides/routes (Phase 8.1)"
```

---

### Task 2: Registry-driven AppModule composition (8.2.1)

**Files:**
- Create: `apps/api/src/domain/domain-modules.ts`
- Test: `apps/api/src/domain/domain-modules.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `resolveEnabledDomains`, `DomainKey` from `./manifest` (Task 1).
- Produces: `DOMAIN_MODULES: Record<DomainKey, Type<unknown>[]>`, `enabledModuleImports(rawDisabled: string | undefined): Type<unknown>[]`.

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/domain/domain-modules.spec.ts`:

```typescript
import { FilesModule } from '../modules/files/files.module';
import { DOMAIN_MODULES, enabledModuleImports } from './domain-modules';
import { DOMAIN_MANIFESTS } from './manifest';

describe('domain module registry', () => {
    it('has module entries for every manifest key', () => {
        expect(Object.keys(DOMAIN_MODULES).sort()).toEqual(DOMAIN_MANIFESTS.map((manifest) => manifest.key).sort());
        for (const modules of Object.values(DOMAIN_MODULES)) expect(modules.length).toBeGreaterThan(0);
    });

    it('imports every domain by default', () => {
        expect(enabledModuleImports(undefined)).toContain(FilesModule);
    });

    it('omits disabled domains', () => {
        expect(enabledModuleImports('files')).not.toContain(FilesModule);
    });

    it('propagates registry validation errors', () => {
        expect(() => enabledModuleImports('accounting')).toThrow(/cannot be disabled/);
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @devloggers/api test -- domain-modules`

Expected: FAIL — `Cannot find module './domain-modules'`.

- [ ] **Step 3: Implement the registry**

Create `apps/api/src/domain/domain-modules.ts`:

```typescript
import type { Type } from '@nestjs/common';
import { AccountingModule } from '../modules/accounting/accounting.module';
import { AiChatModule } from '../modules/ai-chat/ai-chat.module';
import { AuditModule } from '../modules/audit/audit.module';
import { CatalogModule } from '../modules/catalog/catalog.module';
import { CustomFieldsModule } from '../modules/custom-fields/custom-fields.module';
import { FilesModule } from '../modules/files/files.module';
import { AuthModule } from '../modules/identity/auth/auth.module';
import { BusinessSetupModule } from '../modules/identity/business-setup/business-setup.module';
import { OnboardingModule } from '../modules/identity/onboarding/onboarding.module';
import { SettingsModule } from '../modules/identity/settings/settings.module';
import { TenantsModule } from '../modules/identity/tenants/tenants.module';
import { UsersModule } from '../modules/identity/users/users.module';
import { InventoryModule } from '../modules/inventory/inventory.module';
import { StockCountsModule } from '../modules/inventory/stock-counts/stock-counts.module';
import { StockLedgerModule } from '../modules/inventory/stock-ledger/stock-ledger.module';
import { InvoicingModule } from '../modules/invoicing/invoicing.module';
import { PartiesModule } from '../modules/parties/parties.module';
import { ReportsModule } from '../modules/reports/reports.module';
import { resolveEnabledDomains, type DomainKey } from './manifest';

/**
 * Phase 8.2.1 — the Nest modules that compose each domain. `enabledModuleImports`
 * turns the manifest + `DISABLED_DOMAINS` into the AppModule imports list.
 */
export const DOMAIN_MODULES: Record<DomainKey, Type<unknown>[]> = {
    accounting: [AccountingModule],
    'ai-chat': [AiChatModule],
    audit: [AuditModule],
    catalog: [CatalogModule],
    'custom-fields': [CustomFieldsModule],
    files: [FilesModule],
    identity: [AuthModule, TenantsModule, SettingsModule, UsersModule, OnboardingModule, BusinessSetupModule],
    inventory: [InventoryModule, StockLedgerModule, StockCountsModule],
    invoicing: [InvoicingModule],
    parties: [PartiesModule],
    reports: [ReportsModule],
};

export function enabledModuleImports(rawDisabled: string | undefined): Type<unknown>[] {
    return resolveEnabledDomains(rawDisabled).enabled.flatMap((key) => DOMAIN_MODULES[key]);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @devloggers/api test -- domain-modules`

Expected: PASS.

- [ ] **Step 5: Rewrite `app.module.ts` imports to use the registry**

Replace the whole file `apps/api/src/app.module.ts` with:

```typescript
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { I18nModule } from '@devloggers/i18n/nest';
import { APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@devloggers/db-prisma/nest';
import { enabledModuleImports } from './domain/domain-modules';
import configuration from './config/configuration';
import { envValidationSchema } from './config/envValidator';

@Module({
  imports: [
    // MUST stay first: ConfigModule.forRoot loads .env.<NODE_ENV> and assigns
    // the values to process.env synchronously, before the domain registry
    // below reads DISABLED_DOMAINS.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      validationSchema: envValidationSchema,
      load: [configuration],
    }),
    EventEmitterModule.forRoot({ wildcard: false, delimiter: '.', global: true }),
    ScheduleModule.forRoot(),
    I18nModule,
    PrismaModule,
    // Phase 8.2.1 — domain composition comes from the capability registry.
    // DISABLED_DOMAINS is validated in src/domain/manifest.ts.
    ...enabledModuleImports(process.env.DISABLED_DOMAINS),
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    },
  ],
})
export class AppModule { }
```

Note: the direct imports of `CatalogModule`, `AccountingModule`, `InventoryModule`, `InvoicingModule`, `PartiesModule`, `StockLedgerModule`, `InvoicesModule`, `PaymentsModule`, `StockCountsModule`, `ReportsModule`, `AiChatModule`, `AuditModule`, `CustomFieldsModule`, `FilesModule`, `AuthModule`, `TenantsModule`, `SettingsModule`, `UsersModule`, `OnboardingModule`, `BusinessSetupModule` are all removed — `InvoicingModule` already contains invoices/payments/expenses, and the inventory registry lists `InventoryModule`, `StockLedgerModule`, `StockCountsModule`.

- [ ] **Step 6: Regenerate the OpenAPI contract**

Run: `pnpm generate`

Expected: exits 0, writes `apps/api/openapi.yaml` and `packages/api-contracts/types/index.ts`. If `git diff` shows reordered paths/responses, that is the composition-order change — commit the regenerated artifacts.

- [ ] **Step 7: Verify**

```bash
pnpm --filter @devloggers/api typecheck
pnpm --filter @devloggers/api test -- domain-modules
pnpm turbo run build --filter=@devloggers/api
git add apps/api/src/domain/domain-modules.ts apps/api/src/domain/domain-modules.spec.ts apps/api/src/app.module.ts apps/api/openapi.yaml packages/api-contracts/types/index.ts
git commit -m "feat(domain): compose AppModule from the capability registry (Phase 8.2.1)"
```

---

### Task 3: Disabled domain → 404 with clear message (8.2.2)

**Files:**
- Create: `apps/api/src/domain/domain-availability.guard.ts`
- Create: `apps/api/src/domain/disabled-domain.filter.ts`
- Test: `apps/api/src/domain/domain-availability.guard.spec.ts`
- Test: `apps/api/src/domain/disabled-domain.filter.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `resolveEnabledDomains`, `resolveDomainForPath`, `disabledDomainMessage` (Task 1).
- Produces: `DomainAvailabilityGuard` (Nest `CanActivate`), `DisabledDomainFilter` (Nest `ExceptionFilter`), both registered globally by token in AppModule.

- [ ] **Step 1: Write the failing guard tests**

Create `apps/api/src/domain/domain-availability.guard.spec.ts`:

```typescript
import { NotFoundException, type ExecutionContext } from '@nestjs/common';
import { DomainAvailabilityGuard } from './domain-availability.guard';

function contextFor(path: string): ExecutionContext {
    return {
        switchToHttp: () => ({ getRequest: () => ({ path }) }),
    } as unknown as ExecutionContext;
}

describe('DomainAvailabilityGuard', () => {
    const original = process.env.DISABLED_DOMAINS;

    afterEach(() => {
        if (original === undefined) delete process.env.DISABLED_DOMAINS;
        else process.env.DISABLED_DOMAINS = original;
    });

    it('lets everything through when nothing is disabled', () => {
        delete process.env.DISABLED_DOMAINS;
        expect(new DomainAvailabilityGuard().canActivate(contextFor('/files/1'))).toBe(true);
    });

    it('404s a disabled domain with a clear message', () => {
        process.env.DISABLED_DOMAINS = 'files';
        const guard = new DomainAvailabilityGuard();
        expect(() => guard.canActivate(contextFor('/files/1'))).toThrow(NotFoundException);
        expect(() => guard.canActivate(contextFor('/files/1'))).toThrow(
            'The "files" module is disabled in this deployment.',
        );
    });

    it('does not touch enabled domains or untracked paths', () => {
        process.env.DISABLED_DOMAINS = 'files';
        const guard = new DomainAvailabilityGuard();
        expect(guard.canActivate(contextFor('/units'))).toBe(true);
        expect(guard.canActivate(contextFor('/docs'))).toBe(true);
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @devloggers/api test -- domain-availability`

Expected: FAIL — `Cannot find module './domain-availability.guard'`.

- [ ] **Step 3: Implement the guard**

Create `apps/api/src/domain/domain-availability.guard.ts`:

```typescript
import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { disabledDomainMessage, resolveDomainForPath, resolveEnabledDomains } from './manifest';

/**
 * Phase 8.2.2 — a domain listed in DISABLED_DOMAINS answers 404 with a clear
 * message instead of a DI/500 failure. Registered as APP_GUARD so it runs
 * before controller guards (JwtAuthGuard) and before any handler; this covers
 * domains that are still reachable transitively through an enabled module.
 */
@Injectable()
export class DomainAvailabilityGuard implements CanActivate {
    private readonly disabled: ReadonlySet<string>;

    constructor() {
        this.disabled = new Set(resolveEnabledDomains(process.env.DISABLED_DOMAINS).disabled);
    }

    canActivate(context: ExecutionContext): boolean {
        if (this.disabled.size === 0) return true;

        const request = context.switchToHttp().getRequest<Request>();
        const key = resolveDomainForPath(request.path);
        if (key && this.disabled.has(key)) {
            throw new NotFoundException(disabledDomainMessage(key));
        }
        return true;
    }
}
```

- [ ] **Step 4: Run to verify the guard passes**

Run: `pnpm --filter @devloggers/api test -- domain-availability`

Expected: PASS.

- [ ] **Step 5: Write the failing filter tests**

Create `apps/api/src/domain/disabled-domain.filter.spec.ts`:

```typescript
import { NotFoundException, type ArgumentsHost } from '@nestjs/common';
import { DisabledDomainFilter } from './disabled-domain.filter';

function hostFor(path: string): { host: ArgumentsHost; json: jest.Mock; status: jest.Mock } {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
        switchToHttp: () => ({ getResponse: () => ({ status }), getRequest: () => ({ path }) }),
    } as unknown as ArgumentsHost;
    return { host, json, status };
}

describe('DisabledDomainFilter', () => {
    const original = process.env.DISABLED_DOMAINS;

    afterEach(() => {
        if (original === undefined) delete process.env.DISABLED_DOMAINS;
        else process.env.DISABLED_DOMAINS = original;
    });

    it('rewrites router 404s for disabled domains', () => {
        process.env.DISABLED_DOMAINS = 'files';
        const { host, json, status } = hostFor('/files/1');
        new DisabledDomainFilter().catch(new NotFoundException('Cannot GET /files/1'), host);

        expect(status).toHaveBeenCalledWith(404);
        expect(json).toHaveBeenCalledWith({
            statusCode: 404,
            message: 'The "files" module is disabled in this deployment.',
            error: 'Not Found',
        });
    });

    it('keeps the default payload for all other 404s', () => {
        delete process.env.DISABLED_DOMAINS;
        const { host, json } = hostFor('/units/missing');
        new DisabledDomainFilter().catch(new NotFoundException('Unit not found'), host);
        expect(json).toHaveBeenCalledWith({ statusCode: 404, message: 'Unit not found', error: 'Not Found' });
    });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `pnpm --filter @devloggers/api test -- disabled-domain`

Expected: FAIL — `Cannot find module './disabled-domain.filter'`.

- [ ] **Step 7: Implement the filter**

Create `apps/api/src/domain/disabled-domain.filter.ts`:

```typescript
import { ArgumentsHost, Catch, ExceptionFilter, NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { disabledDomainMessage, resolveDomainForPath, resolveEnabledDomains } from './manifest';

/**
 * Phase 8.2.2 — when a disabled domain is not registered at all, the router
 * answers "Cannot GET ..." before any guard runs. Rewrite that router-level
 * 404 into the same clear message; every other 404 keeps its default payload.
 */
@Catch(NotFoundException)
export class DisabledDomainFilter implements ExceptionFilter {
    private readonly disabled: ReadonlySet<string>;

    constructor() {
        this.disabled = new Set(resolveEnabledDomains(process.env.DISABLED_DOMAINS).disabled);
    }

    catch(exception: NotFoundException, host: ArgumentsHost): void {
        const http = host.switchToHttp();
        const response = http.getResponse<Response>();
        const request = http.getRequest<Request>();
        const key = resolveDomainForPath(request.path);
        const payload =
            key && this.disabled.has(key)
                ? { statusCode: exception.getStatus(), message: disabledDomainMessage(key), error: 'Not Found' }
                : exception.getResponse();
        response.status(exception.getStatus()).json(payload);
    }
}
```

- [ ] **Step 8: Register both as global providers in AppModule**

Edit `apps/api/src/app.module.ts`:

1. Change the core import to: `import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';`
2. Add below the registry import:
   ```typescript
   import { DomainAvailabilityGuard } from './domain/domain-availability.guard';
   import { DisabledDomainFilter } from './domain/disabled-domain.filter';
   ```
3. Extend `providers` to:
   ```typescript
   providers: [
     {
       provide: APP_PIPE,
       useValue: new ValidationPipe({
         whitelist: true,
         forbidNonWhitelisted: true,
         transform: true,
         transformOptions: { enableImplicitConversion: true },
       }),
     },
     { provide: APP_GUARD, useClass: DomainAvailabilityGuard },
     { provide: APP_FILTER, useClass: DisabledDomainFilter },
   ],
   ```

- [ ] **Step 9: Verify and commit**

```bash
pnpm --filter @devloggers/api test -- domain-availability
pnpm --filter @devloggers/api test -- disabled-domain
pnpm --filter @devloggers/api typecheck
git add apps/api/src/domain/domain-availability.guard.ts apps/api/src/domain/domain-availability.guard.spec.ts apps/api/src/domain/disabled-domain.filter.ts apps/api/src/domain/disabled-domain.filter.spec.ts apps/api/src/app.module.ts
git commit -m "feat(domain): 404 with clear message for disabled domains (Phase 8.2.2)"
```

---

### Task 4: Manifest drift script + CI gate (8.1.2, done-criterion)

**Files:**
- Create: `apps/api/scripts/check-domain-manifest.ts`
- Modify: `apps/api/package.json` (scripts)

**Interfaces:**
- Consumes: `DOMAIN_MANIFESTS`, `SHARED_KERNEL`, `DomainKey` from `../src/domain/manifest` (Task 1); TypeScript compiler API (already a devDependency).
- Produces: `pnpm --filter @devloggers/api lint:manifest` — exits non-zero on any drift; `lint:architecture` runs it so the existing CI step fails.

- [ ] **Step 1: Write the drift script**

Create `apps/api/scripts/check-domain-manifest.ts`:

```typescript
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
    const first = rel.split('/')[0];
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

        const exported = node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
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
```

- [ ] **Step 2: Wire the script into the lint gate**

Edit `apps/api/package.json` scripts — replace the `lint:architecture` line and add `lint:manifest`:

```json
"lint:architecture": "node scripts/check-architecture-rules.mjs && pnpm lint:manifest",
"lint:manifest": "ts-node -r tsconfig-paths/register --project tsconfig.json scripts/check-domain-manifest.ts",
```

- [ ] **Step 3: Run it**

Run: `pnpm --filter @devloggers/api lint:manifest`

Expected: PASS — output ends with:

```
✓ every domain directory has a manifest entry
✓ import graph matches dependsOn (9 cross-domain edges)
✓ controller routes match routes[]
✓ barrel exports cover provides[]

Domain manifest is in sync with the code.
```

If an edge count differs, compare with the reference graph in the File Structure section above and fix the manifest — not the script.

- [ ] **Step 4: Prove it fails on drift (negative test)**

Run (PowerShell, from repo root):

```powershell
Add-Content -LiteralPath "apps/api/src/modules/parties/parties.module.ts" -Value "import { UnitsService } from '../catalog/units/services/units.service';"
pnpm --filter @devloggers/api lint:manifest
```

Expected: exit 1 with `import graph has undeclared dependency parties->catalog`. Revert with:

```powershell
git checkout -- apps/api/src/modules/parties/parties.module.ts
pnpm --filter @devloggers/api lint:manifest
```

Expected after revert: PASS.

- [ ] **Step 5: Verify CI wiring and commit**

The existing CI step `Architecture lint rules fire` runs `pnpm --filter @devloggers/api lint:architecture`, which now chains the manifest check — no workflow edit needed.

```bash
pnpm --filter @devloggers/api lint:architecture
pnpm --filter @devloggers/api typecheck
git add apps/api/scripts/check-domain-manifest.ts apps/api/package.json
git commit -m "feat(domain): add manifest drift check to lint:architecture (Phase 8.1.2)"
```

---

### Task 5: Outbox schema + migration (8.4.1)

**Files:**
- Create: `packages/db-prisma/src/schema/outbox.prisma`
- Modify: `packages/db-prisma/src/schema/tenant.prisma`
- Create (generated): `packages/db-prisma/src/schema/migrations/<timestamp>_add_outbox_events/migration.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: Prisma model `OutboxEvent`, enum `OutboxStatus`, generated client delegate `prisma.outboxEvent`.

- [ ] **Step 1: Write the schema**

Create `packages/db-prisma/src/schema/outbox.prisma`:

```prisma
// ─── Outbox ───────────────────────────────────────────────────────────────────
/// Phase 8.4 — durable event repository for the optional async seam.
/// Dual-write mode: AccountingPostingFacade writes the outbox row in the same
/// transaction as the journal entry. OFF by default (OUTBOX_ENABLED=false);
/// the synchronous posting path remains the production behavior (8.4.4).
enum OutboxStatus {
    PENDING
    PROCESSING
    DELIVERED
    DEAD
}

model OutboxEvent {
    id          String       @id @default(uuid())
    tenantId    String       @map("tenant_id")
    /// Stable routing key, e.g. 'accounting.journal-posted'.
    topic       String
    payload     Json         @db.JsonB
    status      OutboxStatus @default(PENDING)
    attempts    Int          @default(0)
    maxAttempts Int          @default(5) @map("max_attempts")
    lastError   String?      @map("last_error")
    /// Earliest time the next attempt may run (retry backoff).
    availableAt DateTime     @default(now()) @map("available_at")
    /// Set while status = PROCESSING; stale locks are reclaimable by the worker.
    lockedAt    DateTime?    @map("locked_at")
    deliveredAt DateTime?    @map("delivered_at")
    createdAt   DateTime     @default(now()) @map("created_at")
    updatedAt   DateTime     @updatedAt @map("updated_at")

    tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

    @@index([status, availableAt])
    @@index([tenantId, createdAt])
    @@map("outbox_events")
}
```

- [ ] **Step 2: Add the Tenant back-relation**

Edit `packages/db-prisma/src/schema/tenant.prisma`, in the relation list right after `reconciliationRuns ReconciliationRun[]`:

```prisma
    reconciliationRuns ReconciliationRun[]
    outboxEvents       OutboxEvent[]
```

- [ ] **Step 3: Create the migration**

Run (requires a reachable local Postgres; `packages/db-prisma/prisma.config.ts` loads `DATABASE_URL`):

```bash
pnpm --filter @devloggers/db-prisma db:migrate:dev -- --name add_outbox_events
```

Expected: `migrations/<timestamp>_add_outbox_events/migration.sql` created and applied, ending with `✔ Generated Prisma Client`.

**Fallback if no database is available:** create `packages/db-prisma/src/schema/migrations/20260920120000_add_outbox_events/migration.sql` by hand with exactly:

```sql
-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'DEAD');

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "last_error" TEXT,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbox_events_status_available_at_idx" ON "outbox_events"("status", "available_at");

-- CreateIndex
CREATE INDEX "outbox_events_tenant_id_created_at_idx" ON "outbox_events"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Then run `pnpm --filter @devloggers/db-prisma db:generate` (works without a database).

- [ ] **Step 4: Regenerate the client and verify it exposes the model**

```bash
pnpm --filter @devloggers/db-prisma db:generate
pnpm --filter @devloggers/api typecheck
```

Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/db-prisma/src/schema/outbox.prisma packages/db-prisma/src/schema/tenant.prisma packages/db-prisma/src/schema/migrations
git commit -m "feat(db-prisma): add OutboxEvent model and OutboxStatus (Phase 8.4.1)"
```

---

### Task 6: Outbox types, repository, handler registry

**Files:**
- Create: `apps/api/src/outbox/outbox.types.ts`
- Create: `apps/api/src/outbox/outbox.repository.ts`
- Create: `apps/api/src/outbox/outbox-handler.registry.ts`
- Test: `apps/api/src/outbox/outbox.repository.spec.ts`
- Test: `apps/api/src/outbox/outbox-handler.registry.spec.ts`

**Interfaces:**
- Consumes: generated `outboxEvent` delegate (Task 5); `Prisma.TransactionClient` / `Prisma.InputJsonValue` from `@devloggers/db-prisma`.
- Produces: `OutboxTx`, `OutboxTopic`, `OUTBOX_TOPICS`, `OUTBOX_RETRY_DELAY_MS`, `OUTBOX_STALE_LOCK_MS`, `NewOutboxEvent`, `ClaimedOutboxEvent`, `OutboxHandlerMeta`, `OutboxEventHandler`, `OutboxRepository` (`enqueue`, `claimPending`, `markDelivered`, `markFailed`), `OutboxHandlerRegistry` (`register`, `resolve`).

- [ ] **Step 1: Write the failing repository tests**

Create `apps/api/src/outbox/outbox.repository.spec.ts`:

```typescript
import { OutboxRepository } from './outbox.repository';
import type { ClaimedOutboxEvent } from './outbox.types';

interface RowLike {
    id: string;
    tenantId: string;
    topic: string;
    payload: unknown;
    attempts: number;
    maxAttempts: number;
}

function createDouble(rows: RowLike[] = []) {
    const outboxEvent = {
        create: jest.fn().mockResolvedValue({ id: 'ob-1' }),
        findMany: jest.fn().mockResolvedValue(rows),
        updateMany: jest.fn().mockResolvedValue({ count: rows.length }),
        update: jest.fn().mockResolvedValue(undefined),
    };
    const tx = { outboxEvent };
    const prisma = { outboxEvent, $transaction: jest.fn(async (fn: (client: unknown) => Promise<unknown>) => fn(tx)) };
    return { repository: new OutboxRepository(prisma as never), outboxEvent, tx };
}

const row: RowLike = {
    id: 'ob-1',
    tenantId: 't1',
    topic: 'accounting.journal-posted',
    payload: { journalEntryId: 'je-1' },
    attempts: 0,
    maxAttempts: 5,
};

describe('OutboxRepository', () => {
    it('enqueues inside the caller transaction with the default max attempts', async () => {
        const { repository, outboxEvent, tx } = createDouble();

        await expect(
            repository.enqueue(tx as never, { tenantId: 't1', topic: 'accounting.journal-posted', payload: { a: 1 } }),
        ).resolves.toEqual({ id: 'ob-1' });

        expect(outboxEvent.create).toHaveBeenCalledWith({
            data: { tenantId: 't1', topic: 'accounting.journal-posted', payload: { a: 1 }, maxAttempts: 5 },
            select: { id: true },
        });
    });

    it('honours a maxAttempts override', async () => {
        const { repository, outboxEvent, tx } = createDouble();
        await repository.enqueue(tx as never, { tenantId: 't1', topic: 'x', payload: {}, maxAttempts: 2 });
        expect(outboxEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ maxAttempts: 2 }) }));
    });

    it('claims pending rows and marks them PROCESSING', async () => {
        const { repository, outboxEvent } = createDouble([row]);

        const claimed = await repository.claimPending(20);

        expect(claimed).toEqual<ClaimedOutboxEvent[]>([
            { id: 'ob-1', tenantId: 't1', topic: 'accounting.journal-posted', payload: { journalEntryId: 'je-1' }, attempts: 0, maxAttempts: 5 },
        ]);
        expect(outboxEvent.updateMany).toHaveBeenCalledWith({
            where: { id: { in: ['ob-1'] } },
            data: { status: 'PROCESSING', lockedAt: expect.any(Date) },
        });
    });

    it('does not write when there is nothing to claim', async () => {
        const { repository, outboxEvent } = createDouble([]);
        await expect(repository.claimPending(20)).resolves.toEqual([]);
        expect(outboxEvent.updateMany).not.toHaveBeenCalled();
    });

    it('marks a delivery as delivered', async () => {
        const { repository, outboxEvent } = createDouble();
        await repository.markDelivered('ob-1');
        expect(outboxEvent.update).toHaveBeenCalledWith({
            where: { id: 'ob-1' },
            data: { status: 'DELIVERED', deliveredAt: expect.any(Date), lastError: null },
        });
    });

    it('schedules a retry with backoff', async () => {
        const { repository, outboxEvent } = createDouble();
        await repository.markFailed('ob-1', 'boom', true, 5000);
        expect(outboxEvent.update).toHaveBeenCalledWith({
            where: { id: 'ob-1' },
            data: {
                status: 'PENDING',
                attempts: { increment: 1 },
                availableAt: expect.any(Date),
                lastError: 'boom',
            },
        });
    });

    it('dead-letters when no attempts are left', async () => {
        const { repository, outboxEvent } = createDouble();
        await repository.markFailed('ob-1', 'boom', false, 5000);
        expect(outboxEvent.update).toHaveBeenCalledWith({
            where: { id: 'ob-1' },
            data: { status: 'DEAD', attempts: { increment: 1 }, lastError: 'boom' },
        });
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @devloggers/api test -- outbox.repository`

Expected: FAIL — `Cannot find module './outbox.repository'`.

- [ ] **Step 3: Implement types + repository**

Create `apps/api/src/outbox/outbox.types.ts`:

```typescript
import type { Prisma } from '@devloggers/db-prisma';

/** Transaction client used by `enqueue` — the caller's tx, so outbox rows commit atomically. */
export type OutboxTx = Prisma.TransactionClient;

export const OUTBOX_TOPICS = {
    journalPosted: 'accounting.journal-posted',
    journalReversed: 'accounting.journal-reversed',
} as const;

export type OutboxTopic = (typeof OUTBOX_TOPICS)[keyof typeof OUTBOX_TOPICS];

/** Retry delay for a failed delivery (Phase 8.4.3). */
export const OUTBOX_RETRY_DELAY_MS = 5_000;

/** A PROCESSING row older than this is considered abandoned and can be reclaimed. */
export const OUTBOX_STALE_LOCK_MS = 60_000;

export interface NewOutboxEvent {
    tenantId: string;
    topic: OutboxTopic | string;
    /** JSON-serializable payload (Phase 8.4.1). */
    payload: unknown;
    maxAttempts?: number;
}

export interface ClaimedOutboxEvent {
    id: string;
    tenantId: string;
    topic: string;
    payload: unknown;
    attempts: number;
    maxAttempts: number;
}

export interface OutboxHandlerMeta {
    eventId: string;
    tenantId: string;
    topic: string;
    attempt: number;
}

export type OutboxEventHandler = (payload: unknown, meta: OutboxHandlerMeta) => Promise<void>;
```

Create `apps/api/src/outbox/outbox.repository.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { Prisma } from '@devloggers/db-prisma';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { OUTBOX_STALE_LOCK_MS, type ClaimedOutboxEvent, type NewOutboxEvent, type OutboxTx } from './outbox.types';

@Injectable()
export class OutboxRepository {
    constructor(private readonly prisma: PrismaService) {}

    async enqueue(tx: OutboxTx, event: NewOutboxEvent): Promise<{ id: string }> {
        const row = await tx.outboxEvent.create({
            data: {
                tenantId: event.tenantId,
                topic: event.topic,
                payload: event.payload as Prisma.InputJsonValue,
                maxAttempts: event.maxAttempts ?? 5,
            },
            select: { id: true },
        });
        return { id: row.id };
    }

    /**
     * Claims a batch for processing: PENDING rows that are due, plus PROCESSING
     * rows whose lock is stale (worker crashed mid-delivery).
     */
    async claimPending(limit: number): Promise<ClaimedOutboxEvent[]> {
        const now = new Date();
        const staleBefore = new Date(now.getTime() - OUTBOX_STALE_LOCK_MS);

        return this.prisma.$transaction(async (tx) => {
            const rows = await tx.outboxEvent.findMany({
                where: {
                    OR: [
                        { status: 'PENDING', availableAt: { lte: now } },
                        { status: 'PROCESSING', lockedAt: { lt: staleBefore } },
                    ],
                },
                orderBy: { createdAt: 'asc' },
                take: limit,
            });
            if (rows.length === 0) return [];

            await tx.outboxEvent.updateMany({
                where: { id: { in: rows.map((row) => row.id) } },
                data: { status: 'PROCESSING', lockedAt: now },
            });

            return rows.map((row) => ({
                id: row.id,
                tenantId: row.tenantId,
                topic: row.topic,
                payload: row.payload,
                attempts: row.attempts,
                maxAttempts: row.maxAttempts,
            }));
        });
    }

    async markDelivered(id: string): Promise<void> {
        await this.prisma.outboxEvent.update({
            where: { id },
            data: { status: 'DELIVERED', deliveredAt: new Date(), lastError: null },
        });
    }

    /**
     * Records a failure. `hasAttemptsLeft` false moves the row to DEAD
     * (Phase 8.4.3); otherwise it is rescheduled after `retryInMs`.
     */
    async markFailed(id: string, error: string, hasAttemptsLeft: boolean, retryInMs: number): Promise<void> {
        await this.prisma.outboxEvent.update({
            where: { id },
            data: hasAttemptsLeft
                ? {
                      status: 'PENDING',
                      attempts: { increment: 1 },
                      availableAt: new Date(Date.now() + retryInMs),
                      lastError: error,
                  }
                : { status: 'DEAD', attempts: { increment: 1 }, lastError: error },
        });
    }
}
```

Create `apps/api/src/outbox/outbox-handler.registry.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import type { OutboxEventHandler } from './outbox.types';

/** topic → delivery handler map (Phase 8.4.3). Unknown topics are dead-lettered. */
@Injectable()
export class OutboxHandlerRegistry {
    private readonly handlers = new Map<string, OutboxEventHandler>();

    register(topic: string, handler: OutboxEventHandler): void {
        this.handlers.set(topic, handler);
    }

    resolve(topic: string): OutboxEventHandler | undefined {
        return this.handlers.get(topic);
    }
}
```

Create `apps/api/src/outbox/outbox-handler.registry.spec.ts`:

```typescript
import { OutboxHandlerRegistry } from './outbox-handler.registry';
import type { OutboxEventHandler } from './outbox.types';

describe('OutboxHandlerRegistry', () => {
    it('registers and resolves a handler by topic', () => {
        const registry = new OutboxHandlerRegistry();
        const handler: OutboxEventHandler = () => Promise.resolve();

        registry.register('accounting.journal-posted', handler);

        expect(registry.resolve('accounting.journal-posted')).toBe(handler);
        expect(registry.resolve('unknown.topic')).toBeUndefined();
    });
});
```

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm --filter @devloggers/api test -- outbox`

Expected: PASS for both specs.

- [ ] **Step 5: Commit**

```bash
pnpm --filter @devloggers/api typecheck
git add apps/api/src/outbox/outbox.types.ts apps/api/src/outbox/outbox.repository.ts apps/api/src/outbox/outbox.repository.spec.ts apps/api/src/outbox/outbox-handler.registry.ts apps/api/src/outbox/outbox-handler.registry.spec.ts
git commit -m "feat(outbox): add event repository and handler registry (Phase 8.4.1)"
```

---

### Task 7: Outbox worker with retry + dead-letter + module (8.4.3)

**Files:**
- Create: `apps/api/src/outbox/outbox-worker.service.ts`
- Create: `apps/api/src/outbox/logging-outbox.handler.ts`
- Create: `apps/api/src/outbox/outbox.module.ts`
- Test: `apps/api/src/outbox/outbox-worker.service.spec.ts`
- Test: `apps/api/src/outbox/logging-outbox.handler.spec.ts`

**Interfaces:**
- Consumes: `OutboxRepository`, `OutboxHandlerRegistry`, `OUTBOX_TOPICS`, `OUTBOX_RETRY_DELAY_MS`, `ClaimedOutboxEvent`, `OutboxEventHandler` (Task 6); `RequestContext` (`src/common/request-context/request-context`); `SYSTEM_USER_ID` (`src/modules/audit`).
- Produces: `OutboxWorkerService` (`handleInterval()`, `drainOnce(limit = 20): Promise<number>`), `LoggingOutboxHandler`, `OutboxModule` (providers/exports `OutboxRepository`).

- [ ] **Step 1: Write the failing worker tests**

Create `apps/api/src/outbox/outbox-worker.service.spec.ts`:

```typescript
import { OutboxWorkerService } from './outbox-worker.service';
import { OUTBOX_RETRY_DELAY_MS, type ClaimedOutboxEvent, type OutboxEventHandler } from './outbox.types';

const claimed: ClaimedOutboxEvent = {
    id: 'ob-1',
    tenantId: 't1',
    topic: 'accounting.journal-posted',
    payload: { journalEntryId: 'je-1' },
    attempts: 0,
    maxAttempts: 5,
};

function build(options: { enabled?: boolean; rows?: ClaimedOutboxEvent[]; handler?: OutboxEventHandler }) {
    const repository = {
        claimPending: jest.fn().mockResolvedValue(options.rows ?? []),
        markDelivered: jest.fn().mockResolvedValue(undefined),
        markFailed: jest.fn().mockResolvedValue(undefined),
    };
    const registry = { resolve: jest.fn().mockReturnValue(options.handler) };
    const config = { get: jest.fn().mockReturnValue(options.enabled ? 'true' : 'false') };
    const worker = new OutboxWorkerService(repository as never, registry as never, config as never);
    return { worker, repository, registry };
}

describe('OutboxWorkerService (Phase 8.4.3)', () => {
    it('does not poll while the outbox is disabled (default)', async () => {
        const { worker, repository } = build({ enabled: false, rows: [claimed] });
        await worker.handleInterval();
        expect(repository.claimPending).not.toHaveBeenCalled();
    });

    it('polls when enabled', async () => {
        const { worker, repository } = build({ enabled: true, rows: [] });
        await worker.handleInterval();
        expect(repository.claimPending).toHaveBeenCalled();
    });

    it('delivers a claimed event and marks it delivered', async () => {
        const handler = jest.fn().mockResolvedValue(undefined);
        const { worker, repository, registry } = build({ rows: [claimed], handler });

        await expect(worker.drainOnce()).resolves.toBe(1);

        expect(registry.resolve).toHaveBeenCalledWith('accounting.journal-posted');
        expect(handler).toHaveBeenCalledWith(claimed.payload, {
            eventId: 'ob-1',
            tenantId: 't1',
            topic: 'accounting.journal-posted',
            attempt: 1,
        });
        expect(repository.markDelivered).toHaveBeenCalledWith('ob-1');
        expect(repository.markFailed).not.toHaveBeenCalled();
    });

    it('schedules a retry after a handler failure', async () => {
        const handler = jest.fn().mockRejectedValue(new Error('boom'));
        const { worker, repository } = build({ rows: [claimed], handler });

        await worker.drainOnce();

        expect(repository.markFailed).toHaveBeenCalledWith('ob-1', 'boom', true, OUTBOX_RETRY_DELAY_MS);
    });

    it('dead-letters on the final attempt', async () => {
        const handler = jest.fn().mockRejectedValue(new Error('boom'));
        const { worker, repository } = build({ rows: [{ ...claimed, attempts: 4 }], handler });

        await worker.drainOnce();

        expect(repository.markFailed).toHaveBeenCalledWith('ob-1', 'boom', false, OUTBOX_RETRY_DELAY_MS);
    });

    it('dead-letters an event with no registered handler', async () => {
        const { worker, repository } = build({ rows: [claimed], handler: undefined });

        await worker.drainOnce();

        expect(repository.markFailed).toHaveBeenCalledWith(
            'ob-1',
            'No handler registered for topic "accounting.journal-posted"',
            false,
            0,
        );
        expect(repository.markDelivered).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @devloggers/api test -- outbox-worker`

Expected: FAIL — `Cannot find module './outbox-worker.service'`.

- [ ] **Step 3: Implement the worker**

Create `apps/api/src/outbox/outbox-worker.service.ts`:

```typescript
import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { RequestContext } from '../common/request-context/request-context';
import { SYSTEM_USER_ID } from '../modules/audit';
import { OutboxHandlerRegistry } from './outbox-handler.registry';
import { OutboxRepository } from './outbox.repository';
import { OUTBOX_RETRY_DELAY_MS, type ClaimedOutboxEvent } from './outbox.types';

export const OUTBOX_DRAIN_BATCH = 20;

/**
 * Phase 8.4.3 — poll loop with retry and dead-letter. OFF by default
 * (`OUTBOX_ENABLED=false`, Phase 8.4.4): the facade does not enqueue and the
 * interval returns immediately, so the sync posting path is untouched.
 */
@Injectable()
export class OutboxWorkerService {
    private readonly logger = new Logger(OutboxWorkerService.name);

    constructor(
        private readonly repository: OutboxRepository,
        private readonly registry: OutboxHandlerRegistry,
        private readonly config: ConfigService,
    ) {}

    @Interval('outbox-drain', 5_000)
    async handleInterval(): Promise<void> {
        if (this.config.get<string>('OUTBOX_ENABLED') !== 'true') return;
        await this.drainOnce();
    }

    async drainOnce(limit = OUTBOX_DRAIN_BATCH): Promise<number> {
        const events = await this.repository.claimPending(limit);
        for (const event of events) {
            await this.deliver(event);
        }
        return events.length;
    }

    private async deliver(event: ClaimedOutboxEvent): Promise<void> {
        const handler = this.registry.resolve(event.topic);
        if (!handler) {
            await this.repository.markFailed(event.id, `No handler registered for topic "${event.topic}"`, false, 0);
            this.logger.error({ msg: 'outbox event dead-lettered (no handler)', eventId: event.id, topic: event.topic });
            return;
        }

        try {
            await RequestContext.run(
                { correlationId: randomUUID(), source: 'SCHEDULER', tenantId: event.tenantId, userId: SYSTEM_USER_ID },
                () =>
                    handler(event.payload, {
                        eventId: event.id,
                        tenantId: event.tenantId,
                        topic: event.topic,
                        attempt: event.attempts + 1,
                    }),
            );
            await this.repository.markDelivered(event.id);
        } catch (error) {
            const nextAttempt = event.attempts + 1;
            const hasAttemptsLeft = nextAttempt < event.maxAttempts;
            const message = error instanceof Error ? error.message : String(error);
            await this.repository.markFailed(event.id, message, hasAttemptsLeft, OUTBOX_RETRY_DELAY_MS);
            this.logger.warn({
                msg: hasAttemptsLeft ? 'outbox event failed, will retry' : 'outbox event dead-lettered',
                eventId: event.id,
                topic: event.topic,
                attempts: nextAttempt,
                error: message,
            });
        }
    }
}
```

- [ ] **Step 4: Run to verify the worker passes**

Run: `pnpm --filter @devloggers/api test -- outbox-worker`

Expected: PASS.

- [ ] **Step 5: Add the default handler (with test) and the module**

Create `apps/api/src/outbox/logging-outbox.handler.ts`:

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OutboxHandlerRegistry } from './outbox-handler.registry';
import { OUTBOX_TOPICS, type OutboxHandlerMeta } from './outbox.types';

/**
 * Default consumer of the dual-write seam: one structured debug line per
 * delivered posting event. When a real async GL split happens, this is the
 * registration point that gets swapped for the remote handler.
 */
@Injectable()
export class LoggingOutboxHandler implements OnModuleInit {
    private readonly logger = new Logger(LoggingOutboxHandler.name);

    constructor(private readonly registry: OutboxHandlerRegistry) {}

    onModuleInit(): void {
        this.registry.register(OUTBOX_TOPICS.journalPosted, (payload, meta) => this.log(payload, meta));
        this.registry.register(OUTBOX_TOPICS.journalReversed, (payload, meta) => this.log(payload, meta));
    }

    private log(payload: unknown, meta: OutboxHandlerMeta): Promise<void> {
        const entry = payload as { journalEntryId?: string; number?: string; intentKind?: string } | null;
        this.logger.debug({
            msg: 'outbox event delivered',
            topic: meta.topic,
            tenantId: meta.tenantId,
            eventId: meta.eventId,
            attempt: meta.attempt,
            journalEntryId: entry?.journalEntryId,
            number: entry?.number,
            intentKind: entry?.intentKind,
        });
        return Promise.resolve();
    }
}
```

Create `apps/api/src/outbox/logging-outbox.handler.spec.ts`:

```typescript
import { Logger } from '@nestjs/common';
import { LoggingOutboxHandler } from './logging-outbox.handler';
import { OutboxHandlerRegistry } from './outbox-handler.registry';
import { OUTBOX_TOPICS } from './outbox.types';

describe('LoggingOutboxHandler', () => {
    it('registers itself for both posting topics and logs deliveries', async () => {
        const registry = new OutboxHandlerRegistry();
        const handler = new LoggingOutboxHandler(registry);
        const debug = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);

        handler.onModuleInit();

        const posted = registry.resolve(OUTBOX_TOPICS.journalPosted);
        expect(posted).toBeDefined();
        await posted?.({ journalEntryId: 'je-1', number: 'JE-000001', intentKind: 'PAYMENT_RECORDED' }, {
            eventId: 'ob-1',
            tenantId: 't1',
            topic: OUTBOX_TOPICS.journalPosted,
            attempt: 1,
        });

        expect(debug).toHaveBeenCalledWith(
            expect.objectContaining({ msg: 'outbox event delivered', journalEntryId: 'je-1', number: 'JE-000001' }),
        );
        expect(registry.resolve(OUTBOX_TOPICS.journalReversed)).toBeDefined();
        debug.mockRestore();
    });
});
```

Create `apps/api/src/outbox/outbox.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { LoggingOutboxHandler } from './logging-outbox.handler';
import { OutboxHandlerRegistry } from './outbox-handler.registry';
import { OutboxRepository } from './outbox.repository';
import { OutboxWorkerService } from './outbox-worker.service';

/** Phase 8.4 — outbox infrastructure. Imported by PostingModule; not a domain. */
@Module({
    providers: [OutboxRepository, OutboxHandlerRegistry, OutboxWorkerService, LoggingOutboxHandler],
    exports: [OutboxRepository],
})
export class OutboxModule {}
```

- [ ] **Step 6: Verify and commit**

```bash
pnpm --filter @devloggers/api test -- outbox
pnpm --filter @devloggers/api typecheck
git add apps/api/src/outbox/
git commit -m "feat(outbox): add poll worker with retry, dead-letter and logging handler (Phase 8.4.3)"
```

---

### Task 8: Facade dual-write mode behind `OUTBOX_ENABLED` (8.4.2, 8.4.4)

**Files:**
- Modify: `apps/api/src/modules/accounting/posting/accounting-posting.facade.ts`
- Modify: `apps/api/src/modules/accounting/posting/posting.module.ts`
- Modify: `apps/api/src/config/envValidator.ts`
- Modify: `apps/api/src/modules/accounting/posting/accounting-posting.facade.spec.ts` (constructor wiring only)
- Test: `apps/api/src/modules/accounting/posting/accounting-posting.facade.outbox.spec.ts`

**Interfaces:**
- Consumes: `OutboxRepository`, `OUTBOX_TOPICS` (Tasks 6–7); `ConfigService` (global); existing posting contracts.
- Produces: unchanged public API — `record(tx, intent): Promise<{ journalEntryId: string }>`, `reverse(tx, intent): Promise<{ journalEntryId: string }>`.

- [ ] **Step 1: Write the failing outbox facade tests**

Create `apps/api/src/modules/accounting/posting/accounting-posting.facade.outbox.spec.ts`:

```typescript
import { AccountingPostingFacade } from './accounting-posting.facade';
import type { PaymentCancelledIntent, PaymentRecordedIntent } from './contracts/posting-intent';

const tx = { marker: 'tx' } as never;

const paymentIntent: PaymentRecordedIntent = {
    kind: 'PAYMENT_RECORDED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-03-01T00:00:00.000Z'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'pay-1',
    description: 'Payment PAY-0001',
    type: 'RECEIPT',
    partyId: 'party-1',
    amount: 100,
    cashboxId: 'cb1',
    currencyId: 'USD',
};

const cancelIntent: PaymentCancelledIntent = {
    kind: 'PAYMENT_CANCELLED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-03-02T00:00:00.000Z'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'pay-1',
    description: 'Reversal of payment PAY-0001',
    originalEntryId: 'je-1',
};

function build(outboxEnabled: boolean) {
    const lines = [
        { accountId: 'cash', debit: 100, credit: 0, description: null, sortOrder: 0 },
        { accountId: 'ar', debit: 0, credit: 100, description: null, sortOrder: 1 },
    ];
    const registry = {
        resolvePosting: jest.fn().mockReturnValue({ referenceType: 'PAYMENT', buildLines: jest.fn().mockResolvedValue(lines) }),
        resolveReversal: jest.fn().mockReturnValue({ referenceType: 'PAYMENT_CANCELLATION' }),
    };
    const journalPosting = {
        post: jest.fn().mockResolvedValue({ id: 'je-1' }),
        reverse: jest.fn().mockResolvedValue({ id: 'je-2' }),
    };
    const docSeq = { getNextNumber: jest.fn().mockResolvedValue('JE-000001') };
    const audit = { recordInTx: jest.fn().mockResolvedValue(undefined) };
    const outbox = { enqueue: jest.fn().mockResolvedValue({ id: 'ob-1' }) };
    const config = { get: jest.fn().mockReturnValue(outboxEnabled ? 'true' : 'false') };
    const facade = new AccountingPostingFacade(
        registry as never,
        journalPosting as never,
        docSeq as never,
        audit as never,
        outbox as never,
        config as never,
    );
    return { facade, outbox };
}

describe('AccountingPostingFacade — dual-write outbox (Phase 8.4.2)', () => {
    it('does not write an outbox row when the flag is off (default)', async () => {
        const { facade, outbox } = build(false);
        await expect(facade.record(tx, paymentIntent)).resolves.toEqual({ journalEntryId: 'je-1' });
        expect(outbox.enqueue).not.toHaveBeenCalled();
    });

    it('writes a JSON-safe posting event in the same transaction when enabled', async () => {
        const { facade, outbox } = build(true);
        await facade.record(tx, paymentIntent);

        expect(outbox.enqueue).toHaveBeenCalledWith(tx, {
            tenantId: 't1',
            topic: 'accounting.journal-posted',
            payload: {
                journalEntryId: 'je-1',
                number: 'JE-000001',
                intentKind: 'PAYMENT_RECORDED',
                intent: { ...paymentIntent, date: '2026-03-01T00:00:00.000Z' },
            },
        });
    });

    it('writes a reversal event when enabled', async () => {
        const { facade, outbox } = build(true);
        await facade.reverse(tx, cancelIntent);

        expect(outbox.enqueue).toHaveBeenCalledWith(tx, {
            tenantId: 't1',
            topic: 'accounting.journal-reversed',
            payload: {
                journalEntryId: 'je-2',
                number: 'JE-000001',
                intentKind: 'PAYMENT_CANCELLED',
                reversalOfId: 'je-1',
                intent: { ...cancelIntent, date: '2026-03-02T00:00:00.000Z' },
            },
        });
    });

    it('propagates an outbox failure so the caller transaction rolls back', async () => {
        const { facade, outbox } = build(true);
        outbox.enqueue.mockRejectedValue(new Error('outbox down'));
        await expect(facade.record(tx, paymentIntent)).rejects.toThrow('outbox down');
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @devloggers/api test -- accounting-posting.facade.outbox`

Expected: FAIL — the current facade constructor takes 4 arguments (`TS2554: Expected 4 arguments, but got 6`).

- [ ] **Step 3: Rewrite the facade**

Replace `apps/api/src/modules/accounting/posting/accounting-posting.facade.ts` with:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JournalPostingService } from '../accounts/services/journal-posting.service';
import { DocumentSequencesService } from '../document-sequences/services/document-sequences.service';
import { assertFiscalPeriodOpen } from '../accounts/utils/assert-period-open';
import { AuditWriter } from '../../audit';
import { OutboxRepository } from '../../../outbox/outbox.repository';
import { OUTBOX_TOPICS } from '../../../outbox/outbox.types';
import { PostingPolicyRegistry } from './posting-policy.registry';
import type { PostingRecordIntent, PostingCancellationIntent } from './contracts/posting-intent';
import type { PrismaTransactionClient } from './contracts/prisma-tx';

function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}

/** JSON-safe copy for the outbox payload — dates become ISO strings. */
function toJsonPayload(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value)) as unknown;
}

/**
 * The single entry point non-accounting modules use to reach the GL.
 * Deliberate step order — period check -> policy builds lines (may reject on
 * missing GL config) -> allocate JE number -> persist. A rejection never
 * burns a document-sequence number.
 *
 * Phase 7.2.1 — every posted/reversed entry writes its AuditLog row through
 * the same transaction client, so an entry can never commit un-audited.
 *
 * Phase 8.4.2 — dual-write outbox seam. When OUTBOX_ENABLED=true the same
 * transaction also records a durable outbox event; callers and GL
 * consistency are unchanged. Default off (Phase 8.4.4).
 */
@Injectable()
export class AccountingPostingFacade {
    constructor(
        private readonly registry: PostingPolicyRegistry,
        private readonly journalPosting: JournalPostingService,
        private readonly docSeqService: DocumentSequencesService,
        private readonly audit: AuditWriter,
        private readonly outbox: OutboxRepository,
        private readonly config: ConfigService,
    ) {}

    async record(tx: PrismaTransactionClient, intent: PostingRecordIntent): Promise<{ journalEntryId: string }> {
        const result = await this.executeRecord(tx, intent);
        await this.publish(tx, intent.tenantId, OUTBOX_TOPICS.journalPosted, {
            journalEntryId: result.journalEntryId,
            number: result.number,
            intentKind: intent.kind,
            intent: toJsonPayload(intent),
        });
        return { journalEntryId: result.journalEntryId };
    }

    /** Reversal always mirrors the original entry — JournalPostingService.reverse does the mirroring. */
    async reverse(tx: PrismaTransactionClient, intent: PostingCancellationIntent): Promise<{ journalEntryId: string }> {
        const result = await this.executeReverse(tx, intent);
        await this.publish(tx, intent.tenantId, OUTBOX_TOPICS.journalReversed, {
            journalEntryId: result.journalEntryId,
            number: result.number,
            intentKind: intent.kind,
            reversalOfId: intent.originalEntryId,
            intent: toJsonPayload(intent),
        });
        return { journalEntryId: result.journalEntryId };
    }

    private async executeRecord(
        tx: PrismaTransactionClient,
        intent: PostingRecordIntent,
    ): Promise<{ journalEntryId: string; number: string }> {
        assertFiscalPeriodOpen(intent.fiscalPeriodStatus);
        const { referenceType, buildLines } = this.registry.resolvePosting(intent);
        const lines = await buildLines(tx);
        const number = await this.docSeqService.getNextNumber(intent.tenantId, 'JOURNAL_ENTRY');

        const entry = await this.journalPosting.post(tx, {
            tenantId: intent.tenantId,
            number,
            date: intent.date,
            fiscalPeriodId: intent.fiscalPeriodId,
            fiscalPeriodStatus: intent.fiscalPeriodStatus,
            referenceType,
            referenceId: intent.referenceId,
            description: intent.description,
            exchangeRate: intent.exchangeRate,
            userId: intent.userId,
            lines,
        });

        await this.audit.recordInTx(tx, {
            tenantId: intent.tenantId,
            userId: intent.userId,
            action: 'JOURNAL_POST',
            entityType: 'journal_entry',
            entityId: entry.id,
            source: 'GL',
            newValues: {
                number,
                referenceType,
                referenceId: intent.referenceId,
                date: intent.date,
                fiscalPeriodId: intent.fiscalPeriodId,
                lineCount: lines.length,
                totalDebit: round(lines.reduce((sum, line) => sum + Number(line.debit), 0)),
            },
            metadata: { intentKind: intent.kind },
        });

        return { journalEntryId: entry.id, number };
    }

    private async executeReverse(
        tx: PrismaTransactionClient,
        intent: PostingCancellationIntent,
    ): Promise<{ journalEntryId: string; number: string }> {
        assertFiscalPeriodOpen(intent.fiscalPeriodStatus);
        const { referenceType } = this.registry.resolveReversal(intent);
        const number = await this.docSeqService.getNextNumber(intent.tenantId, 'JOURNAL_ENTRY');

        const entry = await this.journalPosting.reverse(tx, {
            tenantId: intent.tenantId,
            number,
            originalEntryId: intent.originalEntryId,
            referenceType,
            referenceId: intent.referenceId,
            description: intent.description,
            exchangeRate: intent.exchangeRate,
            userId: intent.userId,
            reversalDate: intent.date,
            fiscalPeriodId: intent.fiscalPeriodId,
            fiscalPeriodStatus: intent.fiscalPeriodStatus,
        });

        await this.audit.recordInTx(tx, {
            tenantId: intent.tenantId,
            userId: intent.userId,
            action: 'JOURNAL_REVERSE',
            entityType: 'journal_entry',
            entityId: entry.id,
            source: 'GL',
            newValues: {
                number,
                referenceType,
                referenceId: intent.referenceId,
                reversalOfId: intent.originalEntryId,
                date: intent.date,
            },
            metadata: { intentKind: intent.kind },
        });

        return { journalEntryId: entry.id, number };
    }

    private async publish(
        tx: PrismaTransactionClient,
        tenantId: string,
        topic: string,
        payload: Record<string, unknown>,
    ): Promise<void> {
        if (this.config.get<string>('OUTBOX_ENABLED') !== 'true') return;
        await this.outbox.enqueue(tx, { tenantId, topic, payload });
    }
}
```

- [ ] **Step 4: Wire `OutboxModule` into `PostingModule`**

Edit `apps/api/src/modules/accounting/posting/posting.module.ts`:

1. Add the import after the `DocumentSequencesModule` import:
   ```typescript
   import { OutboxModule } from '../../../outbox/outbox.module';
   ```
2. Change `imports` to:
   ```typescript
   imports: [FinancialSettingsModule, DocumentSequencesModule, OutboxModule],
   ```

- [ ] **Step 5: Add the config flag**

Edit `apps/api/src/config/envValidator.ts`, after the reconciliation line:

```typescript
    // Reconciliation (Phase 7.5)
    RECONCILIATION_CRON_ENABLED: Joi.string().valid('true', 'false').default('true'),
    // Outbox seam (Phase 8.4) — dual-write mode; OFF keeps the sync posting path.
    OUTBOX_ENABLED: Joi.string().valid('true', 'false').default('false'),
```

- [ ] **Step 6: Update the existing facade spec constructor**

Edit `apps/api/src/modules/accounting/posting/accounting-posting.facade.spec.ts`, inside `build()`:

```typescript
    const docSeq = { getNextNumber: jest.fn().mockResolvedValue('JE-000001') };
    const audit = { recordInTx: jest.fn().mockResolvedValue(undefined) };
    const outbox = { enqueue: jest.fn().mockResolvedValue({ id: 'ob-1' }) };
    const config = { get: jest.fn().mockReturnValue('false') };
    const facade = new AccountingPostingFacade(
        registry as never,
        journalPosting as never,
        docSeq as never,
        audit as never,
        outbox as never,
        config as never,
    );
```

- [ ] **Step 7: Run the facade suites and typecheck**

```bash
pnpm --filter @devloggers/api test -- accounting-posting
pnpm --filter @devloggers/api typecheck
```

Expected: PASS — existing 4 GL-audit tests plus the new 4 outbox tests.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/accounting/posting apps/api/src/config/envValidator.ts
git commit -m "feat(accounting): dual-write outbox seam behind OUTBOX_ENABLED, default off (Phase 8.4.2)"
```

---

### Task 9: F3 — keep CRUD events, add the consumer (8.4.5)

**Files:**
- Create: `apps/api/src/common/events/crud-events.listener.ts`
- Test: `apps/api/src/common/events/crud-events.listener.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `ResourceCreatedEvent`, `ResourceUpdatedEvent`, `ResourceDeletedEvent` from `@devloggers/backend-core` (already emitted by `CrudService`).
- Produces: `CrudEventsListener` (registered as an AppModule provider).

- [ ] **Step 1: Write the failing listener test**

Create `apps/api/src/common/events/crud-events.listener.spec.ts`:

```typescript
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { ResourceCreatedEvent, ResourceDeletedEvent, ResourceUpdatedEvent } from '@devloggers/backend-core';
import { CrudEventsListener } from './crud-events.listener';

describe('CrudEventsListener (Phase 8.4.5)', () => {
    it('consumes CRUD events emitted through EventEmitter2', async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', global: true })],
            providers: [CrudEventsListener],
        }).compile();
        await moduleRef.init();

        const debug = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
        const emitter = moduleRef.get(EventEmitter2);

        emitter.emit('units.created', new ResourceCreatedEvent('t1', 'units', { id: 'u1' }));
        expect(debug).toHaveBeenCalledWith(
            expect.objectContaining({ msg: 'crud event', action: 'created', resource: 'units', tenantId: 't1', entityId: 'u1' }),
        );

        emitter.emit('units.updated', new ResourceUpdatedEvent('t1', 'units', { id: 'u1' }, { id: 'u1' }));
        expect(debug).toHaveBeenCalledWith(expect.objectContaining({ action: 'updated', resource: 'units' }));

        emitter.emit('units.deleted', new ResourceDeletedEvent('t1', 'units', { id: 'u1' }));
        expect(debug).toHaveBeenCalledWith(expect.objectContaining({ action: 'deleted', resource: 'units' }));

        debug.mockRestore();
        await moduleRef.close();
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @devloggers/api test -- crud-events.listener`

Expected: FAIL — `Cannot find module './crud-events.listener'`.

- [ ] **Step 3: Implement the listener**

Create `apps/api/src/common/events/crud-events.listener.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
    ResourceCreatedEvent,
    ResourceDeletedEvent,
    ResourceUpdatedEvent,
} from '@devloggers/backend-core';

/**
 * Phase 8.4.5 (F3 decision) — CRUD events are kept and consumed here instead
 * of being deleted. One structured debug line per mutation; this is the seam
 * where future consumers (search index, webhooks, analytics) plug in.
 *
 * Requires EventEmitterModule wildcard mode (see app.module.ts).
 */
@Injectable()
export class CrudEventsListener {
    private readonly logger = new Logger(CrudEventsListener.name);

    @OnEvent('**.created')
    handleCreated(event: ResourceCreatedEvent): void {
        this.log('created', event);
    }

    @OnEvent('**.updated')
    handleUpdated(event: ResourceUpdatedEvent): void {
        this.log('updated', event);
    }

    @OnEvent('**.deleted')
    handleDeleted(event: ResourceDeletedEvent): void {
        this.log('deleted', event);
    }

    private log(action: string, event: ResourceCreatedEvent | ResourceUpdatedEvent | ResourceDeletedEvent): void {
        const payload = event.payload as { id?: string } | null;
        this.logger.debug({
            msg: 'crud event',
            action,
            resource: event.resourceName,
            tenantId: event.tenantId,
            entityId: payload?.id,
        });
    }
}
```

- [ ] **Step 4: Enable wildcard events and register the listener**

Edit `apps/api/src/app.module.ts`:

1. Add after the guard/filter imports:
   ```typescript
   import { CrudEventsListener } from './common/events/crud-events.listener';
   ```
2. Change the event module line to:
   ```typescript
   EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', global: true }),
   ```
3. Add `CrudEventsListener` to `providers` (after the APP_FILTER entry):
   ```typescript
   CrudEventsListener,
   ```

- [ ] **Step 5: Run the listener suite**

Run: `pnpm --filter @devloggers/api test -- crud-events.listener`

Expected: PASS. If the wildcard patterns do not match, switch the three decorators to `'*.created'`, `'*.updated'`, `'*.deleted'` and rerun (all current event names are `<resource>.<action>`).

- [ ] **Step 6: Commit**

```bash
pnpm --filter @devloggers/api typecheck
git add apps/api/src/common/events apps/api/src/app.module.ts
git commit -m "feat(events): consume CRUD events with structured debug listener (Phase 8.4.5)"
```

---

### Task 10: Isolation test harness + facade/domain contract tests (8.3.1, 8.3.2, 8.3.3)

**Files:**
- Create: `apps/api/src/common/testing/module-isolation.ts`
- Create: `apps/api/src/modules/accounting/posting/__tests__/posting-module.isolation.spec.ts`
- Create: `apps/api/src/modules/inventory/movements/__tests__/movements-module.isolation.spec.ts`
- Create: `apps/api/src/domain/domain-modules.isolation.spec.ts`

**Interfaces:**
- Consumes: `PostingModule`, `AccountingPostingFacade`, `FinancialSettingsService`, `DocumentSequencesService`, `AuditWriter`; `InventoryMovementsModule`, `InventoryMovementFacade`; `createFakeInventoryTx` + `movementRows` from `apps/api/src/modules/inventory/movements/__tests__/fake-inventory-tx.ts`; `DOMAIN_MODULES` (Task 2).
- Produces: `compileIsolated(imports, configure?)`, `applyIsolationTestEnv()`, `fakePrismaService`. These specs are the future service-boundary tests if GL extraction happens (8.3.3): the facade contract stays, only the module graph changes.

- [ ] **Step 1: Implement the harness**

Create `apps/api/src/common/testing/module-isolation.ts`:

```typescript
import type { Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, type TestingModule, type TestingModuleBuilder } from '@nestjs/testing';
import { I18nModule } from '@devloggers/i18n/nest';
import { PrismaModule, PrismaService } from '@devloggers/db-prisma/nest';
import { AuditModule } from '../../modules/audit/audit.module';

/**
 * Phase 8.3 — boots a domain module subtree without AppModule. Only global
 * infrastructure is added here; anything a domain needs at runtime must
 * travel in its own `imports`, which is exactly what these tests pin.
 */
export function applyIsolationTestEnv(): void {
    process.env.NODE_ENV ??= 'test';
    process.env.DATABASE_URL ??= 'postgresql://isolated:isolated@localhost:5432/isolated';
    process.env.JWT_ACCESS_SECRET ??= 'isolation-test-secret';
}

/** Compile-time placeholder — no delegate is called during `compile()`. */
export const fakePrismaService = {} as unknown as PrismaService;

export async function compileIsolated(
    imports: Type<unknown>[],
    configure?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<TestingModule> {
    applyIsolationTestEnv();

    const builder = Test.createTestingModule({
        imports: [
            ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
            EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', global: true }),
            I18nModule,
            PrismaModule,
            AuditModule,
            ...imports,
        ],
    })
        .overrideProvider(PrismaService)
        .useValue(fakePrismaService);

    return (configure ? configure(builder) : builder).compile();
}
```

If `.overrideProvider(PrismaService)` does not intercept the provider (Nest throws `Nest could not find PrismaService element`), replace `PrismaModule` in the imports with a local `@Global() @Module({ providers: [{ provide: PrismaService, useValue: fakePrismaService }], exports: [PrismaService] }) class FakePrismaModule {}` and drop the override. Do not import the AppModule.

- [ ] **Step 2: Write the PostingModule isolation contract test (8.3.1)**

Create `apps/api/src/modules/accounting/posting/__tests__/posting-module.isolation.spec.ts` (the `__tests__` directory already exists):

```typescript
import { compileIsolated } from '../../../../common/testing/module-isolation';
import { AuditWriter } from '../../../audit';
import { DocumentSequencesService } from '../../document-sequences/services/document-sequences.service';
import { FinancialSettingsService } from '../../financial-settings/services/financial-settings.service';
import { AccountingPostingFacade } from '../accounting-posting.facade';
import { PostingModule } from '../posting.module';
import type { InvoicePostedIntent } from '../contracts/posting-intent';
import type { PrismaTransactionClient } from '../contracts/prisma-tx';

const settingsFixture = {
    defaultReceivableAccountId: 'ar',
    defaultSalesAccountId: 'sales',
    defaultPayableAccountId: 'ap',
    defaultPurchaseAccountId: 'purchases',
    defaultTaxAccountId: null,
    defaultInventoryAccountId: 'inventory',
    defaultCogsAccountId: 'cogs',
};

const saleIntent: InvoicePostedIntent = {
    kind: 'INVOICE_POSTED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-09-20T00:00:00.000Z'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'inv-1',
    description: 'Sales invoice INV-1',
    direction: 'SALE',
    partyId: 'party-1',
    currencyId: 'USD',
    netAmount: 100,
    taxAmount: 0,
    total: 100,
};

function createTx() {
    const accounts = [
        { id: 'ar', code: '1100', type: 'ASSET', isPostable: true, isContra: false, deletedAt: null },
        { id: 'sales', code: '4000', type: 'REVENUE', isPostable: true, isContra: false, deletedAt: null },
    ];
    return {
        chartOfAccount: { findMany: jest.fn().mockResolvedValue(accounts) },
        party: { findFirst: jest.fn().mockResolvedValue({ receivableAccountId: 'ar', payableAccountId: null }) },
        journalEntry: { create: jest.fn().mockResolvedValue({ id: 'je-1' }) },
    } as unknown as PrismaTransactionClient;
}

describe('PostingModule — isolation contract (Phase 8.3.1)', () => {
    it('boots without AppModule and posts through the facade', async () => {
        const audit = { recordInTx: jest.fn().mockResolvedValue(undefined) };
        const moduleRef = await compileIsolated([PostingModule], (builder) =>
            builder
                .overrideProvider(FinancialSettingsService)
                .useValue({ getOrThrow: jest.fn().mockResolvedValue(settingsFixture) })
                .overrideProvider(DocumentSequencesService)
                .useValue({ getNextNumber: jest.fn().mockResolvedValue('JE-000001') })
                .overrideProvider(AuditWriter)
                .useValue(audit),
        );

        const facade = moduleRef.get(AccountingPostingFacade);
        const tx = createTx();

        await expect(facade.record(tx, saleIntent)).resolves.toEqual({ journalEntryId: 'je-1' });
        expect(audit.recordInTx).toHaveBeenCalledWith(
            tx,
            expect.objectContaining({ action: 'JOURNAL_POST', entityId: 'je-1', source: 'GL' }),
        );

        await moduleRef.close();
    });
});
```

- [ ] **Step 3: Write the InventoryMovementsModule isolation contract test (8.3.2)**

Create `apps/api/src/modules/inventory/movements/__tests__/movements-module.isolation.spec.ts`:

```typescript
import { compileIsolated } from '../../../../common/testing/module-isolation';
import { InventoryMovementFacade } from '../inventory-movement.facade';
import { InventoryMovementsModule } from '../inventory-movements.module';
import { createFakeInventoryTx, movementRows } from './fake-inventory-tx';

describe('InventoryMovementsModule — isolation contract (Phase 8.3.2)', () => {
    it('boots without AppModule and applies a movement intent', async () => {
        const moduleRef = await compileIsolated([InventoryMovementsModule]);
        const facade = moduleRef.get(InventoryMovementFacade);
        const fake = createFakeInventoryTx();

        const result = await facade.apply(fake.client, {
            kind: 'OPENING_STOCK',
            tenantId: 't1',
            userId: 'u1',
            fiscalPeriodId: 'fp-1',
            warehouseId: 'w1',
            lines: [{ itemId: 'i1', quantity: 5, unitCost: 2 }],
        });

        expect(result.valueDelta).toBe(10);
        expect(movementRows(fake.state.movements)).toEqual([
            {
                warehouseId: 'w1',
                itemId: 'i1',
                movementType: 'OPENING',
                quantity: 5,
                unitCost: 2,
                referenceType: undefined,
                referenceId: undefined,
                notes: 'Opening Balance Registration',
            },
        ]);

        await moduleRef.close();
    });
});
```

- [ ] **Step 4: Write the every-domain isolation test**

Create `apps/api/src/domain/domain-modules.isolation.spec.ts`:

```typescript
import { compileIsolated } from '../common/testing/module-isolation';
import { DOMAIN_MODULES } from './domain-modules';

describe('domain module isolation harness (Phase 8.3)', () => {
    it.each(Object.entries(DOMAIN_MODULES))(
        'domain "%s" boots without AppModule',
        async (_key, modules) => {
            const moduleRef = await compileIsolated(modules);
            expect(moduleRef).toBeDefined();
            await moduleRef.close();
        },
        30_000,
    );
});
```

If one domain fails to compile, the missing dependency is one of:
1. a **global** infrastructure module the real app registers (add it to `compileIsolated`'s imports only — never import AppModule), or
2. a **real** missing import inside that domain's module tree (fix the module).

- [ ] **Step 5: Run the isolation suites**

```bash
pnpm --filter @devloggers/api test -- isolation
pnpm --filter @devloggers/api test -- domain-modules.isolation
```

Expected: PASS — `PostingModule`, `InventoryMovementsModule`, and all 11 domain entries compile.

- [ ] **Step 6: Commit**

```bash
pnpm --filter @devloggers/api typecheck
git add apps/api/src/common/testing apps/api/src/modules/accounting/posting/__tests__ apps/api/src/modules/inventory/movements/__tests__ apps/api/src/domain/domain-modules.isolation.spec.ts
git commit -m "test(modularity): add isolation harness and facade/domain contract tests (Phase 8.3)"
```

---

### Task 11: Documentation, spec checkboxes, full verification

**Files:**
- Modify: `.ai/rules/api.md`
- Modify: `docs/superpowers/specs/2026-08-20-erp-roadmap/phase-08-modularity.md`
- Modify: `docs/superpowers/specs/2026-08-20-erp-roadmap/README.md`
- Modify: `docs/superpowers/specs/2026-08-20-erp-roadmap/00-open-issues.md`

**Interfaces:**
- Consumes: everything above.
- Produces: docs in sync; roadmap phase marked done.

- [ ] **Step 1: Update `.ai/rules/api.md`**

In the **Domain boundaries (lint-enforced)** section, after the allowed-dependency-graph paragraph, add:

```markdown
The graph is machine-checked (Phase 8.1.2): `apps/api/src/domain/manifest.ts` declares each domain's
`dependsOn` / `provides` / `routes`; `pnpm --filter @devloggers/api lint:architecture` fails when the
manifest drifts from the production import graph, controller routes or barrel exports. `identity` is the
shared auth kernel and is omitted from `dependsOn`.

`DISABLED_DOMAINS` (comma-separated keys, process env or `.env.<NODE_ENV>`) removes optional domains at
boot; requests to a disabled domain answer 404 with a clear message (guard + filter). Non-optional domains
(`accounting`, `audit`, `identity`, `inventory`, `invoicing`) and domains an enabled domain depends on
cannot be disabled — the registry throws a clear configuration error at startup.
```

In the **Rules** bullets, extend the CRUD-event rule:

```markdown
- Do not re-emit CRUD events in `onCreated` / `onUpdated` / `onDeleted` — base `CrudService` already does.
  Events are consumed by `CrudEventsListener` (`src/common/events/`) for structured debug logging
  (Phase 8.4.5); register future consumers there. `EventEmitterModule` runs in wildcard mode.
```

Add a new section after **Deletion semantics**:

```markdown
## Outbox seam (Phase 8.4)

`OUTBOX_ENABLED` (default `false`) turns on the dual-write outbox: `AccountingPostingFacade` keeps posting
synchronously and additionally writes an `OutboxEvent` row in the same transaction. A poll worker
(`src/outbox/outbox-worker.service.ts`) delivers rows through `OutboxHandlerRegistry` with retry
(`OUTBOX_RETRY_DELAY_MS`) and dead-lettering. Enabling the flag does not change GL consistency, call sites
or the facade return type; the async GL split (enqueue-only) requires a design review per `.ai/rules/domain.md` §4.
```

- [ ] **Step 2: Update the phase spec**

In `docs/superpowers/specs/2026-08-20-erp-roadmap/phase-08-modularity.md`:

1. Change the status line to:
   ```markdown
   **Status:** ✅ done (2026-09-20, plan: docs/superpowers/plans/2026-09-20-phase-8-modularity.md)
   ```
2. Check every task checkbox (`8.1.1`–`8.4.5`), the four success criteria, and both `Done when` boxes.
3. Add a `## Not in this phase` note:
   ```markdown
   - Enqueue-only async GL (deferred enqueue, nullable `journalEntryId`) — requires the design review in
     `.ai/rules/domain.md` §4 before any production consideration.
   ```

- [ ] **Step 3: Update the roadmap index and open issues**

In `docs/superpowers/specs/2026-08-20-erp-roadmap/README.md` phase table:

```markdown
| **8** | [Modularity](phase-08-modularity.md) | 🟢 P3 | 5 | ✅ Complete |
```

(Also correct the stale Phase 5 row to `✅ Complete`, matching `phase-05-domain-coupling.md`.)

In `docs/superpowers/specs/2026-08-20-erp-roadmap/00-open-issues.md`, replace the three Modularity rows with resolved entries:

```markdown
| ~~`EventEmitter2` CRUD events have zero consumers~~ — resolved Phase 8 (consumer: `CrudEventsListener`) | F3 | ✅ **8** |
| ~~No capability manifest or module isolation tests~~ — resolved Phase 8 (`src/domain/manifest.ts`, `lint:manifest`, isolation harness) | — | ✅ **8** |
| ~~No outbox seam for future async GL~~ — resolved Phase 8 (dual-write, `OUTBOX_ENABLED`, default off) | — | ✅ **8** |
```

- [ ] **Step 4: Run the full gate set**

```bash
pnpm --filter @devloggers/api typecheck
pnpm --filter @devloggers/api lint:ci
pnpm --filter @devloggers/api lint:architecture
pnpm --filter @devloggers/api test
pnpm turbo run build --filter=@devloggers/api
pnpm generate
git diff --exit-code apps/api/openapi.yaml packages/api-contracts/types/index.ts
```

Expected: all exit 0; no diff after `pnpm generate` (if there is a diff, commit it).

- [ ] **Step 5: Manual smoke checks (document in the commit body)**

1. `DISABLED_DOMAINS=files` in `apps/api/.env.development`, run `pnpm --filter @devloggers/api dev`, then `GET /files` → `404 {"message":"The \"files\" module is disabled in this deployment."}` while `GET /units` still works. Revert the env change.
2. With `OUTBOX_ENABLED=true` locally (and a DB), post an invoice; `SELECT topic, status FROM outbox_events ORDER BY created_at DESC LIMIT 1` shows `accounting.journal-posted` / `DELIVERED`.
3. Confirm default config: `OUTBOX_ENABLED` unset → no rows written.

- [ ] **Step 6: Commit**

```bash
git add .ai/rules/api.md docs/superpowers/specs/2026-08-20-erp-roadmap
git commit -m "docs(roadmap): mark Phase 8 modularity complete; document registry and outbox"
```

---

## Self-Review Notes

- **Spec coverage:** 8.1.1 → Task 1 (`dependsOn`/`provides` per domain); 8.1.2 → Task 4 (script + CI); 8.1.3 → Task 1 (accounting `optional: false` + rationale); 8.2.1 → Task 2; 8.2.2 → Task 3; 8.3.1 → Task 10 Step 2; 8.3.2 → Task 10 Step 3; 8.3.3 → Task 10 header (contract survives extraction); 8.4.1 → Task 5; 8.4.2/8.4.4 → Task 8; 8.4.3 → Task 7; 8.4.5 → Task 9. Success criteria and `Done when` are asserted in Tasks 4 (drift fails CI), 7/8/10 (isolation + flag tests), 11 (verification).
- **Type consistency:** `resolveEnabledDomains` returns `{ enabled, disabled }` used by Task 2's `enabledModuleImports` and Tasks 3's guard/filter. `OutboxRepository.enqueue(tx, { tenantId, topic, payload, maxAttempts? })` matches Task 6 interface, facade call in Task 8, and worker's `claimPending`/`markFailed(id, error, hasAttemptsLeft, retryInMs)` signature in Task 7. `OUTBOX_TOPICS.journalPosted` / `journalReversed` are the only topics produced and the only ones registered by `LoggingOutboxHandler`.
- **Known execution risks (documented inline):** Prisma migration fallback SQL (Task 5), wildcard `@OnEvent` pattern fallback (Task 9), `overrideProvider(PrismaService)` fallback (Task 10), OpenAPI regeneration after composition change (Task 2).

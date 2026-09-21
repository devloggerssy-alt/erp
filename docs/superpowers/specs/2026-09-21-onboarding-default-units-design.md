# Onboarding — Bootstrap Default Units — Design

**Date:** 2026-09-21
**Author:** opencode agent
**Status:** Implemented (Option A)
**Scope:** `apps/api` — identity (onboarding) + catalog (units) domain boundary
**Primary goal:** Every new tenant gets the 7 standard units of measure during onboarding, so items (`Item.baseUnitId`, required) can be created without a manual, unhinted Units setup step.

---

## Context

- Pre-Phase-6, `OnboardingService.stepCurrencies` created default data with raw Prisma: SYP/USD, 2 cashboxes, the main warehouse, and the 7 units.
- Commit `aec9297` ("remove raw Prisma business-entity mutations, delegate to domain services", Phase 6.4) deleted that block. Currencies were delegated to `CurrenciesService`; cashboxes/warehouses became Business Setup hub tasks. **Units got no replacement** — no `UNITS` task exists in `setup-task-graph.ts`, and no bootstrap remains anywhere in `apps/api`.
- Consequence (observed): a new tenant has 0 units, the item form's unit picker is empty, and the setup hub never points to Catalog → Units. `Item.baseUnitId` is non-nullable (`packages/db-prisma/src/schema/item.prisma:14`).
- Related specs/policies: `docs/superpowers/specs/2026-08-20-erp-roadmap/phase-06-business-setup-orchestration.md` ("slim onboarding to baseline"), `.ai/rules/api.md` §Domain boundaries.
- Decision already taken by the user: **bootstrap defaults during onboarding** (not a setup task, not manual only).

---

## Requirements

### Functional

- [ ] When a tenant completes onboarding, it has the 7 standard units (same definitions as the seed: قطعة/pcs, كيلوغرام/kg, لتر/L, متر/m, علبة/box, دزينة/doz, حزمة/pack).
- [ ] Idempotent: if the tenant already has any unit, nothing is created; calling `complete()` twice creates nothing new.
- [ ] Units are created through the catalog domain service — **no raw Prisma in onboarding** (Phase 6 rule and `apps/api/src/scripts/check-architecture-rules.mjs` grep).
- [ ] Existing tenants are untouched (no backfill in this change).

### Non-functional

- [ ] `pnpm --filter @devloggers/api lint:architecture` passes (domain manifest + boundary probes).
- [ ] Domain manifest stays truthful: import graph == `dependsOn`, `provides` exported by a barrel.
- [ ] No DB schema change / migration.
- [ ] No dashboard changes; no OpenAPI/DTO change (`pnpm generate` not required — confirm).

---

## Proposed approach

### Option A (recommended) — direct domain call

1. Add a domain API to units: `UnitsService.createDefaults(tenantId): Promise<number>`.
   - Guards on existing units (repository `findMany(tenantId, { take: 1 })`), then `UnitsRepository.createMany(DEFAULT_UNITS)`.
   - `DEFAULT_UNITS` lives next to the service (catalog reference data), mirroring `packages/db-prisma/src/seed/seeds/units.seed.ts`.
2. Publish catalog: create `apps/api/src/modules/catalog/index.ts` exporting `UnitsModule` and `UnitsService` (the only catalog entry point other domains may import).
3. `OnboardingService.complete()` calls `unitsService.createDefaults(tenantId)` **before** setting `onboardingCompletedAt`, so a failure leaves onboarding retryable and a success is final.
4. Boundary plumbing (all machine-checked):
   - `apps/api/src/domain/manifest.ts`: `identity.dependsOn += 'catalog'`; `catalog.provides += ['UnitsModule', 'UnitsService']`; `catalog.optional: false` + rationale.
   - `.ai/rules/api.md`: dependency-graph table row `identity ───► catalog (units)` and the catalog public-entry row.
   - `apps/api/eslint/domain-boundaries.mjs`: update the `catalog` message (barrel now exists).
   - `apps/api/scripts/check-architecture-rules.mjs`: probe cases (`ONBOARDING → modules/catalog` clean; deep `catalog/units/services/...` error).
   - `apps/api/src/domain/manifest.spec.ts`: the "disable custom-fields+catalog" case must change (catalog can no longer be disabled).

**Why this option:** simplest, explicit failure semantics, uses the documented "adding an edge" procedure, no new event infrastructure.

**Consequence to accept:** because identity (non-optional) now depends on catalog, **catalog can no longer be disabled** via `DISABLED_DOMAINS`. In practice catalog already powers inventory/items and is never disabled, but this is a real modularity change and must be approved explicitly.

### Option B (rejected) — event-driven listener

`complete()` emits an onboarding-completed event; a catalog listener calls `UnitsService.createDefaults`. Preserves catalog optionality (no listener when disabled) but requires a new published identity entry point or a shared event constant, adds a listener pattern, and makes failure semantics implicit (listener throwing after the tenant row was updated). Rejected for cost/complexity versus Option A; revisit only if catalog optionality must be preserved.

### Alternative considered and rejected

- `UNITS` setup task in the Business Setup hub (discovery-only): architecturally consistent, but user chose unconditional defaults instead of a guided task.
- Raw `prisma.unit.createMany` in onboarding: violates Phase 6 / `api.md` ("Do not call Prisma from services") and the architecture grep.

---

## File map

```
apps/api/src/modules/catalog/units/
  default-units.ts                                  [new] 7 standard unit definitions
  repositories/units.repository.ts                  [modify] createMany()
  services/units.service.ts                         [modify] createDefaults()
  services/units.service.spec.ts                    [new] idempotency + creation
  index.ts                                          [new] public barrel (UnitsModule, UnitsService)
apps/api/src/modules/catalog/index.ts               [new] re-export units barrel
apps/api/src/modules/identity/onboarding/
  services/onboarding.service.ts                    [modify] complete() → createDefaults()
  services/onboarding.service.spec.ts               [new] complete() calls createDefaults first
  onboarding.module.ts                              [modify] import UnitsModule
apps/api/src/domain/manifest.ts                     [modify] identity.dependsOn, catalog.provides/optional
apps/api/src/domain/manifest.spec.ts                [modify] optional-domain case
apps/api/eslint/domain-boundaries.mjs               [modify] catalog barrel message
apps/api/scripts/check-architecture-rules.mjs       [modify] probe cases
.ai/rules/api.md                                    [modify] dependency graph + public entry
```

No Prisma migration, no api-contracts/DTO change, no dashboard change.

---

## Verification plan

1. `pnpm --filter @devloggers/api test` — new units + onboarding specs pass.
2. `pnpm --filter @devloggers/api typecheck` (two pre-existing failures in `discovery-completion.spec.ts` are unrelated and out of scope).
3. `pnpm --filter @devloggers/api lint:architecture` — manifest drift + probes green.
4. Manual/integration: point a scratch tenant through `complete()` (or register + complete onboarding via the API) → 7 units exist; run `complete()` again → still 7.
5. Regression: `pnpm --filter @devloggers/api test` overall and `lint:ci` (two pre-existing errors in `permission-sync.service.ts`/`roles.service.ts` are unrelated).

## Risks

- Catalog becomes non-disableable (Option A consequence; see above).
- Deliberate deviation from Phase 6 "slim onboarding to baseline" — accepted by user decision; documented here.
- If a future `UNITS` setup task is added, discovery will already find the bootstrapped units (task would complete immediately) — no conflict.

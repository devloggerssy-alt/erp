# Phase 8 — Modularity

**Status:** ✅ done (2026-09-20, plan: docs/superpowers/plans/2026-09-20-phase-8-modularity.md)  
**Priority:** 🟢 P3  
**Depends on:** [Phase 5](phase-05-domain-coupling.md)  
**Blocks:** nothing  
**Findings addressed:** [00-open-issues.md](00-open-issues.md) — modularity  
**Index:** [README](README.md)

> **Merged from:** old architecture refactor Phase 4.

---

## Goal

Each domain independently loadable and testable. Capability manifest matches actual imports. Optional outbox seam for future service extraction.

---

## Success criteria

- [x] Domain capability manifest with `dependsOn` / `provides`
- [x] Build-time check: manifest matches import graph
- [x] Facade contract tests pass with other modules unloaded
- [x] Outbox model exists; **off by default**

---

## Tasks

### 8.1 — Capability manifest

- [x] 8.1.1 Each domain declares `{ key, dependsOn[], provides[] }`
- [x] 8.1.2 Script compares manifest to ESLint import graph
- [x] 8.1.3 Accounting marked non-optional with documented rationale

### 8.2 — Dynamic registration

- [x] 8.2.1 `AppModule` composes from config-driven registry
- [x] 8.2.2 Disabled module → 404 with clear message (not 500)

### 8.3 — Contract tests per facade

- [x] 8.3.1 `AccountingPostingFacade` isolation test
- [x] 8.3.2 `InventoryMovementFacade` isolation test (from Phase 5)
- [x] 8.3.3 Become service-boundary tests if extraction happens

### 8.4 — Outbox seam (optional mode)

- [x] 8.4.1 `Outbox` model: tenantId, topic, payload, status, attempts, timestamps
- [x] 8.4.2 `AccountingPostingFacade` optional outbox mode behind config — call sites unchanged
- [x] 8.4.3 Worker with retry + dead-letter
- [x] 8.4.4 **Default: off.** Sync posting remains production path until real split needs async GL
- [x] 8.4.5 **F3 decision:** give `EventEmitter2` CRUD events consumers **or** stop emitting

---

## Verification

```bash
pnpm turbo run build --filter=@devloggers/api
# Each domain module boots in isolation test harness
```

## Done when

- [x] Manifest drift fails CI
- [x] Outbox mode tested behind flag; default path unchanged

## Risk

Outbox changes GL consistency model — requires design review before enabling in production (.ai/rules/domain.md §4).

## Decisions & deviations

- **8.4.2 (user-approved):** dual-write seam — sync posting is kept and the outbox row is written in the
  same transaction. Call sites and the facade return type are unchanged; GL consistency is unchanged.
- **8.4.5 (user-approved):** events are kept and consumed by `CrudEventsListener`
  (`apps/api/src/common/events/`) with structured debug logging.
- **OpenAPI artifacts:** `pnpm generate` runs via ts-node and does not apply the `@nestjs/swagger`
  plugin configured in `nest-cli.json`, so its output drifts from the committed `openapi.yaml` /
  `types/index.ts` (pre-existing at HEAD). No artifact was regenerated in this phase because the API
  surface did not change (module registration order only). Fixing the generation path is a separate task.
- **`node dist/main.js` / `nest start`:** pre-existing failure in this workspace —
  `@prisma/client-runtime-utils` is not resolvable from `packages/db-prisma/dist/generated/client`.
  Unrelated to this phase; manual runtime smoke checks were skipped in favour of unit + isolation tests.

## Not in this phase

- Enqueue-only async GL (deferred enqueue, nullable `journalEntryId`) — requires the design review in
  `.ai/rules/domain.md` §4 before any production consideration.

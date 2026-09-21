# Phase 5 — Domain Coupling

**Status:** ✅ done (2026-09-17, plan: docs/superpowers/plans/2026-09-17-phase-5-domain-coupling.md)  
**Priority:** 🟡 P2  
**Findings addressed:** [00-open-issues.md](00-open-issues.md) — domain coupling  
**Depends on:** [Phase 2](phase-02-subledger-accounting-foundation.md)

---

## Goal

Apply the Phase 1 posting-port pattern to inventory. Enforce deletion semantics repo-wide. Extend domain boundary lint.

---

## Success criteria

- [x] `InventoryMovementFacade` with typed movement intents
- [x] No service imports another domain's internals (lint enforced)
- [x] Financial documents never hard-deletable via CRUD routes
- [x] Per-model delete/archive policy documented and enforced

---

## Tasks

### 5.1 — Inventory movement port

- [x] 5.1.1 `InventoryMovementFacade` mirroring posting port vocabulary (intent → policy → persist)
- [x] 5.1.2 Migrate `invoice-posting.service.ts` movement sites
- [x] 5.1.3 Migrate `stock-counts.service.ts`
- [x] 5.1.4 Remove remaining `tx as any` at movement call sites
- [x] 5.1.5 Facade contract tests for movement intents

### 5.2 — Boundary lint for all domains

- [x] 5.2.1 Extend `no-restricted-imports`: one public barrel per domain
- [x] 5.2.2 Document allowed dependency graph in `.ai/rules/api.md`
- [x] 5.2.3 CI fails on cross-domain internal imports

### 5.3 — Deletion semantics (F8)

- [x] 5.3.1 Decision table per model: hard delete | soft delete | archive | cancel-only
- [x] 5.3.2 Financial docs (`Invoice`, `Payment`, `Expense`, `JournalEntry`): cancel/reverse only
- [x] 5.3.3 Extend `StatusGuardedCrudService` guards to all Tier B documents
- [x] 5.3.4 `CrudRepository` hook prevents bypass for financial entities
- [x] 5.3.5 Only `ChartOfAccount` soft-delete today — extend where needed

### 5.4 — Split oversized services (post-seam)

- [x] 5.4.1 `invoices.service.ts` — split along posting vs CRUD seams if still >350 LOC after Phase 1
- [x] 5.4.2 `items-import.service.ts`, `payments.service.ts` — only if natural boundaries exist
- [x] 5.4.3 **Do not split arbitrarily by LOC** — responsibility clarity is the criterion

---

## Verification

```bash
pnpm turbo run build --filter=@devloggers/api
pnpm --filter @devloggers/api test -- --testPathPattern=inventory
# Lint rule: attempt forbidden import → CI fail
```

## Done when

- [x] Invoice post uses `InventoryMovementFacade` only
- [x] Posted payment delete attempt returns 400/403, not 200

## Not in this phase

- Onboarding / Business Setup orchestration → Phase 6
- Outbox / module manifest → Phase 8
- Migration flipping `journal_lines.{party,cashbox,bank_account,currency}_id` and `payments.party_id` from `ON DELETE SET NULL` to `RESTRICT` (app-level guards added in 5.3.5)
- Consolidating accounting's five published entry points into one barrel → Phase 6
- `CustomFieldsRepository` exposed via the custom-fields barrel — replace with a `CustomFieldsService` read method
- Re-parenting `ExpensesService` / `InvoicesService` / `StockCountsService` onto `StatusGuardedCrudService` (guards pinned instead)

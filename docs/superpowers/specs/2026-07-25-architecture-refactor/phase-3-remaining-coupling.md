# Phase 3 — Remaining Coupling

**Status:** ⬜ scoped, **not decomposed** — write a dedicated spec before executing
**Depends on:** [Phase 1.5](phase-1.5-service-layering.md)
**Blocks:** [Phase 4](phase-4-modularity.md)
**Findings addressed:** [F8](00-findings.md#f8--secondary-issues) (deletion semantics)
**Index:** [README](README.md)

---

## Goal

Apply the Phase 1 pattern to the other cross-domain dependencies.

## Success criteria

- [ ] No service imports another domain's internals
- [ ] Boundary lint covers all domains, not just accounting

---

## Scope

### 3.1 — Inventory port

- [ ] 3.1.1 `InventoryMovementFacade` with typed movement intents, mirroring the posting port
- [ ] 3.1.2 Migrate `invoice-posting.service.ts` (3 `postMovementTx` sites) and
      `stock-counts.service.ts`
- [ ] 3.1.3 Removes the remaining `tx as any` at movement call sites

Phase 1 proved this pattern on GL. Inventory is the same shape with a smaller blast radius, so it
should reuse the intent/facade/policy vocabulary verbatim rather than inventing a parallel one.

### 3.2 — Onboarding saga

- [ ] 3.2.1 `onboarding.service.ts` (333 LOC) imports four domain services directly
- [ ] 3.2.2 Convert to a coordinator composing domain facades, with per-step idempotency

### 3.3 — Boundary lint for all domains

- [ ] 3.3.1 Extend `no-restricted-imports`: each domain exposes exactly one barrel
- [ ] 3.3.2 Document the allowed dependency graph in `.ai/rules/api.md`

### 3.4 — Deletion semantics (F8)

- [ ] 3.4.1 Decide per model: hard delete, soft delete, or archive. Currently only
      `ChartOfAccount` has `deletedAt`
- [ ] 3.4.2 Financial documents (`Invoice`, `Payment`, `Expense`, `JournalEntry`) must **never**
      hard-delete — reverse or cancel only, per `.ai/rules/domain.md` workflow rules
- [ ] 3.4.3 Enforce in `CrudRepository` so it cannot be bypassed per module.
      **Partly delivered by Phase 1.5.B.4** — `DocumentCrudService` already blocks update/delete on
      non-draft documents; 3.4 extends the same idea to soft-delete/archive across all models

### 3.5 — Split oversized services

- [ ] 3.5.1 `invoices.service.ts` (397 LOC), `onboarding.service.ts` (333),
      `items-import.service.ts` (299), `payments.service.ts` (291)
- [ ] 3.5.2 **Split along the seams Phase 1 exposed, not arbitrarily.** LOC is the symptom, not
      the criterion — a 400-line service with one clear responsibility is fine; these are flagged
      because Phase 1 and 1.5 will have already carved natural boundaries into them

---

## Test obligation

Facade contract tests for inventory, mirroring the Phase 1 policy unit tests.

## Before executing

Write `docs/superpowers/specs/YYYY-MM-DD-inventory-movement-port-design.md` (and a separate one for
deletion semantics — it touches every model and deserves its own review).

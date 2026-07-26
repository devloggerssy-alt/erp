# Architecture Refactor — Spec Index

**Date:** 2026-07-25 (split into per-phase specs 2026-07-26)
**Author:** Claude (Opus 5) with Mohammad Khyata
**Scope:** Cross-cutting — `apps/api`, `apps/dashboard`, `packages/*`

**Primary goal:** Remove accounting/GL policy from six non-accounting modules, restore type safety
in the API, and prepare the codebase for modular/microservice extraction — **without changing any
posted GL output.**

---

## How to use these specs

Each phase file is **self-contained and independently executable**. One phase = one agent session
= one or more PRs. Do not load the whole folder into a single session.

To execute a phase:

1. Read [`00-findings.md`](00-findings.md) — the shared evidence base. Every phase cites it.
2. Read **only** that phase's file.
3. Check its `Depends on` row is satisfied before starting.
4. Work the task checkboxes in order; run the phase's own `Verification` block before claiming done.
5. Tick the status in the table below and commit the spec change with the work.

The task-level execution plan lives at
[`docs/superpowers/plans/2026-07-26-architecture-refactor.md`](../../plans/2026-07-26-architecture-refactor.md).

---

## Phases

| # | Spec | Depends on | Status |
|---|---|---|---|
| 0 | [Guardrails](phase-0-guardrails.md) — strictness, golden masters, drift checker, CI | nothing | 🟡 **in progress** — 0.3 ✅ · 0.4 ✅ · **0.1 + 0.2 remain** |
| 1 | [GL Posting Port](phase-1-gl-posting-port.md) — accounting owns all GL policy | 0 | ⬜ not started |
| 1.5 | [Service & Controller Layering](phase-1.5-service-layering.md) — three tiers, typed responses | 1 | ⬜ not started |
| 2 | [Client & Dashboard Type Safety](phase-2-client-and-dashboard-types.md) | 1.5 | ⬜ not started |
| 3 | [Remaining Coupling](phase-3-remaining-coupling.md) — inventory port, onboarding saga, deletion semantics | 1.5 | ⬜ needs own spec expansion |
| 4 | [Modularity](phase-4-modularity.md) — capability manifest, outbox seam | 3 | ⬜ needs own spec expansion |
| 5 | [Audit & Observability](phase-5-audit-observability.md) | 1.5 | ⬜ needs own spec expansion |
| 6 | [AuthZ](phase-6-authz.md) — **blocking before first production tenant** | independent | ⬜ needs own spec expansion |
| — | [ERP Gap Register](gap-register.md) — Part B, each item needs its own spec | — | reference only |

Phases 0 → 1 → 1.5 → 2 are **strictly sequential**. Phases 3–5 may overlap. Phase 6 is
independent but blocking before production.

Phases 3–6 are scoped and sized here but **not decomposed to task level** — write a dedicated
spec for each before executing.

---

## Why this ordering

| Phase | Why it sits here |
|---|---|
| **0.4 — API strictness** | **Start here.** Every later phase verifies with `pnpm turbo run build`. Under `noImplicitAny: false` that command exits 0 on broken refactors. Measured cost ~84 errors (F4) — no reason to defer |
| 1 — GL posting port | Golden masters cover the 8 posting paths; the type-checker covers the other ~37k LOC the refactor touches. Both must exist first |
| 1.5 — Service layering | Phase 1 removes ~60 LOC of GL policy per Tier B service, exposing the seam the base classes attach to. Doing it first means redoing it |
| 2 — Client & dashboard types | `crud-client` generics and the dashboard casts are unfixable while 63 responses generate as `unknown` / `never` |

**On splitting F4 across two phases:** making `apps/api` strict depends on nothing — pure config
plus mechanical fixes. Making `crud-client.ts` and the dashboard type-safe genuinely requires the
response DTOs from 1.5. The first draft bundled both into one late phase, which delayed the
independent half for no reason and left the refactor phases unguarded.

---

## Requirements (whole roadmap)

### Functional

- [ ] No module outside `modules/accounting/**` imports `JournalPostingService`,
      `FinancialSettingsService`, `DocumentSequencesService`, `assertFiscalPeriodOpen`, or any
      journal-line builder. *(Phase 1)*
- [ ] Callers describe **economic facts**; accounting decides accounts, sides, sequence, period. *(Phase 1)*
- [ ] GL posting stays inside the caller's Prisma transaction — ACID preserved. *(Phase 1)*
- [ ] Posted journal entries are byte-identical before and after Phase 1.
- [ ] `apps/api` compiles under `strict: true` across `src/**`, **before any refactor phase begins**. *(Phase 0.4)*
- [ ] Every `2xx` response resolves to a named schema — zero `"application/json": unknown` or
      `content?: never` in `packages/api-contracts/types/index.ts`. *(Phase 1.5)*
- [ ] Every controller returns presenter output, never a raw Prisma entity. *(Phase 1.5)*
- [ ] No `POSTED` financial document is reachable by a hard-delete route. *(Phase 1.5)*
- [ ] `packages/api-client/src/infra/crud-client.ts` contains no `as any` / `as never`. *(Phase 2)*
- [ ] Every mutation writes an `AuditLog` row. *(Phase 5)*
- [ ] Every mutating route carries an explicit permission. *(Phase 6)*

### Non-functional

- [ ] Tenant isolation preserved on every path touched.
- [ ] No new runtime dependencies without explicit approval.
- [ ] Each phase independently mergeable and revertable.
- [ ] Boundary violations fail CI, not code review.
- [ ] Existing i18n (en, ar, tr, ar-SY) and RTL behaviour unaffected.

### Explicitly not a requirement

- Changing any accounting *outcome*. Phase 1 is behaviour-preserving by construction.
- Splitting into actual microservices. This roadmap prepares the seam only.

---

## Out of scope

- Any change to posted GL output.
- Actual microservice extraction — Phase 4 builds the seam only.
- Every item in the [gap register](gap-register.md) — each needs its own spec.
- Dashboard visual redesign.
- Migrating off `EventEmitter2` — decision deferred to Phase 4.

---

## Cross-cutting test strategy

Testing is a gate on every phase, not a phase of its own. Current state: 23 spec files across
~37k LOC (3 in dashboard, 1 in packages), no API e2e suite.

| Phase | Test obligation |
|---|---|
| 0 | Golden-master JE snapshots for all 10 posting paths + `tsc --noEmit` clean under the strict base, **verified to fail** on a deliberately introduced implicit `any` |
| 1 | Per-policy unit tests; golden masters unchanged; balance drift ≤ baseline |
| 1.5 | Lifecycle-guard tests (posted rejects update **and** delete); response-type audit at 0 untyped; golden masters unchanged |
| 2 | `expectTypeOf` tests for `crud-client` inference |
| 3 | Facade contract tests for inventory |
| 4 | Module isolation tests — each domain boots alone |
| 5 | Audit row asserted for each mutation path |
| 6 | Negative authz tests — permission denied returns 403, not 200 |

---

## Open questions (owned by the phase that resolves them)

| # | Question | Owner |
|---|---|---|
| Q1 | Does `ReferenceType` need an `OPENING_STOCK` member? | [Phase 1](phase-1-gl-posting-port.md) task 1.4.7 |
| Q2 | Accounting bugs surfaced while extracting policies — log, fix in a follow-up spec, **never inside Phase 1** | [Phase 1](phase-1-gl-posting-port.md) task 1.6 |
| Q3 | `Permission` global vs tenant-scoped | [Phase 6](phase-6-authz.md) |
| Q4 | `AuditLog` retention policy | [Phase 5](phase-5-audit-observability.md) |
| Q5 | Pre-existing balance drift — correct now or track separately? | [Phase 0](phase-0-guardrails.md) task 0.2.4 |
| Q6 | Tier placement of the `FinancialSettingsService` / `SettingsService` singletons | [Phase 1.5](phase-1.5-service-layering.md) |
| Q7 | `Decimal` serialization in response DTOs | [Phase 1.5](phase-1.5-service-layering.md) task 1.5.E |
| Q8 | Does `DocumentCrudService` belong in `backend-core`? | [Phase 1.5](phase-1.5-service-layering.md) task 1.5.B |

---

## Related specs

- `docs/superpowers/specs/2026-07-02-accounting-integration-blueprint-design.md`
- `docs/superpowers/specs/2026-07-16-accounting-coa-refactor-design.md`
- `docs/superpowers/specs/2026-07-20-opening-balance-stock-design.md`

## Approval

- [ ] Design reviewed by: ___
- [ ] Approved on: ___

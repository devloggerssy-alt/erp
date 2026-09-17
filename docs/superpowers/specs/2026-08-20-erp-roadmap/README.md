# ERP Roadmap — Spec Index

**Date:** 2026-08-20  
**Scope:** Remaining work — subledger accounting, Business Setup, type safety, AuthZ, audit, modularity  
**Status:** Active

This folder contains **only unresolved work**. Prerequisites already in the codebase (posting facade, strict API, document lifecycle guards) are assumed — not spec'd here.

---

## How to use

1. Read [`00-accounting-principles.md`](00-accounting-principles.md) — approved ADRs (**required before Phase 2**).
2. Read [`00-open-issues.md`](00-open-issues.md) — what is still broken or missing.
3. Execute **one phase file** at a time; confirm dependencies in the table below.

---

## Phases (remaining)

| Phase | Spec | Priority | Depends on | Status |
|-------|------|----------|------------|--------|
| **2** | [Subledger Accounting Foundation](phase-02-subledger-accounting-foundation.md) | 🔴 P0 | — | ✅ Complete |
| **3** | [Opening Balances & Subledger Services](phase-03-opening-balances-subledger-services.md) | 🔴 P0 | 2 | ✅ Complete |
| **4** | [Client & Dashboard Types](phase-04-client-dashboard-types.md) | 🟠 P1 | — | ✅ Complete |
| **5** | [Domain Coupling](phase-05-domain-coupling.md) | 🟡 P2 | 2 | ⬜ **Next** |
| **6** | [Business Setup Orchestration](phase-06-business-setup-orchestration.md) | 🟠 P1 | 2, 3 | ⬜ |
| **7** | [Audit, Reconciliation & Observability](phase-07-audit-reconciliation-observability.md) | 🟡 P2 | 2, 3 | ✅ Complete (7.1.4 / 7.5.3 hook into Phase 6) |
| **8** | [Modularity](phase-08-modularity.md) | 🟢 P3 | 5 | ⬜ |
| **9** | [AuthZ](phase-09-authz.md) | 🔴 P0 prod gate | — | ⬜ |
| **10** | [Business Setup UI, Import & Readiness](phase-10-business-setup-ui-import-readiness.md) | 🟠 P1 | 6, 7 | ⬜ |
| — | [Gap Register](gap-register.md) | reference | — | post-roadmap |
| — | [Drift Baselines](drift-baselines.md) | reference | — | |

---

## Priority order

| Order | Phase | Why |
|-------|-------|-----|
| 1 | **2** | Wrong accounting model today (`linkedAccountId`, no subledger dimensions). Blocks everything. |
| 2 | **3** | Opening balances, party/cash projections, reconciliation foundation. |
| 3 | **4** | Type pipeline (∥ with 2–3). |
| 4 | **9** | Production blocker (∥ with 2–5). |
| 5 | **5** | Inventory port, deletion semantics, boundary lint. |
| 6 | **6** | SetupTask orchestration (needs 2–3). |
| 7 | **7** | Audit + full reconciliation (needs 2–3). |
| 8 | **8** | Modularity / outbox seam. |
| 9 | **10** | UI, import, operational readiness. |

**Chains:** `2 → 3 → 6 → 10` · `5 → 8`

---

## Verification approach

Each phase defines its own tests. Roadmap-wide gates:

- `pnpm turbo run build` for touched packages
- **Policy unit tests** under `apps/api/src/modules/accounting/posting/policies/*.spec.ts`
- **Subledger integration tests** (new in Phases 2–3)
- **Reconciliation report** clean after setup ([drift-baselines.md](drift-baselines.md))
- **Negative AuthZ tests** in Phase 9

Do not use snapshot-style “characterization” tests as the correctness gate — assert accounting invariants and subledger rules explicitly.

---

## Open questions

| # | Question | Owner |
|---|----------|-------|
| Q3 | Permission global vs tenant-scoped? | Phase 9 — recommend global catalog + tenant `RolePermission` |
| Q4 | AuditLog retention? | ✅ Decided (Phase 7) — retain indefinitely; no purge job. Any future purge must issue an explicit `DELETE` and never touch `source = 'GL'` rows |
| Q9 | Multi-currency `JournalLine` column layout | Phase 2 task 2.1 — gate before coding |
| Q10 | Hard vs soft `/setup` redirect | Phase 10 |

---

## Related specs

- `docs/superpowers/specs/2026-07-20-opening-balance-stock-design.md`
- `docs/superpowers/specs/2026-06-30-onboarding-wizard-design.md` — completion semantics superseded

## Approval

- [ ] Roadmap reviewed by: ___
- [ ] Approved on: ___

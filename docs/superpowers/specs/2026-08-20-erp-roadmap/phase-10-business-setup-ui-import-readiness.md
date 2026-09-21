# Phase 10 — Business Setup UI, Import & Readiness

**Status:** 🚧 in progress — 10.1 / 10.4 / 10.5 shipped via [2026-09-21-phase-10-setup-hub-readiness.md](../../plans/2026-09-21-phase-10-setup-hub-readiness.md); 10.2 (opening-balance UI) and 10.3 (import pipeline) pending  
**Priority:** 🟠 P1  
**Depends on:** [Phase 6](phase-06-business-setup-orchestration.md), [Phase 7](phase-07-audit-reconciliation-observability.md)  
**Blocks:** nothing (product completion)  
**Index:** [README](README.md)

---

## Goal

User-facing Business Setup hub, bulk import for existing businesses, operational readiness declaration.

---

## Success criteria

- [ ] `/setup` hub shows progress %, task groups, next recommended action
- [ ] Import pipeline: upload → parse → validate → map → preview → commit → reconcile
- [ ] `businessSetupCompletedAt` set only when reconciliation passes
- [ ] Final acceptance scenario (§11 below) achievable end-to-end

---

## Tasks

### 10.1 — Setup UI

- [x] 10.1.1 Route: `/{locale}/setup` — persistent hub (not linear wizard)
- [x] 10.1.2 Groups: Accounting, Money, Inventory, Parties
- [x] 10.1.3 Task cards → existing CRUD pages or opening wizards
- [x] 10.1.4 "Next recommended action" from dependency engine with explanation
- [x] 10.1.5 Gate policy (Q10): **decided — soft warnings only** (nav warning icons + dashboard banner + hub prominence). Hard redirect rejected: accepted legacy reconciliation drift would permanently lock existing tenants out of the product.

### 10.2 — Opening balance UI

- [ ] 10.2.1 Session-based opening workflows (cash, bank, AR, AP) — replace legacy account grid where needed
- [ ] 10.2.2 Currency-specific party statement preview before post
- [ ] 10.2.3 Review step before lock

### 10.3 — Import pipeline (incremental)

- [ ] 10.3.1 `ImportJob` model: status, errors, preview rows
- [ ] 10.3.2 Phase A: products CSV
- [ ] 10.3.3 Phase B: parties CSV
- [ ] 10.3.4 Phase C: opening balances CSV (cash, AR, AP)
- [ ] 10.3.5 Phase D: opening inventory CSV
- [ ] 10.3.6 All-or-nothing financial commit; domain service validation on commit

### 10.4 — Operational readiness

- [x] 10.4.1 `operationalReadiness` cache: sales, purchasing, inventory, cashOps, bankOps, accounting
- [x] 10.4.2 Nav soft warnings for non-ready modules
- [x] 10.4.3 `RECONCILIATION` task triggers Phase 7 service; blockers listed explicitly

### 10.5 — Remediation UI

> **Implemented differently (2026-09-21):** `Party.openingBalance` was dropped in `20260821014711_drop_party_opening_balance` and `cashboxes.linkedAccountId` was backfilled then dropped in `20260821000000_subledger_foundation`, so neither can be surfaced as data. Remediation instead names the failing reconciliation checks (the real legacy blockers: unbalanced entries and missing FX amounts/rates) on the setup hub — see `SetupReconciliationPanel`. Verified by `git grep` against `packages/db-prisma/src/schema/*.prisma`: neither column exists.

- [x] 10.5.1 Surface orphan `Party.openingBalance` from migration — obsolete (column dropped, data unrecoverable); replaced by failing-check remediation panel
- [x] 10.5.2 Surface historical `linkedAccountId` remediation (post-Phase 2 cohorts) — obsolete (column backfilled to `FinancialSetting.defaultCashAccountId`, then dropped); replaced by failing-check remediation panel

---

## Final acceptance scenario

Existing business with:

- 3 warehouses, 2,500 products, 180 customers, 70 suppliers
- $25,000 receivables, $13,000 payables
- 4 cashboxes, 3 bank accounts
- USD / SYP / EUR
- Existing Chart of Accounts

Must complete all 20 steps from audit (organization → currencies → … → reconciliation → readiness) **without user understanding subledger mechanics**.

---

## Verification

```bash
pnpm turbo run build --filter=@devloggers/dashboard
# E2E: empty business path + existing business import path (Playwright when available)
```

## Done when

- [x] Setup hub shows accurate READY/BLOCKED states
- [ ] Import 100+ products commits with validation errors blocking partial financial state
- [x] Reconciliation failure prevents `businessSetupCompletedAt`

# Phase 7 — Audit, Reconciliation & Observability

**Status:** ✅ complete (7.1.4 / 7.5.3 hooks shipped; integration in Phase 6)  
**Priority:** 🟡 P2  
**Depends on:** [Phase 2](phase-02-subledger-accounting-foundation.md), [Phase 3](phase-03-opening-balances-subledger-services.md)  
**Blocks:** [Phase 10](phase-10-business-setup-ui-import-readiness.md) (reconciliation gate)  
**Findings addressed:** [00-open-issues.md](00-open-issues.md) — audit, reconciliation  
**Index:** [README](README.md)

> **Merged from:** old Phase 5 + Business Setup reconciliation model (8 checks).

---

## Goal

Every mutation auditable. Full subledger reconciliation. Drift checker promoted to scheduled job.

---

## Success criteria

- [x] `AuditLog` row for every mutation (interceptor + GL-specific paths)
- [x] All 8 reconciliation checks from [00-accounting-principles.md](00-accounting-principles.md) implemented
- [ ] Drift report empty on clean tenant after setup — not yet observed: the current dev DB carries accepted pre-existing drift (see [drift-baselines.md](drift-baselines.md)); Phase 3 acceptance data is not seeded here
- [x] Dashboard surface for tenant admins (optional in this phase — minimum API)

---

## Tasks

### 7.1 — Audit interceptor (F5)

- [x] 7.1.1 `AuditInterceptor` on non-GET routes: actor, tenant, entity, action, diff, correlation id
- [x] 7.1.2 Redact secrets (`passwordHash`, tokens)
- [x] 7.1.3 Audit failure must **not** fail business transaction — log and continue
- [ ] 7.1.4 Setup operations tagged: source=`BUSINESS_SETUP`, task type in metadata — hook ready: `RequestContext.run({ source: 'BUSINESS_SETUP', metadata: { taskType } })` — wire in Phase 6

### 7.2 — GL-specific audit

- [x] 7.2.1 Journal post/reverse/period close always audited (independent of interceptor)
- [x] 7.2.2 Opening balance post/lock audited
- [x] 7.2.3 Audit rows append-only — no update/delete API

### 7.3 — Structured logging

- [x] 7.3.1 Nest `Logger` JSON in production
- [x] 7.3.2 Correlation id through request → transaction → audit row

### 7.4 — Reconciliation service

- [x] 7.4.1 Extend `BalanceDriftService` → `BusinessSetupReconciliationService`
- [x] 7.4.2 Check 1: Cash GL vs cashbox subledger (per currency)
- [x] 7.4.3 Check 2: Cashbox subledger vs `Cashbox.balance`
- [x] 7.4.4 Check 3: Bank GL vs bank subledger
- [x] 7.4.5 Check 4–5: AR/AP control vs party subledger (per currency)
- [x] 7.4.6 Check 6: Inventory GL vs stock movements (where valued)
- [x] 7.4.7 Check 7: JE balance (existing)
- [x] 7.4.8 Check 8: Multi-currency txn × rate = base

### 7.5 — Scheduled job

- [x] 7.5.1 Cron/worker runs drift report per tenant (daily)
- [x] 7.5.2 Alert on new drift vs last baseline ([drift-baselines.md](drift-baselines.md))
- [ ] 7.5.3 `RECONCILIATION` setup task calls this service — hook ready: `ReconciliationMonitorService.runForTenant(tenantId, 'BUSINESS_SETUP')` — wire in Phase 6

---

## Q4 — AuditLog retention (decided 2026-09-17)

**Retain indefinitely in Phase 7; no purge job.** A future purge must never delete rows with `source = 'GL'` and must run as an explicit `DELETE` (the append-only trigger blocks only `UPDATE`, so a purge remains possible). Nothing in Phase 7 depends on shorter retention.

---

## Deviations

Recorded in the implementation plan; each was signed off in Task 0 on 2026-09-17. See [`2026-09-17-phase-7-audit-reconciliation-observability.md`](../../plans/2026-09-17-phase-7-audit-reconciliation-observability.md):

1. 7.1.4 / 7.5.3 ship as hooks; Phase 6 wires them.
2. GL audit rows are written **inside** the posting transaction (atomic), unlike best-effort HTTP audit.
3. Fiscal-period close/lock audit is best-effort (no transaction to join in `CrudService.update`).
4. Append-only is enforced for `UPDATE` at the database and `DELETE` only at the application.
5. "Phase 3 acceptance scenario passes the gate" is a manual gate; no automated fixture tenant exists.

---

## Verification

```bash
pnpm --filter @devloggers/api test
# Integration: mutate entity → audit row exists
# Reconciliation: fixture tenant with openings → all 8 checks pass
```

## Done when

- [ ] Phase 3 acceptance scenario passes reconciliation gate — not confirmed in this environment. The gate was run against the dev DB on 2026-09-17 (`docs/drift-baseline-phase-7.json`); both tenants carry accepted pre-existing legacy drift (`MISSING_AMOUNT` lines on `JE-00001` / `JE--00001`, and an opening-inventory GL/stock gap on `demo-shop`), so `passed` is `false` for real data reasons, not check bugs. Recorded in [drift-baselines.md](drift-baselines.md).
- [x] Audit asserted in tests for payment post and opening post (setup handler commit moved to Phase 6 — deviation 1)

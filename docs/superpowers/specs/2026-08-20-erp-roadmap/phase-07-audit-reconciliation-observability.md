# Phase 7 — Audit, Reconciliation & Observability

**Status:** ⬜ not started  
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

- [ ] `AuditLog` row for every mutation (interceptor + GL-specific paths)
- [ ] All 8 reconciliation checks from [00-accounting-principles.md](00-accounting-principles.md) implemented
- [ ] Drift report empty on clean tenant after setup
- [ ] Dashboard surface for tenant admins (optional in this phase — minimum API)

---

## Tasks

### 7.1 — Audit interceptor (F5)

- [ ] 7.1.1 `AuditInterceptor` on non-GET routes: actor, tenant, entity, action, diff, correlation id
- [ ] 7.1.2 Redact secrets (`passwordHash`, tokens)
- [ ] 7.1.3 Audit failure must **not** fail business transaction — log and continue
- [ ] 7.1.4 Setup operations tagged: source=`BUSINESS_SETUP`, task type in metadata

### 7.2 — GL-specific audit

- [ ] 7.2.1 Journal post/reverse/period close always audited (independent of interceptor)
- [ ] 7.2.2 Opening balance post/lock audited
- [ ] 7.2.3 Audit rows append-only — no update/delete API

### 7.3 — Structured logging

- [ ] 7.3.1 Nest `Logger` JSON in production
- [ ] 7.3.2 Correlation id through request → transaction → audit row

### 7.4 — Reconciliation service

- [ ] 7.4.1 Extend `BalanceDriftService` → `BusinessSetupReconciliationService`
- [ ] 7.4.2 Check 1: Cash GL vs cashbox subledger (per currency)
- [ ] 7.4.3 Check 2: Cashbox subledger vs `Cashbox.balance`
- [ ] 7.4.4 Check 3: Bank GL vs bank subledger
- [ ] 7.4.5 Check 4–5: AR/AP control vs party subledger (per currency)
- [ ] 7.4.6 Check 6: Inventory GL vs stock movements (where valued)
- [ ] 7.4.7 Check 7: JE balance (existing)
- [ ] 7.4.8 Check 8: Multi-currency txn × rate = base

### 7.5 — Scheduled job

- [ ] 7.5.1 Cron/worker runs drift report per tenant (daily)
- [ ] 7.5.2 Alert on new drift vs last baseline ([drift-baselines.md](drift-baselines.md))
- [ ] 7.5.3 `RECONCILIATION` setup task calls this service

---

## Open question

**Q4 — AuditLog retention.** Decide policy before 7.1 ships. GL rows may need longer retention.

---

## Verification

```bash
pnpm --filter @devloggers/api test
# Integration: mutate entity → audit row exists
# Reconciliation: fixture tenant with openings → all 8 checks pass
```

## Done when

- [ ] Phase 3 acceptance scenario passes reconciliation gate
- [ ] Audit asserted in tests for payment post, opening post, setup handler commit

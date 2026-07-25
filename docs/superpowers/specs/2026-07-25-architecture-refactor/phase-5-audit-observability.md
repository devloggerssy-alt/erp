# Phase 5 — Audit & Observability

**Status:** ⬜ scoped, **not decomposed** — write a dedicated spec before executing
**Depends on:** [Phase 1.5](phase-1.5-service-layering.md) (may overlap Phases 3–4)
**Blocks:** nothing
**Findings addressed:** [F5](00-findings.md#f5--auditlog-is-write-never), [F8](00-findings.md#f8--secondary-issues)
**Index:** [README](README.md)

---

## Goal

Every state change is attributable; cached balances are provably correct.

## Success criteria

- [ ] `AuditLog` has a row for every mutation
- [ ] Drift report is empty

---

## Scope

### 5.1 — Audit interceptor (F5)

- [ ] 5.1.1 `AuditInterceptor` (`apps/api/src/common/interceptors/audit.interceptor.ts`) writing on
      every non-GET route: actor, tenant, entity type, entity id, action, before/after diff,
      correlation id
- [ ] 5.1.2 Redact `passwordHash` and any secret-bearing field
- [ ] 5.1.3 **Audit writes must not fail the business transaction** — log and continue on error.
      An audit outage must not become an outage of the thing being audited

### 5.2 — GL-specific audit

- [ ] 5.2.1 Journal post, reverse, and period close/reopen are **always** audited, independent of
      the interceptor — these are the operations an auditor will ask about first
- [ ] 5.2.2 `AuditLog` rows for GL actions are append-only — no update or delete path

### 5.3 — Structured logging

- [ ] 5.3.1 Nest `Logger` with JSON output in production
- [ ] 5.3.2 Request correlation id propagated through the transaction and into audit rows

### 5.4 — Reconciliation job

- [ ] 5.4.1 Promote the [Phase 0.2](phase-0-guardrails.md) drift checker to a scheduled job
- [ ] 5.4.2 Surface drift on the dashboard for tenant admins

---

## Open question

**Q4 — `AuditLog` retention policy.** An append-only audit table on every mutation grows without
bound. Decide retention (and whether GL rows are exempt) before shipping 5.1, not after the table
is large.

## Test obligation

Audit row asserted for each mutation path.

## Before executing

Write `docs/superpowers/specs/YYYY-MM-DD-audit-trail-design.md`, covering Q4 and the diff format.

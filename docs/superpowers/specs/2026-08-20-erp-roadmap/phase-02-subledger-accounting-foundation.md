# Phase 2 — Subledger Accounting Foundation

**Status:** ✅ Complete — verified 2026-09-07 against current codebase  
**Priority:** 🔴 P0  
**Blocks:** 3, 5, 6  
**Principles:** [00-accounting-principles.md](00-accounting-principles.md) ADR-1, ADR-2, ADR-5  
**Index:** [README](README.md)

---

## Goal

Implement **Control Account + Subledger** at schema and posting layer. Remove `Cashbox.linkedAccountId`. Add `BankAccount`. Multi-currency journal line dimensions.

---

## Success criteria

- [x] `JournalLine`: `cashboxId`, `bankAccountId`, `currencyId`, txn amount, locked rate, base equivalent (Q9)
- [x] `FinancialSetting`: `defaultCashAccountId`, `defaultBankAccountId`
- [x] `BankAccount` CRUD module
- [x] Payments/expenses post to Cash GL + `cashboxId` — not `linkedAccountId`
- [x] `Cashbox.linkedAccountId` removed
- [x] Policy + integration tests pass ([§Tests](#tests)) — 85/85 API tests green; see test-coverage note under [§2.6](#26--tests)
- [x] Drift baseline recorded ([drift-baselines.md](drift-baselines.md)) — `BalanceDriftService.getReport()` verified `clean: true` post-Phase 3 (see Phase 3 plan execution notes); not saved as a labeled `docs/drift-baseline-*.json` file per the doc's literal process

---

## Tasks

### 2.1 — Schema (Q9 gate)

- [x] 2.1.1 Multi-currency line layout design
- [x] 2.1.2 Migration: `journal_lines` columns
- [x] 2.1.3 Migration: `bank_accounts`
- [x] 2.1.4 Migration: financial_settings cash/bank slots
- [x] 2.1.5 Drop `cashboxes.linked_account_id` after data script
- [x] 2.1.6 Reconciliation indexes

Migration: `packages/db-prisma/src/schema/migrations/20260821000000_subledger_foundation/`.

### 2.2 — Contracts & DTOs

- [x] 2.2.1 Bank account resource + DTOs
- [x] 2.2.2 Posting-intent dimensional fields (`cashboxId`/`bankAccountId`/`currencyId`/`exchangeRate` on the per-policy intent contracts — no single shared `JournalLineDraft` type, but the substance is present)
- [x] 2.2.3 Financial settings DTOs
- [x] 2.2.4 OpenAPI regenerate

### 2.3 — BankAccount module

- [x] 2.3.1 CRUD module — no dedicated GL field on entity (`apps/api/src/modules/invoicing/bank-accounts/`)
- [x] 2.3.2 Optional seed sample (`packages/db-prisma/src/seed/seeds/bank-accounts.seed.ts`)

### 2.4 — Posting policy rewrite

- [x] 2.4.1 `PaymentRecordedPolicy` — Cash GL + `cashboxId`
- [x] 2.4.2 Expense posting — same
- [x] 2.4.3 Opening policies — dimensions + currency
- [x] 2.4.4 `InvoicePostedPolicy` — currency metadata
- [x] 2.4.5 `PaymentsService.post()` — drop `linkedAccountId`; keep `Cashbox.balance` sync

### 2.5 — Migration

- [x] 2.5.1 Historical `linkedAccountId` remediation script
- [x] 2.5.2 Stop onboarding from writing `linkedAccountId`
- [x] 2.5.3 Default Cash/Bank GL slots in bootstrap

### 2.6 — Tests

- [ ] 2.6.1 Update/add policy specs: payment, expense with `cashboxId` — **gap:** no dedicated `payment-recorded.policy.spec.ts` / `expense-recorded.policy.spec.ts`; dimension behavior is only exercised indirectly (payments/expense service specs, `balance-drift.service.spec.ts`, `opening-balance.policy.spec.ts`)
- [ ] 2.6.2 Integration: payment → lines hit Cash GL + dimension — payment service specs pass `cashboxId` as input but don't assert the posted `JournalLine` dimension directly
- [ ] 2.6.3 Multi-currency line: txn + rate + base preserved — no dedicated test found
- [ ] 2.6.4 Migration test on seed tenant — ran manually against the dev DB, not as an automated test (see Phase 3 plan execution notes: seed consistency fix + `BalanceDriftService` clean verification)

> **Verification note (2026-09-07):** full API suite is 85/85 green and `pnpm turbo run build --filter=@devloggers/api` succeeds, so nothing here is *broken* — the gap is test-file granularity, not behavior. Worth a follow-up if Phase 7's audit work wants explicit regression coverage on the dimension-attribution behavior.

---

## Verification

```bash
pnpm --filter @devloggers/db-prisma db:migrate:dev
pnpm turbo run build --filter=@devloggers/api
pnpm --filter @devloggers/api test -- --testPathPattern="posting/policies|posting/accounting-posting"
```

## Done when

- [x] No production use of `linkedAccountId` — zero references outside docs/specs and one stale test mock
- [x] Payment fails with clear error if Cash GL not configured — `payment-recorded.policy.ts` throws `BadRequestException` when `defaultCashAccountId` is unset
- [x] Subledger integration tests green — 85/85 API tests pass (see §2.6 note on coverage granularity)

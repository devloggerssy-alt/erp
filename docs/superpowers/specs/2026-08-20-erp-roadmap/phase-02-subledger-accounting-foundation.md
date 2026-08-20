# Phase 2 — Subledger Accounting Foundation

**Status:** ⬜ not started — **NEXT**  
**Priority:** 🔴 P0  
**Blocks:** 3, 5, 6  
**Principles:** [00-accounting-principles.md](00-accounting-principles.md) ADR-1, ADR-2, ADR-5  
**Index:** [README](README.md)

---

## Goal

Implement **Control Account + Subledger** at schema and posting layer. Remove `Cashbox.linkedAccountId`. Add `BankAccount`. Multi-currency journal line dimensions.

---

## Success criteria

- [ ] `JournalLine`: `cashboxId`, `bankAccountId`, `currencyId`, txn amount, locked rate, base equivalent (Q9)
- [ ] `FinancialSetting`: `defaultCashAccountId`, `defaultBankAccountId`
- [ ] `BankAccount` CRUD module
- [ ] Payments/expenses post to Cash GL + `cashboxId` — not `linkedAccountId`
- [ ] `Cashbox.linkedAccountId` removed
- [ ] Policy + integration tests pass ([§Tests](#tests))
- [ ] Drift baseline recorded ([drift-baselines.md](drift-baselines.md))

---

## Tasks

### 2.1 — Schema (Q9 gate)

- [ ] 2.1.1 Multi-currency line layout design
- [ ] 2.1.2 Migration: `journal_lines` columns
- [ ] 2.1.3 Migration: `bank_accounts`
- [ ] 2.1.4 Migration: financial_settings cash/bank slots
- [ ] 2.1.5 Drop `cashboxes.linked_account_id` after data script
- [ ] 2.1.6 Reconciliation indexes

### 2.2 — Contracts & DTOs

- [ ] 2.2.1 Bank account resource + DTOs
- [ ] 2.2.2 `JournalLineDraft` dimensional fields
- [ ] 2.2.3 Financial settings DTOs
- [ ] 2.2.4 OpenAPI regenerate

### 2.3 — BankAccount module

- [ ] 2.3.1 CRUD module — no dedicated GL field on entity
- [ ] 2.3.2 Optional seed sample

### 2.4 — Posting policy rewrite

- [ ] 2.4.1 `PaymentRecordedPolicy` — Cash GL + `cashboxId`
- [ ] 2.4.2 Expense posting — same
- [ ] 2.4.3 Opening policies — dimensions + currency
- [ ] 2.4.4 `InvoicePostedPolicy` — currency metadata
- [ ] 2.4.5 `PaymentsService.post()` — drop `linkedAccountId`; keep `Cashbox.balance` sync

### 2.5 — Migration

- [ ] 2.5.1 Historical `linkedAccountId` remediation script
- [ ] 2.5.2 Stop onboarding from writing `linkedAccountId`
- [ ] 2.5.3 Default Cash/Bank GL slots in bootstrap

### 2.6 — Tests

- [ ] 2.6.1 Update/add policy specs: payment, expense with `cashboxId`
- [ ] 2.6.2 Integration: payment → lines hit Cash GL + dimension
- [ ] 2.6.3 Multi-currency line: txn + rate + base preserved
- [ ] 2.6.4 Migration test on seed tenant

---

## Verification

```bash
pnpm --filter @devloggers/db-prisma db:migrate:dev
pnpm turbo run build --filter=@devloggers/api
pnpm --filter @devloggers/api test -- --testPathPattern="posting/policies|posting/accounting-posting"
```

## Done when

- [ ] No production use of `linkedAccountId`
- [ ] Payment fails with clear error if Cash GL not configured
- [ ] Subledger integration tests green

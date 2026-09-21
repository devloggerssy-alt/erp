# Drift Baselines

**Index:** [README](README.md)  
**Service:** `BusinessSetupReconciliationService` → `BalanceDriftService`  
**Endpoints:** `GET /accounting/reconciliation/checks` (live) · `GET|POST /accounting/reconciliation/runs` (stored)

---

## Current baseline

[`docs/drift-baseline-phase-7.json`](../../../drift-baseline-phase-7.json) — recorded 2026-09-17 from `BusinessSetupReconciliationService.evaluate()` against the dev DB.

> **Not comparable to older baselines.** Check 2 now reconciles `Cashbox.balance` against the **journal-line subledger** (`Σ ±|amount|` over posted lines carrying the cashbox id), not against payment/expense documents. Check 3 now compares `BankAccount.balance` in its own currency against the `bankAccountId` subledger. `docs/drift-baseline.json` (recorded 2026-08-16) predates both changes.

### Accepted pre-existing drift (Phase 7 baseline)

Both tenants on the dev DB have legacy rows written before the fixes, classified as `MISSING_AMOUNT` by check 8 and as an opening-inventory gap by check 6. These are **accepted** — pre-existing drift is not a regression; only an increase is (see Policy).

| Tenant | Finding key | Detail |
|--------|-------------|--------|
| `demo-shop` | `FX_LINE:<jl>` (`JE-00001`, ×2) | legacy lines stored with `amount = 0` (`MISSING_AMOUNT`); base 10,000,000 / 15,000,000 |
| `demo-shop` | `INVENTORY_GL:...0003` | Inventory GL 10,000,000 vs stock valuation 0 (opening inventory posted to GL without a valued movement) |
| `khyath-qtan` | `FX_LINE:<jl>` (`JE--00001`, ×2) | legacy lines stored with `amount = 0` (`MISSING_AMOUNT`); base 20,000 each |

The Phase 3 acceptance scenario is not seeded in this environment, so the `"passed": true` gate for a clean, freshly-set-up tenant remains unconfirmed. New postings record `amount`/`exchangeRate` (Phase 7 Task 8), so new drift is not expected.

---

## Policy

1. Record a baseline on a DB with representative data.
2. Phase 7 promotes checks to a scheduled job; drift **increase** vs the previous run = regression and raises an alert.
3. First run of a tenant establishes the baseline and reports nothing new (`diffNewFindings(null, …) === []`).

---

## The 9 checks

Mapped by `buildChecks()` in `reconciliation-checks.ts`:

| # | Code | Check |
|---|------|-------|
| 1 | `CASH_GL_VS_CASHBOX_SUBLEDGER` | Cash control GL vs cashbox subledger (per currency) |
| 2 | `CASHBOX_SUBLEDGER_VS_PROJECTION` | Cashbox subledger (journal lines) vs `Cashbox.balance` |
| 3 | `BANK_GL_VS_BANK_SUBLEDGER` | Bank control GL vs bank subledger + `BankAccount.balance` projection |
| 4 | `AR_CONTROL_VS_CUSTOMER_SUBLEDGER` | AR control vs party subledger (per currency) |
| 5 | `AP_CONTROL_VS_SUPPLIER_SUBLEDGER` | AP control vs party subledger (per currency) |
| 6 | `INVENTORY_GL_VS_STOCK_VALUATION` | Inventory GL vs `Σ(quantity × unitCost)` (skipped when no Inventory account) |
| 7 | `JOURNAL_ENTRIES_BALANCED` | Posted journals: debits = credits |
| 8 | `MULTI_CURRENCY_BASE_CONSISTENT` | `debit + credit = ROUND(|amount| × rate, 4)` |
| — | `STOCK_QUANTITY_PROJECTION` | `StockBalance.quantity` vs `Σ movements` (supplementary) |

---

## Record a run

Manual:

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:4040/accounting/reconciliation/runs \
  | tee docs/drift-baseline-<label>.json
```

The daily job (`ReconciliationScheduler`, cron `0 3 * * *`, env `RECONCILIATION_CRON_ENABLED`) stores a run per tenant automatically. Only a run that finds drift **new or grown** vs the previous run raises an alert (`RECONCILIATION_DRIFT_DETECTED` audit row + `reconciliation.drift-detected` event).

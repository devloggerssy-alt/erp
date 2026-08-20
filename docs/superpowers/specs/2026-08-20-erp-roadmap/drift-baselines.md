# Drift Baselines

**Index:** [README](README.md)  
**Service:** `BalanceDriftService` · `GET /accounting/reconciliation/balance-drift`

---

## Current baseline

[`docs/drift-baseline.json`](../../../drift-baseline.json) — recorded 2026-08-16, `clean: true`.

Use this as the comparison point before Phase 2. After subledger migration, record a **new** baseline — dimensional accounting will change what “clean” validates against.

---

## Policy

1. Record baseline **before** starting Phase 2 on a DB with representative data.
2. Record baseline **after** Phase 2 and Phase 3 complete.
3. Phase 7 promotes checks to a scheduled job; drift **increase** vs last baseline = regression.

---

## Checks today

- `Cashbox.balance` vs posted payments/expenses
- `StockBalance.quantity` vs sum of movements
- Posted JEs: debits = credits

## Added in Phase 3 / 7

See [00-accounting-principles.md](00-accounting-principles.md) — 8-check reconciliation stack (Cash GL subledger, bank, AR/AP per currency, multi-currency consistency).

---

## Record baseline

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/accounting/reconciliation/balance-drift \
  | tee docs/drift-baseline-<label>.json
```

# Accounting Principles & ADRs

**Status:** Approved — authoritative for all phases  
**Index:** [README](README.md)  
**Required reading before:** [Phase 2](phase-02-subledger-accounting-foundation.md)

---

## Control Account + Subledger Principle

Operational entities with balance-level tracking use **subledger dimensions** over GL **control accounts**. The GL is the accounting source of truth. Operational balances (`Cashbox.balance`, party statement totals) are **projections** that must reconcile to posted journal lines.

```
Operational Entity → Subledger Dimension → Control GL Account
```

| Entity | Dimension | Control account (`FinancialSetting`) |
|--------|-----------|--------------------------------------|
| Cashbox | `cashboxId` | `defaultCashAccountId` |
| BankAccount | `bankAccountId` | `defaultBankAccountId` |
| Customer | `partyId` | `defaultReceivableAccountId` |
| Supplier | `partyId` | `defaultPayableAccountId` |

Dedicated GL accounts per operational entity are **not allowed** unless a future ADR explicitly approves them.

---

## Approved ADRs

### ADR-1 — Cashbox GL: Option B

- Shared Cash control account — **no** dedicated GL per cashbox
- Journal lines carry `cashboxId` for subledger attribution
- `Cashbox.balance` = operational cache, not accounting truth
- **`Cashbox.linkedAccountId` must be removed** — conflicts with this ADR

### ADR-2 — Bank: Option B

- Separate `BankAccount` entity (not `Cashbox.kind`)
- Bank GL + `bankAccountId` on journal lines

### ADR-3 — Party openings: Option A

- AR/AP control accounts + `partyId` on journal lines
- No per-party GL accounts
- `Party.openingBalance` deprecated — draft → validate → review → post

### ADR-4 — Opening cash: Option A (revised)

- Opening JE on Cash GL + `cashboxId` + currency
- **Not** `Payment(type = ADJUSTMENT)`
- Update `Cashbox.balance` atomically with posting

### ADR-5 — Multi-currency openings

Each line preserves: transaction currency, amount, locked exchange rate, base equivalent. Party statements are currency-specific — never sum USD + EUR into one operational total.

### ADR-6 — N-currency onboarding

One base currency + zero or more enabled currencies. No hardcoded SYP/USD in setup code.

### ADR-7 — Existing business CoA

```
Inspect → Detect → Propose Mapping → Validate → User Approval → Apply
```

Never silently duplicate or destructively replace existing CoA.

---

## Opening balance lifecycle

```
Draft → Validate → Review → Post → Locked
```

Corrections after posting use normal adjustment journal entries — never silent repost of original opening state.

Opening lines may carry: `partyId`, `cashboxId`, `bankAccountId`, `currencyId`.

---

## Reconciliation stack (authoritative)

**Invalid:** `Cashbox ↔ linkedAccountId GL account`

**Valid:**

1. Cash GL ↔ aggregated `cashboxId` subledger (per currency)
2. Cashbox subledger ↔ `Cashbox.balance` projection
3. Bank GL ↔ `bankAccountId` subledger
4. AR control ↔ customer subledger (per currency)
5. AP control ↔ supplier subledger (per currency)
6. Inventory GL ↔ stock movement valuation
7. Posted JEs: debits = credits
8. Multi-currency: txn × rate = base (within tolerance)

Implemented in [Phase 7](phase-07-audit-reconciliation-observability.md); foundation in [Phase 3](phase-03-opening-balances-subledger-services.md).

---

## Business Setup rules

Setup orchestrators **must** call domain services and `AccountingPostingFacade`. They **must not** use raw Prisma for business entities or invent accounting rules.

Distinguish:

- `onboardingCompletedAt` — baseline configuration done
- `businessSetupCompletedAt` — setup + reconciliation passed

Wizard finish ≠ financially ready.

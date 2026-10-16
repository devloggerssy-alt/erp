# Currency Exchange Rate Input — Design

**Date:** 2026-10-16
**Author:** opencode
**Status:** Approved (decisions confirmed by user)
**Scope:** Dashboard shared form control + form integrations (invoices, expenses, payments, opening-balance sessions)
**Primary goal:** Replace the raw `exchangeRate` number field with a readable, two-way currency rate input so users can express a rate in whichever direction is intuitive (e.g. `1 USD = 13900 SYP`) instead of a tiny decimal (`1 SYP = 0.000072 USD`).

---

## Context

- `exchangeRate` is stored on `Invoice`, `Expense`, `Payment`, `OpeningBalanceSessionLine` (`Decimal(18,6)`), documented as *"exchange rate of the document currency to tenant base currency"* (`packages/db-prisma/src/schema/invoice.prisma:47`).
- Backend semantics: `baseAmount = amount × exchangeRate` (`apps/api/.../reports.service.ts`, posting policies). So **`exchangeRate` = value of 1 unit of the document currency in base-currency units**.
- For a weak document currency (e.g. SYP against a USD base) the value is a tiny decimal: `1 SYP = 0.000072 USD`. Users reason in the inverse: `1 USD = 13900 SYP` (reciprocal).
- Existing inputs are plain number fields:
  - `modules/invoices/components/invoice-form.tsx:114`
  - `modules/expenses/components/expense-form.tsx:60`
  - `modules/payments/components/payment-form.tsx:100`
  - `modules/opening-balance-sessions/components/opening-balance-session-dialog.tsx:439`
- Base currency is resolvable from the currencies list (`isBase === true`); precedent `modules/home/hooks/use-dashboard-base-currency.ts`.
- The document currency is already part of each form value (`values.currency` — full object with `code`, `isBase`).
- i18n lives in `packages/i18n/src/{en,ar,tr}/{business,system}.json` (next-intl).

## Design decisions (confirmed with user)

| # | Decision |
|---|----------|
| Q1 | **Both sides editable.** The component shows both reciprocal rates; typing in either updates the other live. |
| Q2 | **Counterpart = tenant base currency**, auto-detected from the currencies list (`isBase`). No extra selector. |
| Q3 | **Applies everywhere** an exchange-rate input exists: invoices, expenses, payments, opening-balance sessions. |

## Component model

Let `X = exchangeRate` (base per 1 document).

The control renders two reciprocal rows:

```
Exchange Rate                                    [⇄]
  1 [BASE]   =  [ X      ] [DOC]     ← editable (base per doc)
  1 [DOC]    =  [ 1 / X  ] [BASE]    ← editable (doc per base)
```

- Editing the first field sets `X`; the second shows `1/X`.
- Editing the second field sets `1/X`; the first shows the reciprocal.
- The edited field keeps the exact typed string (no reformat while typing); only the derived field is reformatted (up to 6 dp, matching `Decimal(18,6)`).
- `⇄` swaps the visual order of the two rows and marks the other direction as primary.
- If `document === base` → show "base currency, rate is 1" and no inputs (keep `X = 1`).
- If base currency is not yet known → fall back to the previous plain number input so the form never breaks.
- If no document currency is selected → disabled hint to pick a currency first.

## Files

| File | Role |
|------|------|
| `shared/components/form/lib/exchange-rate.ts` | Pure helpers: reciprocal conversion + formatting (+ unit test) |
| `shared/hooks/use-currencies.ts` | Tenant currencies list query (shared, cached under the currency resource key) |
| `shared/hooks/use-base-currency.ts` | Base-currency selector built on `useCurrencies` |
| `shared/components/form/controls/currency-exchange-input.tsx` | Presentational controlled control |
| `shared/components/form/fields/rhf-exchange-rate-field.tsx` | RHF wrapper (`useController` + base-currency hook) |
| `shared/components/form/index.ts` | Re-export control + field |
| `modules/home/hooks/use-dashboard-base-currency.ts` | Delegates to shared hook |
| invoice / expense / payment forms | Use `RhfExchangeRateField` |
| opening-balance dialog | Uses `CurrencyExchangeInput` |
| `modules/{invoices,expenses,payments}/*.config.ts` | Relax `exchangeRate` min from `0.0001` → `> 0` (weak-currency rates are < 0.0001) |
| `packages/i18n/src/{en,ar,tr}/system.json` | Shared strings (`system.exchangeRate.*`) |

## Non-goals

- No schema/API changes — stored value and semantics are unchanged.
- No remote FX-rate fetching.

## Success criteria

- `pnpm --filter @devloggers/dashboard test:unit` passes (helper tests).
- `pnpm --filter @devloggers/dashboard typecheck` and `lint` pass.
- Entering `13900` next to `1 USD` sets the stored rate to `1/13900` (~`0.000072`) and persists as before.

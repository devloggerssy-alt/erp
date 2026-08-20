# Phase 3 — Opening Balances & Subledger Services

**Status:** ⬜ not started  
**Priority:** 🔴 P0  
**Depends on:** [Phase 2](phase-02-subledger-accounting-foundation.md)  
**Blocks:** [Phase 6](phase-06-business-setup-orchestration.md), [Phase 7](phase-07-audit-reconciliation-observability.md)  
**Principles:** [00-accounting-principles.md](00-accounting-principles.md) ADR-3, ADR-4, ADR-5  
**Index:** [README](README.md)

---

## Goal

Unified opening balance workflow with draft/post/lock lifecycle. Party, cash, bank, and inventory openings through `AccountingPostingFacade`. Deprecate orphan `Party.openingBalance`. Sync operational projections.

---

## Success criteria — Phase 2 acceptance gate (all 10 required)

1. [ ] Every posted cash transaction has correct `cashboxId` attribution
2. [ ] Cashbox operational balances reconcile to posted activity for that `cashboxId`
3. [ ] Aggregate cashbox subledger reconciles to Cash GL (per currency)
4. [ ] AR party subledger reconciles to AR control (per currency)
5. [ ] AP party subledger reconciles to AP control (per currency)
6. [ ] Opening balances use same posting facade as normal entries
7. [ ] `Party.openingBalance` no longer an independent accounting source
8. [ ] No `Payment(type=ADJUSTMENT)` for openings
9. [ ] Multi-currency openings preserve currency, rate, base equivalent
10. [ ] No operational entity gets dedicated GL unless approved ADR

---

## Tasks

### 3.1 — Opening balance session model

- [ ] 3.1.1 `OpeningBalanceSession` (or equivalent): Draft → Validate → Review → Post → Locked
- [ ] 3.1.2 Lines support dimensions: `partyId`, `cashboxId`, `bankAccountId`, `currencyId`
- [ ] 3.1.3 Post creates balanced JE via facade; lock prevents silent edit
- [ ] 3.1.4 Corrections via adjustment JEs only

### 3.2 — Opening cash (ADR-4)

- [ ] 3.2.1 `OpeningCashService` — JE on Cash GL + `cashboxId`
- [ ] 3.2.2 Atomically increment `Cashbox.balance` in same transaction
- [ ] 3.2.3 Multi-currency per ADR-5

### 3.3 — Opening bank

- [ ] 3.3.1 `OpeningBankService` — Bank GL + `bankAccountId`
- [ ] 3.3.2 Bank balance projection hook (minimal — full reconciliation in Phase 7)

### 3.4 — Opening AR/AP (ADR-3)

- [ ] 3.4.1 `PartyOpeningBalanceService` — control account + `partyId` + currency
- [ ] 3.4.2 Draft UI/API workflow; block direct `Party.openingBalance` writes
- [ ] 3.4.3 Migration detector for existing `openingBalance > 0`

### 3.5 — Opening inventory (unify paths)

- [ ] 3.5.1 `ItemsService.create()` opening stock → same path as `registerOpeningBalance()` when value > 0
- [ ] 3.5.2 Bulk opening stock unchanged; ensure GL + movement atomic

### 3.6 — Subledger reconciliation (foundation)

- [ ] 3.6.1 Extend `BalanceDriftService`: Cash GL vs cashbox subledger
- [ ] 3.6.2 AR/AP control vs party subledger (per currency)
- [ ] 3.6.3 Bank GL vs bank subledger stub

### 3.7 — Deprecations

- [ ] 3.7.1 Mark `Party.openingBalance` deprecated in API/docs
- [ ] 3.7.2 Replace `/finance/opening-balances` account-grid with session-based flow (or wrap legacy until Phase 10 UI)

---

## Verification

```bash
pnpm turbo run build --filter=@devloggers/api
pnpm --filter @devloggers/api test
# Manual: post opening cash → cashbox.balance matches; AR opening → party statement USD only
```

## Done when

- [ ] All 10 success criteria ticked
- [ ] Integration test: opening cash + opening AR + opening inventory in one tenant — reconciliation clean

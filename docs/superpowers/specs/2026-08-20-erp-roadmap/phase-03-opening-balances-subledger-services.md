# Phase 3 — Opening Balances & Subledger Services

**Status:** ✅ Complete — verified 2026-09-07 against current codebase. See implementation plan + execution notes: `docs/superpowers/plans/2026-08-21-phase-3-opening-balances-subledger-services.md`  
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

1. [x] Every posted cash transaction has correct `cashboxId` attribution
2. [x] Cashbox operational balances reconcile to posted activity for that `cashboxId`
3. [x] Aggregate cashbox subledger reconciles to Cash GL (per currency)
4. [x] AR party subledger reconciles to AR control (per currency)
5. [x] AP party subledger reconciles to AP control (per currency)
6. [x] Opening balances use same posting facade as normal entries
7. [x] `Party.openingBalance` no longer an independent accounting source — column dropped entirely (exceeds "deprecated")
8. [x] No `Payment(type=ADJUSTMENT)` for openings
9. [x] Multi-currency openings preserve currency, rate, base equivalent
10. [x] No operational entity gets dedicated GL unless approved ADR

Verified via `BalanceDriftService.getReport(seedTenant)` → `clean: true` (all 7 sections empty) — see plan execution notes.

---

## Tasks

### 3.1 — Opening balance session model

- [x] 3.1.1 `OpeningBalanceSession` (or equivalent): Draft → Validate → Review → Post → Locked
- [x] 3.1.2 Lines support dimensions: `partyId`, `cashboxId`, `bankAccountId`, `currencyId`
- [x] 3.1.3 Post creates balanced JE via facade; lock prevents silent edit
- [x] 3.1.4 Corrections via adjustment JEs only — a correction is a new session posting the delta through the same facade; no repost of the original (decision 8 in the plan)

### 3.2 — Opening cash (ADR-4)

- [x] 3.2.1 `OpeningCashService` — JE on Cash GL + `cashboxId`
- [x] 3.2.2 Atomically increment `Cashbox.balance` in same transaction
- [x] 3.2.3 Multi-currency per ADR-5

### 3.3 — Opening bank

- [x] 3.3.1 `OpeningBankService` — Bank GL + `bankAccountId`
- [x] 3.3.2 Bank balance projection hook (minimal — full reconciliation in Phase 7)

### 3.4 — Opening AR/AP (ADR-3)

- [x] 3.4.1 `PartyOpeningBalanceService` — control account + `partyId` + currency
- [x] 3.4.2 Draft UI/API workflow; block direct `Party.openingBalance` writes
- [x] 3.4.3 Migration detector for existing `openingBalance > 0` — one-shot backfill ran (`migrated=0 blocked=0`, all legacy values were seed zeros); script itself was removed post-drop, recoverable from git history (`05ed444`) if a future environment has real data

### 3.5 — Opening inventory (unify paths)

- [x] 3.5.1 `ItemsService.create()` opening stock → same path as `registerOpeningBalance()` when value > 0
- [x] 3.5.2 Bulk opening stock unchanged; ensure GL + movement atomic

### 3.6 — Subledger reconciliation (foundation)

- [x] 3.6.1 Extend `BalanceDriftService`: Cash GL vs cashbox subledger
- [x] 3.6.2 AR/AP control vs party subledger (per currency)
- [x] 3.6.3 Bank GL vs bank subledger stub

### 3.7 — Deprecations

- [x] 3.7.1 Mark `Party.openingBalance` deprecated in API/docs — superseded: column dropped entirely after backfill (migrations `make_party_opening_balance_nullable` + `drop_party_opening_balance`)
- [x] 3.7.2 Replace `/finance/opening-balances` account-grid with session-based flow — legacy `modules/opening-balances/` deleted, `modules/opening-balance-sessions/` in place

---

## Verification

```bash
pnpm turbo run build --filter=@devloggers/api
pnpm --filter @devloggers/api test
# Manual: post opening cash → cashbox.balance matches; AR opening → party statement USD only
```

## Done when

- [x] All 10 success criteria ticked
- [x] Integration test: opening cash + opening AR + opening inventory in one tenant — reconciliation clean (verified manually against the real dev DB via `BalanceDriftService.getReport()`, not as an automated test fixture — see §2.6 note on Phase 2 for the same test-file-granularity caveat)

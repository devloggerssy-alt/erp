# Phase 3 — Opening Balances & Subledger Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unified opening-balance workflow (draft → validate → review → post → lock) for cash, bank, party, and account openings through `AccountingPostingFacade`; drift-report subledger reconciliation; `Party.openingBalance` removed after a facade-backed backfill.

**Architecture:** New `OpeningBalanceSession` + `OpeningBalanceSessionLine` hold dimensional lines (`partyId`/`cashboxId`/`bankAccountId`/`currencyId`). One new intent `OPENING_SESSION_POSTED` + `OpeningSessionPostedPolicy` resolve control accounts from `FinancialSettings` + party overrides and offset imbalance to Opening Balance Equity. `OpeningCashService`/`OpeningBankService`/`PartyOpeningBalanceService` own line building + atomic projection sync. `OpeningBalanceSessionsService` runs the lifecycle; `BalanceDriftService` gains cash/party/bank subledger checks.

**Tech Stack:** NestJS 4-layer, Prisma, `AccountingPostingFacade`, api-contracts resources + api-client `CrudClient`, `pnpm generate` types.

## Global Constraints

- **No new test files.** Verify via typecheck + lint + build + existing suites green + `pnpm generate` after DTO/controller changes. No manual browser QA.
- **No hand-written migrations.** Only `prisma migrate dev --name <name>`.
- **Openings post only through `AccountingPostingFacade`** — never raw `journalEntry.create`; never `Payment(type=ADJUSTMENT)`.
- **No GL naming outside accounting** — policies resolve accounts; services describe events.
- **Projection writes live inside posting transactions** (ADR-4, database.md).
- **Backfill must run before the column-drop migration.**
- **Regenerate types after every backend DTO/controller change** (`pnpm generate`).
- No bad coupling: subledger services live in the accounting `opening-balances` module and are exported for Phase 6.

## Decisions (review before executing)

1. One posting path for all openings: `OPENING_SESSION_POSTED` → one policy (criterion 6).
2. Session numbers via `DocumentSequence` type `OPENING_BALANCE` (prefix `OB`); seed made idempotent (`skipDuplicates: true`); backfill self-creates the sequence row.
3. `Party.openingBalance` **dropped**: write surface removed (Task 10), data backfilled into POSTED+LOCKED sessions (Task 11), column dropped (Task 12). `CUSTOMER → AR`, else → `AP`.
4. Legacy `POST /accounting/opening-balances` + `AccountOpeningBalancesClient` retained for backward compat (Phase 10 may remove); only the dashboard grid is replaced.
5. Strict lifecycle: post needs REVIEWED, review needs VALIDATED, validate needs DRAFT, edits only in DRAFT, lock only from POSTED. Dashboard "Post" chains the three calls.
6. `checkCashboxes` derived formula now includes OPENING_BALANCE cash lines (criterion 2).
7. Bank checks are a projection + GL stub (empty until bank postings exist; Phase 7 deepens).
8. **Corrections (3.1.4):** locked sessions cannot be edited; a correction is a *new* session posting the delta through the same facade — no silent repost of the original. (A dedicated adjustment-JE flow is Phase 7/10 scope.)

---

## Task 1 — Schema: `OpeningBalanceSession` + lines (migration 1)

**Files:** create `packages/db-prisma/src/schema/opening-balance.prisma`; add back-relations in `party.prisma`, `cashbox.prisma`, `bank-account.prisma`, `accounting.prisma` (ChartOfAccount), `currency.prisma`, `fiscal-period.prisma`, `tenant.prisma`.

```prisma
enum OpeningBalanceSessionStatus { DRAFT VALIDATED REVIEWED POSTED LOCKED }
enum OpeningBalanceDimension { CASHBOX BANK_ACCOUNT PARTY ACCOUNT }
enum OpeningBalancePartySide { AR AP }

model OpeningBalanceSession {
    id             String                      @id @default(uuid())
    tenantId       String                      @map("tenant_id")
    number         String
    fiscalPeriodId String                      @map("fiscal_period_id")
    status         OpeningBalanceSessionStatus @default(DRAFT)
    description    String?
    postedAt       DateTime?                   @map("posted_at")
    postedBy       String?                     @map("posted_by")
    lockedAt       DateTime?                   @map("locked_at")
    lockedBy       String?                     @map("locked_by")
    createdBy      String                      @map("created_by")
    createdAt      DateTime                    @default(now()) @map("created_at")
    updatedAt      DateTime                    @updatedAt @map("updated_at")

    tenant       Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
    fiscalPeriod FiscalPeriod @relation(fields: [fiscalPeriodId], references: [id])
    lines        OpeningBalanceSessionLine[]

    @@unique([tenantId, number])
    @@index([tenantId])
    @@index([tenantId, status])
    @@map("opening_balance_sessions")
}

model OpeningBalanceSessionLine {
    id            String                   @id @default(uuid())
    tenantId      String                   @map("tenant_id")
    sessionId     String                   @map("session_id")
    dimension     OpeningBalanceDimension
    accountId     String?                  @map("account_id")
    partyId       String?                  @map("party_id")
    cashboxId     String?                  @map("cashbox_id")
    bankAccountId String?                  @map("bank_account_id")
    currencyId    String?                  @map("currency_id")
    partySide     OpeningBalancePartySide? @map("party_side")
    amount        Decimal                  @db.Decimal(18, 4)
    exchangeRate  Decimal                  @default(1) @map("exchange_rate") @db.Decimal(18, 6)
    createdAt     DateTime                 @default(now()) @map("created_at")
    updatedAt     DateTime                 @updatedAt @map("updated_at")

    session     OpeningBalanceSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
    tenant      Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)
    party       Party?                @relation(fields: [partyId], references: [id])
    cashbox     Cashbox?              @relation(fields: [cashboxId], references: [id])
    bankAccount BankAccount?          @relation(fields: [bankAccountId], references: [id])
    account     ChartOfAccount?       @relation(fields: [accountId], references: [id])
    currency    Currency?             @relation(fields: [currencyId], references: [id])

    @@index([tenantId, sessionId])
    @@map("opening_balance_session_lines")
}
```

Back-relations: add `openingBalanceSessionLines OpeningBalanceSessionLine[]` to Party, Cashbox, BankAccount, ChartOfAccount, Currency; `openingBalanceSessions OpeningBalanceSession[]` to FiscalPeriod; `openingBalanceSessions` + `openingBalanceSessionLines` to Tenant.

Commands: `pnpm --filter @devloggers/db-prisma exec prisma migrate dev --schema=src/schema --name add_opening_balance_sessions`; `pnpm --filter @devloggers/db-prisma db:generate`; verify both typechecks.

---

## Task 2 — Posting contracts: `OpeningSessionPostedIntent`

Modify `apps/api/src/modules/accounting/posting/contracts/posting-intent.ts` and `.../posting/index.ts` (add `OpeningSessionLineDraft` + `OpeningSessionPostedIntent`, add to `PostingRecordIntent`, export). Verify `api typecheck`.

---

## Task 3 — Shared `openingLineSide` util + refactor legacy policy

Create `apps/api/src/modules/accounting/accounts/utils/opening-line-side.ts`; rewrite `opening-balance.policy.ts` onto it (drop `(entry as any)` casts, behavior-preserving). Verify `typecheck` + `test -- opening-balance.policy.spec`.

---

## Task 4 — `OpeningSessionPostedPolicy` + registry + module

Create `policies/opening-session.policy.ts` (resolve control accounts per dimension, validate, offset to opening equity); wire `OPENING_SESSION_POSTED → ReferenceType.OPENING_BALANCE` in registry + module. Verify `typecheck` + `test`.

---

## Task 5 — Subledger services: cash, bank, party

Create `apps/api/src/modules/accounting/opening-balances/services/{opening-cash,opening-bank,party-opening-balance}.service.ts` with `toLineDraft`, `post` (single-line intent via facade in `$transaction`), and cash/bank `syncProjection`. Verify `typecheck`.

---

## Task 6 — Sessions API module (4-layer)

Create `opening-balances/dto`, `sessions/{repository,presenter,service,controller}`, `opening-balances.module.ts`; wire into `accounting.module.ts`. Strict lifecycle guards. Verify `typecheck`, `test`, `pnpm generate`.

---

## Task 7 — api-contracts resource + api-client + registration

Resource `opening-balance-session.resource.ts` (CRUD + validate/review/post/lock routes), export, `OpeningBalanceSessionsClient` (CrudClient + custom methods), register in api.ts. Verify builds.

---

## Task 8 — Document-sequence seed (idempotent)

Add `DOC_SEQ_OPENING` id + seed row with `skipDuplicates: true`. Verify `db:seed`.

---

## Task 9 — Drift report: subledger checks

DTOs + service methods (`checkCashSubledgers`, `checkPartySubledgers`, `checkBankSubledgers`, `checkBankAccounts`, `diffPerCurrency`); include OPENING_BALANCE cash lines in `checkCashboxes`. Verify `typecheck`, `test`, `pnpm generate`.

---

## Task 10 — Party deprecation: remove `openingBalance` surface

Remove from party DTOs, presenter, dashboard parties config + form. Verify `api typecheck`, `pnpm generate`, `api-contracts build`, `dashboard typecheck`.

---

## Task 11 — One-shot backfill `Party.openingBalance` → sessions

Create `apps/api/scripts/backfill-party-opening-balances.ts` (+ package.json script) with `--dry-run` detector; run dry-run then real backfill until `blocked=0`.

---

## Task 12 — Migration 2: drop `parties.opening_balance`

Remove field from `party.prisma`, `prisma migrate dev --name drop_party_opening_balance`, `db:generate`. Verify typecheck + test.

---

## Task 13 — Inventory: unify item-create opening stock with GL

Extract `InventoryService.registerOpeningStockTx`; use it in `registerOpeningBalance` and `ItemsService.create`. Verify `typecheck` + `test`.

---

## Task 14 — Dashboard: minimal sessions page, replace legacy grid

Create `apps/dashboard/modules/opening-balance-sessions/` (hook, form, page), update `/finance/opening-balances/page.tsx`, delete `modules/opening-balances/`, add i18n keys (en/ar/tr). Verify `dashboard typecheck` + `lint`.

---

## Task 15 — Final verification + baseline

`api typecheck`, `api lint`, `api test`, `pnpm turbo run build --filter=@devloggers/api`, `dashboard lint`, `pnpm generate`, record drift baseline; cross-check all 10 success criteria.

---

## Execution notes (post-implementation deviations)

- **Sessions service is standalone** (extends nothing), not `CrudService`. The api-contracts resource types are validated against the generated OpenAPI `paths`, which only exist after the API module compiles + `pnpm generate` — a CrudService referencing `resources.openingBalanceSessions.key` would create a build cycle (api-contracts build needs generated paths; generated paths need the API to compile; the API needs api-contracts dist). A standalone service (like the existing `OpeningBalancesService`) has no such dependency.
- **Column drop took two Prisma migrations.** `prisma migrate dev` refuses destructive column drops in non-interactive environments (the data-loss warning needs a human). `migrate dev --create-only` and `migrate diff` both refused or required a shadow DB. The clean path: `make_party_opening_balance_nullable` (drops NOT NULL — non-destructive), then NULL the zero placeholder values, then `drop_party_opening_balance`. All SQL is Prisma-generated.
- **The one-shot backfill script was removed after the drop.** It referenced `party.openingBalance`, which no longer exists in the generated client once the column is dropped. It ran on the dev DB (`migrated=0 blocked=0` — all legacy values were seed zeros). Recreate from git history (`05ed444`) if a future environment has real data to preserve.
- **Seed consistency fix:** the seeded `JE-00001` opening JE posted 5,000,000 to Cash GL with no `cashboxId`, which the new `checkCashSubledgers` check surfaced as drift. The seed now attributes the Cash line to `CASH-SYP`/`SYP` and sets that cashbox's `balance` to match. Fresh DBs are consistent; the dev DB was patched in place.
- Verified against the real DB: `BalanceDriftService.getReport(seedTenant)` → `clean: true` (all 7 sections empty).
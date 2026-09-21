# Phase 10.2 — Opening Balance UI (Sessions) — Design

**Date:** 2026-09-21  
**Author:** agent  
**Status:** Approved 2026-09-21  
**Scope:** Roadmap Phase 10.2 — [phase-10-business-setup-ui-import-readiness.md](2026-08-20-erp-roadmap/phase-10-business-setup-ui-import-readiness.md) §10.2  
**Primary goal:** Make the opening-balance session workflow the real, usable way to enter cash, bank, AR/AP and GL openings — multi-line drafts, a pre-post currency-specific party preview, and one-click validate→review→post behind a confirm dialog — and retire the dead legacy GL opening endpoint.

---

## Context

Phase 3 shipped the opening-balance session backend (`apps/api/src/modules/accounting/opening-balances/`) with a mixed-dimension line model (`CASHBOX | BANK_ACCOUNT | PARTY | ACCOUNT`), a `DRAFT → VALIDATED → REVIEWED → POSTED → LOCKED` lifecycle, posting through `AccountingPostingFacade` + `OpeningSessionPostedPolicy`, and cash/bank projection sync. The dashboard session UI (`apps/dashboard/modules/opening-balance-sessions/`) is minimal and not workflow-shaped:

- The create dialog builds **exactly one line per session** (`opening-balance-session-form.tsx`), so entering 4 cashboxes + 3 banks + 180 customers is one session each.
- `postSession` chains `validate → review → post` unconditionally (`use-opening-balance-sessions.ts:104-111`), which **fails for an already-VALIDATED session** (the service only allows `validate` from DRAFT).
- There is no session detail/edit/delete UI, no line rendering, no error surfacing, and no posting-gated permission check in the page.
- The legacy account-grid UI was deleted in Phase 3 (`c9de50a`), but the legacy backend (`POST /accounting/opening-balances`), its `AccountOpeningBalancesClient`, contract resource and stale `dashboard.openingBalances` i18n blocks remain live and have **zero dashboard consumers**. The Phase 3 plan explicitly left them for Phase 10 to remove.
- The reports party statement (`ReportsService.getPartyStatement`) is not currency-aware — it sums all currencies (an ADR-5 violation) and excludes opening postings. This design deliberately does **not** touch it; the 10.2.2 preview is session-scoped and currency-separated.

Design decisions (user-approved 2026-09-21):

| # | Decision |
|---|----------|
| D1 | One **mixed multi-line session** — any combination of cash, bank, party and GL lines in one draft; one balanced opening JE per session. |
| D2 | **Session-scoped preview** computed server-side by dry-running the real posting policy; the reports statement is out of scope. |
| D3 | **One-click validate→review→post** stays, gated by a **confirm dialog showing the preview**. No `reviewedAt`/`reviewedBy` columns; no migration. |
| D4 | The session editor is a **dialog on the list page**; no detail route. |
| D5 | **Retire** the dead legacy GL opening surface. |

---

## Functional requirements

- [ ] 10.2.1 — A DRAFT session accepts many lines across all four dimensions; the editor groups lines by dimension (Cash / Bank / Parties / GL) with add/remove rows and per-currency entered totals.
- [ ] 10.2.1 — Sessions can be viewed (read-only), edited and deleted while DRAFT; posted/locked sessions are read-only; posted sessions can be locked.
- [ ] 10.2.2 — `GET /accounting/opening-balance-sessions/:id/preview` returns, per currency, the session's base debit/credit/net and the auto offset to opening equity, plus one row per (party, side, currency) with opening amount, current posted balance and resulting balance. Currencies are never summed together (ADR-5).
- [ ] 10.2.2 — The Post action opens a confirm dialog that fetches and renders the preview; a preview error (missing mapping, non-postable account, no lines) is shown and blocks posting.
- [ ] 10.2.3 — Posting from any non-terminal status resumes the lifecycle correctly: DRAFT → validate → review → post, VALIDATED → review → post, REVIEWED → post.
- [ ] D5 — `POST /accounting/opening-balances` and every artifact that exists only to serve it are deleted; sessions become the only opening-balance path.
- [ ] Mutating actions (New/Edit/Save/Delete/Post/Lock) render only for users with `openingBalances.manage`; list/view works with `openingBalanceSessions.view`.

## Non-functional requirements

- [ ] No Prisma migration — the session schema is unchanged.
- [ ] Tenant isolation on every query (`tenantId` in every `where`).
- [ ] i18n: every new string in `packages/i18n/src/{en,ar,tr}/business.json` under `business.resources.openingBalanceSessions`; logical CSS only (RTL).
- [ ] Swagger decorators on every new DTO field with explicit `type`/`enum`/`nullable`; run `pnpm generate` and commit `apps/api/openapi.yaml` + `packages/api-contracts/types/index.ts`.
- [ ] Every new controller route carries `@RequirePermission` (enforced by `enforcement-coverage.spec.ts`).
- [ ] Repositories for writes — the preview service is read-only and may use `PrismaService` for reads, mirroring the sessions service's read paths.

---

## Backend design

### Preview endpoint

```
GET /accounting/opening-balance-sessions/:id/preview
Permission: openingBalances.manage
Response: OpeningBalanceSessionPreviewDto
```

Permission is `openingBalances.manage` (not `.view`) because the payload is a computed posting preflight intended for the confirm-post flow.

New `OpeningBalanceSessionPreviewService` at `apps/api/src/modules/accounting/opening-balances/sessions/opening-balance-session-preview.service.ts`:

1. `repo.findWithLines(tenantId, id)` → 404 `Opening balance session not found` when absent/other tenant.
2. Load the session's fiscal period (`startDate`, `status`) → 400 `Fiscal period not found` when absent.
3. Build an `OpeningSessionPostedIntent` exactly like `OpeningBalanceSessionsService.post()` does (kind `OPENING_SESSION_POSTED`, `date = fiscalPeriod.startDate`, `exchangeRate = 1`, `referenceId = session.id`, mapped lines via `lineDraftFromEntity`).
4. **Dry-run `OpeningSessionPostedPolicy.buildLines(prisma, intent)`.** This resolves every line's GL account from `FinancialSettings` + party overrides, validates postable/active/account type, and appends the opening-equity offset — the preview therefore fails with the same `BadRequestException` messages post would produce, and never writes.
5. The policy pushes one draft per intent line in order, then the optional offset draft last. Zip drafts to lines by index to recover `dimension`, `partySide` and identifiers; treat a final extra draft as the offset.
6. Aggregate **per currency** (never across): sum `debit`/`credit` from the **session-line drafts only** (the offset draft is reported separately, not folded into a currency bucket), already base-currency values from `openingLineSide`, `net = round(debit - credit)`.
7. For every distinct `(accountId, partyId, currencyId)` among PARTY drafts, read the currently posted balance:
   ```
   prisma.journalLine.groupBy({
     by: ['currencyId'],
     where: { tenantId, accountId, partyId, journalEntry: { status: 'POSTED' } },
     _sum: { debit: true, credit: true },
   })
   ```
   `currentBalance = Σ(debit - credit)` for the line's currency; `resultingBalance = round(currentBalance + openingNet)` where `openingNet = draft.debit - draft.credit`. Aggregate duplicate (party, side, currency) session lines into one row.
8. Resolve display names in batch: `chartOfAccount` (code, name), `party` (name), `cashbox` (name), `bankAccount` (name), `currency` (code).

Wiring: `PostingModule` adds `OpeningSessionPostedPolicy` to `exports`; `OpeningBalancesModule` adds `OpeningBalanceSessionPreviewService` to `providers`. If `PrismaService` does not structurally satisfy `PrismaTransactionClient`, call the policy inside a read-only `this.prisma.$transaction(...)`.

### Preview DTOs

New `apps/api/src/modules/accounting/opening-balances/dto/opening-balance-session-preview.dto.ts`:

```ts
export class OpeningBalancePreviewCurrencyTotalDto {
    currencyId: string | null;   // null = base-currency bucket (ACCOUNT lines without a currency)
    currencyCode: string | null;
    debit: number;               // base-currency value
    credit: number;              // base-currency value
    net: number;                 // debit - credit, 4dp
}

export class OpeningBalancePreviewOffsetDto {
    accountId: string;           // defaultOpeningEquityAccountId
    accountCode: string;
    accountName: string;
    amount: number;              // |base imbalance|, 4dp
}

export class OpeningBalancePreviewLineDto {
    dimension: 'CASHBOX' | 'BANK_ACCOUNT' | 'PARTY' | 'ACCOUNT';
    accountId: string;
    accountCode: string;
    accountName: string;
    partyId: string | null;
    partyName: string | null;
    cashboxId: string | null;
    cashboxName: string | null;
    bankAccountId: string | null;
    bankAccountName: string | null;
    currencyId: string | null;
    currencyCode: string | null;
    amount: number;              // signed transaction-currency amount from the zipped session line (policy drafts store |amount|)
    exchangeRate: number;
    debit: number;               // base
    credit: number;              // base
}

export class OpeningBalancePreviewPartyDto {
    partyId: string;
    partyName: string;
    side: 'AR' | 'AP';
    accountId: string;           // resolved AR/AP control account
    accountCode: string;
    currencyId: string;
    currencyCode: string;
    openingNet: number;          // base, signed
    currentBalance: number;      // base, posted lines for this party+account+currency
    resultingBalance: number;    // round(currentBalance + openingNet)
}

export class OpeningBalanceSessionPreviewDto {
    sessionId: string;
    number: string;
    status: string;
    currencyTotals: OpeningBalancePreviewCurrencyTotalDto[];
    offset: OpeningBalancePreviewOffsetDto | null;  // null when the session is balanced
    lines: OpeningBalancePreviewLineDto[];
    parties: OpeningBalancePreviewPartyDto[];
}
```

All fields carry explicit `@ApiProperty`/`@ApiPropertyOptional` annotations with `type`, `enum`/`enumName`, `isArray` and `nullable` where applicable. The enum sources are the existing `OPENING_SESSION_DIMENSIONS` / `OPENING_SESSION_PARTY_SIDES` constants.

### Contracts and client

- `packages/api-contracts/src/resources/opening-balance-session.resource.ts` gains `preview: '/accounting/opening-balance-sessions/{id}/preview'`.
- `packages/api-client/src/clients/opening-balance-sessions.client.ts` gains `preview(id: string): Promise<ApiResponse<typeof resource.routes.preview, 'get'>>`.
- `pnpm generate` regenerates `apps/api/openapi.yaml` + `packages/api-contracts/types/index.ts`.

### Legacy retirement (D5)

Delete:

| Artifact | Path |
|---|---|
| Controller | `apps/api/src/modules/accounting/accounts/controllers/opening-balances.controller.ts` |
| Service | `apps/api/src/modules/accounting/accounts/services/opening-balances.service.ts` |
| DTOs | `apps/api/src/modules/accounting/accounts/dto/opening-balance.dto.ts` |
| Policy + spec | `apps/api/src/modules/accounting/posting/policies/opening-balance.policy.ts`, `.spec.ts` |
| Contract resource | `packages/api-contracts/src/resources/account-opening-balance.resource.ts` |
| Client | `packages/api-client/src/clients/account-opening-balances.client.ts` |
| i18n | stale `dashboard.openingBalances` blocks in `packages/i18n/src/{en,ar,tr}/business.json` |

Modify: `accounts.module.ts` (drop controller + provider), `posting.module.ts` (drop `OpeningBalancePolicy`), `posting-policy.registry.ts` (drop the `OPENING_BALANCE_POSTED` case + dependency), `packages/api-contracts/src/resources/index.ts` (registrations), `packages/api-client/src/api.ts` (registration), `posting-intent.ts` (drop `OpeningBalancePostedIntent`/`OPENING_BALANCE_POSTED`). Any step that finds another consumer of these symbols stops and re-plans rather than guessing.

---

## Dashboard design

### Hooks — `modules/opening-balance-sessions/hooks/use-opening-balance-sessions.ts`

Queries: sessions list, OPEN fiscal periods, cashboxes, bank accounts, parties, currencies, postable balance-sheet accounts (existing). New:

- `updateSession` — `update(id, { description, lines })`, invalidates the list.
- `deleteSession` — `destroy(id)`, invalidates the list.
- `postSession` — status-aware, variables `{ id, status }`:
  ```ts
  if (status === "DRAFT") await api[...].validate(id)
  if (status === "DRAFT" || status === "VALIDATED") await api[...].review(id)
  await api[...].post(id)
  ```
  All steps are awaited in order and surfaced through a toast on error; partial failure leaves the session in a resumable status and the button chain resumes correctly.
- `lockSession` — unchanged behaviour, plus toast.
- `preview(sessionId)` — `useQuery` with `enabled: Boolean(sessionId)`, key `[openingBalanceSessionResource.key, sessionId, "preview"]`, used by the confirm dialog.

All mutations invalidate the `[openingBalanceSessionResource.key]` query prefix after success, which also drops cached preview queries (preview keys are nested under it).

### List page — `components/opening-balance-sessions-page.tsx`

| Column | Content |
|---|---|
| Number | session number |
| Status | badge (existing status keys) |
| Description | `description ?? "—"` |
| Fiscal period | resolved period label |
| Date | `postedAt ?? createdAt` |

Row actions, rendered per status and only when `can("openingBalances.manage")` for mutations:

| Action | Statuses | Behaviour |
|---|---|---|
| View | all | opens the editor dialog read-only |
| Edit | DRAFT | opens the editor dialog |
| Post | DRAFT, VALIDATED, REVIEWED | opens the confirm dialog with preview |
| Lock | POSTED | confirm dialog, then `lockSession` |
| Delete | DRAFT | confirm dialog, then `deleteSession` |

A view-only user sees the table and View but no New/Edit/Post/Lock/Delete buttons (`usePermissions`).

### Editor dialog — `components/opening-balance-session-dialog.tsx`

Replaces `opening-balance-session-form.tsx`. Props: `open`, `onOpenChange`, `sessionId: string | null` (null = create).

- **Header:** title (New / Edit / session number), status badge in edit/view mode.
- **Meta:** fiscal period select (create only; read-only in edit/view — the backend cannot change it) and description input.
- **Line sections:** tabs `Cash / Bank / Parties / GL`, each rendering its own row table:
  - Cash: cashbox select, currency select, amount, exchange rate (default 1).
  - Bank: bank account select, currency select, amount, exchange rate.
  - Parties: party select filtered by side, side select (AR/AP), currency select, amount, exchange rate; party options filtered to CUSTOMER for AR and SUPPLIER for AP.
  - GL: postable ASSET/LIABILITY/EQUITY account select, amount, exchange rate.
  - Every row has a remove button; each tab has an “Add line” button; empty tabs show a muted “no lines” hint.
- **Footer:** per-currency sum of entered signed amounts (client-side display only — debit/credit/offset semantics are server-owned and shown in the post preview); total line count.
- **Actions:** Cancel; Save draft (create or update, stays open on the saved record); Delete (DRAFT only); Post (DRAFT/VALIDATED/REVIEWED, opens the confirm dialog); Close. In view mode (POSTED/LOCKED) inputs are disabled and only Close is shown.
- **Validation:** at least one line; every row must carry its dimension's required target and, for cash/bank/party, a currency; amount numeric; exchange rate > 0. Invalid state disables Save with inline hints.
- **Errors:** server errors (e.g. `Cannot modify a session in POSTED status`) surface via toast; the dialog state is refetched on error so the UI never diverges silently.

### Post confirm dialog — `components/opening-balance-post-dialog.tsx`

- Fetches the preview when opened; loading skeleton while pending.
- Summary: per-currency total table (debit / credit / net), the auto-offset line ("difference X posts to `<code> <name>`") or an explicit balanced note, and the party table (`party / side / currency / opening / current / resulting`).
- When the preview request fails, the error message is rendered in the dialog and **Confirm is disabled**.
- Confirm calls `postSession.mutate({ id, status })`, closes on success after a success toast; Cancel closes without side effects.

---

## File map

```
apps/api/src/modules/accounting/opening-balances/
  sessions/opening-balance-session-preview.service.ts        [new]
  sessions/opening-balance-session-preview.service.spec.ts   [new]
  sessions/opening-balance-sessions.controller.ts            [modify — preview route]
  dto/opening-balance-session-preview.dto.ts                 [new]
  opening-balances.module.ts                                 [modify]
apps/api/src/modules/accounting/posting/
  posting.module.ts                                          [modify — export policy]
  posting-policy.registry.ts                                 [modify — drop legacy case]
  contracts/posting-intent.ts                                [modify — drop legacy intent]
  policies/opening-balance.policy.ts                         [delete]
  policies/opening-balance.policy.spec.ts                    [delete]
apps/api/src/modules/accounting/accounts/
  controllers/opening-balances.controller.ts                 [delete]
  services/opening-balances.service.ts                       [delete]
  dto/opening-balance.dto.ts                                 [delete]
  accounts.module.ts                                         [modify]
packages/api-contracts/src/resources/
  opening-balance-session.resource.ts                        [modify]
  account-opening-balance.resource.ts                        [delete]
  index.ts                                                   [modify]
packages/api-client/src/
  clients/opening-balance-sessions.client.ts                 [modify]
  clients/account-opening-balances.client.ts                 [delete]
  api.ts                                                     [modify]
packages/api-contracts/types/index.ts                        [regenerated]
apps/api/openapi.yaml                                        [regenerated]
packages/i18n/src/{en,ar,tr}/business.json                   [modify]

apps/dashboard/modules/opening-balance-sessions/
  hooks/use-opening-balance-sessions.ts                      [rewrite]
  components/opening-balance-sessions-page.tsx               [rewrite]
  components/opening-balance-session-dialog.tsx              [new]
  components/opening-balance-post-dialog.tsx                 [new]
  components/opening-balance-session-form.tsx                [delete]
  opening-balance-sessions.utils.ts                          [new]
  opening-balance-sessions.utils.test.ts                     [new]
```

---

## Testing

**API (Jest, mocked constructor injection — house style):**

- `opening-balance-session-preview.service.spec.ts`:
  1. balanced session → currency totals per bucket, `offset: null`, resolved line names, no party rows when no party lines;
  2. imbalanced session → `offset` points at the opening-equity account with `amount = |diff|`;
  3. same party in two currencies → two party rows, each with its own current/resulting balance, no cross-currency sum;
  4. party with existing posted lines → `currentBalance` from `journalLine.groupBy`, `resultingBalance = current + openingNet`;
  5. policy `BadRequestException` (missing default cash account) propagates — preview exposes the same preflight failure as post;
  6. unknown / other-tenant session → `NotFoundException`.
- `opening-balance-sessions.service.spec.ts` stays green (no behaviour change).
- `enforcement-coverage.spec.ts` covers the new route's `@RequirePermission`.
- Full `business-setup`/accounting-adjacent suites stay green after the legacy deletion (the plan verifies every removed symbol is unreferenced with grep before deleting).

**Dashboard (Vitest, node env, `modules/**/*.test.ts` only):**

- `opening-balance-sessions.utils.test.ts` for the pure helpers extracted from the dialog and hook:
  - per-currency entered totals from lines (signed amounts, no currency mixing);
  - post-chain selection for each status (`DRAFT → [validate, review, post]`, `VALIDATED → [review, post]`, `REVIEWED → [post]`, terminal → `[]`);
  - line grouping per dimension and default new-line factory shape.
- Component/DTO correctness is verified by `pnpm --filter @devloggers/dashboard typecheck` + `pnpm turbo run build --filter=@devloggers/dashboard`.

**Generated contract checks:**

- `Select-String packages/api-contracts/types/index.ts -Pattern 'OpeningBalanceSessionPreviewDto|OpeningBalancePreviewPartyDto'`;
- `grep "opening-balance-sessions/{id}/preview" apps/api/openapi.yaml`;
- `grep` proves `account-opening-balances` / `OPENING_BALANCE_POSTED` are gone from `apps/api/src`, `packages/api-*`.

## Verification

```bash
pnpm --filter @devloggers/api test
pnpm turbo run build --filter=@devloggers/api
pnpm generate
pnpm turbo run build --filter=@devloggers/api-contracts --filter=@devloggers/api-client --filter=@devloggers/i18n
pnpm --filter @devloggers/dashboard typecheck
pnpm --filter @devloggers/dashboard test:unit
pnpm turbo run build --filter=@devloggers/dashboard
```

Manual acceptance: create a mixed session (2 cashboxes in different currencies, 1 bank line, 2 customer AR lines in different currencies, 1 GL line) → save draft → reopen and edit → Post → confirm dialog shows per-currency totals, the opening-equity offset and per-party current→resulting balances → confirm → session POSTED, setup hub marks the corresponding `OPENING_*` tasks complete from discovery → Lock → session read-only → unmatched mapping (clear `defaultCashAccountId`) makes the preview fail with the policy message and Confirm disabled.

## Out of scope

- Phase 10.3 import pipeline (CSV bulk opening entry) — the answer to 180-customer bulk loads.
- Currency-aware refactor of `ReportsService.getPartyStatement` (ADR-5 fix split out; preview is session-scoped).
- `reviewedAt` / `reviewedBy` columns and reviewer identity (D3).
- Removing the business-setup direct-posting handlers (`PATCH /business-setup/tasks/OPENING_*`) — they remain reachable but unused by the dashboard.
- The inventory opening-stock page and its grid.

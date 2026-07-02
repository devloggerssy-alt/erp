# Chart of Accounts — Balances Master-Detail

**Date:** 2026-07-02
**Branch:** `feat/account-balances-explorer`
**Status:** Approved design

## Problem

Users cannot reliably see account balances. The chart-of-accounts tree already
renders a per-node `currentBalance`, but that value is a denormalized cache
(`ChartOfAccount.currentBalance`) that is only incremented on the *exact* account
a journal line hits. Because postings land on **leaf** accounts, **parent accounts
never accumulate** and sit at 0 — and any missed posting path makes the cache drift.
The result: balances read as empty or wrong, and there is no usable balances view.

## Goal

Rebuild the chart-of-accounts page as a **master-detail balances explorer**:
a tree navigator on the side, and a main panel that lists the selected account's
sub-accounts with correct, rolled-up balances computed from the ledger — with
drill-down into a leaf account's journal lines.

## Chosen approach

**Ledger-computed balances, compute-on-read, client-side drill (Approach A).**

- One endpoint returns *all* accounts with balances in a single payload; the
  frontend builds both the tree and the main table from it, so parent→child
  navigation is instant client-side work (no refetch).
- Balances are computed from `JournalLine` (the source of truth) on every read,
  eliminating cache drift. The chart of accounts is bounded (dozens–hundreds of
  rows), so a single grouped aggregate is cheap.
- Leaf ledger detail is a second, paginated endpoint.

Rejected alternatives:
- **Per-selection lazy endpoints** — rollup needs the whole subtree aggregated
  anyway, so lazy fetching adds round-trips and spinners for no gain.
- **Repair/maintain the `currentBalance` cache (incl. parent rollups)** — touches
  every posting path, rollup-on-write is drift-prone, and would still need a
  recompute/verify tool. Fights the problem instead of eliminating it.

The drifting `currentBalance` cache is left untouched (out of scope). The ledger
is the source of truth for display.

## Section 1 — Backend

Two custom routes on the existing accounts controller
(`apps/api/src/modules/accounting/accounts/`).

### `GET /accounts/balances`

Returns all tenant accounts with computed balances, **unpaginated**.

```
AccountBalanceDto {
  id, code, name (localized), nameI18n, type, parentId, isActive,
  ownBalance:    number   // Σ(debit − credit) on lines hitting THIS account, signed by normal side
  rolledBalance: number   // ownBalance + Σ children.rolledBalance (post-order rollup)
}
```

Service computation:
1. Load all accounts (`id, code, name, type, parentId, isActive`).
2. `journalLine.groupBy({ by: [accountId], _sum: { debit, credit },
   where: { tenantId, journalEntry: { is: { status: POSTED } } } })` — one query.
3. `ownBalance` via existing `getAccountBalanceDelta(type, debit, credit)`
   (`account-balance.utils.ts`).
4. `rolledBalance` via post-order traversal of the parent map, reusing the
   **cycle-guard pattern** already in `build-account-tree.ts`.

### `GET /accounts/:id/ledger?page&limit`

Paginated journal lines for one account, `POSTED` only, newest first.

```
AccountLedgerLineDto {
  id, date, entryNumber, description, referenceType, referenceId,
  debit: number, credit: number
}
```

Running-balance column is deferred (it fights pagination); the panel header shows
the account's total instead.

### Implementation risk (flagged)

`/accounts/balances` must resolve **before** the factory-generated `/accounts/:id`,
or `balances` is captured as an `:id`. Verify route registration order and guard
if needed. This is the one non-obvious risk.

## Section 2 — Contracts + client

- `account.resource.ts`: add routes
  `balances: '/accounts/balances'`, `ledger: '/accounts/{id}/ledger'`.
- `account.dto.ts`: add `AccountBalanceDto`, `AccountLedgerLineDto` with complete
  `@ApiProperty` / `@ApiPropertyOptional` decorators per `.ai/rules/api.md`.
- `AccountsClient`: add `balances()` and `ledger(id, query)` methods.
- Run `pnpm generate` to regenerate OpenAPI types; drop the module-local
  `AccountListItem` workaround if the generated type now suffices.

## Section 3 — Frontend layout & interaction

Rebuild `accounts-page.tsx` as a two-column master-detail (logical `start`/`end`,
stacks on mobile).

```
┌ Toolbar: expand/collapse · search · [+ Add] ────────────────┐
├───────────────┬─────────────────────────────────────────────┤
│  TREE (side)  │  MAIN PANEL                                   │
│  reused       │  Breadcrumb: Root ▸ Assets ▸ Cash             │
│  AccountsTree │  Header: selected account + rolled balance    │
│  manage mode  │  ┌ Balances table ────────────────────────┐  │
│  + CRUD       │  │ Code · Name · [Type] · Balance · ›      │  │
│  actions      │  │ (children of selection; roots if null)  │  │
│  = navigator  │  └─────────────────────────────────────────┘  │
└───────────────┴─────────────────────────────────────────────┘
```

- **Data:** one `useAccountBalances()` TanStack query feeds both the tree and the
  table. Tree click sets `selectedId`.
- **Main table = children of `selectedId`**, or top-level roots grouped by type
  when `selectedId` is null.
- **Row click:** parent → drills in (`setSelectedId`); leaf → switches the main
  panel to the **ledger view** (`api.accounts.ledger`) with a Back button.
- **Breadcrumb:** built by walking parents from `selectedId`; crumbs are clickable.
- **CRUD stays:** the tree keeps add/edit/delete (existing `AccountsResource` +
  `FormDialog`); on any mutation, invalidate the balances query.
- **Balance cells:** locale-formatted, 2 decimals, `text-destructive` when negative
  (matches the current tree style).

The ledger detail **takes over the main panel** (not a side drawer). The
null-selection view **groups roots by type**.

## Section 4 — i18n, edge cases, testing

- **i18n:** new keys under `business.resources.accounts.*` (balances, ledger,
  breadcrumb, back, column headers, empty states) in `en` / `ar` / `tr`.
- **Edge cases:** orphan `parentId` → treated as root; cycle guard on rollup;
  inactive accounts shown muted; empty ledger → empty state; zero balance shown as
  `0.00`.
- **Tests:** backend unit test for rollup / sign-by-type / cycle-guard and ledger
  POSTED-only ordering + pagination; frontend pure-function tests for the
  "children-of-selected" selector and the breadcrumb-path builder.

## Out of scope (YAGNI)

As-of / period date filter; running-balance column; currency prefixing;
hide-zero / active-only toggles; repairing the `currentBalance` cache.

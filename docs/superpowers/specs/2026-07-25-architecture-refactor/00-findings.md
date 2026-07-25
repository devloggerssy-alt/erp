# Findings — shared evidence base

> Read this once before executing any phase. Every phase spec cites these by number rather than
> repeating them. All figures were measured against the repo, not estimated; the commands used
> are given so they can be re-measured.

**Index:** [README](README.md)

---

## What exists today

The monorepo follows a consistent, well-documented vertical slice
(`Prisma → api-contracts → NestJS 4-layer → api-client → dashboard generateResource`).
That structure is sound and is **not** what this refactor changes. What it changes is the
**semantic coupling** that grew inside that structure.

| Area | Files |
|---|---|
| GL posting engine | `apps/api/src/modules/accounting/accounts/services/journal-posting.service.ts` |
| GL account resolution | `apps/api/src/modules/accounting/financial-settings/services/financial-settings.service.ts` |
| JE numbering | `apps/api/src/modules/accounting/document-sequences/services/document-sequences.service.ts` |
| Period guard | `apps/api/src/modules/accounting/accounts/utils/assert-period-open.ts` |
| Journal line builders | `invoicing/invoices/invoice-journal.ts`, `invoicing/payments/payment-journal.ts`, `invoicing/expenses/expense-journal.ts`, `accounting/accounts/utils/inventory-journal.ts` |

## System review summary

Overall: **6.2 / 10** — a well-structured skeleton with a thin enforcement layer.

| Dimension | Score | Evidence |
|---|---|---|
| Layering & conventions | 5.5 | The 4-layer pattern is excellent — but only **18 of 42 controllers** and **18 of 46 services** use it (F9) |
| Contracts / type pipeline | 4.5 | Pipeline is correct; **63 of 200 `2xx` responses generate as `unknown` or `never`** (F9) |
| Domain modeling (GL) | 6.5 | Double-entry, reversals, fiscal periods, perpetual COGS all present and correct |
| **Module coupling** | **3.5** | GL policy resolved inside 6 non-accounting services (F1) |
| **Type safety (API)** | **3.0** | `apps/api` is the only non-strict workspace — but the gap is only ~84 errors (F4) |
| **AuthZ** | **1.5** | `JwtAuthGuard` is the only guard; no permission model (F6) |
| **Auditability** | **2.0** | `AuditLog` model + read API exist; nothing writes to it (F5) |
| Testing | 4.0 | 23 spec files across ~37k LOC; 3 in dashboard, 1 in packages |
| Financial reporting | 3.0 | No trial balance, P&L, or balance sheet (F7) |

---

## F1 — GL coupling is semantic, not merely structural

Ten call sites across six services call `journalPosting.post()` / `.reverse()`:

| Service | Lines |
|---|---|
| `accounting/accounts/services/opening-balances.service.ts` | 134 |
| `inventory/inventory.service.ts` | 141 |
| `inventory/stock-counts/stock-counts.service.ts` | 139 |
| `invoicing/expenses/expenses.service.ts` | 146, 193 |
| `invoicing/invoices/invoice-posting.service.ts` | 98, 208, 283 |
| `invoicing/payments/payments.service.ts` | 145, 201 |

Each caller **also** resolves GL accounts, allocates the JE number, asserts the period is open,
and builds journal lines. `invoice-posting.service.ts:40-75` is representative: it reads
`FinancialSettings`, falls back from party-level to tenant-level payable/receivable accounts,
validates that an Inventory account exists, then calls `buildInvoiceJournalLines`. That is
accounting policy living in the invoicing module.

Violates `.ai/rules/domain.md` §1 (Sub-Ledger Isolation) in substance, even though the letter is
satisfied — movements do route through `JournalPostingService`.

**Addressed by:** Phase 1.

## F2 — The transaction handle is a load-bearing `any`

`journal-posting.service.ts:57` and `:118` type the transaction handle as `any`. This defeats
Prisma's `TransactionClient` type and is the direct cause of `tx as any` at
`inventory.service.ts:141` and `stock-counts.service.ts:139`.

**Addressed by:** Phase 1 task 1.2.

## F3 — The event infrastructure has zero consumers

`CrudService` emits `ResourceCreatedEvent` / `ResourceUpdatedEvent` / `ResourceDeletedEvent` on
every mutation. There are **no `@OnEvent` handlers anywhere in the API** — all nine grep matches
are documentation comments. There is also no outbox table, so moving GL posting to async events
today would break the ACID guarantee `.ai/rules/domain.md` §4 requires.

**Addressed by:** Phase 4 task 4.4.5 (give them consumers or stop emitting).

## F4 — `apps/api` is the only workspace that is not strict

`apps/api/tsconfig.json` does not extend `packages/typescript-config/base.json`. It sets
`"noImplicitAny": false`, `"strictBindCallApply": false`, and never sets `strict`.

Everything else already is strict: `apps/dashboard` sets `strict: true` directly; `backend-core`,
`api-contracts`, and `api-client` all extend the strict base. **`apps/api` is the sole hole.**

The gap is far smaller than it looks. `apps/api/tsconfig.json:19` **already sets
`strictNullChecks: true`** — normally 60–80% of a strict migration's cost. Per-flag measurement
(`cd apps/api && npx tsc --noEmit -p tsconfig.json --<flag>`; baseline is clean, exit 0):

| Flag | Errors | Nature |
|---|---|---|
| `strictBindCallApply` | **0** | free |
| `strictFunctionTypes` | **0** | free |
| `noImplicitThis` | **0** | free |
| `useUnknownInCatchVariables` | **0** | free |
| `alwaysStrict` | **0** | free |
| `noImplicitAny` | **3** | all `TS7016` — missing `@types/js-yaml`, `@types/passport-jwt`. **Zero application-code errors** |
| `strictPropertyInitialization` | **81** | all `TS2564`, all in DTO files |
| `noUncheckedIndexedAccess` | 24 | 17 in `.spec.ts`, 7 in source |

Full `strict: true` costs **84 errors, 81 of them one mechanical pattern**.

**Why this outranks everything else:** the verification loop the whole roadmap depends on is
`pnpm turbo run build --filter=@devloggers/api`. With `noImplicitAny: false`, that command exits 0
on refactors that dropped a parameter type or mistyped an intent field. Phase 1 moves ten posting
call sites across six services; Phase 1.5 rewrites four more. Golden masters cover the 10 posting
paths — **the type-checker is the only guardrail covering everything else.**

Repo-wide escape hatches: 404 `: any`, 112 `@ts-ignore`/`@ts-expect-error`, 67 `as never`,
55 `as unknown`, 34 `as any` in the dashboard, 27 in the API. These are *not* what the strict
flags catch — they are deliberate silencing, addressed by lint rules (Phase 0.4) and, for the
dashboard, by Phase 2 once response types exist.

**Addressed by:** Phase 0.4 (API side) and Phase 2 (client/dashboard side).

## F4b — Dead duplicate module trees

`src/modules/tenants/dto/tenant.dto.ts` and `src/modules/users/dto/user.dto.ts` are orphans left
from the `identity/` domain reorganisation — no module, no controller, zero imports anywhere in
`apps/api`. They still compile and contributed 9 of the 81 `TS2564` errors. Delete, don't fix.

**Status:** ✅ done — commit `a4e7f88`.

## F5 — `AuditLog` is write-never

`audit.service.ts` exposes `findMany`, `count`, and a `create` — but `create` has no callers
outside the module. No mutation path in the system records who did what.

**Addressed by:** Phase 5.

## F6 — No permission system

`Role` and `UserRole` models exist (`packages/db-prisma/src/schema/user.prisma:23,41`), and a
roles CRUD module exists. There is no `Permission` model, no `RolePermission` join, no
`PermissionsGuard`, and no `@RequirePermission()` decorator. **Any authenticated user can post,
cancel, and reverse journal entries.**

**Addressed by:** Phase 6 — blocking before the first production tenant.

## F7 — No financial statements

`reports.controller.ts` provides stock-balance, sales/purchase summary, customer/supplier
statements, and profit-summary. There is no Trial Balance, P&L, or Balance Sheet endpoint.

**Addressed by:** [gap register](gap-register.md), P0. Needs its own spec.

## F8 — Secondary issues

Soft delete (`deletedAt`) exists only on `ChartOfAccount`; 44 `console.log` calls in source
(including `ApiClient`'s constructor logging the API base URL on every instantiation);
15 `eslint-disable` comments; denormalized balance caches (`ChartOfAccount.currentBalance`,
`Cashbox.balance`, `StockBalance`) with no reconciliation job.

**Addressed by:** Phase 3 (deletion semantics), Phase 2 (logging), Phase 5 (reconciliation).

## F9 — The 4-layer pattern covers less than half the API, and the gap breaks the type pipeline

The `backend-core` base classes are good and the 18 modules using them are consistent. The problem
is everything else:

| Layer | Conforming | Total | Non-conforming |
|---|---|---|---|
| Service `extends CrudService` | 18 | 46 | 28 — 4 correctly extend `CrudExportServiceBase` / `CrudImportServiceBase` instead → **24 genuinely unlayered** |
| Controller via `createCrudController` | 18 | 42 | 24 |
| Presenter `extends CrudPresenter` | 24 | — | 5 exist but are wired at the controller, not the service (`invoices`, `stock-counts`, `inventory`, `users`, `tenants`) |

This is not cosmetic duplication. **It silently breaks the OpenAPI → TypeScript contract**, the
single mechanism `.ai/rules/code-quality.md` §4 depends on.

Hand-rolled controllers document responses with a literal example instead of a DTO:

```ts
// payments.controller.ts:23 — no response DTO
@ApiOkResponse({ description: 'Paginated list of payments', schema: { example: { … } } })

// expenses.controller.ts:22 — no schema at all
@ApiOkResponse({ description: 'Paginated list of expenses' })
```

`openapi-typescript` therefore has nothing to emit. Measured against the committed
`packages/api-contracts/types/index.ts`:

| Generated `2xx` response | Count | Usable by `CrudClient`? |
|---|---|---|
| Typed (`components["schemas"][…]`) | 137 | yes |
| `"application/json": unknown` | 39 | no |
| `content?: never` | 24 | no |

**63 of 200 (32%) success responses carry no type.** Every one traces to a hand-rolled
controller — `Payments.*`, `Expenses.*`, `Users.*`, `StockCounts.*`, `Accounting.*`, `Reports.*`,
`Inventory.*`, `Audit.*`, `AiChat.*`, `Tenants.*`, `Invoices.postInvoice/cancelInvoice/addPayment`,
`Accounts.restore/convertToGroup`, `OpeningBalances.postOpeningBalances`, `Files.uploadFile`,
`Dashboard.summary`.

The dashboard escape hatches counted in F4 are the **downstream symptom**, not the disease:

```
expenses.controller.ts:22   @ApiOkResponse({ description: '…' })     ← no response DTO
      ↓ pnpm generate
types/index.ts              "Expenses.findAll".responses.200.content?: never
      ↓
expenses-columns.tsx:36     const status = (row as any).status
expenses-columns.tsx:111    const cashbox = (row.original as any).cashbox
```

Seven of the dashboard's `as any` casts live in `modules/expenses` alone. Fixing them in the
dashboard is forbidden by `code-quality.md` §4 — the fix must be the missing response DTO.

Secondary consequence: hand-rolled `findAll` methods accept only ad-hoc query params
(`payments.controller.ts:19-22` → `type`, `status`, `page`, `limit`). They do **not** support the
`filterSchema`, `search`, `searchIn`, `sortField`, or `sortOrder` contract that
`createCrudController` generates and `generateResource` expects. These resources are structurally
unable to use the standard list toolbar.

**Addressed by:** Phase 1.5.

## F10 — `CrudService` as it stands does not fit transactional documents

The symmetry between `payments.service.ts`, `expenses.service.ts`, and `invoices.service.ts` is
real, but the base class cannot absorb them as written:

| Requirement of a financial document | `CrudService` today |
|---|---|
| Actor for `createdBy` / `postedBy` / audit | `create(tenantId, dto)` — **no `userId` parameter at all** |
| Document number from `DocumentSequencesService` | `create` spreads the DTO straight into `repository.create({ tenantId, ...dto })` |
| Derived fields (`totalAmount`, `unallocatedAmount`) and nested writes (`items: { create: [] }`) | flat DTO spread only |
| Status lifecycle verbs (`post`, `cancel`, `allocate`) | not modelled |
| **A `POSTED` document must never be hard-deleted** | `delete()` calls `repository.delete(id)` unconditionally |

That last row is the important one. `invoices.service.ts:380` correctly guards *"Only draft
invoices can be deleted. Posted invoices must be cancelled."* Making `InvoicesService extends
CrudService` without addressing this would **expose an unguarded hard-delete route on a posted
financial document** — precisely what `.ai/rules/domain.md` workflow rules forbid.

The base class is right for master data (`units`, `brands`, `currencies`); documents need a
sibling that adds actor, numbering, and lifecycle guards.

**Addressed by:** Phase 1.5 task 1.5.B.

## F11 — DTO field initializers silently disable input validation

Discovered while executing Phase 0.4; it invalidated this roadmap's original guidance.

The global `ValidationPipe` (`app.module.ts:63`) runs with `transform: true`, so `plainToInstance`
constructs the DTO class and **any field initializer becomes a real runtime value**. A field
absent from the request body therefore reaches the validators already populated — and passes.

Measured with `plainToInstance(Dto, {})` + `validateSync`, counting rejected fields:

| DTO style | Fields rejected on an empty body |
|---|---|
| No initializer | **5 / 5** |
| Value initializers | **1 / 5** — only the `@IsNotEmpty()` string |
| Definite assignment (`!`) | **5 / 5** |

Initializers defeat `@IsEnum`, `@IsBoolean`, `@IsNumber`, and `@IsArray` entirely. `@IsNotEmpty()`
strings survive only incidentally, because `''` is itself rejected.

The dangerous case is enums. `CreatePaymentDto.type: PaymentTypeEnum = PaymentTypeEnum.RECEIPT`
would let a client omit `type` and have the payment silently become a **RECEIPT** —
`payment-journal.ts` branches on exactly that value to choose the debit/credit direction. An
omitted field would post cash to the wrong side of the ledger.

`!` is a compile-time assertion with no runtime emit, so the field stays `undefined` and is still
rejected. **Request DTOs must use `!`; only response DTOs may use initializers.**

Pinned by `apps/api/src/common/__tests__/dto-validation-semantics.spec.ts`.

Note: `CreateUnitDto.abbreviation: string = ''` and the other conforming Create DTOs carry the
same latent pattern — currently harmless because every field is an `@IsNotEmpty()` string.
`.ai/skills/backend-resource-module/SKILL.md` states the initializer rule without this
qualification and must be corrected.

**Addressed by:** Phase 0.4 tasks 3 and 11.

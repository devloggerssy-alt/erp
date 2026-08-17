# Phase 1.5 — Service & Controller Layering

**Status:** 🟡 in progress — A (type-audit ratchet) done, B (`StatusGuardedCrudService`) done, C.1 (payments) done. Execution plan: `docs/superpowers/plans/2026-07-30-phase-1.5-service-layering.md`.
**Depends on:** [Phase 1](phase-1-gl-posting-port.md) ✅ complete
**Blocks:** [Phase 2](phase-2-client-and-dashboard-types.md)
**Findings addressed:** [F9](00-findings.md#f9--the-4-layer-pattern-covers-less-than-half-the-api-and-the-gap-breaks-the-type-pipeline), [F10](00-findings.md#f10--crudservice-as-it-stands-does-not-fit-transactional-documents)
**Index:** [README](README.md)

---

## Goal

Every API resource has a typed response contract, and the 4-layer pattern covers the whole API
instead of 43% of it.

## Success criteria

- [ ] Zero untyped `2xx` responses in the generated types (baseline: 39 `unknown` + 11 `never` = 50)
- [ ] Every controller returns presenter output, never a raw Prisma entity
- [ ] No hard-delete path on a posted document
- [ ] `apps/dashboard/modules/expenses` compiles with no `as any`
- [ ] Golden masters unchanged — this phase must not change GL output either

> **Why after Phase 1:** extracting GL policy is what shrinks the Tier B services enough for the
> base classes to fit. `payments.service.ts` is 291 LOC today; ~60 of those are account resolution
> and journal-line construction that Phase 1 deletes. Layering first means redoing it.

---

## Approach — three tiers, not one

The 24 unlayered services are not one problem. Forcing all of them onto `CrudService` would be as
wrong as leaving them alone.

| Tier | Services | Target |
|---|---|---|
| **A — Master data**<br>(pure CRUD, already fits) | `users`, `tag-assignments`, `custom-field-values`, `files` | `CrudService` + `CrudRepository` + `CrudPresenter` + `createCrudController`, unchanged |
| **B — Transactional documents**<br>(CRUD + actor + numbering + lifecycle) | `invoices`, `payments`, `expenses`, `stock-counts` | New `DocumentCrudService` base; controller extends `createCrudController` output **and adds** its lifecycle routes |
| **C — Genuinely not CRUD**<br>(engines, queries, singletons, sagas) | `auth`, `onboarding`, `settings`, `data-reset`, `reports`, `dashboard`, `ai-chat`, `audit`, `accounting` (JE reads), `inventory`, `stock-ledger`, `journal-posting`, `invoice-posting`, `account-balances`, `opening-balances`, `financial-settings`, `tenants` | **Keep bespoke.** Do *not* extend `CrudService`. But **must** gain a response DTO + presenter so their OpenAPI output is typed |

Not listed: the four `*-import` / `*-export` services already extend `CrudImportServiceBase` /
`CrudExportServiceBase`. Correctly layered on a different base — no change needed.

**Tier C is the important correction to the premise:** roughly two-thirds of the flagged services
*should* stay bespoke. `JournalPostingService` is a posting engine, `ReportsService` is a query
service, `FinancialSettingsService` is a 1-to-1 singleton — none has a
list/show/create/update/delete shape, and pretending otherwise adds indirection for nothing.

**What all three tiers share is the obligation the codebase is actually failing: a typed response
contract.** Tier C keeps its hand-written controller; it just stops using `schema: { example: … }`
and starts declaring `@ApiOkResponseStandard(XResponseDto)`.

### `DocumentCrudService` (Tier B)

A **sibling** of `CrudService`, not a replacement:

```ts
export abstract class DocumentCrudService<TEntity, TResponse, TCreate, TUpdate>
  extends CrudService<TEntity, TResponse, TCreate, TUpdate> {

  /** Doc-sequence key, e.g. 'PAYMENT'. Number allocated before create. */
  protected abstract readonly documentType: string;

  /** Statuses at which update/delete are still legal. Default: ['DRAFT']. */
  protected readonly mutableStatuses: readonly string[] = ['DRAFT'];

  /** Actor-carrying create — the overload documents cannot live without. */
  abstract createAs(tenantId: string, userId: string, dto: TCreate): Promise<TResponse>;

  /** Enforced for every document: no update or hard delete once posted. */
  protected override async beforeUpdate(t: string, id: string, dto: TUpdate, existing: TEntity) { … }
  protected override async beforeDelete(t: string, id: string, existing: TEntity) { … }
}
```

The guard lives in the base class, so `.ai/rules/domain.md`'s "reverse, never delete" rule becomes
**structural** rather than per-module — matching the intent already stated in Phase 3 task 3.4.3.

Lifecycle verbs (`post`, `cancel`, `allocate`) stay on the concrete service. They are domain
operations, not CRUD — and `createCrudController` returns a **base class**, so
`PaymentsController extends PaymentsCrudBase` keeps its `@Post(':id/post')` routes while
inheriting typed list/show/create/update/delete, pagination, filter schema, and bulk ops.

---

## File map

### Create

| Path | Purpose |
|---|---|
| `packages/backend-core/src/base/document-crud-service.ts` | Tier B base — actor, doc numbering, lifecycle guards |
| `scripts/audit-openapi-response-types.mjs` | CI ratchet — fails on any untyped `2xx` |
| `invoicing/payments/{dto/payment-response.dto.ts, presenters/payment.presenter.ts, repositories/payments.repository.ts}` | Tier B |
| `invoicing/expenses/{dto/expense-response.dto.ts, presenters/expense.presenter.ts, repositories/expenses.repository.ts}` | Tier B |
| `inventory/stock-counts/{dto/…-response.dto.ts, repositories/…}` | Tier B — presenter already exists |
| `identity/users/repositories/users.repository.ts` | Tier A — presenter + DTO already exist |
| Response DTOs for every Tier C controller | `reports`, `dashboard`, `audit`, `ai-chat`, `accounting`, `inventory`, `stock-ledger`, `tenants`, `files`, `settings`, `onboarding` |

### Modify

| Path | Change |
|---|---|
| `invoicing/payments/payments.controller.ts` | Extend `createCrudController` base; lifecycle routes keep explicit `@Post`; drop `schema: { example }` |
| `invoicing/expenses/expenses.controller.ts` | Same |
| `invoicing/invoices/invoices.controller.ts` | Already presenter-backed; move the presenter call into the service, type the 3 `content?: never` lifecycle routes |
| `inventory/stock-counts/stock-counts.controller.ts` | Same |
| `identity/users/users.controller.ts` | Same |
| The 12 Tier C controllers using `schema: { example: … }` | Swap for `@ApiOkResponseStandard(XResponseDto)` / `@ApiOkResponsePaginated(…)`; keep bespoke routes |
| `apps/dashboard/modules/expenses/**` | Delete the 7 `as any` casts once the response type exists |
| `.ai/rules/api.md` | Document the three tiers + the mandatory typed response contract |

---

## Tasks

### 1.5.A — Type-audit ratchet (do this first)

- [x] 1.5.A.1 `scripts/audit-openapi-response-types.mjs` — parse
      `packages/api-contracts/types/index.ts`, report every `2xx` whose content is `unknown` or
      `never`, grouped by operation
- [x] 1.5.A.2 **Run `pnpm generate` first** — the committed artifact goes stale (see F9's correction note). Baseline after regeneration on 2026-07-26: **138 typed / 39 `unknown` / 11 `never` = 50 untyped** *(actual ratchet recorded: 76 — see `scripts/.untyped-ratchet`)*
- [ ] 1.5.A.3 Wire into CI as a **ratchet** — the untyped count may only decrease. Flip to
      hard-fail-at-zero after 1.5.E

### 1.5.B — `DocumentCrudService` base

- [x] 1.5.B.1 Add to `packages/backend-core/src/base/`; export from `base/index.ts`.
      **Resolves Q8:** does this belong in `backend-core` at all? `.ai/rules/packages.md` says
      *no domain logic in backend-core — infrastructure only*. Lifecycle-guard-by-status is a
      generic mechanism; the naming is what's domain-flavoured.
      **Recommendation: `backend-core`, named `StatusGuardedCrudService`.**
- [x] 1.5.B.2 `documentType` → number allocation via an injected `IDocumentNumberAllocator` port,
      keeping `backend-core` free of a domain import
- [x] 1.5.B.3 `createAs(tenantId, userId, dto)` — the actor-carrying create `CrudService` lacks
- [x] 1.5.B.4 `beforeUpdate` / `beforeDelete` throw unless `status ∈ mutableStatuses`
      (default `['DRAFT']`)
- [x] 1.5.B.5 Tests: a posted document rejects **both** update and delete; a draft accepts both

### 1.5.C — Tier B migration (one service per PR; **parallelisable**)

- [x] 1.5.C.1 `payments` — repository + `PaymentResponseDto` + presenter; service extends
      `DocumentCrudService`; controller extends the factory base and keeps `post`, `cancel`,
      `allocate`, `removeAllocation` as explicit routes
- [ ] 1.5.C.2 `expenses` — nested `items` write stays in an overridden `createAs`
- [ ] 1.5.C.3 `stock-counts` — presenter already exists
- [ ] 1.5.C.4 `invoices` — largest; move `InvoicePresenter` from the controller into the service
      first. Split per Phase 3 task 3.5.1 if the diff gets unreviewable
- [x] 1.5.C.5 Per PR: `pnpm generate` → the audit count drops → **delete that resource's dashboard
      casts in the same PR** *(payments: dashboard casts gone; audit count dropped from 76 → 69 committed)*
- [ ] 1.5.C.6 Golden masters stay green *(payments PR green; still owed for remaining C.2–C.4)*

### 1.5.D — Tier A migration

- [ ] 1.5.D.1 `users`, `tag-assignments`, `custom-field-values`, `files` → plain `CrudService` +
      factory controller. Presenter and DTO already exist for `users`

### 1.5.E — Tier C typed responses (no restructuring)

- [ ] 1.5.E.1 For each of the 12 controllers using `schema: { example: … }`: add a response DTO
      with full `@ApiProperty` per `.ai/rules/api.md`, swap in `@ApiOkResponseStandard` /
      `@ApiOkResponsePaginated`
- [ ] 1.5.E.2 Add a presenter wherever a raw Prisma entity is returned — e.g.
      `accounting.service.ts` returns `journalEntry` with nested `lines` verbatim
- [ ] 1.5.E.3 **Do not** convert these to `CrudService`. Record in each PR description why the
      service stayed bespoke
- [x] 1.5.E.4 **Resolves Q7 — `Decimal` serialization.** Prisma returns `Decimal`; hand-rolled
      controllers leak whatever `JSON.stringify` produces, and the untyped responses have hidden
      the inconsistency. The layered path already chose: `invoice.presenter.ts:6-9` defines a local
      `toNum()` calling `.toNumber()`. **Recommendation: standardise on `number` and lift `toNum`
      into a shared `CrudPresenter` helper** rather than re-declaring it per module. `number`
      loses exactness above 2^53, which `@db.Decimal(18,4)` can exceed — record as a known
      limitation with a follow-up spec rather than breaking every typed endpoint mid-refactor *(done — `toNum` is now a static helper on `CrudPresenter`; `PaymentPresenter` uses it)*
- [ ] 1.5.E.5 **Resolves Q6 — singleton tier placement.** `FinancialSettingsService` (1-to-1 with
      `Tenant`) and `SettingsService` (grouped key-value) have `get` + `update` but no list or
      create. **Recommendation: Tier C** — a `SingletonResourceService` base would serve exactly
      two call sites. They still need typed responses

### 1.5.F — List-contract parity

- [ ] 1.5.F.1 Tier A/B resources gain `filterSchema` so `search`, `searchIn`, `sortField`,
      `sortOrder`, and `filters[…]` work — matching what `generateResource` already sends
- [ ] 1.5.F.2 Smoke-test the dashboard toolbar (filter · search · sort) on `payments` and
      `expenses`, which cannot use it today

### 1.5.G — Lock it in

- [ ] 1.5.G.1 Audit script hard-fails at any untyped `2xx`
- [ ] 1.5.G.2 ESLint: ban `schema: { example` inside `apps/api/src/**/*.controller.ts`
- [ ] 1.5.G.3 Update `.ai/rules/api.md` and `.ai/skills/backend-resource-module/SKILL.md` with the
      three tiers — the skill currently implies every module is Tier A

---

## Verification

```bash
pnpm generate                                        # regenerate types from the spec
node scripts/audit-openapi-response-types.mjs        # must report 0 untyped 2xx
pnpm --filter @devloggers/api test                   # golden masters unchanged
pnpm turbo run build --filter=@devloggers/dashboard  # proves the casts were removable
```

### Manual smoke test

- [ ] Payments and expenses list pages: filter, search, and column sort all work (they cannot today)
- [ ] Attempt to delete a POSTED invoice / payment / expense → rejected with the cancel guidance
- [ ] Attempt to edit a POSTED document → rejected
- [ ] Create → post → cancel each document type; response payloads unchanged in shape
- [ ] Journal-entry list and detail render (now presenter-backed, previously raw Prisma entities)
- [ ] Reports and dashboard pages render — their responses are newly typed

## Done when

- [ ] `node scripts/audit-openapi-response-types.mjs` reports 0 untyped `2xx`
- [ ] `grep -rn "as any\|as unknown" apps/dashboard/modules/expenses` returns nothing
- [ ] Golden-master snapshots identical
- [ ] Q6, Q7, Q8 answered and recorded

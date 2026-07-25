# Architecture Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:executing-plans` (sequential) or
> `superpowers:subagent-driven-development` (Phase 1.4 / 1.5 policies, which parallelise well).
> Steps use checkbox (`- [ ]`) syntax. **Do not batch tasks** — each task below is sized to one
> reviewable PR with its own verification.

**Goal:** Move all GL policy into the accounting module, extend the 4-layer pattern across the
whole API, and restore an honest type contract end-to-end — without changing any posted GL output.

**Architecture:** Non-accounting modules emit typed *posting intents*; an `AccountingPostingFacade`
owns account selection, period guards, JE numbering, and persistence, synchronously inside the
caller's Prisma transaction. Services split into three tiers (master data / transactional documents
/ bespoke), each with a typed response contract.

**Tech Stack:** Turborepo, Prisma, NestJS, api-contracts, api-client, Next.js dashboard, next-intl

**Spec:** [`docs/superpowers/specs/2026-07-25-architecture-refactor-roadmap-design.md`](../specs/2026-07-25-architecture-refactor-roadmap-design.md)

---

## Execution order

```
0.4  API strictness ────────────► unblocks trustworthy verification for everything below
  │
0.1–0.3  Golden masters + drift checker + CI
  │
1    GL posting port ───────────► behaviour-preserving; golden masters must not move
  │
1.5  Service & controller layering
  │
2    Client & dashboard type safety
  │
3–6  Coupling · modularity · audit · authz   (each needs its own spec first)
```

**Rule:** never start a task whose "Depends on" row is unchecked.

| Task | Depends on | Parallelisable |
|---|---|---|
| 0.4 | nothing | no — do first |
| 0.1–0.3 | 0.4 | yes, among themselves |
| 1.1–1.3 | 0.1, 0.4 | no |
| 1.4.x policies | 1.3 | **yes** — one agent per policy |
| 1.5.x services | 1.4 complete | **yes** — one agent per service |
| 2 | 1.5 | no |

---

## Current state (as of 2026-07-26)

Phase 0.4 was started interactively and is **partially applied in the working tree, uncommitted**:

| Step | State |
|---|---|
| 0.4.1 delete dead trees | applied (`git rm` staged) |
| 0.4.2 `@types/js-yaml`, `@types/passport-jwt` | applied |
| 0.4.3 72 × `TS2564` | applied — 65 `!`, 7 initializers |
| regression test | added at `apps/api/src/common/__tests__/dto-validation-semantics.spec.ts` |
| 0.4.4 `noUncheckedIndexedAccess` | **reverted — not applied** |
| 0.4.5–0.4.8 | not started |

**Decide before continuing:** keep this work as the starting point of Task 0.4, or
`git checkout -- apps/api && git reset` and redo it cleanly from this plan. Either is fine; the
plan below is written to be run from a clean tree.

---

## File map (what changes where)

**Create**
- `apps/api/src/modules/accounting/posting/` — the whole port (contracts, facade, registry, policies)
- `packages/backend-core/src/base/document-crud-service.ts` — Tier B base
- `scripts/audit-openapi-response-types.mjs` — CI ratchet for untyped responses
- `apps/api/src/common/__tests__/dto-validation-semantics.spec.ts` — pins the `!` convention
- Response DTOs + presenters + repositories for `payments`, `expenses`, `stock-counts`, and the 12 Tier C controllers

**Modify**
- `apps/api/tsconfig.json` — extend the strict base
- 13 DTO files — 65 `!`, 7 initializers
- 6 services — drop GL imports, emit intents
- 24 hand-rolled controllers — typed responses
- `packages/api-client/src/infra/crud-client.ts` — remove `as any` / `as never`
- `.ai/rules/api.md`, `.ai/skills/backend-resource-module/SKILL.md` — document tiers + DTO convention

**Delete**
- `apps/api/src/modules/tenants/`, `apps/api/src/modules/users/` — dead orphans
- `invoicing/*/["invoice"|"payment"|"expense"]-journal.ts` — moved into policies

---

# PHASE 0 — Guardrails

## Task 0.4: API strictness

**Why first:** every later task verifies with `pnpm turbo run build`. Under `noImplicitAny: false`
that command exits 0 on a broken refactor. Measured cost is ~84 errors.

**Files:**
- Delete: `apps/api/src/modules/tenants/`, `apps/api/src/modules/users/`
- Modify: `apps/api/tsconfig.json`, `apps/api/package.json`, 13 DTO files, `reports.service.ts`, `s3.utils.ts`, `onboarding.service.ts`, 2 spec files
- Create: `apps/api/src/common/__tests__/dto-validation-semantics.spec.ts`

- [ ] **Step 1: Delete dead trees.** Confirm zero importers first — note `@/modules/users` in the
      dashboard is a *different, live* module.

```bash
grep -rn "modules/tenants\|modules/users" apps/api/src --include=*.ts | grep -v identity/
# expect: no output
git rm -r apps/api/src/modules/tenants apps/api/src/modules/users
```

- [ ] **Step 2: Install missing type packages** — clears all 3 `noImplicitAny` errors (`TS7016`);
      no application code changes.

```bash
pnpm --filter @devloggers/api add -D @types/js-yaml @types/passport-jwt
```

- [ ] **Step 3: Fix 72 × `TS2564` — the fix differs by DTO kind.**

      **Request DTOs (65 sites) → definite assignment.** An initializer would be a real runtime
      value under `transform: true`, so an absent field would pass validation (spec F11).

```ts
// ✅ request DTO — absent field still rejected
@IsEnum(PaymentTypeEnum) type!: PaymentTypeEnum;

// ❌ NEVER on a request DTO — omitting `type` silently becomes RECEIPT,
//    flipping the debit/credit direction in payment-journal.ts
@IsEnum(PaymentTypeEnum) type: PaymentTypeEnum = PaymentTypeEnum.RECEIPT;
```

      **Response DTOs (7 sites, all `ChartOfAccountTreeDto`) → initializers.** Built by presenters,
      never validated.

```ts
id: string = '';
nameI18n: object = {};
type: AccountType = AccountType.ASSET;
parentId: string | null = null;
isActive: boolean = true;
```

      Locate sites precisely from compiler output rather than by grep:

```bash
cd apps/api && npx tsc --noEmit -p tsconfig.json --strictPropertyInitialization
```

- [ ] **Step 4: Add the regression test** pinning why request DTOs use `!`, so a future
      contributor cannot "tidy" it back into initializers. Assert that an empty body rejects
      5/5 fields with `!` and only 1/5 with initializers.

- [ ] **Step 5: Fix 7 source `noUncheckedIndexedAccess` errors at the source — no casts.**

| File | Fix |
|---|---|
| `reports.service.ts` ×4 | `.toISOString().split('T')[0]` → `.toISOString().slice(0, 10)` |
| `s3.utils.ts` ×2 | destructure the regex group and the path segments, then guard on truthiness |
| `onboarding.service.ts` ×1 | `return Object.fromEntries(template.map(a => [a.code, ids[a.code]]))` → `return ids` (identical content, one fewer indirection) |

- [ ] **Step 6: Fix 17 `TS2532` in two spec files** —
      `account-balances.service.spec.ts` (14), `accounts.service.spec.ts` (3). These index into
      `Object.fromEntries(...)` / arrays in assertions. Prefer a typed lookup helper in the spec
      over `!` on every assertion.

- [ ] **Step 7: Flip the config.**

```jsonc
// apps/api/tsconfig.json
{
  "extends": "@devloggers/typescript-config/base.json",
  // delete: "noImplicitAny": false, "strictBindCallApply": false
}
```

- [ ] **Step 8: Verify — must be 0 errors.**

```bash
pnpm --filter @devloggers/api exec tsc --noEmit
pnpm --filter @devloggers/api test
pnpm turbo run build --filter=@devloggers/api
```

- [ ] **Step 9: Prove the gate actually fails.** Introduce `const x: any = 1;` in a module file,
      confirm lint/typecheck fails, then revert. **A guardrail unverified is not a guardrail.**

- [ ] **Step 10: ESLint regression rules** at error level, scoped to `apps/api/src/**`
      (dashboard follows in Phase 2): `@typescript-eslint/no-explicit-any`,
      `no-unnecessary-type-assertion`, `ban-ts-comment`.

- [ ] **Step 11: Correct the skill.** `.ai/skills/backend-resource-module/SKILL.md` currently says
      "Initialize all `XResponseDto` fields … to satisfy strict mode" without distinguishing
      request DTOs. Add the `!`-for-request-DTOs rule with the reason.

- [ ] **Step 12: Commit.**

```bash
git commit -m "refactor(api): enable strict TypeScript

Deletes dead tenants/users DTO orphans, adds missing @types packages,
and resolves 72 TS2564 + 24 noUncheckedIndexedAccess errors.

Request DTOs use definite assignment rather than initializers: under
ValidationPipe transform:true an initializer becomes a runtime value,
so an absent field passes validation. Measured 1/5 vs 5/5 fields
rejected on an empty body. Pinned by a regression test."
```

---

## Task 0.1: Golden-master characterization suite

**Depends on:** 0.4 (so the suite itself is type-checked honestly)

**Files:** Create `apps/api/src/modules/accounting/posting/__tests__/golden-master.spec.ts`

- [ ] **Step 1:** Build an in-memory Prisma transaction double recording `journalEntry.create`
      payloads verbatim.
- [ ] **Step 2:** Snapshot current JE output for all 10 posting paths: purchase invoice, sales
      invoice (with COGS), invoice cancellation, payment, payment cancellation, expense, expense
      cancellation, stock-count variance, opening balance, opening stock.
- [ ] **Step 3:** Cover the branch matrix per path — with/without tax, with/without party-level
      account override, service-only vs stock lines, zero-COGS sales.
- [ ] **Step 4:** Assert on account IDs, debit/credit amounts, `sortOrder`, `description`,
      `referenceType`, `partyId`, and total debits = total credits.
- [ ] **Step 5: Commit snapshots. These files must not be regenerated during Phase 1** — a diff
      here is the signal the refactor changed behaviour.

## Task 0.2: Balance-drift checker

- [ ] **Step 1:** Service comparing `ChartOfAccount.currentBalance` vs `SUM(JournalLine)` per account.
- [ ] **Step 2:** Same for `Cashbox.balance` and `StockBalance` vs `StockMovement`.
- [ ] **Step 3:** Authenticated diagnostic endpoint returning drifted rows.
- [ ] **Step 4:** Record a **baseline** drift report. Pre-existing drift is not a Phase 1 regression
      — resolve **Q5** here (correct now vs track separately).

## Task 0.3: CI gate

- [ ] **Step 1:** Workflow running `pnpm turbo run lint typecheck test` on PR.
- [ ] **Step 2:** Fail on any new `eslint-disable` under `apps/api/src/modules/**`.
- [ ] **Step 3:** Wire in the strict typecheck from 0.4 and the golden-master suite from 0.1.

---

# PHASE 1 — GL Posting Port

**Success:** golden-master snapshots byte-identical; zero imports of accounting internals from
outside accounting; drift ≤ baseline.

## Task 1.1: Contracts

- [ ] `prisma-tx.ts` — `export type PrismaTransactionClient = Prisma.TransactionClient`
- [ ] `posting-intent.ts` — discriminated union on `kind`; shared base `tenantId`, `userId`,
      `date`, `fiscalPeriodId`, `exchangeRate`
- [ ] **Intents carry only economic facts.** No `accountId` may appear on any intent — this is the
      invariant the whole phase exists to establish. Enforce in review.
- [ ] `journal-line-draft.ts` — `accountId`, `debit`, `credit`, `description`, `sortOrder`, `partyId`
- [ ] `index.ts` barrel exporting **only** `AccountingPostingFacade`, `PostingIntent`,
      `PrismaTransactionClient`

## Task 1.2: Typed transaction (removes F2)

- [ ] Change `JournalPostingService.post` / `.reverse` signatures to `PrismaTransactionClient`
- [ ] Remove `tx as any` at `inventory.service.ts:141` and `stock-counts.service.ts:139`
- [ ] Fix resulting type errors at their source — no new casts
- [ ] **Verify:** golden masters green

## Task 1.3: Facade + registry

- [ ] `AccountingPostingFacade.record(tx, intent): Promise<{ journalEntryId: string }>`
- [ ] Facade order of operations: resolve policy → policy builds lines → `assertFiscalPeriodOpen`
      → `getNextNumber('JOURNAL_ENTRY')` → assert balanced → `JournalPostingService.post`
- [ ] `.reverse(tx, intent)` for the six `*_CANCELLATION` types
- [ ] Registry: exhaustive `kind → policy` map, `never`-checked so a new intent kind without a
      policy is a **compile error**
- [ ] `posting.module.ts` exports the facade only

## Task 1.4: Policies — one PR each, parallelisable

Each policy is a pure function `intent → JournalLineDraft[]`, unit-tested without a DB.

- [ ] 1.4.1 `invoice-posted.policy.ts` — absorbs `invoice-posting.service.ts:40-75` account
      resolution + `invoice-journal.ts` + COGS lines from `inventory-journal.ts`
- [ ] 1.4.2 `invoice-cancelled.policy.ts`
- [ ] 1.4.3 `payment-recorded.policy.ts` — absorbs `payment-journal.ts`
- [ ] 1.4.4 `expense-recorded.policy.ts` — absorbs `expense-journal.ts`
- [ ] 1.4.5 `stock-count-adjusted.policy.ts`
- [ ] 1.4.6 `opening-balance.policy.ts` — retains suspense routing per `.ai/rules/domain.md` §2
- [ ] 1.4.7 `opening-stock.policy.ts` — resolve **Q1** here (does `ReferenceType` need an
      `OPENING_STOCK` member?)
- [ ] Move each `*-journal.spec.ts` alongside its policy

## Task 1.5: Migrate call sites — one service per PR

- [ ] 1.5.1 `invoice-posting.service.ts` (3 sites)
- [ ] 1.5.2 `payments.service.ts` (2 sites)
- [ ] 1.5.3 `expenses.service.ts` (2 sites)
- [ ] 1.5.4 `stock-counts.service.ts` (1 site)
- [ ] 1.5.5 `inventory.service.ts` (1 site)
- [ ] 1.5.6 `opening-balances.service.ts` (1 site) — inside accounting, but route through the
      facade for uniformity
- [ ] Each PR deletes the service's imports of `FinancialSettingsService`,
      `DocumentSequencesService`, `JournalPostingService`, `assertFiscalPeriodOpen`, and any
      journal-line builder — **strictness from 0.4 will flag the orphaned imports**
- [ ] Update each service's `.spec.ts` to mock the facade instead of `journalPosting`

## Task 1.6: Lock the boundary

- [ ] ESLint `no-restricted-imports`: `modules/accounting/**` unreachable from outside accounting
      except `modules/accounting/posting`
- [ ] Stop exporting `JournalPostingService` from `accounts.module.ts`
- [ ] Run the drift checker; compare to the 0.2 baseline. **New drift blocks merge.**
- [ ] Log any accounting bug the policies surfaced under spec **Q2** — do not fix inside Phase 1

**Verification**

```bash
pnpm --filter @devloggers/api test          # golden masters MUST be unchanged
pnpm turbo run build --filter=@devloggers/api
pnpm turbo run lint                          # boundary rule
```

**Manual smoke:** post purchase invoice · sales invoice with COGS · cancel invoice · payment +
cancel · expense + cancel · stock-count variance · opening balance → all JE lines match
pre-refactor values; drift report shows nothing new.

---

# PHASE 1.5 — Service & controller layering

**Success:** 0 untyped `2xx` responses; every controller returns presenter output; no hard-delete
path on a posted document; `modules/expenses` compiles with no `as any`.

## Task 1.5.A: Type-audit ratchet (do first)

- [ ] `scripts/audit-openapi-response-types.mjs` — parse `packages/api-contracts/types/index.ts`,
      report every `2xx` whose content is `unknown` or `never`, grouped by operation
- [ ] Record baseline: **137 typed / 39 `unknown` / 24 `never`**
- [ ] Wire into CI as a ratchet — the untyped count may only decrease

## Task 1.5.B: `DocumentCrudService` base

- [ ] Add to `packages/backend-core/src/base/`; resolve **Q8** on naming
      (recommendation: `StatusGuardedCrudService`, to keep backend-core domain-neutral)
- [ ] `documentType` → number allocation via an injected `IDocumentNumberAllocator` port
- [ ] `createAs(tenantId, userId, dto)` — the actor-carrying create `CrudService` lacks
- [ ] `beforeUpdate` / `beforeDelete` throw unless `status ∈ mutableStatuses` (default `['DRAFT']`)
- [ ] Tests: posted document rejects **both** update and delete; draft accepts both

## Task 1.5.C: Tier B migration — one service per PR, parallelisable

- [ ] `payments` — repository + `PaymentResponseDto` + presenter; controller extends the factory
      base, keeps `post` / `cancel` / `allocate` / `removeAllocation` as explicit routes
- [ ] `expenses` — nested `items` write stays in an overridden `createAs`
- [ ] `stock-counts` — presenter already exists
- [ ] `invoices` — largest; move `InvoicePresenter` from controller into service first
- [ ] Per PR: `pnpm generate` → audit count drops → **delete that resource's dashboard casts in
      the same PR**
- [ ] Golden masters stay green — 1.5 must not change GL output either

## Task 1.5.D: Tier A migration

- [ ] `users`, `tag-assignments`, `custom-field-values`, `files` → plain `CrudService` + factory
      controller (presenter + DTO already exist for `users`)

## Task 1.5.E: Tier C typed responses — no restructuring

- [ ] For each of the 12 controllers using `schema: { example: … }`: add a response DTO with full
      `@ApiProperty`, swap in `@ApiOkResponseStandard` / `@ApiOkResponsePaginated`
- [ ] Add a presenter wherever a raw Prisma entity is returned (e.g. `accounting.service.ts`
      returns `journalEntry` with nested `lines` verbatim)
- [ ] **Do not** convert these to `CrudService` — record in each PR why it stayed bespoke
- [ ] Resolve **Q7**: standardise `Decimal` → `number`, lifting `toNum` from
      `invoice.presenter.ts:6-9` into a shared `CrudPresenter` helper

## Task 1.5.F: List-contract parity

- [ ] Tier A/B resources gain `filterSchema` so `search`, `searchIn`, `sortField`, `sortOrder`,
      `filters[…]` work — matching what `generateResource` already sends
- [ ] Smoke: filter · search · sort on `payments` and `expenses`, which cannot do this today

## Task 1.5.G: Lock it in

- [ ] Audit script hard-fails at any untyped `2xx`
- [ ] ESLint: ban `schema: { example` in `apps/api/src/**/*.controller.ts`
- [ ] Update `.ai/rules/api.md` + `backend-resource-module` skill with the three tiers — the
      skill currently implies every module is Tier A

---

# PHASE 2 — Client & dashboard type safety

**Depends on:** 1.5 (response types must exist first)

- [ ] **2.1** `crud-client.ts`: constrain `CrudResource` route generics so each method narrows to
      its own path; typed private helpers (`getAt`, `postAt`, …) carry the narrowing. Target zero
      `as any` / `as never`. Model `bulkDelete` / `bulkUpdate` explicitly instead of
      `as unknown as ApiPathByMethod<"delete">`. Add `expectTypeOf` tests.
- [ ] **2.2** Remove the 34 dashboard casts — most should already be gone via 1.5.C. **Any
      survivor means a still-missing or wrong response DTO: fix the API and regenerate, never the
      consumer** (`code-quality.md` §4). Extend the 0.4 ESLint rules to `apps/dashboard/**`.
- [ ] **2.3** Replace 44 `console.log` with the Nest `Logger`; audit the 15 `eslint-disable`
      comments; remove `ApiClient`'s constructor URL log.

---

# PHASES 3–6 — require their own specs before execution

These are named and sized in the design spec but **not decomposed here**. Write a spec for each
before starting; the task lists below are scope reminders, not execution plans.

| Phase | Scope | Blocking? |
|---|---|---|
| **3** Remaining coupling | `InventoryMovementFacade` mirroring the posting port; onboarding saga → coordinator; boundary lint for all domains; deletion semantics (soft delete / archive per model); split `invoices.service.ts` (397 LOC), `onboarding.service.ts` (333), `items-import.service.ts` (299), `payments.service.ts` (291) along the seams Phase 1 exposed | no |
| **4** Modularity | Capability manifest per domain; config-driven module registration; per-facade contract tests; outbox seam **off by default**; decide the fate of the zero-consumer `EventEmitter2` CRUD events (F3) | no |
| **5** Audit + observability | `AuditInterceptor` on every non-GET route (F5 — `AuditLog` is currently write-never); GL actions audited append-only; structured logging with correlation ids; promote the 0.2 drift checker to a scheduled job | no |
| **6** AuthZ | Permission catalog; `Permission` + `RolePermission` schema; `PermissionsGuard` + `@RequirePermission()`; **routes with no permission metadata must deny**; separation of duties (`journals.post` ≠ `journals.reverse` ≠ `periods.close`); dashboard gating | **YES — blocking before the first production tenant.** Today any authenticated user can post, cancel, and reverse journal entries |

---

## Final verification

```bash
pnpm --filter @devloggers/api exec tsc --noEmit         # strict, 0 errors
pnpm --filter @devloggers/api test                      # golden masters unchanged
node scripts/audit-openapi-response-types.mjs           # 0 untyped 2xx
pnpm turbo run lint typecheck build
pnpm generate                                           # after any DTO/Swagger change
```

- [ ] Golden-master snapshots byte-identical to their Phase 0 commit
- [ ] Balance drift ≤ the 0.2 baseline
- [ ] No module outside `modules/accounting/**` imports accounting internals
- [ ] Zero `as any` / `as never` in `crud-client.ts` and `apps/dashboard/modules/**`
- [ ] Implementation matches the spec line-by-line

---

## Open questions to resolve during execution

| # | Question | Resolve at |
|---|---|---|
| Q1 | Does `ReferenceType` need an `OPENING_STOCK` member? | Task 1.4.7 |
| Q2 | Accounting bugs surfaced while extracting policies | log during 1.4, fix in a follow-up spec — **never inside Phase 1** |
| Q3 | `Permission` global vs tenant-scoped (recommend: global catalog, tenant-scoped `RolePermission`) | Phase 6 start |
| Q4 | `AuditLog` retention policy | Phase 5 |
| Q5 | Pre-existing balance drift — correct before Phase 1 or track separately? | Task 0.2 |
| Q6 | Tier placement of `FinancialSettingsService` / `SettingsService` singletons (recommend: Tier C) | Phase 1.5 start |
| Q7 | `Decimal` serialization (recommend: `number`, shared helper) | Task 1.5.E |
| Q8 | Does `DocumentCrudService` belong in backend-core? (recommend: yes, as `StatusGuardedCrudService`) | Task 1.5.B |

---

## Follow-ups (post-merge)

- [ ] Part B gap register — Trial Balance / P&L / Balance Sheet (**P0**, no financial statements
      exist today), period close & year-end rollover (**P0**), credit notes, tax rate master,
      bank reconciliation. Each needs its own spec.
- [ ] Apply the `!` request-DTO convention to the 18 already-conforming modules (currently benign
      — every field is an `@IsNotEmpty()` string — so not urgent, but the pattern is latent)
- [ ] Reconciliation job surfacing drift to tenant admins (Phase 5.4)

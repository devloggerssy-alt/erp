# Phase 4 — Client & Dashboard Type Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the client edge of the type pipeline — remove the `as any`/`as never` escape hatches from `packages/api-client`'s `CrudClient`, then remove the ~85 downstream `as any`/`as unknown`/`as never` casts across `apps/dashboard` that exist because of it (or, where a cast turns out to guard a genuine upstream DTO bug, fix the DTO at the source instead of the cast).

**Architecture:** This plan was written after directly verifying — with the TypeScript compiler, not by inspection alone — why each cast exists. The investigation (documented in Task 0) found two distinct root causes, not one:
1. **The vast majority of dashboard casts are simply unnecessary.** `CrudClient.list()`/`show()`/etc. already have correct, fully-resolved return types today (their explicit return-type annotations are authoritative regardless of what the method body does internally) — confirmed empirically for `CashboxesClient`, `CurrenciesClient`, `AccountsClient`, `FiscalPeriodsClient`, `PartiesClient`, `BankAccountsClient`, `CustomFieldsClient`, and `UnitsClient`/`BrandsClient`-shaped consumers. The casts around them are stale defensive code that can simply be deleted.
2. **A small number of casts guard real bugs**, in two flavors:
   - `AccountsClient`'s hand-written `balances()`/`tree()`/`ledger()` methods cast their route to the *wide* `ApiPathByMethod<"get">` union instead of keeping the resource's literal path type, which collapses their return type for every caller. Confirmed by direct compiler probe (see Task 0).
   - Several response DTOs use `@ApiPropertyOptional({ nullable: true })` / `@ApiProperty({ nullable: true })` **without** a `type:` option — a documented anti-pattern in `.ai/rules/api.md` that generates `Record<string, never>` instead of `string` in `packages/api-contracts/types/index.ts`. Confirmed on `PartyResponseDto.code/phone/email/address` by direct compiler probe.

This plan fixes root cause (2) at the source, then removes every now-provably-unnecessary cast from root cause (1), file by file.

**Tech Stack:** TypeScript 5.9 (strict), `openapi-fetch`, `openapi-typescript`, NestJS Swagger decorators, Vitest `expectTypeOf`, ESLint (`eslint-config-next` + `typescript-eslint`).

**Deviations from the spec's literal wording (each evidence-based, not a shortcut):**
1. **§4.1.2 "typed private helpers (`getAt`, `postAt`, …)"** — not implemented as a helper-extraction refactor. Task 0's compiler probes found the actual minimal fix is narrower: drop the unnecessary route cast, keep one precisely-typed assertion per method. Introducing a helper layer wouldn't remove any assertion the probes proved necessary — it would just move them, adding indirection without a corresponding safety gain.
2. **§4.1 success criterion "Zero `as any` / `as never` in `crud-client.ts`"** — only "zero `as any`" is achieved. Task 0 "verified claim 2b" and Task 5 directly prove a subset of `as never` is structurally required by `ApiClient`'s current generics design (not fixable without a larger redesign, out of this plan's scope). Report this honestly at Task 15 rather than papering over it.
3. **§4.4.3 "target 0 untyped `2xx` responses"** — Task 14 ratchets `scripts/.untyped-ratchet` down to whatever the audit script reports *after* this plan's DTO fixes, not to 0. Driving the count to 0 means finding and fixing every remaining endpoint whose Swagger response schema is missing entirely (a different, larger investigation than the "missing `type:` option" pattern this plan fixes) — worth its own follow-up, not silently folded into this one.

## Global Constraints

- **Regenerate types after every API DTO change:** `pnpm generate` (bootstraps NestJS without a running server/DB — always safe). Then `pnpm --filter @devloggers/api-contracts build`.
- **Never hand-edit `packages/api-contracts/types/index.ts`** — it is generated output.
- **Never use `as any`, `as unknown as X`, or `as never` to paper over API-data-shape errors** — fix the DTO/decorator at the source instead (`.ai/rules/code-quality.md` §4). This plan's whole point is enforcing that rule on itself.
- **Three files have pre-existing, uncommitted local changes as of this plan's writing** (unrelated WIP, not part of this phase): `apps/api/src/modules/catalog/brands/dto/brand.dto.ts`, `apps/api/src/modules/catalog/item-categories/dto/item-category.dto.ts`, `apps/api/src/modules/catalog/items/dto/item.dto.ts`, and `apps/dashboard/modules/brands/brands.config.ts`. Task 11 explicitly **excludes** these three DTO files from its automated sweep — check `git diff` on them before touching, and coordinate with whoever owns that WIP rather than overwriting it.
- **Verify per package after each task:** `pnpm --filter @devloggers/api-client build` (Tasks 1–4), `pnpm --filter @devloggers/dashboard typecheck` (Tasks 6–10, 12), `pnpm --filter @devloggers/api typecheck && pnpm generate` (Task 11).
- **No snapshot/characterization tests as a correctness gate** for behavior — but Task 2 is explicitly a *characterization* test (pins already-correct behavior before refactoring), which is appropriate for a type-safety refactor with no behavior change, not a substitute for asserting new invariants (Tasks 3–4 use real TDD red→green).

---

## Task 0 — Investigation summary (read before executing; no code changes)

This task has no steps — it's the evidence trail the rest of the plan relies on, so a reviewer can check the plan's claims instead of taking them on faith.

**Verified claim 1:** `ResourceItem<TClient>` (`apps/dashboard/shared/data-view/resource/types.ts:28`) resolves correctly today. Probe used (`apps/dashboard/__scratch-typecheck.ts`, deleted after use):
```ts
import type { CashboxesClient, CurrenciesClient, AccountsClient, FiscalPeriodsClient, PartiesClient, BankAccountsClient } from "@devloggers/api-client"
import type { ResourceItem } from "@/shared/data-view/resource"
type CheckCashbox = ResourceItem<CashboxesClient>
const a: CheckCashbox = 12345 // forces TS to print the real resolved type in the error
```
Result: `Type 'number' is not assignable to type '{ id: string; code: string; name: string; nameI18n: {...}; currencyId: string; isActive: boolean; createdAt: string; updatedAt: string; balance: string; }'`. Repeated for `CurrenciesClient`, `AccountsClient`, `FiscalPeriodsClient`, `PartiesClient`, `BankAccountsClient`, `CustomFieldsClient` — all fully resolved, no `any`/`unknown`/`never`.

**Verified claim 2:** `AccountsClient.balances()` (`packages/api-client/src/clients/account.client.ts:10-13`) casts `accountResource.routes.balances as ApiPathByMethod<"get">` before calling `this.apiClient.get(route)`. Probe: reproducing the same call **without** the cast resolved to a fully-typed response object; **with** the cast (as in the real file today), the method has no return-type annotation so it inherits whatever `this.apiClient.get(route)` infers — and since `route`'s type was just widened to the union of every GET path in the API, the inferred type collapses. This is why `use-account-balances.ts`, `use-account-tree.ts`, and `use-account-ledger.ts` all manually re-cast the response.

**Verified claim 2b (corrects an earlier assumption in this plan — see Task 5):** inside `CrudClient<R>`'s generic class body, passing `this.resource.routes.list` directly to `this.apiClient.get(route)` **needs no cast at all** on `route` — probed with a standalone generic class reproducing the exact shape; TypeScript accepts `R["routes"]["list"]` as a valid `Path` argument without complaint. But the **return value** of that call resolves to `Promise<unknown>` from inside the generic body (not `Promise<ApiResponse<R["routes"]["list"], "get">>`, even though that's the method's own declared return type) — `ApiResponse<P, M>`'s conditional/indexed-access resolution can't evaluate when `P` is still an abstract type parameter rather than a literal, so it degrades to `unknown` until the caller's concrete `R` is substituted in. A **precisely-typed return-value assertion is therefore genuinely necessary**, not optional cleanup — the fix is to stop asserting `as any` (imprecise, hides real mistakes) and instead assert the exact declared return type (`as Promise<ApiResponse<R["routes"]["list"], "get">>>`, still an assertion, but one that can never silently disagree with the method's own signature). Separately, **options objects passed as the second argument (`{ params, query, body }`) still need `as never`** — probed the same way; `ApiRequestOptions<Path, Method>` has the identical abstract-`Path` resolution problem, and without the cast TypeScript infers the parameter type as `undefined`, rejecting any real options object. **Net effect: the phase's literal "zero `as any` / `as never`" success criterion is not fully achievable without a much deeper restructuring of `ApiClient`'s generics** (out of scope for this plan) — what Task 5 delivers instead, and what's honest to report at the end of Task 15, is *zero `as any`* and *every remaining `as never`/typed assertion narrowed to the one argument construction site it's structurally required for, with a comment explaining why*.

**Verified claim 3:** `PartyResponseDto.code` (`apps/api/src/modules/parties/dto/party.dto.ts:90`) is declared `@ApiProperty({ example: 'SUPP-001', nullable: true })` with no `type:` option — the exact forbidden pattern documented in `.ai/rules/api.md`'s "Forbidden patterns" section. Probe confirmed the generated type is `Record<string, never> | null`, not `string | null`. The same pattern was grepped across the whole API (`apps/api/src/**/*.dto.ts`) and appears ~40 more times across 14 files (full list in Task 11).

**What this means for scope:** the spec's own numbers ("34 casts", "44 console.log", "15 eslint-disable") were written before this investigation and don't match the current tree — the real counts (verified by grep, not estimated) are ~85 cast occurrences across 36 dashboard files, 20 `console.log` calls across 3 files, and 13 `eslint-disable` comments (12 of which are legitimate `react-hooks/exhaustive-deps` suppressions that should stay). This plan uses the real, current numbers.

---

## Task 1 — Add Vitest to `packages/api-client`

**Files:**
- Modify: `packages/api-client/package.json`
- Create: `packages/api-client/vitest.config.ts`

**Interfaces:**
- Produces: a `test` script runnable via `pnpm --filter @devloggers/api-client test`, matching the pattern already used by `packages/api-contracts` and `apps/dashboard`.

- [ ] **Step 1: Add the vitest config**

```ts
// packages/api-client/vitest.config.ts
import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        environment: "node",
        include: ["src/**/*.test.ts"],
    },
})
```

- [ ] **Step 2: Add the `test` script and `vitest` devDependency**

In `packages/api-client/package.json`, replace the `scripts` block:

```json
    "scripts": {
        "dev": "tsc --watch",
        "build": "tsc",
        "lint": "echo \"No lint configured for @devloggers/api\"",
        "check-types": "echo \"No typecheck configured for @devloggers/api\"",
        "test": "vitest run",
        "typecheck": "tsc --noEmit"
    },
```

Add to `devDependencies` (matching the version already pinned in `packages/api-contracts/package.json` and `apps/dashboard/package.json`):

```json
        "vitest": "^4.1.8"
```

- [ ] **Step 3: Install and verify the script resolves**

Run: `pnpm install`
Run: `pnpm --filter @devloggers/api-client test`
Expected: `No test files found` (no `*.test.ts` exists yet) — exits non-zero, which is expected and fixed by Task 2.

- [ ] **Step 4: Commit**

```bash
git add packages/api-client/package.json packages/api-client/vitest.config.ts pnpm-lock.yaml
git commit -m "chore(api-client): add vitest for expectTypeOf tests"
```

---

## Task 2 — Characterization tests: pin `CrudClient`'s already-correct return types

This is **not** a red→green TDD task — Task 0 already proved these types resolve correctly today. This is a *pinning* test: it locks in today's correct behavior so Task 5 (which touches the same methods' internals) can refactor with a safety net instead of hoping nothing broke.

**Files:**
- Create: `packages/api-client/src/infra/crud-client.type-test.ts`

**Interfaces:**
- Consumes: `UnitsClient` (`packages/api-client/src/clients/units.client.ts`), `ApiClient` (`./client`), `unitResource` (`@devloggers/api-contracts`).

- [ ] **Step 1: Write the pinning test**

```ts
// packages/api-client/src/infra/crud-client.type-test.ts
import { describe, expectTypeOf, it } from "vitest"
import { unitResource } from "@devloggers/api-contracts"
import type { ApiResponse } from "@devloggers/api-contracts"
import { UnitsClient } from "../clients/units.client"
import { ApiClient } from "./client"
import type { CrudListDataItem } from "./crud-client"

describe("CrudClient — pinned response types (characterization, not red/green TDD)", () => {
    it("list() item shape resolves the real Unit fields, not any/unknown", () => {
        type ListItem = CrudListDataItem<UnitsClient>
        expectTypeOf<ListItem>().not.toBeAny()
        expectTypeOf<ListItem>().toHaveProperty("abbreviation")
        expectTypeOf<ListItem>().toHaveProperty("nameI18n")
    })

    it("show() resolves the real Unit response envelope, not any", () => {
        type ShowResponse = ApiResponse<typeof unitResource.routes.show, "get">
        expectTypeOf<ShowResponse>().not.toBeAny()
    })

    it("create()/update() request bodies are typed from the resource, not any", () => {
        const client = new UnitsClient(new ApiClient("http://localhost"))
        expectTypeOf(client.create).parameter(0).not.toBeAny()
        expectTypeOf(client.update).parameter(1).not.toBeAny()
    })
})
```

- [ ] **Step 2: Run it and confirm it passes today**

Run: `pnpm --filter @devloggers/api-client test`
Expected: `3 passed` — this confirms Task 0's claim before any refactor happens. If any assertion fails here, **stop** — it means Task 0's investigation was wrong for this resource and the rest of the plan needs re-checking before proceeding.

- [ ] **Step 3: Commit**

```bash
git add packages/api-client/src/infra/crud-client.type-test.ts
git commit -m "test(api-client): pin CrudClient's current correct return types before refactor"
```

---

## Task 3 — Fix `AccountsClient.balances/tree/ledger` (TDD: real red→green)

**Files:**
- Modify: `packages/api-client/src/clients/account.client.ts`
- Modify: `packages/api-client/src/infra/crud-client.type-test.ts` (add assertions)

**Interfaces:**
- Consumes: `accountResource` (`@devloggers/api-contracts`), `ApiResponse` (`@devloggers/api-contracts`).
- Produces: `AccountsClient.balances(): Promise<ApiResponse<typeof accountResource.routes.balances, "get">>`, same shape for `tree`/`ledger` — callers (Task 7) no longer need to re-cast the result.

- [ ] **Step 1: Add the failing assertions**

Append to `packages/api-client/src/infra/crud-client.type-test.ts`:

```ts
import { AccountsClient } from "../clients/account.client"

describe("AccountsClient — balances/tree/ledger must not leak unknown/any", () => {
    const client = new AccountsClient(new ApiClient("http://localhost"))

    it("balances() resolves a real response, not any/unknown", () => {
        type Balances = Awaited<ReturnType<typeof client.balances>>
        expectTypeOf<Balances>().not.toBeAny()
        expectTypeOf<Balances>().not.toBeUnknown()
    })

    it("tree() resolves a real response, not any/unknown", () => {
        type Tree = Awaited<ReturnType<typeof client.tree>>
        expectTypeOf<Tree>().not.toBeAny()
        expectTypeOf<Tree>().not.toBeUnknown()
    })

    it("ledger() resolves a real response, not any/unknown", () => {
        type Ledger = Awaited<ReturnType<typeof client.ledger>>
        expectTypeOf<Ledger>().not.toBeAny()
        expectTypeOf<Ledger>().not.toBeUnknown()
    })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm --filter @devloggers/api-client test`
Expected: the three new `AccountsClient` tests **fail** — `balances()`/`tree()`/`ledger()` currently have no explicit return-type annotation, so their inferred type depends on the widened `route` cast inside the method body (Task 0, verified claim 2). If they unexpectedly pass, stop and re-check Task 0's probe against the current file before continuing.

- [ ] **Step 3: Fix `account.client.ts`**

Replace the whole file:

```ts
// packages/api-client/src/clients/account.client.ts
import { accountResource } from "@devloggers/api-contracts"
import type { ApiResponse } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class AccountsClient extends CrudClient<typeof accountResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, accountResource)
  }

  /**
   * Uses `accountResource.routes.X` directly (no cast). Casting it to the wider
   * `ApiPathByMethod<"get">` here would erase the literal path type and collapse
   * the return type for every caller — see Task 0 of the Phase 4 plan for the
   * verified repro. The explicit return-type annotation below is defense in
   * depth: it stays correct even if a future edit reintroduces a widening cast
   * inside the method body.
   */
  balances = (): Promise<ApiResponse<typeof accountResource.routes.balances, "get">> => {
    return this.apiClient.get(accountResource.routes.balances)
  }

  tree = (): Promise<ApiResponse<typeof accountResource.routes.tree, "get">> => {
    return this.apiClient.get(accountResource.routes.tree)
  }

  ledger = (
    id: string,
    query?: { page?: number; limit?: number },
  ): Promise<ApiResponse<typeof accountResource.routes.ledger, "get">> => {
    return this.apiClient.get(accountResource.routes.ledger, { params: { id }, query })
  }
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `pnpm --filter @devloggers/api-client build`
Expected: succeeds. If `this.apiClient.get(accountResource.routes.ledger, { params: { id }, query })` reports a type error (the `query` shape not exactly matching `ApiQueryParams<Path, "get">`), that's real information the earlier `as never` was hiding — narrow the fix to a single, commented cast **only on the `query` value**, e.g. `{ params: { id }, query: query as never }`, with a one-line comment explaining the specific mismatch found. Do not blanket-cast the whole options object.

Run: `pnpm --filter @devloggers/api-client test`
Expected: `6 passed` (3 from Task 2 + 3 new).

- [ ] **Step 5: Commit**

```bash
git add packages/api-client/src/clients/account.client.ts packages/api-client/src/infra/crud-client.type-test.ts
git commit -m "fix(api-client): stop widening AccountsClient custom routes, fixing balances/tree/ledger typing"
```

---

## Task 4 — Model `bulkDelete`/`bulkUpdate` explicitly in the resource type (TDD: real red→green)

**Problem (verified):** `bulkUpdate<TUpdateDto>(items: BulkUpdateItem<TUpdateDto>[])` requires the **caller** to supply `TUpdateDto` — it is not derived from the resource, so nothing stops a caller from passing a shape that doesn't match the resource's real update DTO. `bulkDelete`/`bulkUpdate` also both reinterpret `routes.list` (a GET-only route) as a DELETE/PATCH route via `as unknown as ApiPathByMethod<X>`, with no way for a resource to declare a *different* dedicated bulk route.

**Files:**
- Modify: `packages/api-contracts/src/resources/base/crud-resource.ts`
- Modify: `packages/api-client/src/infra/crud-client.ts`
- Modify: `packages/api-client/src/infra/crud-client.type-test.ts`

**Interfaces:**
- Produces: `CrudRoutes.bulkDelete?: ApiPathByMethod<"delete">`, `CrudRoutes.bulkUpdate?: ApiPathByMethod<"patch">` (both optional, default to reusing `list`'s path — no resource file needs to change). `CrudClient.bulkUpdate(items: BulkUpdateItem<UpdateDtoOf<R>>[])` — no more caller-supplied generic.

- [ ] **Step 1: Add the failing assertion**

Append to `packages/api-client/src/infra/crud-client.type-test.ts`:

```ts
import type { UpdateUnitDto } from "@devloggers/api-contracts"

describe("CrudClient.bulkUpdate — item type must derive from the resource, not a caller-supplied generic", () => {
    const client = new UnitsClient(new ApiClient("http://localhost"))

    it("infers the Unit update DTO's own fields on the bulk item, without a type argument", () => {
        expectTypeOf(client.bulkUpdate).parameter(0).items.toHaveProperty("abbreviation")
        expectTypeOf(client.bulkUpdate).parameter(0).items.not.toEqualTypeOf<{ id: string }>()
    })
})
```

- [ ] **Step 2: Run it and confirm it fails**

**Use `npx tsc --noEmit` from `packages/api-client/`, not `pnpm test`.** `vitest run` only transpiles and executes — it does not type-check `expectTypeOf(...)` assertions by default, so a plain `pnpm --filter @devloggers/api-client test` run can never fail on this kind of type-only check (discovered the hard way in Task 3: the brief originally said to use `pnpm test` here too, and it silently reported all-green on broken code because vitest never evaluated the type assertion at all). `tsc --noEmit` is the correct, real oracle for whether a type-level assertion currently holds.

Run: `cd packages/api-client && npx tsc --noEmit`
Expected: fails — today `bulkUpdate`'s own (uninvoked) generic signature has no bound `TUpdateDto`, so `.items` doesn't statically carry `abbreviation`. Capture the actual compiler error text in the report as RED evidence. (If TypeScript resolves the uninstantiated generic differently than expected here, note the actual error message — it's still informative for Step 3 — and proceed; the fix in Step 3 removes the generic entirely, which resolves the ambiguity either way.)

- [ ] **Step 3: Extend `CrudRoutes`**

In `packages/api-contracts/src/resources/base/crud-resource.ts`:

```ts
import { ApiPath, ApiPathByMethod } from "../../api"
import { ResourceDefinition } from "./resource"

/**
 * Standard CRUD route names.
 * Resources using CrudClient must provide routes with these keys.
 */
export type CrudRoutes = {
  list: ApiPathByMethod<"get">
  show: ApiPathByMethod<"get">
  create?: ApiPathByMethod<"post">
  update?: ApiPathByMethod<"patch">
  delete?: ApiPathByMethod<"delete">
  /** Bulk delete route. Defaults to `list`'s path (`DELETE` on the same URL as the list `GET`) when omitted. */
  bulkDelete?: ApiPathByMethod<"delete">
  /** Bulk update route. Defaults to `list`'s path (`PATCH` on the same URL as the list `GET`) when omitted. */
  bulkUpdate?: ApiPathByMethod<"patch">
}

/**
 * A resource that satisfies CRUD requirements.
 * May have extra routes beyond the standard five.
 */
export type CrudResource<
  TKey extends string = string,
  TRoutes extends CrudRoutes & Record<string, ApiPath> = CrudRoutes & Record<string, ApiPath>,
> = ResourceDefinition<TKey, TRoutes>


export function defineCrudResource<T extends string, R extends CrudRoutes & Record<string, ApiPath>>(
  def: CrudResource<T, R>,
): CrudResource<T, R> {
  return def
}
```

- [ ] **Step 4: Update `CrudClient.bulkDelete`/`bulkUpdate`**

In `packages/api-client/src/infra/crud-client.ts`, update the imports and the two methods:

```ts
import type {
  CrudResource,
  ApiPathByMethod,
  ApiResponse,
  ApiPath,
  ApiRequestBody,
  ImportResultDto,
  BulkResult,
  BulkUpdateItem,
} from "@devloggers/api-contracts"
```

```ts
  /**
   * Bulk delete by ids. Hits `DELETE` on the resource's `bulkDelete` route if
   * declared, otherwise the same path as `list`. Returns `{ total, succeeded, failed, errors }`.
   */
  async bulkDelete(ids: string[]): Promise<BulkResult> {
    const route = (this.resource.routes.bulkDelete ??
      (this.resource.routes.list as unknown as ApiPathByMethod<"delete">)) as ApiPathByMethod<"delete">
    const response = await this.apiClient.delete(route, { body: { ids } } as never)
    return unwrapApiData<BulkResult>(response as unknown)
  }

  /**
   * Bulk partial update. Hits `PATCH` on the resource's `bulkUpdate` route if
   * declared, otherwise the same path as `list`. Each item is `{ id } & Partial<update DTO>`,
   * with the update DTO type derived from the resource's own `update` route —
   * no caller-supplied type argument needed or accepted.
   * Returns `{ total, succeeded, failed, errors }`.
   */
  async bulkUpdate(
    items: BulkUpdateItem<ApiRequestBody<NonNullable<R["routes"]["update"]>, "patch">>[],
  ): Promise<BulkResult> {
    const route = (this.resource.routes.bulkUpdate ??
      (this.resource.routes.list as unknown as ApiPathByMethod<"patch">)) as ApiPathByMethod<"patch">
    const response = await this.apiClient.patch(route, { items } as never)
    return unwrapApiData<BulkResult>(response as unknown)
  }
```

- [ ] **Step 5: Fix any call sites that passed an explicit type argument**

Run: `pnpm --filter @devloggers/dashboard typecheck`
If any call site does `client.bulkUpdate<SomeDto>([...])`, remove the `<SomeDto>` — the type now comes from the client's own resource automatically. (Expected: none exist yet, since this method was added recently and not yet wired into a dashboard bulk-edit UI — this step is a safety check, not an anticipated fix.)

- [ ] **Step 6: Run the test and confirm it passes**

Run: `pnpm --filter @devloggers/api-client build`
Run: `pnpm --filter @devloggers/api-client test`
Expected: `7 passed`.

- [ ] **Step 7: Commit**

```bash
git add packages/api-contracts/src/resources/base/crud-resource.ts packages/api-client/src/infra/crud-client.ts packages/api-client/src/infra/crud-client.type-test.ts
git commit -m "feat(api-client): derive bulkUpdate's item type from the resource instead of a caller-supplied generic"
```

---

## Task 5 — Remove `as never`/`as any` from `CrudClient`'s base methods

**Files:**
- Modify: `packages/api-client/src/infra/crud-client.ts`

**Interfaces:**
- Consumes: Task 2's pinning tests (regression check — must stay green).

**What Task 0's verified claim 2b established** (re-read it before starting — it corrects an earlier draft of this task): the cast on the **route itself** (`this.resource.routes.list as ApiPathByMethod<"get">`) is unnecessary and can be deleted outright — probed directly, TypeScript accepts `R["routes"]["list"]` as a `Path` argument with zero cast. But **two other casts are structurally required** and stay:
- The **options argument** (`{ query }`, `{ params: { id } }`, `body`) — `ApiRequestOptions<Path, Method>` can't resolve from an abstract `Path` inside the generic class body; without the cast, TypeScript infers the parameter as `undefined` and rejects any real object.
- The **return value** — `ApiResponse<Path, Method>` has the same abstract-`Path` problem, so `this.apiClient.get(route, ...)`'s own inferred return type collapses to `Promise<unknown>` from inside the generic body, even though `route`'s type is provably correct. The fix is not to delete this assertion (Task 0 originally assumed it could be deleted — it can't) but to stop asserting `as any` and instead assert the **exact declared return type**, so the assertion can never silently disagree with the method's own signature.

- [ ] **Step 1: Replace the five base methods**

```ts
  list(query?: Record<string, unknown>): Promise<ApiResponse<R["routes"]["list"], "get">> {
    const route = this.resource.routes.list
    // The options cast and the return-value cast are both structurally required —
    // see Phase 4 plan Task 0 "verified claim 2b" for the direct compiler probe.
    // ApiResponse<Path, Method> can't resolve while Path is still the abstract
    // R["routes"]["list"] rather than a literal, so this.apiClient.get(...)'s own
    // inferred type collapses to Promise<unknown> here — asserting the exact
    // declared return type (not `any`) keeps this from silently drifting out of
    // sync with the signature above.
    return this.apiClient.get(route, query ? ({ query } as never) : undefined) as Promise<
      ApiResponse<R["routes"]["list"], "get">
    >
  }

  show(id: string): Promise<ApiResponse<R["routes"]["show"], "get">> {
    const route = this.resource.routes.show
    return this.apiClient.get(route, { params: { id } } as never) as Promise<
      ApiResponse<R["routes"]["show"], "get">
    >
  }

  create(body: unknown): Promise<ApiResponse<NonNullable<R["routes"]["create"]>, "post">> {
    const route = this.resource.routes.create as NonNullable<R["routes"]["create"]>
    return this.apiClient.post(route, body as never) as Promise<
      ApiResponse<NonNullable<R["routes"]["create"]>, "post">
    >
  }

  update(id: string, body: unknown): Promise<ApiResponse<NonNullable<R["routes"]["update"]>, "patch">> {
    const route = this.resource.routes.update as NonNullable<R["routes"]["update"]>
    return this.apiClient.patch(route, body as never, { params: { id } } as never) as Promise<
      ApiResponse<NonNullable<R["routes"]["update"]>, "patch">
    >
  }

  destroy(id: string): Promise<ApiResponse<NonNullable<R["routes"]["delete"]>, "delete">> {
    const route = this.resource.routes.delete as NonNullable<R["routes"]["delete"]>
    return this.apiClient.delete(route, { params: { id } } as never) as Promise<
      ApiResponse<NonNullable<R["routes"]["delete"]>, "delete">
    >
  }
```

Note what changed and what didn't: the bare `as ApiPathByMethod<"get"/"post"/"patch"/"delete">` cast on each `route` local is gone (proven unnecessary — `create`/`update`/`destroy` keep a narrower `NonNullable<...>` assertion only because those routes are declared optional on `CrudRoutes`, which is a real, different, legitimate narrowing, not the same widening problem). Every `) as any` is gone, replaced by a precisely-typed `as Promise<ApiResponse<...>>` that matches the method's own declared return type exactly. The `as never` on constructed option objects is unchanged — still required, still one per call, still commented.

- [ ] **Step 2: Verify nothing broke**

Run: `pnpm --filter @devloggers/api-client build`
Expected: succeeds with zero errors.

Run: `pnpm --filter @devloggers/api-client test`
Expected: `7 passed` — Task 2's pinning tests confirm the return types are unchanged.

Run: `grep -n "as any" packages/api-client/src/infra/crud-client.ts`
Expected: no output — `as any` is fully gone from this file.

Run: `grep -n "as never" packages/api-client/src/infra/crud-client.ts`
Expected: still shows hits, one per option-argument construction, each immediately preceded or followed by a comment. This is the honest, verified final state — see Task 0 "verified claim 2b" for why literal zero isn't achievable here without a larger `ApiClient` generics redesign, which is out of this plan's scope.

- [ ] **Step 3: Commit**

```bash
git add packages/api-client/src/infra/crud-client.ts
git commit -m "refactor(api-client): drop unnecessary route casts, replace blanket 'as any' returns with precise typed assertions"
```

---

## Task 6 — Dashboard: remove unnecessary `RhfResourceSelect` `getLabel` casts

Verified in Task 0: `ResourceItem<TClient>` (the type `getLabel`'s parameter already has) resolves correctly for every client below. These casts do nothing but suppress a phantom error.

**Files:**
- Modify: `apps/dashboard/modules/bank-accounts/components/bank-accounts-form.tsx:49`
- Modify: `apps/dashboard/modules/cashboxes/components/cashboxes-form.tsx:49`
- Modify: `apps/dashboard/modules/parties/components/parties-form.tsx:96,104`
- Modify: `apps/dashboard/modules/settings/components/gl-accounts-form.tsx:97`
- Modify: `apps/dashboard/modules/expenses/components/expense-form.tsx:35,45,54`
- Modify: `apps/dashboard/modules/expenses/components/expense-line-row.tsx:48`
- Modify: `apps/dashboard/modules/payments/components/payment-form.tsx:59,69,78,87`

- [ ] **Step 1: `bank-accounts-form.tsx`**

```tsx
// was: getLabel={(it) => `${(it as any).code} — ${(it as any).name}`}
getLabel={(it) => `${it.code} — ${it.name}`}
```

- [ ] **Step 2: `cashboxes-form.tsx`**

Same transform: `getLabel={(it) => \`${it.code} — ${it.name}\`}`.

- [ ] **Step 3: `parties-form.tsx`** (two occurrences: `receivableAccount`, `payableAccount`)

Same transform on both `getLabel` callbacks:
```tsx
getLabel={(it) => `${it.code} — ${it.name}`}
```

- [ ] **Step 4: `gl-accounts-form.tsx`**

```tsx
// was: getLabel={(it) => `${(it as any).code} — ${(it as any).name}`}
getLabel={(it) => `${it.code} — ${it.name}`}
```

- [ ] **Step 5: `expense-form.tsx`** (three occurrences: `cashbox`, `currency`, `fiscalPeriod`)

```tsx
// cashbox and currency:
getLabel={(it) => `${it.code} — ${it.name}`}
// fiscalPeriod (no code field on FiscalPeriod):
getLabel={(it) => it.name}
```

- [ ] **Step 6: `expense-line-row.tsx`**

```tsx
// was: getLabel={(it) => `${(it as any).code ?? ""} — ${(it as any).name ?? ""}`.trim()}
getLabel={(it) => `${it.code ?? ""} — ${it.name ?? ""}`.trim()}
```

- [ ] **Step 7: `payment-form.tsx`** (four occurrences using the heavier `Record<string,string>` cast — same fix, simpler)

```tsx
// cashbox and currency:
getLabel={(it) => `${it.code} — ${it.name}`}
// party and fiscalPeriod (no code field):
getLabel={(it) => it.name}
```

- [ ] **Step 8: Verify**

Run: `pnpm --filter @devloggers/dashboard typecheck`
Expected: zero new errors. If any field name doesn't match (e.g. a resource's real field is named differently than `code`/`name`), the compiler will point at the exact line — fix the field name using the error message, don't re-add a cast.

Run: `grep -n "as any\|as unknown" apps/dashboard/modules/bank-accounts/components/bank-accounts-form.tsx apps/dashboard/modules/cashboxes/components/cashboxes-form.tsx apps/dashboard/modules/parties/components/parties-form.tsx apps/dashboard/modules/settings/components/gl-accounts-form.tsx apps/dashboard/modules/expenses/components/expense-form.tsx apps/dashboard/modules/expenses/components/expense-line-row.tsx apps/dashboard/modules/payments/components/payment-form.tsx`
Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add apps/dashboard/modules/bank-accounts/components/bank-accounts-form.tsx apps/dashboard/modules/cashboxes/components/cashboxes-form.tsx apps/dashboard/modules/parties/components/parties-form.tsx apps/dashboard/modules/settings/components/gl-accounts-form.tsx apps/dashboard/modules/expenses/components/expense-form.tsx apps/dashboard/modules/expenses/components/expense-line-row.tsx apps/dashboard/modules/payments/components/payment-form.tsx
git commit -m "refactor(dashboard): remove unnecessary getLabel casts — RhfResourceSelect already types items correctly"
```

---

## Task 7 — Dashboard: clean up `accounts` module now that `AccountsClient` is fixed

Task 3 fixed `balances()`/`tree()`/`ledger()` to return real types. These five files can now drop their manual re-typing.

**Files:**
- Modify: `apps/dashboard/modules/accounts/hooks/use-account-balances.ts`
- Modify: `apps/dashboard/modules/accounts/hooks/use-account-tree.ts`
- Modify: `apps/dashboard/modules/accounts/hooks/use-account-ledger.ts`
- Modify: `apps/dashboard/modules/accounts/components/account-picker.tsx:54`
- Modify: `apps/dashboard/modules/accounts/components/accounts-form.tsx:72`

- [ ] **Step 1: `use-account-balances.ts`**

The `select` callback currently does `(((res as { data?: unknown })?.data ?? []) as unknown) as RawBalance[]`. Replace with the real typed field access — `balances()` now returns `ApiResponse<typeof accountResource.routes.balances, "get">`, which has a real `data` array:

```ts
import { useQuery } from "@tanstack/react-query"
import { accountResource } from "@devloggers/api-contracts"
import { useApi } from "@/shared/useApi"
import type { AccountBalanceItem } from "../accounts.types"

export const ACCOUNT_BALANCES_KEY = ["account-balances"] as const

export function useAccountBalances() {
    const api = useApi()
    return useQuery({
        queryKey: ACCOUNT_BALANCES_KEY,
        queryFn: () => api[accountResource.key].balances(),
        staleTime: 30_000,
        select: (res): AccountBalanceItem[] => {
            const rows = res.data ?? []
            return rows.map((r) => ({
                id: r.id,
                code: r.code,
                name: r.name,
                nameI18n: r.nameI18n ?? null,
                type: r.type,
                parentId: r.parentId ?? null,
                isActive: r.isActive,
                ownBalance: r.ownBalance,
                rolledBalance: r.rolledBalance,
                // feed the tree's inline balance display with the rolled figure
                currentBalance: r.rolledBalance,
            }))
        },
    })
}
```

If `res.data`'s real element type doesn't have one of these fields (or has a different name), `pnpm --filter @devloggers/dashboard typecheck` will point at the exact mismatch — fix the field reference or `AccountBalanceItem`'s shape, whichever is wrong, using the compiler error as ground truth. Delete the now-unused `RawBalance` type.

- [ ] **Step 2: `use-account-tree.ts`**

Same transform:

```ts
import { useQuery } from "@tanstack/react-query"
import { accountResource } from "@devloggers/api-contracts"
import { useApi } from "@/shared/useApi"
import type { AccountListItem } from "../accounts.types"

export const ACCOUNT_TREE_KEY = ["account-tree"] as const

export function useAccountTree() {
    const api = useApi()
    return useQuery({
        queryKey: ACCOUNT_TREE_KEY,
        queryFn: () => api[accountResource.key].tree(),
        staleTime: 60_000,
        select: (res): AccountListItem[] => {
            const rows = res.data ?? []
            return rows.map((r) => ({
                id: r.id,
                code: r.code,
                name: r.name,
                nameI18n: r.nameI18n ?? null,
                type: r.type,
                parentId: r.parentId ?? null,
                isActive: r.isActive,
            }))
        },
    })
}
```

Delete the now-unused `RawTreeItem` type.

- [ ] **Step 3: `use-account-ledger.ts`**

```ts
import { useQuery } from "@tanstack/react-query"
import { accountResource } from "@devloggers/api-contracts"
import { useApi } from "@/shared/useApi"
import type { AccountLedgerLine } from "../accounts.types"

export type AccountLedgerPage = {
    data: AccountLedgerLine[]
    total: number
    page: number
    limit: number
}

export function useAccountLedger(accountId: string | null, page: number, limit = 50) {
    const api = useApi()
    return useQuery({
        queryKey: ["account-ledger", accountId, page, limit],
        enabled: !!accountId,
        queryFn: () => api[accountResource.key].ledger(accountId as string, { page, limit }),
        select: (res): AccountLedgerPage => {
            const pagination = res.meta?.pagination
            return {
                data: res.data ?? [],
                total: pagination?.total ?? 0,
                page: pagination?.page ?? page,
                limit: pagination?.limit ?? limit,
            }
        },
    })
}
```

If `AccountLedgerLine` (from `../accounts.types`) doesn't structurally match the real `res.data` element type, fix `AccountLedgerLine`'s definition to match what the compiler reports — don't re-cast.

- [ ] **Step 4: `account-picker.tsx:54` and `accounts-form.tsx:72`**

Both currently do `((data?.data ?? []) as unknown) as AccountListItem[]` after calling `api[accountResource.key].list(...)` (the standard, already-correctly-typed `list()` method — not `balances`/`tree`). Replace with:

```ts
const raw = data?.data ?? []
```

and let TypeScript infer the real element type. If `AccountListItem` needs adjusting to match, fix `AccountListItem`, not the call site.

- [ ] **Step 5: Verify**

Run: `pnpm --filter @devloggers/dashboard typecheck`
Expected: zero new errors.

Run: `grep -rn "as unknown\|as any" apps/dashboard/modules/accounts/`
Expected: no output in the five files above (other files in the module, if any, are out of this task's scope).

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/modules/accounts/hooks/use-account-balances.ts apps/dashboard/modules/accounts/hooks/use-account-tree.ts apps/dashboard/modules/accounts/hooks/use-account-ledger.ts apps/dashboard/modules/accounts/components/account-picker.tsx apps/dashboard/modules/accounts/components/accounts-form.tsx
git commit -m "refactor(dashboard): drop manual re-typing in accounts module now that AccountsClient is properly typed"
```

---

## Task 8 — Dashboard: remove unnecessary casts in table columns and page titles

Verified in Task 0 for the `brands`/`catalog-entities` pattern (identical `asRow()` helper in both) and for `CustomFieldsClient` (its `label`/`name` fields already resolve to `{ ar: string; en?: string }`, not `Record<string, never>` — the `custom-field.dto.ts` DTO for these two fields is already correctly typed with `LocalizedStringDto`, this is a stale cast, not a real DTO bug).

**Files:**
- Modify: `apps/dashboard/modules/brands/components/brands-columns.tsx`
- Modify: `apps/dashboard/modules/brands/components/brands-page.tsx:16`
- Modify: `apps/dashboard/modules/catalog-entities/components/catalog-entities-columns.tsx`
- Modify: `apps/dashboard/modules/catalog-entities/components/catalog-entities-page.tsx:16`
- Modify: `apps/dashboard/modules/users/components/users-page.tsx:16`
- Modify: `apps/dashboard/modules/custom-fields/components/custom-fields-columns.tsx:17`
- Modify: `apps/dashboard/modules/payments/components/payments-columns.tsx`

- [ ] **Step 1: `brands-columns.tsx` — delete the `asRow` indirection entirely**

```tsx
import type { ColumnDef } from "@tanstack/react-table"
import type { BrandsClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { BooleanCell, ColumnHeader } from "@/shared/data-view/table-view"

type ColumnTranslator = (key: string) => string

export function createBrandsColumns(
    helpers: ResourceTableHelpers<BrandsClient>,
    t: ColumnTranslator,
): ColumnDef<ResourceItem<BrandsClient>>[] {
    return [
        {
            id: "name",
            enableSorting: true,
            accessorFn: (row) => row.name,
            header: ({ column }) => <ColumnHeader column={column} title={t("name")} />,
            cell: ({ row }) => {
                const brand = row.original
                return (
                    <div className="flex items-center gap-2">
                        {brand.imageUrl && (
                            <img
                                src={brand.imageUrl}
                                alt={brand.name}
                                className="h-6 w-6 rounded object-contain"
                            />
                        )}
                        <span>{brand.name}</span>
                    </div>
                )
            },
        },
        {
            id: "isActive",
            accessorFn: (row) => row.isActive,
            header: ({ column }) => <ColumnHeader column={column} title={t("active")} />,
            cell: ({ row }) => <BooleanCell value={row.original.isActive} />,
        },
        helpers.actionsColumn(),
    ]
}
```

If `ResourceItem<BrandsClient>` doesn't have `imageUrl`/`isActive` (e.g. because `brand.dto.ts`'s in-progress WIP changed the response shape — see Global Constraints), the compiler error will show the real current shape; adjust field names to match rather than re-adding a cast, and flag the mismatch to whoever owns the brands WIP.

- [ ] **Step 2: `brands-page.tsx:16`**

```tsx
// was: title={(it) => (it?.id ? String((it as unknown as { name?: unknown }).name ?? "") : t("addAction"))}
title={(it) => (it?.id ? it.name : t("addAction"))}
```

- [ ] **Step 3: `catalog-entities-columns.tsx` — same `asRow` deletion**

```tsx
import type { ColumnDef } from "@tanstack/react-table"
import type { CatalogEntitiesClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { BooleanCell, ColumnHeader } from "@/shared/data-view/table-view"
import { Badge } from "@/shared/components/ui/badge"

type ColumnTranslator = (key: string) => string

export function createCatalogEntitiesColumns(
    helpers: ResourceTableHelpers<CatalogEntitiesClient>,
    t: ColumnTranslator,
): ColumnDef<ResourceItem<CatalogEntitiesClient>>[] {
    return [
        {
            id: "name",
            enableSorting: true,
            accessorFn: (row) => row.name,
            header: ({ column }) => <ColumnHeader column={column} title={t("name")} />,
            cell: ({ row }) => row.original.name,
        },
        {
            id: "kind",
            accessorFn: (row) => row.kind,
            header: ({ column }) => <ColumnHeader column={column} title={t("kind")} />,
            cell: ({ row }) => {
                const kind = row.original.kind
                return kind ? <Badge variant="secondary">{kind}</Badge> : null
            },
        },
        {
            id: "parent",
            header: ({ column }) => <ColumnHeader column={column} title={t("parent")} />,
            cell: ({ row }) => {
                const parent = row.original.parent
                if (!parent) return <span className="text-muted-foreground text-sm">—</span>
                return (
                    <span className="text-sm">
                        {parent.name}
                        <span className="ml-1.5 text-xs text-muted-foreground">({parent.kind})</span>
                    </span>
                )
            },
        },
        {
            id: "isActive",
            accessorFn: (row) => row.isActive,
            header: ({ column }) => <ColumnHeader column={column} title={t("active")} />,
            cell: ({ row }) => <BooleanCell value={row.original.isActive} />,
        },
        helpers.actionsColumn(),
    ]
}
```

`parent`'s nested shape depends on `CatalogEntityResponseDto.parent`'s type — Task 11 fixes that DTO's `type: () => Object` to a real nested type (`type: () => CatalogEntityParentSummary`); if this task runs before Task 11, `parent.name`/`parent.kind` may still type-check against a generic `Object` shape with no fields. In that case, do Task 11's `catalog-entity.dto.ts` fix first (it's independent, no ordering dependency the other direction), regenerate, then return to this step.

- [ ] **Step 4: `catalog-entities-page.tsx:16`**

```tsx
// was: title={(it) => (it?.id ? (it as unknown as { name: string }).name : t("addAction"))}
title={(it) => (it?.id ? it.name : t("addAction"))}
```

- [ ] **Step 5: `users-page.tsx:16`**

```tsx
// was: title={(it) => ((it as any)?.id ? (it as any).fullName : t("addAction"))}
title={(it) => (it?.id ? it.fullName : t("addAction"))}
```

- [ ] **Step 6: `custom-fields-columns.tsx:17`**

```tsx
// was: accessorFn: (row) => localize(row.label as never, locale, localize(row.name as never, locale)),
accessorFn: (row) => localize(row.label, locale, localize(row.name, locale)),
```

- [ ] **Step 7: `payments-columns.tsx` — remove the `as any` on `accessorKey` and the `Record<string, unknown>` re-casts**

```tsx
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { PaymentsClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { ColumnHeader } from "@/shared/data-view/table-view"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { MoreHorizontalIcon, SendIcon, XCircleIcon, PencilIcon, EyeIcon } from "lucide-react"
import { cn } from "@/shared/lib/utils"

type PaymentItem = ResourceItem<PaymentsClient>
type ColumnTranslator = (key: string) => string

export type PaymentColumnActions = {
    onOpenModal: (id: string) => void
    postPayment: (id: string) => Promise<unknown>
    cancelPayment: (id: string) => Promise<unknown>
}

function PaymentActionsCell({
    row,
    t,
    actions,
}: {
    row: PaymentItem
    t: ColumnTranslator
    actions: PaymentColumnActions
}) {
    const status = row.status
    const id = String(row.id)

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                    <MoreHorizontalIcon className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {status === "DRAFT" && (
                    <>
                        <DropdownMenuItem onClick={() => actions.onOpenModal(id)}>
                            <PencilIcon className="me-2 h-4 w-4" />
                            {t("actions.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => actions.postPayment(id)}>
                            <SendIcon className="me-2 h-4 w-4" />
                            {t("actions.post")}
                        </DropdownMenuItem>
                    </>
                )}
                {status === "POSTED" && (
                    <>
                        <DropdownMenuItem onClick={() => actions.onOpenModal(id)}>
                            <EyeIcon className="me-2 h-4 w-4" />
                            {t("actions.view")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => actions.cancelPayment(id)}
                        >
                            <XCircleIcon className="me-2 h-4 w-4" />
                            {t("actions.cancel")}
                        </DropdownMenuItem>
                    </>
                )}
                {status === "CANCELLED" && (
                    <DropdownMenuItem onClick={() => actions.onOpenModal(id)}>
                        <EyeIcon className="me-2 h-4 w-4" />
                        {t("actions.view")}
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export function createPaymentsColumns(
    _helpers: ResourceTableHelpers<PaymentsClient>,
    t: ColumnTranslator,
    actions: PaymentColumnActions,
): ColumnDef<PaymentItem>[] {
    return [
        {
            accessorKey: "number",
            header: ({ column }) => <ColumnHeader column={column} title={t("number")} />,
            cell: ({ row }) => (
                <span className="font-mono font-semibold text-sm">{row.getValue("number")}</span>
            ),
        },
        {
            accessorKey: "type",
            header: ({ column }) => <ColumnHeader column={column} title={t("type")} />,
            cell: ({ row }) => {
                const type = row.getValue("type") as string
                return (
                    <Badge variant="secondary" className="text-xs font-medium">
                        {type === "RECEIPT" ? t("types.RECEIPT") : type === "PAYMENT" ? t("types.PAYMENT") : t("types.ADJUSTMENT")}
                    </Badge>
                )
            },
        },
        {
            accessorKey: "date",
            header: ({ column }) => <ColumnHeader column={column} title={t("date")} />,
            cell: ({ row }) => {
                const val = row.getValue("date") as string
                return val ? new Date(val).toLocaleDateString() : "—"
            },
        },
        {
            id: "cashboxCode",
            header: ({ column }) => <ColumnHeader column={column} title={t("cashbox")} />,
            cell: ({ row }) => {
                const cashbox = row.original.cashbox
                return cashbox?.code
                    ? <span className="font-mono text-sm">{cashbox.code}</span>
                    : <span className="text-muted-foreground">—</span>
            },
        },
        {
            id: "partyName",
            header: ({ column }) => <ColumnHeader column={column} title={t("party")} />,
            cell: ({ row }) => {
                const party = row.original.party
                return party?.name
                    ? <span>{party.name}</span>
                    : <span className="text-muted-foreground">—</span>
            },
        },
        {
            accessorKey: "status",
            header: ({ column }) => <ColumnHeader column={column} title={t("statusLabel")} />,
            cell: ({ row }) => {
                const status = row.getValue("status") as string
                return (
                    <Badge
                        variant="outline"
                        className={cn(
                            "font-medium text-xs",
                            status === "POSTED" && "border-green-500 text-green-700 dark:text-green-400",
                            status === "CANCELLED" && "border-destructive text-destructive",
                            status === "DRAFT" && "border-muted-foreground text-muted-foreground",
                        )}
                    >
                        {status === "POSTED"
                            ? t("status.posted")
                            : status === "CANCELLED"
                                ? t("status.cancelled")
                                : t("status.draft")}
                    </Badge>
                )
            },
        },
        {
            accessorKey: "amount",
            header: ({ column }) => (
                <ColumnHeader column={column} title={t("amount")} className="text-end" />
            ),
            cell: ({ row }) => {
                const amount = row.getValue("amount") as number
                return (
                    <div className="text-end font-medium tabular-nums">
                        {amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                )
            },
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <PaymentActionsCell row={row.original} t={t} actions={actions} />
            ),
        },
    ]
}
```

If `PaymentItem` doesn't have a `cashbox`/`party` nested object (i.e. the payment list response doesn't embed those relations), the compiler will show the real shape — this may mean the API's `PaymentResponseDto` needs a `cashbox`/`party` summary field added (a genuine DTO gap, not a cast to remove); if so, note it and keep the existing `Record<string, unknown>` cast **at those two cells only**, with a comment linking to a follow-up, rather than silently guessing a shape.

- [ ] **Step 8: Verify**

Run: `pnpm --filter @devloggers/dashboard typecheck`

Run: `grep -rn "as any\|as unknown" apps/dashboard/modules/brands/components/ apps/dashboard/modules/catalog-entities/components/ apps/dashboard/modules/users/components/users-page.tsx apps/dashboard/modules/custom-fields/components/custom-fields-columns.tsx apps/dashboard/modules/payments/components/payments-columns.tsx`
Expected: no output (or only the documented `cashbox`/`party` survivor from Step 7, if that gap turned out to be real).

- [ ] **Step 9: Commit**

```bash
git add apps/dashboard/modules/brands/components/brands-columns.tsx apps/dashboard/modules/brands/components/brands-page.tsx apps/dashboard/modules/catalog-entities/components/catalog-entities-columns.tsx apps/dashboard/modules/catalog-entities/components/catalog-entities-page.tsx apps/dashboard/modules/users/components/users-page.tsx apps/dashboard/modules/custom-fields/components/custom-fields-columns.tsx apps/dashboard/modules/payments/components/payments-columns.tsx
git commit -m "refactor(dashboard): remove unnecessary casts in table columns and dialog titles"
```

---

## Task 9 — Dashboard: remove unnecessary casts in the `items` module; document genuine survivors

**Files:**
- Modify: `apps/dashboard/modules/items/components/items-form.tsx:122,132`
- Modify: `apps/dashboard/modules/items/components/items-tags-section.tsx`
- Modify: `apps/dashboard/modules/items/components/items-catalog-entities-section.tsx`
- Modify: `apps/dashboard/modules/items/components/items-relations-section.tsx:125`

- [ ] **Step 1: `items-form.tsx` — `baseUnit` and `brand` selects**

The `category` select two lines above already does `getLabel={(item) => item.name}` with **no cast** — proof this exact pattern works uncast in this same file. Apply it to the other two:

```tsx
// was: getLabel={(item) => (item as unknown as { name: string }).name}
getLabel={(item) => item.name}
```
(both `baseUnit` and `brand` selects)

- [ ] **Step 2: `items-tags-section.tsx` — replace the `any`-typed list/array handling**

The `tags.list()` and `tag-assignments.list()` calls are standard `CrudClient.list()` calls (already correctly typed per Task 0/5) — only the *query parameter* (`{ limit: 100 }`) needs a documented cast, because the query shape here isn't declared in the endpoint's OpenAPI query schema. Rewrite:

```tsx
"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { XIcon, PlusIcon } from "lucide-react"
import { useApi } from "@/shared/useApi"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/components/ui/select"

interface ItemTagsSectionProps {
    itemId: string
    disabled?: boolean
}

export function ItemTagsSection({ itemId, disabled }: ItemTagsSectionProps) {
    const api = useApi()
    const t = useTranslations("business.resources.items")
    const qc = useQueryClient()
    const [selectedTagId, setSelectedTagId] = useState("")

    const assignmentsKey = ["tag-assignments", "item", itemId]

    const { data: assignmentsResponse } = useQuery({
        queryKey: assignmentsKey,
        // entityType/entityId are ad-hoc filter params not declared on the list
        // query schema — see Phase 4 plan Task 9 for why this one cast stays.
        queryFn: () => api["tag-assignments"].list({ entityType: "item", entityId: itemId } as never),
        enabled: !!itemId,
    })
    const assignments = assignmentsResponse?.data ?? []

    const { data: tagsResponse } = useQuery({
        queryKey: ["tags", "module-items"],
        queryFn: () => api.tags.list({ limit: 100 }),
        staleTime: 5 * 60 * 1000,
    })
    const allTags = tagsResponse?.data ?? []
    const itemTags = allTags.filter((tag) => tag.module === "items")
    const assignedIds = new Set(assignments.map((a) => a.tagId))
    const available = itemTags.filter((tag) => !assignedIds.has(tag.id))

    const addMutation = useMutation({
        mutationFn: (tagId: string) =>
            api["tag-assignments"].create({ tagId, entityType: "item", entityId: itemId }),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: assignmentsKey })
            setSelectedTagId("")
        },
    })

    const removeMutation = useMutation({
        mutationFn: (id: string) => api["tag-assignments"].destroy(id),
        onSuccess: () => void qc.invalidateQueries({ queryKey: assignmentsKey }),
    })

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("sectionTags")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2 min-h-8">
                    {assignments.length === 0 ? (
                        <span className="text-sm text-muted-foreground">{t("noTags")}</span>
                    ) : (
                        assignments.map((assignment) => (
                            <Badge
                                key={assignment.id}
                                variant="outline"
                                className="gap-1 pr-1"
                                style={{ borderColor: assignment.tag?.color ?? undefined }}
                            >
                                {assignment.tag?.color && (
                                    <span
                                        className="inline-block h-2 w-2 rounded-full"
                                        style={{ backgroundColor: assignment.tag.color }}
                                    />
                                )}
                                <span>{assignment.tag?.name}</span>
                                <button
                                    type="button"
                                    aria-label="Remove tag"
                                    disabled={disabled || removeMutation.isPending}
                                    className="ml-1 rounded-full hover:bg-muted p-0.5 disabled:opacity-50"
                                    onClick={() => removeMutation.mutate(assignment.id)}
                                >
                                    <XIcon className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))
                    )}
                </div>
                {available.length > 0 && (
                    <div className="flex gap-2">
                        <Select
                            value={selectedTagId}
                            onValueChange={setSelectedTagId}
                            disabled={disabled}
                        >
                            <SelectTrigger className="flex-1">
                                <SelectValue placeholder={t("addTagPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                {available.map((tag) => (
                                    <SelectItem key={tag.id} value={tag.id}>
                                        <div className="flex items-center gap-2">
                                            {tag.color && (
                                                <span
                                                    className="inline-block h-3 w-3 rounded-full border border-border"
                                                    style={{ backgroundColor: tag.color }}
                                                />
                                            )}
                                            <span>{tag.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={!selectedTagId || disabled || addMutation.isPending}
                            onClick={() => addMutation.mutate(selectedTagId)}
                        >
                            <PlusIcon className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
```

If `assignment.tag` isn't embedded in `TagAssignmentsClient`'s response type, the compiler will show the real shape — this mirrors the `payments-columns.tsx` caveat in Task 8 Step 7: if the embed genuinely isn't in the DTO, that's a real gap to flag, not a cast to restore.

- [ ] **Step 3: `items-catalog-entities-section.tsx` — same treatment**

```tsx
"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { TrashIcon, PlusIcon } from "lucide-react"
import { useApi } from "@/shared/useApi"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Label } from "@/shared/components/ui/label"
import { ResourceSelectField } from "@/shared/components/form"
import type { ICrudClient } from "@devloggers/api-client"

interface ItemCatalogEntitiesSectionProps {
    itemId: string
    disabled?: boolean
}

export function ItemCatalogEntitiesSection({ itemId, disabled }: ItemCatalogEntitiesSectionProps) {
    const api = useApi()
    const t = useTranslations("business.resources.items")
    const qc = useQueryClient()

    const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)

    const linksKey = ["item-catalog-entities", itemId]

    const { data: linksResponse } = useQuery({
        queryKey: linksKey,
        // itemId filter is an ad-hoc bracket-notation param not on the list query schema.
        queryFn: () => api["item-catalog-entities"].list({ [`filters[itemId][$eq]`]: itemId } as never),
        enabled: !!itemId,
    })
    const links = linksResponse?.data ?? []

    const addMutation = useMutation({
        mutationFn: () =>
            api["item-catalog-entities"].create({
                itemId,
                catalogEntityId: selectedEntityId!,
            }),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: linksKey })
            setSelectedEntityId(null)
        },
    })

    const removeMutation = useMutation({
        mutationFn: (id: string) => api["item-catalog-entities"].destroy(id),
        onSuccess: () => void qc.invalidateQueries({ queryKey: linksKey }),
    })

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("sectionCatalogEntities")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {links.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("noCatalogEntities")}</p>
                ) : (
                    <div className="divide-y rounded-md border">
                        {links.map((link) => (
                            <div key={link.id} className="flex items-center justify-between px-3 py-2 text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-medium truncate">
                                        {link.catalogEntity?.name ?? link.id}
                                    </span>
                                    {link.catalogEntity?.kind && (
                                        <Badge variant="secondary" className="text-xs py-0 shrink-0">
                                            {link.catalogEntity.kind}
                                        </Badge>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 text-destructive hover:text-destructive"
                                    disabled={disabled || removeMutation.isPending}
                                    onClick={() => removeMutation.mutate(link.id)}
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="space-y-3 rounded-md border p-3">
                    <p className="text-sm font-medium text-muted-foreground">{t("addCatalogEntity")}</p>
                    <div className="space-y-2">
                        <Label className="text-sm">{t("sectionCatalogEntities")}</Label>
                        <ResourceSelectField<ICrudClient>
                            client={(a) => a["catalog-entities"] as ICrudClient}
                            getLabel={(item) => {
                                const e = item as unknown as { name: string; kind: string }
                                return `${e.name} · ${e.kind}`
                            }}
                            value={selectedEntityId}
                            onChange={(val) => setSelectedEntityId(val as string | null)}
                            placeholder={t("catalogEntityPlaceholder")}
                            disabled={disabled}
                            queryKey={["catalog-entities", "entity-picker"]}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!selectedEntityId || disabled || addMutation.isPending}
                        onClick={() => addMutation.mutate()}
                    >
                        <PlusIcon className="h-4 w-4 me-2" />
                        {t("addCatalogEntityAction")}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
```

Note: the `ResourceSelectField<ICrudClient>` cast on `getLabel`'s parameter stays — `ICrudClient` (the generic fallback interface) genuinely doesn't know `catalog-entities`' concrete field shape, unlike the other files in Task 6 which used a concrete client type. This is a **documented survivor**, not a bug: fixing it properly would mean typing `ResourceSelectField` with the concrete `CatalogEntitiesClient` instead of falling back to `ICrudClient`, which is a bigger change than this task's scope — leave the cast with the inline comment already present (`item as unknown as { name: string; kind: string }`) and move on. Only `links`'s response casts change here, not the picker's `getLabel`.

- [ ] **Step 4: `items-relations-section.tsx:125` — same survivor pattern**

Only clean the obviously-broken part (the response array unwrap already uses proper typed access at lines 47/86/89 — no change needed there per re-reading; `rel.relatedItem`, `rel.notes`, `rel.id` are already accessed without casts in this file). The one remaining rough edge is line 125's picker, which has the same `ICrudClient`-fallback limitation as Step 3 — leave `getLabel={(item) => \`${(item ).name} (${(item ).code})\`}`'s awkward spacing but no cast is actually present there to remove (double-check: the two nested parens around `item` with a space are a stray artifact, not a type cast — clean up the stray space while touching the line, nothing else):

```tsx
getLabel={(item) => `${(item).name} (${(item).code})`}
```

- [ ] **Step 5: Verify**

Run: `pnpm --filter @devloggers/dashboard typecheck`

Run: `grep -rn "as any\|as unknown" apps/dashboard/modules/items/components/items-form.tsx apps/dashboard/modules/items/components/items-tags-section.tsx apps/dashboard/modules/items/components/items-catalog-entities-section.tsx apps/dashboard/modules/items/components/items-relations-section.tsx`
Expected: only the two documented survivors from Steps 2–3 (the ad-hoc filter-query casts) and the one `ICrudClient`-fallback cast in `items-catalog-entities-section.tsx` remain, each with its inline comment.

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/modules/items/components/items-form.tsx apps/dashboard/modules/items/components/items-tags-section.tsx apps/dashboard/modules/items/components/items-catalog-entities-section.tsx apps/dashboard/modules/items/components/items-relations-section.tsx
git commit -m "refactor(dashboard): remove unnecessary casts in items module, document remaining survivors"
```

---

## Task 10 — Dashboard: remaining misc cast cleanups

**Files:**
- Modify: `apps/dashboard/modules/auth/register-form.tsx:65`
- Modify: `apps/dashboard/modules/home/components/dashboard-recent-payments.tsx:41`
- Modify: `apps/dashboard/modules/invoices/components/invoice-payments-panel.tsx:106`
- Modify: `apps/dashboard/modules/onboarding/components/document-sequences-step.tsx:44-45`
- Modify: `apps/dashboard/modules/onboarding/components/gl-defaults-step.tsx:49`
- Modify: `apps/dashboard/modules/opening-stock/components/opening-stock-page.tsx:96`
- Modify: `apps/dashboard/modules/opening-balance-sessions/hooks/use-opening-balance-sessions.ts:97`
- Modify: `apps/dashboard/modules/stock-counts/stock-counts.config.ts:81`

- [ ] **Step 1: `register-form.tsx` — type the register response properly**

`api.auth.register(values)` is already correctly typed (Task 0: `AuthClient.register` uses the resource's literal route, no cast, resolves fine). Replace the manual reinterpretation:

```tsx
mutationFn: (values: RegisterFormValues) => api.auth.register(values),
onSuccess: async (result) => {
    const data = result.data
    if (data?.accessToken && data.user) {
        await login(data.accessToken, data.user)
        router.push(localizedHref("/"))
    }
},
```

`login`'s signature is `(token: string, user: AuthUser, expiresIn?: number) => Promise<void>` (`apps/dashboard/shared/stores/auth-store.ts:16`). If `data.user`'s real shape (from `AuthUserDto` in `apps/api/src/modules/identity/auth/dto/auth-response.dto.ts`) doesn't structurally satisfy `AuthUser`, the compiler will show exactly which field is missing or mismatched — fix `AuthUser`'s definition to match the real DTO rather than re-casting.

- [ ] **Step 2: `dashboard-recent-payments.tsx:41`**

`useDashboardMovements()` just calls `api.payments.list(...)` (standard, already-typed `list()`). Replace:

```tsx
// was: const payments = (data as any)?.data ?? []
const payments = data?.data ?? []
```

- [ ] **Step 3: `invoice-payments-panel.tsx:106`**

```tsx
// was: getLabel={(it) => `${(it as unknown as Record<string, string>)["code"]} — ${(it as unknown as Record<string, string>)["name"]}`}
getLabel={(it) => `${it.code} — ${it.name}`}
```

- [ ] **Step 4: `document-sequences-step.tsx:44-45`**

```tsx
// was:
// {(errors.sequences as any)?.[i]?.prefix && (
//     <p className="text-xs text-destructive">{(errors.sequences as any)[i].prefix.message}</p>
// )}
{errors.sequences?.[i]?.prefix && (
    <p className="text-xs text-destructive">{errors.sequences[i]?.prefix?.message}</p>
)}
```

If `errors.sequences` (from react-hook-form's `FieldErrors<DocumentSequencesStepValues>`) isn't indexable this way without a cast because `DocumentSequencesStepValues.sequences` isn't a typed array field, check the form's zod schema — the array field should already produce a properly-indexable `FieldErrors` shape from RHF; if it genuinely doesn't, this is one of the harder RHF-generic-limitation cases (like `use-form-mutation.ts`'s `setError`) — leave a single cast on `.prefix` access only, with a comment, rather than the current blanket double-cast.

- [ ] **Step 5: `gl-defaults-step.tsx:49`**

`api[accountResource.key].list(...)` is the standard, already-typed `list()`. Replace:

```tsx
// was: const accounts = useMemo(() => (data?.data ?? []) as unknown as AccountListItem[], [data])
const accounts = useMemo(() => data?.data ?? [], [data])
```

If `AccountListItem` (used later in the file for `accounts.find(...)`) doesn't match the real inferred element type, fix `AccountListItem`'s definition — it's a local type in `@/modules/accounts/accounts.types`, already used correctly elsewhere per Task 7.

- [ ] **Step 6: `opening-stock-page.tsx:96`**

```tsx
// was: editableColumnIds={EDITABLE_COLUMNS as unknown as string[]}
editableColumnIds={EDITABLE_COLUMNS}
```

Check `EDITABLE_COLUMNS`'s declared type where it's defined in this file — if it's declared as a `readonly` tuple of specific string literals and `EditableGrid`'s prop wants a plain `string[]`, widen the constant's declaration (`const EDITABLE_COLUMNS: string[] = [...]` instead of `as const`) rather than casting at the usage site.

- [ ] **Step 7: `use-opening-balance-sessions.ts:97`**

```tsx
// was: mutationFn: (body: CreateSessionBody) => api[openingBalanceSessionResource.key].create(body as never),
mutationFn: (body: CreateSessionBody) => api[openingBalanceSessionResource.key].create(body),
```

`create()` (standard `CrudClient.create`, already typed via Task 5) expects `NonNullable<R["routes"]["create"]>`'s request body — if `CreateSessionBody`'s shape doesn't exactly match `CreateOpeningBalanceSessionDto`, the compiler will show the mismatch; align `CreateSessionBody`'s definition (it's a local dashboard type) to the real DTO instead of re-adding the cast.

- [ ] **Step 8: `stock-counts.config.ts:81`**

```tsx
// was: toUpdate: (_values) => ({}) as never,
```

This one is different: `StockCountsFormConfig`'s `toUpdate` returns `never` because `ResourceFormConfig<StockCountFormValues, CreateStockCountDto, never>` deliberately marks update as unsupported (stock counts have no update flow — only create/post/cancel). Check whether `ResourceFormConfig`'s `toUpdate` field can be made `optional` instead of requiring a `never`-returning stub function. If `use-resource-form-controller.ts` only calls `toUpdate` when `isEditing` is true, and stock counts never reach edit mode, making the field optional (`toUpdate?: (values: TValues) => TUpdate`) and deleting this stub entirely is cleaner than keeping a fake function. If `ResourceFormConfig` is shared across many resources and making it optional is a bigger ripple than this task's scope, leave `toUpdate: (_values) => { throw new Error("Stock counts do not support update") }` (a real runtime guard, no cast, that fails loudly instead of silently if someone wires up an edit path later) instead of the current silent `as never` stub.

- [ ] **Step 9: Verify**

Run: `pnpm --filter @devloggers/dashboard typecheck`

Run: `grep -rln "as any\|as unknown\|as never" apps/dashboard/modules/auth/register-form.tsx apps/dashboard/modules/home/components/dashboard-recent-payments.tsx apps/dashboard/modules/invoices/components/invoice-payments-panel.tsx apps/dashboard/modules/onboarding/components/document-sequences-step.tsx apps/dashboard/modules/onboarding/components/gl-defaults-step.tsx apps/dashboard/modules/opening-stock/components/opening-stock-page.tsx apps/dashboard/modules/opening-balance-sessions/hooks/use-opening-balance-sessions.ts apps/dashboard/modules/stock-counts/stock-counts.config.ts`
Expected: no output, or only the documented survivor from Step 4 if the RHF limitation turns out to be real.

- [ ] **Step 10: Commit**

```bash
git add apps/dashboard/modules/auth/register-form.tsx apps/dashboard/modules/home/components/dashboard-recent-payments.tsx apps/dashboard/modules/invoices/components/invoice-payments-panel.tsx apps/dashboard/modules/onboarding/components/document-sequences-step.tsx apps/dashboard/modules/onboarding/components/gl-defaults-step.tsx apps/dashboard/modules/opening-stock/components/opening-stock-page.tsx apps/dashboard/modules/opening-balance-sessions/hooks/use-opening-balance-sessions.ts apps/dashboard/modules/stock-counts/stock-counts.config.ts
git commit -m "refactor(dashboard): remove remaining unnecessary casts across misc modules"
```

---

## Task 11 — API: fix the missing-`type:`-option DTO anti-pattern (repo-wide sweep)

**Root cause (verified in Task 0):** `.ai/rules/api.md` documents that `@ApiProperty`/`@ApiPropertyOptional` with `nullable: true` but no `type:` option generates `Record<string, never>` instead of the real type in `packages/api-contracts/types/index.ts`. This was verified directly on `PartyResponseDto`. The same pattern was grepped across the whole API — **excluding** entries that already have a `type:` option (those are already correct) and **excluding** the three files with uncommitted WIP (Global Constraints).

**Status update (discovered during Task 8):** Task 8's implementer needed 3 targeted DTO fixes to unblock 3 of its 7 dashboard files, which required running `pnpm generate` — and `pnpm generate` regenerates the *entire* spec, not incrementally. Since the previously-committed `openapi.yaml`/`types/index.ts` were already stale (drift discovered and deliberately discarded in this plan's own Task 0 investigation, before any Phase 4 work started), that regen exposed this task's *entire* remaining scope across the whole dashboard at once — breaking typecheck in files no other task had touched yet, including previously-approved Task 7 files. **This task is now a hard prerequisite for Tasks 8-10's dashboard typecheck to pass**, not a task that can trail behind them — it is being executed next, immediately after Task 8, not in its original position. Two consequences for what's below:
- `apps/api/src/modules/catalog/brands/dto/brand.dto.ts` (`imageUrl`) and part of `apps/api/src/modules/catalog/catalog-entities/dto/catalog-entity.dto.ts` (the `parent` nested-object field, converted to a real `CatalogEntityParentSummaryDto` class) were **already fixed by Task 8** — skip re-doing those two specific fixes below; `catalog-entity.dto.ts`'s three `parentId` fields (Step 16) still need fixing.
- A new occurrence surfaced by Task 7: `apps/api/src/modules/accounting/accounts/dto/account.dto.ts`'s `ChartOfAccountTreeDto.nameI18n` uses `@ApiProperty({ description: '...' })` with no `type:` option **and no `nullable: true`** (the missing-type bug isn't limited to nullable fields) — add this as a new step below (Step 10b).

**Files (each needs the same one-word fix: add `type: 'string'` unless noted otherwise):**

- [ ] **Step 1: Worked example — `apps/api/src/modules/parties/dto/party.dto.ts`**

```ts
// PartyResponseDto — was:
    @ApiProperty({ example: 'SUPP-001', nullable: true })
    code: string | null = null;

    @ApiProperty({ example: '+963-11-9876543', nullable: true })
    phone: string | null = null;

    @ApiProperty({ example: 'info@damsimport.sy', nullable: true })
    email: string | null = null;

    @ApiProperty({ example: 'Damascus, Industrial Zone', nullable: true })
    address: string | null = null;
```

```ts
// PartyResponseDto — now:
    @ApiProperty({ type: 'string', example: 'SUPP-001', nullable: true })
    code: string | null = null;

    @ApiProperty({ type: 'string', example: '+963-11-9876543', nullable: true })
    phone: string | null = null;

    @ApiProperty({ type: 'string', example: 'info@damsimport.sy', nullable: true })
    email: string | null = null;

    @ApiProperty({ type: 'string', example: 'Damascus, Industrial Zone', nullable: true })
    address: string | null = null;
```

- [ ] **Step 2: `apps/api/src/modules/identity/users/dto/user.dto.ts`** (lines 81, 87 — both `string | null` fields: `phone`, `lastLoginAt`)

```ts
@ApiPropertyOptional({ type: 'string', example: '+963-933-111222', nullable: true })
phone: string | null = null;

@ApiPropertyOptional({ type: 'string', nullable: true })
lastLoginAt: string | null = null;
```

- [ ] **Step 3: `apps/api/src/modules/custom-fields/dto/custom-field.dto.ts:126`** (`defaultValue: string | null`)

```ts
@ApiProperty({ type: 'string', nullable: true })
defaultValue: string | null = null;
```

- [ ] **Step 4: `apps/api/src/modules/invoicing/payments/dto/payment-response.dto.ts`** (lines 20, 30, 31, 32 — `partyId`, `notes`, `postedAt`, `cancelledAt`, all `string | null`)

```ts
@ApiPropertyOptional({ type: 'string', nullable: true }) partyId: string | null = null;
// ...
@ApiPropertyOptional({ type: 'string', nullable: true }) notes: string | null = null;
@ApiPropertyOptional({ type: 'string', nullable: true }) postedAt: string | null = null;
@ApiPropertyOptional({ type: 'string', nullable: true }) cancelledAt: string | null = null;
```

- [ ] **Step 5: `apps/api/src/modules/identity/tenants/dto/tenant.dto.ts`** (lines 109–117 — `address`, `phone`, `email`, `logo`, `legalName`, `taxNumber`, `website`, `baseCurrencyId`, `defaultSalesSequenceId`, all `string | null`)

Add `type: 'string',` as the first key in each of the nine `@ApiPropertyOptional({ nullable: true })` calls on those lines.

- [ ] **Step 6: `apps/api/src/modules/accounting/currencies/dto/currency.dto.ts:66`** (`symbol: string | null`)

```ts
@ApiProperty({ type: 'string', example: '£', nullable: true })
symbol: string | null = null;
```

- [ ] **Step 7: `apps/api/src/modules/catalog/tags/dto/tag.dto.ts:55`** (`color: string | null`)

```ts
@ApiProperty({ type: 'string', example: '#FF5733', nullable: true })
color: string | null = null;
```

- [ ] **Step 8: `apps/api/src/modules/inventory/warehouses/dto/warehouse.dto.ts:59`** (`address: string | null`)

```ts
@ApiProperty({ type: 'string', example: 'Damascus Industrial Zone', nullable: true })
address: string | null = null;
```

- [ ] **Step 9: `apps/api/src/modules/inventory/stock-ledger/dto/stock-ledger.dto.ts`** (lines 10, 16, 19, 37, 40, 43 — `warehouseName`, `itemName`, `itemCode`, `referenceType`, `referenceId`, `notes`, all `string | null`)

```ts
@ApiProperty({ type: 'string', example: 'Main Warehouse', nullable: true })
warehouseName: string | null = null;

@ApiProperty({ type: 'string', example: 'Laptop 15"', nullable: true })
itemName: string | null = null;

@ApiProperty({ type: 'string', example: 'LP-001', nullable: true })
itemCode: string | null = null;

@ApiPropertyOptional({ type: 'string', example: 'invoice', nullable: true })
referenceType: string | null = null;

@ApiPropertyOptional({ type: 'string', example: '00000000-0000-4000-ae00-000000000001', nullable: true })
referenceId: string | null = null;

@ApiPropertyOptional({ type: 'string', nullable: true })
notes: string | null = null;
```

- [ ] **Step 10: `apps/api/src/modules/accounting/accounts/dto/account.dto.ts`** (three call sites: line ~49 in the Update DTO, lines ~78/81/84 in a list/summary DTO, line ~115 in the response DTO — `parentId`, `parentCode`, `parentName`, all `string | null`)

```ts
@ApiPropertyOptional({ type: 'string', example: '00000000-0000-4000-a601-000000000001', nullable: true, description: 'Updated parent account UUID — set to null to make it a root account' })
parentId?: string | null;

@ApiPropertyOptional({ type: 'string', example: '00000000-0000-4000-a601-000000000001', nullable: true })
parentId: string | null = null;

@ApiPropertyOptional({ type: 'string', example: '1000', nullable: true })
parentCode: string | null = null;

@ApiPropertyOptional({ type: 'string', example: 'الأصول المتداولة', nullable: true })
parentName: string | null = null;

@ApiProperty({ type: 'string', nullable: true, description: 'Parent account UUID or null' })
parentId: string | null = null;
```

- [ ] **Step 10b: same file — `ChartOfAccountTreeDto.nameI18n`** (in scope after all — see this task's Status update above). This field has no `nullable: true`, so it was originally scoped out of Task 11, but the missing-`type:` bug applies to it too and it's a real, confirmed break (Task 7's implementer hit it live): `@ApiProperty({ description: 'Raw localized name object' })` on `nameI18n: object = {}` generates `Record<string, never>` instead of the real localized-string shape. Fix by pointing at the same `LocalizedStringDto` its correctly-typed sibling `ChartOfAccountResponseDto.nameI18n` already uses in this file:

```ts
// ChartOfAccountTreeDto.nameI18n — was:
@ApiProperty({ description: 'Raw localized name object' })
nameI18n: object = {};

// now:
@ApiProperty({ type: LocalizedStringDto, description: 'Raw localized name object' })
nameI18n: LocalizedStringDto = new LocalizedStringDto();
```

Confirm `LocalizedStringDto` is already imported in this file (it should be, since `ChartOfAccountResponseDto` uses it) — if not, import it from `@devloggers/backend-core` matching the pattern used elsewhere in this plan (e.g. `custom-field.dto.ts`).

- [ ] **Step 11: `apps/api/src/modules/accounting/accounts/dto/account-balance.dto.ts`** — already has `type: 'string'` on every occurrence (lines 23, 48, 51, 54). **No change needed** — confirmed correct, included here only so the sweep's file list is exhaustive and auditable.

- [ ] **Step 12: `apps/api/src/modules/identity/auth/dto/auth-response.dto.ts`** (lines 16, 49 — `AuthTenantDto.onboardingCompletedAt`, `MeDataDto.phone`, both `string | null`)

```ts
@ApiProperty({ type: 'string', nullable: true, example: null })
onboardingCompletedAt: string | null = null;
```

```ts
@ApiProperty({ type: 'string', nullable: true, example: null })
phone?: string | null;
```

- [ ] **Step 13: `apps/api/src/modules/identity/auth/roles/dto/role.dto.ts:43`** (`description: string | null` — check the field name at that line; the Arabic example is a plain flattened string, not `LocalizedStringDto`, matching `account.dto.ts`'s `parentName` pattern)

```ts
@ApiProperty({ type: 'string', example: 'صلاحيات المحاسبة والمالية', nullable: true })
```
(keep whatever field name is actually declared there — add `type: 'string'` only.)

- [ ] **Step 14: `apps/api/src/modules/inventory/stock-counts/dto/stock-count.dto.ts`** (lines 50, 74, 75 — `notes` ×2, `postedAt`, all `string | null`)

```ts
@ApiPropertyOptional({ type: 'string', nullable: true }) notes: string | null = null;
// ...
@ApiPropertyOptional({ type: 'string', nullable: true }) notes: string | null = null;
@ApiPropertyOptional({ type: 'string', nullable: true }) postedAt: string | null = null;
```

- [ ] **Step 15: `apps/api/src/modules/catalog/item-relations/dto/item-relation.dto.ts:70`** (`notes: string | null`)

```ts
@ApiProperty({ type: 'string', nullable: true })
notes: string | null = null;
```

- [ ] **Step 16: `apps/api/src/modules/catalog/catalog-entities/dto/catalog-entity.dto.ts`** — three plain-string fixes (the nested-object `parent` field fix was already done by Task 8 — `parent` now correctly uses `type: () => CatalogEntityParentSummaryDto`; skip that part, only the three `parentId` fields below remain):

```ts
// CreateCatalogEntityDto.parentId — was: @ApiPropertyOptional({ example: null, nullable: true })
@ApiPropertyOptional({ type: 'string', example: null, nullable: true })
parentId?: string | null

// UpdateCatalogEntityDto.parentId — was: @ApiPropertyOptional({ nullable: true })
@ApiPropertyOptional({ type: 'string', nullable: true })
parentId?: string | null

// CatalogEntityResponseDto.parentId — was: @ApiProperty({ nullable: true })
@ApiProperty({ type: 'string', nullable: true })
parentId: string | null = null;
```

- [ ] **Step 17: Note the excluded files**

Do **not** touch these two in this task — they still have pre-existing uncommitted WIP (Global Constraints; `brand.dto.ts` is no longer in this list — Task 8 already fixed and committed it): `apps/api/src/modules/catalog/item-categories/dto/item-category.dto.ts`, `apps/api/src/modules/catalog/items/dto/item.dto.ts`. Run `git status` to confirm they're still the ones with local modifications before starting; if the WIP has since been committed or resolved, re-run the Task 0 grep pattern against these two files and fold any remaining hits into this task as a follow-up.

Also note: `apps/api/src/modules/inventory/stock-ledger/dto/stock-ledger.dto.ts`'s two number fields (from Task 0's original grep — `unitCost: number`, `quantity: number`) already have correct `@ApiProperty({ example: N })` with **no** `nullable: true` — they were a false positive in the very first broad grep and are already fine; the real fixable string fields for that file are the six listed in Step 9.

- [ ] **Step 18: Regenerate and verify**

Run: `pnpm --filter @devloggers/api typecheck`
Expected: succeeds (adding a `type:` option to an existing decorator doesn't change runtime behavior or class-validator rules).

Run: `pnpm generate`
Expected: `packages/api-contracts/types/index.ts` regenerates; `git diff --stat packages/api-contracts/types/index.ts` should show the previously-`Record<string, never>` fields now typed as `string | null`.

Run: `pnpm --filter @devloggers/api-contracts build`
Expected: succeeds.

- [ ] **Step 19: Re-run Tasks 6–10's typecheck to confirm no regressions from the DTO fix**

Run: `pnpm --filter @devloggers/dashboard typecheck`
Expected: succeeds — this DTO sweep should only ever make previously-`Record<string,never>` fields *more* usable, never break an existing correct usage. If it does break something, that call site was relying on the broken type accidentally being compatible with something it shouldn't have been — fix the call site, don't revert the DTO fix.

**Known call sites to check (discovered live when Task 8 ran `pnpm generate` early and exposed this task's scope ahead of schedule — these are NOT new regressions from your work, they're pre-existing consumer code whose local types were coincidentally shaped like the broken `Record<string, never>` generated type and will now mismatch the correct one):**
- `apps/dashboard/modules/accounts/components/account-picker.tsx:121` and `accounts-form.tsx:72` — `AccountListItem`'s local `parentId` field type needs to allow the real generated shape (check the compiler's exact reported type and align `AccountListItem`, in `apps/dashboard/modules/accounts/accounts.types.ts`, to match — likely just needs `| undefined` added or the field's nullability adjusted to match the real DTO).
- `apps/dashboard/modules/accounts/hooks/use-account-ledger.ts:22` — `AccountLedgerLine`'s local type declares `description`/`referenceType`/`referenceId` as required `string | null`; the real DTO (`AccountLedgerLineDto` in `account-balance.dto.ts`, already correctly typed) marks them `@ApiPropertyOptional`, so they're genuinely `string | null | undefined`. Add `?` to those three fields in `AccountLedgerLine`'s definition.
- `apps/dashboard/modules/auth/login-form.tsx:71` — `AuthUser`'s local `tenant.onboardingCompletedAt` field needs to match `string | null` now that `AuthTenantDto.onboardingCompletedAt` (Step 12 above) is fixed.
- `apps/dashboard/modules/invoices/components/invoice-line-row.tsx:61` — check what real field this now resolves to and adjust the local consumer type/access accordingly.
- `apps/dashboard/modules/items/components/items-relations-section.tsx:99` — `rel.notes` (from `item-relation.dto.ts`, Step 15 above) rendered directly as a React child; once typed as real `string | null`, this should just work — if not, check whether the JSX needs `{rel.notes ?? null}` instead of relying on truthy-render.
- `apps/dashboard/modules/reports/party-statement/party-statement-page.tsx:32` — a `Party[]` cast/conversion; once `PartyResponseDto`'s fields (Step 1 above) are fixed, check whether the manual `Party` type conversion can be simplified or needs its local `Party` type's field types aligned.

For each: use the compiler's exact reported type as ground truth, fix the local dashboard type definition to match it (not the other way around, and not by re-adding a cast) — same discipline as Tasks 6-10.

- [ ] **Step 20: Commit**

```bash
git add apps/api/src/modules/identity/users/dto/user.dto.ts apps/api/src/modules/parties/dto/party.dto.ts apps/api/src/modules/custom-fields/dto/custom-field.dto.ts apps/api/src/modules/invoicing/payments/dto/payment-response.dto.ts apps/api/src/modules/identity/tenants/dto/tenant.dto.ts apps/api/src/modules/accounting/currencies/dto/currency.dto.ts apps/api/src/modules/catalog/tags/dto/tag.dto.ts apps/api/src/modules/inventory/warehouses/dto/warehouse.dto.ts apps/api/src/modules/inventory/stock-ledger/dto/stock-ledger.dto.ts apps/api/src/modules/accounting/accounts/dto/account.dto.ts apps/api/src/modules/identity/auth/dto/auth-response.dto.ts apps/api/src/modules/identity/auth/roles/dto/role.dto.ts apps/api/src/modules/inventory/stock-counts/dto/stock-count.dto.ts apps/api/src/modules/catalog/item-relations/dto/item-relation.dto.ts apps/api/src/modules/catalog/catalog-entities/dto/catalog-entity.dto.ts packages/api-contracts/types/index.ts
git commit -m "fix(api): add missing 'type:' option on nullable @ApiProperty decorators repo-wide

Without an explicit type, nullable fields generate Record<string, never>
instead of their real type in the OpenAPI-derived TS types — documented
anti-pattern in .ai/rules/api.md, confirmed by direct compiler probe on
PartyResponseDto (see Phase 4 plan docs/superpowers/plans/2026-09-07-phase-4-client-dashboard-types.md Task 0)."
```

---

## Task 12 — ESLint escape-hatch rules at error level in the dashboard

**Finding:** `@typescript-eslint/no-explicit-any` is already effectively at error level in `apps/dashboard` (confirmed: the dashboard's last full lint run reported 98 real errors for `no-explicit-any`/`react-hooks/set-state-in-effect`, not warnings — pre-existing, unrelated to this phase). What's **not** covered today is `as unknown` and `as never` — `no-explicit-any` only flags the literal `any` keyword, not those two.

**Files:**
- Modify: `apps/dashboard/eslint.config.mjs`

- [ ] **Step 1: Add a `no-restricted-syntax` rule targeting `as unknown` and `as never`**

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSAsExpression[typeAnnotation.type='TSUnknownKeyword']",
          message:
            "Avoid 'as unknown' — type the source value correctly instead. If this is a genuine escape hatch (e.g. bridging a generic UI library callback), add an inline eslint-disable-next-line with a comment explaining why.",
        },
        {
          selector: "TSAsExpression[typeAnnotation.type='TSNeverKeyword']",
          message:
            "Avoid 'as never' — type the value correctly instead. If this is a genuine escape hatch, add an inline eslint-disable-next-line with a comment explaining why.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
```

- [ ] **Step 2: Run lint and inventory what's left**

Run: `pnpm --filter @devloggers/dashboard lint`
Expected: after Tasks 6–10, the only reported hits should be the **documented survivors** already identified: `shared/components/form/controls/async-select-field.tsx`, `shared/components/form/controls/resource-select-field.tsx`, `shared/components/form/fields/rhf-checkbox-field.tsx`, `shared/components/form/fields/rhf-resource-select.tsx`, `shared/components/form/rhf-field.tsx`, `shared/data-view/filter/filter-parsers.ts` (`JSON.parse(...) as unknown` — the standard, correct pattern for `JSON.parse`'s return type), `shared/data-view/resource/generate-resource.tsx`, `shared/data-view/resource/resource-context.tsx`, `items-catalog-entities-section.tsx`, `items-tags-section.tsx`/`items-relations-section.tsx`'s ad-hoc filter-query casts (Task 9), and `document-sequences-step.tsx` if Task 10 Step 4's RHF limitation turned out real.

- [ ] **Step 3: Silence each genuine survivor with a scoped, commented disable**

For each file in Step 2's list, add `// eslint-disable-next-line no-restricted-syntax -- <reason>` immediately above the specific line (not a file-level disable). Example for `resource-context.tsx:14`:

```ts
// eslint-disable-next-line no-restricted-syntax -- generic React Context needs an erased initial value; narrowed back to ResourceContext<TClient> by useResourceContext()
const resourceContext = createContext(null as unknown)
```

Repeat for each remaining hit reported by Step 2's lint run, using a reason specific to that line (not a copy-pasted generic excuse).

- [ ] **Step 4: Verify the rule actually catches regressions**

Run: `pnpm --filter @devloggers/dashboard lint`
Expected: zero errors (every real hit is now either fixed by Tasks 6–10 or has a scoped, commented disable).

As a sanity check that the rule works at all, temporarily add `const x = 1 as unknown` to any dashboard file, run lint again, confirm it reports the new custom error message, then remove the line.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/eslint.config.mjs apps/dashboard/shared/data-view/resource/resource-context.tsx apps/dashboard/shared/data-view/filter/filter-parsers.ts apps/dashboard/shared/data-view/resource/generate-resource.tsx apps/dashboard/shared/components/form/controls/async-select-field.tsx apps/dashboard/shared/components/form/controls/resource-select-field.tsx apps/dashboard/shared/components/form/fields/rhf-checkbox-field.tsx apps/dashboard/shared/components/form/fields/rhf-resource-select.tsx apps/dashboard/shared/components/form/rhf-field.tsx
git commit -m "chore(dashboard): error on 'as unknown'/'as never' escape hatches, document remaining justified survivors"
```

---

## Task 13 — Residual cleanup: `console.log` and `eslint-disable` audit

**Files:**
- Modify: `packages/api-client/src/infra/client.ts`
- Modify: `apps/dashboard/modules/invoices/components/invoice-form.tsx:231`
- Modify: `apps/dashboard/shared/api.ts:7`
- Modify: `apps/dashboard/modules/home/use-dashboard-data.ts:5-6`

- [ ] **Step 1: Remove all debug `console.log` calls from `ApiClient`**

In `packages/api-client/src/infra/client.ts`, delete every `console.log(...)` line: the two in the constructor (`"[ApiClient] constructor baseUrl:"`, `"[ApiClient] constructor baseUrl (normalized):"`) and the request/response/error logging inside `get`/`post`/`put`/`delete`/`patch` (three per method: `"-> "`, `"<- "`, `"ERROR"`). This also removes the now-pointless `fullUrl` local variables in each method that existed only to feed those logs — remove those too. Keep the `try`/`catch` error-handling logic itself, just drop the `console.log` inside the `catch` blocks.

- [ ] **Step 2: Remove the debug log in `invoice-form.tsx`**

```tsx
// was:
// console.log("Form submission errors:", ers)
```
Delete the line entirely (or, if the surrounding handler needs to do something with `ers` on error, replace with a no-op comment — check the surrounding code first; if `ers` is otherwise unused after removing the log, also remove the now-unused parameter/variable).

- [ ] **Step 3: Remove the debug log in `shared/api.ts`**

```ts
// was:
// console.log(`Auth Token: ${token}`);
```
Delete the line. This one is a genuine security-hygiene fix, not just noise — it logs an auth token to the console.

- [ ] **Step 4: Fix `use-dashboard-data.ts`'s `any` escape (the one real eslint-disable to fix)**

```ts
// was:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DashboardData = Record<string, any>
```
```ts
export type DashboardData = Record<string, unknown>
```
Run `pnpm --filter @devloggers/dashboard typecheck` after this change — if consumers of `DashboardData` relied on `any`'s implicit property access without narrowing, the compiler will show exactly which access sites need a type guard or a narrower field type. Fix those call sites; don't revert to `any`.

**Outcome (2026-09-08): reverted, deferred, not fixed in this task.** The `any`→`unknown` change produced 26 real compile errors across 10 `apps/dashboard/modules/home/*.tsx` widget files (`.completed`/`.no_shows`/`.series`/etc. property access, `ReactNode` assignability, array-callback typing) — the "home" dashboard has an entire tier of widgets consuming an untyped `DashboardData` blob, not a handful of call sites. A first attempt tried "targeted type assertions" per-file but shipped broken (dangling reference to an unexported `asDashboardRecord` helper, `{}`-typed intermediate casts that didn't actually narrow anything) while self-reporting `DONE_WITH_CONCERNS`. The controller reverted `use-dashboard-data.ts` and all 10 consumer files to their pre-Task-13 state (commit `a45d06c`), keeping the three genuinely isolated console.log fixes (which were correct and unaffected). `DashboardData` stays `Record<string, any>` with its eslint-disable comment. Properly fixing this means giving the underlying reports/dashboard endpoint a real typed response contract — the same scope as the abandoned `docs/superpowers/plans/2026-07-30-phase-1.5-service-layering.md`'s "Tier C — Reports + Dashboard typed responses" task (see that file's status note) — not a "residual cleanup" line item. Left as documented technical debt.

- [ ] **Step 5: Confirm the other 12 `eslint-disable` comments are left untouched**

These are all legitimate, already-commented `react-hooks/exhaustive-deps` suppressions for intentional "run once" or "intentionally omit this dependency" effects — verified in Task 0's investigation, no action needed: `accounts-form.tsx:49`, `expense-line-row.tsx:35`, `use-expense-form.ts:130`, `invoice-form.tsx:56`, `invoice-line-row.tsx:71`, `use-invoice-form.ts:164,212,241`, `gl-defaults-step.tsx:66`, `payment-form.tsx:31`, `use-payment-form.ts:107`, `use-settings-section.ts:50`, `use-auth.ts:14`, `use-resource-form.ts:63`.

- [ ] **Step 6: Verify**

Run: `grep -rn "console\.log" apps/dashboard --include="*.ts" --include="*.tsx" | grep -v ".next"`
Expected: no output.

Run: `grep -rn "console\.log" packages/api-client/src`
Expected: no output.

Run: `pnpm --filter @devloggers/api-client build && pnpm --filter @devloggers/dashboard typecheck`
Expected: both succeed.

- [ ] **Step 7: Commit**

```bash
git add packages/api-client/src/infra/client.ts apps/dashboard/modules/invoices/components/invoice-form.tsx apps/dashboard/shared/api.ts apps/dashboard/modules/home/use-dashboard-data.ts
git commit -m "chore: remove debug console.log calls (including one that logged an auth token) and fix one real any-escape"
```

---

## Task 14 — OpenAPI artifact hygiene

**Decision:** keep `apps/api/openapi.yaml` and `packages/api-contracts/types/index.ts` **committed** (per `.ai/rules/packages.md`: "committed as the API contract") rather than switching to CI-only generation — the dashboard's `predev`/`prebuild` scripts already regenerate them locally, and a committed contract is what lets `pnpm --filter @devloggers/api-contracts build` work without a running API in CI for downstream packages. What's missing is a CI check that the committed files are actually in sync with the current code.

**Files:**
- Modify: `.github/workflows/*.yml` (whichever workflow runs `pnpm turbo run build`/`lint`/`typecheck` — check `.github/workflows/` for the exact filename before editing)
- Modify: `scripts/.untyped-ratchet`

- [ ] **Step 1: Find the CI workflow to extend**

Run: `ls .github/workflows/`
Open the workflow that runs the main build/lint/typecheck gate (per `docs/ai-engineering.md`'s CI mention and the Phase 0 "CI gates (0.3)" work in memory — likely already exists from that earlier phase).

- [ ] **Step 2: Add a drift-check step before the existing build/lint/typecheck steps**

Add a step that regenerates and fails on any diff:

```yaml
      - name: Check OpenAPI contract is up to date
        run: |
          pnpm generate
          git diff --exit-code apps/api/openapi.yaml packages/api-contracts/types/index.ts
```

Place it after dependency install and before the build/test steps, so a stale committed contract fails fast with a clear diff in the CI log instead of surfacing as a confusing downstream type error.

- [ ] **Step 3: Re-run the untyped-response audit and update the ratchet**

Run: `node scripts/audit-openapi-response-types.mjs`
Read the reported `Total untyped:` count.

Update `scripts/.untyped-ratchet` to that exact number (the ratchet should never increase from here — it's a ceiling, not a target. If Task 11's DTO fixes happened to also reduce the `content?: never`/`unknown` count reported by this script, as opposed to just the `Record<string, never>` issue it targets separately, the new number may be lower than before this phase; use whatever the script reports today).

- [ ] **Step 4: Wire the audit script into the same CI step (optional but cheap)**

Extend the Step 2 workflow addition:

```yaml
      - name: Check OpenAPI contract is up to date
        run: |
          pnpm generate
          git diff --exit-code apps/api/openapi.yaml packages/api-contracts/types/index.ts
          node scripts/audit-openapi-response-types.mjs
```

- [ ] **Step 5: Verify locally**

Run: `pnpm generate && git diff --exit-code apps/api/openapi.yaml packages/api-contracts/types/index.ts`
Expected: no diff (assuming Task 11's `pnpm generate` was already run and committed).

Run: `node scripts/audit-openapi-response-types.mjs`
Expected: exits 0, reports a count ≤ the new ratchet value.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/<the-workflow-file>.yml scripts/.untyped-ratchet
git commit -m "ci: fail the build if the committed OpenAPI contract drifts from source, ratchet down untyped-response count"
```

---

## Task 15 — Final verification

- [ ] **Step 1: Full typecheck/lint/build sweep**

```bash
pnpm --filter @devloggers/api-client build
pnpm --filter @devloggers/api-client test
pnpm --filter @devloggers/api typecheck
pnpm --filter @devloggers/api lint:ci
pnpm --filter @devloggers/api test
pnpm --filter @devloggers/dashboard typecheck
pnpm --filter @devloggers/dashboard lint
pnpm turbo run build --filter=@devloggers/api
pnpm turbo run build --filter=@devloggers/dashboard
```
Expected: every command exits 0.

- [ ] **Step 2: Confirm the phase's own success criteria**

```bash
grep -n "as any" packages/api-client/src/infra/crud-client.ts
```
Expected: no output — `as any` fully removed, satisfying that half of the phase's success criterion.

```bash
grep -n "as never" packages/api-client/src/infra/crud-client.ts
```
Expected: hits remain — one per option-argument construction in `list`/`show`/`create`/`update`/`destroy` (5) plus the `bulkDelete`/`bulkUpdate` fallback-route casts (Task 4). This is the **honest deviation from the phase spec's literal "zero `as any` / `as never`" wording**, verified necessary in Task 0 "verified claim 2b" and re-confirmed in Task 5 — not an oversight. Every remaining hit should be immediately adjacent to a comment explaining why it's structurally required. If any hit lacks that comment, that's a real gap to fix before calling this task done.

```bash
grep -rn "as any\|as unknown\|as never" apps/dashboard --include="*.ts" --include="*.tsx" | grep -v ".next" | grep -v "eslint-disable"
```
Expected: only the documented survivors from Tasks 9/12 remain, each immediately preceded by a `// eslint-disable-next-line no-restricted-syntax -- <reason>` comment.

```bash
pnpm --filter @devloggers/dashboard lint 2>&1 | grep -c "no-restricted-syntax"
```
Expected: `0`.

- [ ] **Step 3: Record what's genuinely deferred (not silently dropped)**

Update this plan file's own status, or open a short follow-up note, listing:
- Any DTO nesting gaps found in Task 8/9 (e.g. `PaymentResponseDto` needing embedded `cashbox`/`party` summaries, if that turned out to be real rather than a stale cast).
- Any RHF-generic limitation found in Task 10 Step 4 or Task 12 Step 2 that couldn't be removed without a larger RHF-typing change.
- The `brand.dto.ts`/`item-category.dto.ts`/`item.dto.ts` DTO fixes deferred in Task 11 pending the in-progress WIP being resolved.

- [ ] **Step 4: Update the roadmap spec's status**

In `docs/superpowers/specs/2026-08-20-erp-roadmap/phase-04-client-dashboard-types.md` and `README.md`, mark Phase 4 complete following the same pattern already used for Phases 2–3 (status header, success-criteria checkboxes, task checkboxes, "Done when" checkboxes) — cross-reference this plan file and Task 0's investigation notes rather than re-deriving completion evidence from scratch.

# Phase 0 — Guardrails

**Status:** 🟡 in progress — **task 0.4 complete ✅**; tasks 0.1, 0.2, 0.3 not started
**Depends on:** nothing — this is the entry point of the roadmap
**Blocks:** Phase 1 (and therefore everything else)
**Findings addressed:** [F4](00-findings.md#f4--appsapi-is-the-only-workspace-that-is-not-strict), [F4b](00-findings.md#f4b--dead-duplicate-module-trees), [F11](00-findings.md#f11--dto-field-initializers-silently-disable-input-validation)
**Index:** [README](README.md)

---

## Goal

Make Phase 1 provably safe before touching a single posting call site.

## Success criteria

- [ ] A test suite that fails if any journal entry changes shape
- [x] A compiler that reports type errors honestly (`tsc --noEmit` clean under the strict base)
- [ ] A CI job running both on every PR, **verified to actually fail** when violated

> **Task 0.4 is the first thing to do in this entire roadmap** — before 0.1. Golden masters cover
> the 10 posting paths; the type-checker covers everything else. Refactoring ten posting call
> sites while `noImplicitAny: false` means `pnpm turbo run build` can exit 0 on a broken refactor.
> Doing 0.4 first also means the golden-master suite itself is type-checked properly.

---

## Task 0.4 — API strictness

**~84 errors, one PR.** See [F4](00-findings.md#f4--appsapi-is-the-only-workspace-that-is-not-strict) for the per-flag measurement.

### Progress — ✅ complete

| Step | State | Commit |
|---|---|---|
| 1 — delete dead trees | ✅ | `a4e7f88` |
| 2 — `@types` packages | ✅ | `27b0228` |
| 3 — 72 × `TS2564` | ✅ | `27b0228` |
| 4 — regression test | ✅ | `27b0228` |
| 5 — `noUncheckedIndexedAccess` (7 source) | ✅ | this PR |
| 6 — `TS2532` (17, 2 spec files) | ✅ | this PR |
| 7 — flip `tsconfig.json` to the strict base | ✅ | this PR |
| 8 — verify | ✅ | `tsc` exit 0 · 82/82 tests · build OK |
| 9 — prove the gate fails | ✅ | see below |
| 10 — ESLint rules | ✅ | two at error, one at warn — see below |
| 11 — correct the skill | ✅ | this PR |

**Effective compiler options after the flip** (`tsc -p tsconfig.json --showConfig`):

```
strict true · noImplicitAny true · strictNullChecks true · strictBindCallApply true
strictFunctionTypes true · strictPropertyInitialization true · noImplicitThis true
useUnknownInCatchVariables true · alwaysStrict true · noUncheckedIndexedAccess true
target es2023 · moduleResolution nodenext          (both preserved)
```

**Extra step not in the original plan:** `apps/api` had never declared
`@devloggers/typescript-config` as a dependency, so `"extends"` could not resolve. Added as a
devDependency (`workspace:^`). Every other package already declared it — this is why `apps/api`
was the only workspace on a hand-rolled config.

### Gate proof (step 9)

| Probe | Expected | Result |
|---|---|---|
| `function f(value) {}` — implicit any | typecheck fails | ✅ `TS7006`, `tsc` exit 1 |
| `function f(value: any) {}` — explicit any | lint flags | ✅ `no-explicit-any` warning |
| `// @ts-ignore` | lint **errors** | ✅ `ban-ts-comment` error |

Probe removed; `git diff` on `reports.service.ts` shows only the intended `.slice(0, 10)` change.

### ESLint levels (step 10) — deviation from plan, with evidence

The plan said all three rules at error. Measured before enabling:

| Rule | Violations in `src/**` | Level set | Why |
|---|---|---|---|
| `no-unnecessary-type-assertion` | **0** | `error` | clean — catches the next one |
| `ban-ts-comment` | **0** | `error` | clean — no `@ts-ignore` anywhere in `src` |
| `no-explicit-any` | **67** source + 73 spec | **`warn`** | see below |

`no-explicit-any` at `error` would emit ~140 failures and block every PR. Most of them sit in
files Phase 1 / 1.5 rewrite outright — `journal-posting` (4), `reports` (7), `stock-counts` (6),
`inventory` (5), `expenses` (4), `invoice-posting` (3), `payments` (2), `invoices` (2). Fixing
them now means doing that work early and in the wrong order, and most of the code is deleted
anyway. **Flip to `error` at the end of Phase 1.5**; treat 140 as a ratchet ceiling until then.

---

## ⚠️ Two pre-existing failures found — both block Task 0.3, neither caused by 0.4

Verified by rebuilding at the committed baseline: identical output.

**1. `pnpm --filter @devloggers/api lint` is already red — 15 errors.**
Not from the new rules (they contribute 0). From `recommendedTypeChecked`, which was already on:

| Rule | Count |
|---|---|
| `no-unused-vars` | 8 |
| `require-await` | 4 |
| `no-unsafe-argument` | 2 |
| `no-base-to-string` | 2 |
| `only-throw-error` | 1 |

**Task 0.3.1 cannot add `lint` to CI until these 15 are fixed** — a gate that is red on day one
gets ignored. Small and mechanical; fix as the first step of 0.3.

**2. `pnpm turbo run build` fails at `@devloggers/api-client` — 5 errors.**

```
src/clients/invoices.client.ts(10,52): TS2322: Type '{ id: string; }' is not assignable to type 'undefined'.
src/clients/payments.client.ts(26,43): TS2345: Argument of type 'CreatePaymentDto' is not assignable to parameter of type 'undefined'.
src/clients/payments.client.ts(31,44): TS2345: Argument of type 'UpdatePaymentDto' is not assignable to parameter of type 'never'.
```

This **is [F9](00-findings.md#f9--the-4-layer-pattern-covers-less-than-half-the-api-and-the-gap-breaks-the-type-pipeline) manifesting as a build failure**, not a separate bug: `Invoices.*` and
`Payments.*` are hand-rolled controllers whose responses generate as `undefined` / `never`, so the
client cannot type its own calls. It resolves in **Phase 1.5** when those controllers get response
DTOs — no action here. `pnpm turbo run build --filter=@devloggers/api` passes.

### Steps

- [x] **0.4.1 — Delete the dead trees** `src/modules/tenants/`, `src/modules/users/` (F4b).
      Verify zero importers first; note `@/modules/users` in the dashboard is a *different, live*
      module.

```bash
grep -rn "modules/tenants\|modules/users" apps/api/src --include=*.ts | grep -v identity/
# expect: no output
```

- [x] **0.4.2 — Install missing type packages** — clears all 3 `noImplicitAny` errors (`TS7016`).
      No application code changes.

```bash
pnpm --filter @devloggers/api add -D @types/js-yaml @types/passport-jwt
```

- [x] **0.4.3 — Fix 72 × `TS2564`.** The fix **differs by DTO kind** — measured, not assumed
      (see [F11](00-findings.md#f11--dto-field-initializers-silently-disable-input-validation)).

  - **Request DTOs (65 sites) → definite assignment.** An initializer becomes a runtime value
    under `transform: true`, so an absent field would pass validation.

    ```ts
    // ✅ absent field still rejected
    @IsEnum(PaymentTypeEnum) type!: PaymentTypeEnum;

    // ❌ NEVER on a request DTO — omitting `type` silently becomes RECEIPT,
    //    flipping the debit/credit direction in payment-journal.ts
    @IsEnum(PaymentTypeEnum) type: PaymentTypeEnum = PaymentTypeEnum.RECEIPT;
    ```

  - **Response DTOs (7 sites, all `ChartOfAccountTreeDto`) → initializers.** Presenter-built,
    never validated, so no hazard. Matches `UnitResponseDto`.

    ```ts
    id: string = '';
    nameI18n: object = {};
    type: AccountType = AccountType.ASSET;
    parentId: string | null = null;
    isActive: boolean = true;
    ```

  Locate sites from compiler output rather than by grep:

```bash
cd apps/api && npx tsc --noEmit -p tsconfig.json --strictPropertyInitialization
```

- [x] **0.4.4 — Regression test** pinning why request DTOs use `!`, so it cannot be "tidied" back.
      Lives at `apps/api/src/common/__tests__/dto-validation-semantics.spec.ts`. Asserts an empty
      body rejects 5/5 fields with `!` and only 1/5 with initializers.

- [x] **0.4.5 — Fix the 7 source `noUncheckedIndexedAccess` errors at the source — no casts.**

| File | Fix |
|---|---|
| `reports.service.ts` ×4 | `.toISOString().split('T')[0]` → `.toISOString().slice(0, 10)` — `slice` returns `string`, no index access, and states the intent (date portion) more clearly |
| `s3.utils.ts` ×2 | destructure the regex group and the path segments, then guard on truthiness rather than on `.length >= 2`, which TS cannot narrow from |
| `onboarding.service.ts` ×1 | `return Object.fromEntries(template.map(a => [a.code, ids[a.code]]))` → `return ids` — identical content (one key per template code), one fewer indirection |

- [x] **0.4.6 — Fix 17 × `TS2532` in two spec files** —
      `account-balances.service.spec.ts` (14), `accounts.service.spec.ts` (3). These index into
      `Object.fromEntries(...)` / arrays in assertions. Prefer a small typed lookup helper in the
      spec over `!` on every assertion line.

- [x] **0.4.7 — Flip the config.**

```jsonc
// apps/api/tsconfig.json
{
  "extends": "@devloggers/typescript-config/base.json",
  // delete: "noImplicitAny": false
  // delete: "strictBindCallApply": false
}
```

- [x] **0.4.8 — Verify — must be 0 errors.**

```bash
pnpm --filter @devloggers/api exec tsc --noEmit
pnpm --filter @devloggers/api test
pnpm turbo run build --filter=@devloggers/api
```

- [x] **0.4.9 — Prove the gate fails.** Introduce `const x: any = 1;` in a module file, confirm
      lint/typecheck fails, then revert. **A guardrail unverified is not a guardrail.**

- [x] **0.4.10 — ESLint regression rules**, error level, scoped to `apps/api/src/**`
      (dashboard follows in Phase 2, so its 34 pre-existing casts don't block the gate):
      `@typescript-eslint/no-explicit-any`, `no-unnecessary-type-assertion`, `ban-ts-comment`.

- [x] **0.4.11 — Correct the skill.** `.ai/skills/backend-resource-module/SKILL.md` says
      "Initialize all `XResponseDto` fields … to satisfy strict mode" without distinguishing
      request DTOs. Add the `!`-for-request-DTOs rule *with the reason*, else the next module
      scaffolded from it reintroduces F11.

---

## Task 0.1 — Golden-master characterization suite

**Create:** `apps/api/src/modules/accounting/posting/__tests__/golden-master.spec.ts`

- [ ] 0.1.1 Build an in-memory Prisma transaction double recording `journalEntry.create` payloads
      verbatim.
- [ ] 0.1.2 Snapshot current JE output for all **10** posting paths: purchase invoice, sales
      invoice (with COGS), invoice cancellation, payment, payment cancellation, expense, expense
      cancellation, stock-count variance, opening balance, opening stock.
- [ ] 0.1.3 Cover the branch matrix per path: with/without tax, with/without party-level account
      override, service-only vs stock lines, zero-COGS sales.
- [ ] 0.1.4 Assert on account IDs, debit/credit amounts, `sortOrder`, `description`,
      `referenceType`, `partyId`, and **total debits = total credits**.
- [ ] 0.1.5 Commit the snapshots. **These files must not be regenerated during Phase 1** — a diff
      here is the signal that the refactor changed behaviour.

---

## Task 0.2 — Balance-drift checker

**Create:** `apps/api/src/modules/accounting/reconciliation/balance-drift.service.ts`
(Phase 0 tool; promoted to a scheduled job in Phase 5)

- [ ] 0.2.1 Compare `ChartOfAccount.currentBalance` against `SUM(JournalLine)` per account.
- [ ] 0.2.2 Same for `Cashbox.balance` and `StockBalance` vs `StockMovement`.
- [ ] 0.2.3 Expose as an authenticated diagnostic endpoint returning drifted rows.
- [ ] 0.2.4 **Record a baseline drift report before Phase 1.** Pre-existing drift is not a Phase 1
      regression. **Resolves Q5** — decide here whether pre-existing drift gets corrected now or
      tracked separately.

---

## Task 0.3 — CI gate

- [ ] 0.3.1 Workflow running `pnpm turbo run lint typecheck test` on PR.
- [ ] 0.3.2 Fail the build on any new `eslint-disable` under `apps/api/src/modules/**`.
- [ ] 0.3.3 Wire in the strict typecheck (0.4.7) and the golden-master suite (0.1).

---

## Verification

```bash
pnpm --filter @devloggers/api exec tsc --noEmit    # 0 errors under the strict base
pnpm --filter @devloggers/api test                 # golden masters + DTO semantics test
pnpm turbo run lint typecheck
```

## Done when

- [x] `apps/api/tsconfig.json` extends the strict base with no opt-outs
- [x] `tsc --noEmit` exits 0
- [x] A deliberately introduced implicit `any` **fails typecheck** (verified, not assumed). Wiring it into CI is Task 0.3
- [ ] Golden-master snapshots committed for all 10 posting paths
- [ ] Baseline drift report recorded, Q5 answered
- [x] `.ai/skills/backend-resource-module/SKILL.md` carries the corrected DTO rule (synced to `.claude/skills/`)

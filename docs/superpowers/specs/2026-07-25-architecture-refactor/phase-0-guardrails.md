# Phase 0 — Guardrails

**Status:** 🟡 in progress — task 0.4 steps 1–4 done, **resume at step 5**
**Depends on:** nothing — this is the entry point of the roadmap
**Blocks:** Phase 1 (and therefore everything else)
**Findings addressed:** [F4](00-findings.md#f4--appsapi-is-the-only-workspace-that-is-not-strict), [F4b](00-findings.md#f4b--dead-duplicate-module-trees), [F11](00-findings.md#f11--dto-field-initializers-silently-disable-input-validation)
**Index:** [README](README.md)

---

## Goal

Make Phase 1 provably safe before touching a single posting call site.

## Success criteria

- [ ] A test suite that fails if any journal entry changes shape
- [ ] A compiler that reports type errors honestly (`tsc --noEmit` clean under the strict base)
- [ ] A CI job running both on every PR, **verified to actually fail** when violated

> **Task 0.4 is the first thing to do in this entire roadmap** — before 0.1. Golden masters cover
> the 10 posting paths; the type-checker covers everything else. Refactoring ten posting call
> sites while `noImplicitAny: false` means `pnpm turbo run build` can exit 0 on a broken refactor.
> Doing 0.4 first also means the golden-master suite itself is type-checked properly.

---

## Task 0.4 — API strictness

**~84 errors, one PR.** See [F4](00-findings.md#f4--appsapi-is-the-only-workspace-that-is-not-strict) for the per-flag measurement.

### Progress

| Step | State | Commit |
|---|---|---|
| 1 — delete dead trees | ✅ | `a4e7f88` |
| 2 — `@types` packages | ✅ | `27b0228` |
| 3 — 72 × `TS2564` | ✅ | `27b0228` |
| 4 — regression test | ✅ | `27b0228` |
| **5 — `noUncheckedIndexedAccess` (source)** | ⬜ **resume here** | |
| 6 — `TS2532` in 2 spec files | ⬜ | |
| 7 — flip `tsconfig.json` | ⬜ | |
| 8–12 | ⬜ | |

⚠️ **The config flip has not happened.** `apps/api/tsconfig.json:21` still reads
`"noImplicitAny": false`. The DTOs are compliant but nothing enforces it — a new implicit `any`
would still pass CI. Steps 5–7 are what actually close F4.

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

- [ ] **0.4.5 — Fix the 7 source `noUncheckedIndexedAccess` errors at the source — no casts.**

| File | Fix |
|---|---|
| `reports.service.ts` ×4 | `.toISOString().split('T')[0]` → `.toISOString().slice(0, 10)` — `slice` returns `string`, no index access, and states the intent (date portion) more clearly |
| `s3.utils.ts` ×2 | destructure the regex group and the path segments, then guard on truthiness rather than on `.length >= 2`, which TS cannot narrow from |
| `onboarding.service.ts` ×1 | `return Object.fromEntries(template.map(a => [a.code, ids[a.code]]))` → `return ids` — identical content (one key per template code), one fewer indirection |

- [ ] **0.4.6 — Fix 17 × `TS2532` in two spec files** —
      `account-balances.service.spec.ts` (14), `accounts.service.spec.ts` (3). These index into
      `Object.fromEntries(...)` / arrays in assertions. Prefer a small typed lookup helper in the
      spec over `!` on every assertion line.

- [ ] **0.4.7 — Flip the config.**

```jsonc
// apps/api/tsconfig.json
{
  "extends": "@devloggers/typescript-config/base.json",
  // delete: "noImplicitAny": false
  // delete: "strictBindCallApply": false
}
```

- [ ] **0.4.8 — Verify — must be 0 errors.**

```bash
pnpm --filter @devloggers/api exec tsc --noEmit
pnpm --filter @devloggers/api test
pnpm turbo run build --filter=@devloggers/api
```

- [ ] **0.4.9 — Prove the gate fails.** Introduce `const x: any = 1;` in a module file, confirm
      lint/typecheck fails, then revert. **A guardrail unverified is not a guardrail.**

- [ ] **0.4.10 — ESLint regression rules**, error level, scoped to `apps/api/src/**`
      (dashboard follows in Phase 2, so its 34 pre-existing casts don't block the gate):
      `@typescript-eslint/no-explicit-any`, `no-unnecessary-type-assertion`, `ban-ts-comment`.

- [ ] **0.4.11 — Correct the skill.** `.ai/skills/backend-resource-module/SKILL.md` says
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

- [ ] `apps/api/tsconfig.json` extends the strict base with no opt-outs
- [ ] `tsc --noEmit` exits 0
- [ ] A deliberately introduced implicit `any` **fails CI** (verified, not assumed)
- [ ] Golden-master snapshots committed for all 10 posting paths
- [ ] Baseline drift report recorded, Q5 answered
- [ ] `.ai/skills/backend-resource-module/SKILL.md` carries the corrected DTO rule

# Phase 2 — Client & Dashboard Type Safety

**Status:** ⬜ not started
**Depends on:** [Phase 1.5](phase-1.5-service-layering.md) — response DTOs must exist first
**Blocks:** nothing
**Findings addressed:** [F4](00-findings.md#f4--appsapi-is-the-only-workspace-that-is-not-strict) (client half), [F8](00-findings.md#f8--secondary-issues)
**Index:** [README](README.md)

---

## Goal

Close the client edge of the type pipeline — the half of F4 that genuinely cannot be done earlier.

> **Scope note:** this phase originally also contained the `apps/api` strict migration. That work
> moved to [Phase 0.4](phase-0-guardrails.md) after measurement showed it costs ~84 errors, not a
> multi-PR strangler, and that deferring it means running Phases 1 and 1.5 with the compiler
> half-blind. What remains here is only the work with a real dependency: `crud-client` generics
> and the dashboard casts both need Phase 1.5's response types to exist.

## Success criteria

- [ ] Zero `as any` / `as never` in `packages/api-client/src/infra/crud-client.ts`
- [ ] The dashboard's 34 casts are gone, or each survivor has a one-line justification
- [ ] Escape-hatch lint rules are error-level repo-wide

---

## Tasks

### 2.1 — `crud-client.ts`

- [ ] 2.1.1 **Root cause:** `openapi-fetch` infers per-path unions; passing a
      `R["routes"]["list"]` widens to the union of *all* paths, so `as never` is used to silence
      the mismatch.
- [ ] 2.1.2 **Fix:** constrain `CrudResource` route generics so each method narrows to its own
      path, and introduce typed private helpers (`getAt`, `postAt`, …) that carry the narrowing —
      rather than casting at every call site.
- [ ] 2.1.3 Target: `list`, `show`, `create`, `update`, `destroy` return their inferred
      `ApiResponse` **without assertion**.
- [ ] 2.1.4 `bulkDelete` / `bulkUpdate` reuse the `list` route with a different verb — model this
      explicitly in the resource type rather than `as unknown as ApiPathByMethod<"delete">`.
- [ ] 2.1.5 Add type-level tests (`expectTypeOf`) pinning the inferred return types, so a future
      change to the resource generics fails loudly.

### 2.2 — Dashboard escape hatches

- [ ] 2.2.1 Remove the 34 `as any` / `as unknown` casts. Most should already be gone — Phase 1.5.C
      deletes them per-resource as each response type lands.
- [ ] 2.2.2 **Any cast that survives indicates a still-missing or wrong response DTO.** Fix the API
      DTO and regenerate; **never patch the consumer** (`.ai/rules/code-quality.md` §4).
- [ ] 2.2.3 Extend the Phase 0.4 ESLint rules (`no-explicit-any`, `no-unnecessary-type-assertion`,
      `ban-ts-comment`) to `apps/dashboard/**` at error level.

### 2.3 — Residual cleanup

- [ ] 2.3.1 Remove the 44 `console.log` calls; replace with the Nest `Logger`.
- [ ] 2.3.2 Audit the 15 `eslint-disable` comments; each needs a justification or removal.
- [ ] 2.3.3 Remove `ApiClient`'s constructor `console.log` of the API base URL
      (`packages/api-client/src/infra/client.ts`) — it fires on every instantiation.

---

## Verification

```bash
pnpm --filter @devloggers/api-client build
pnpm turbo run lint typecheck build
```

## Done when

- [ ] `grep -n "as any\|as never" packages/api-client/src/infra/crud-client.ts` returns nothing
- [ ] `grep -rn "as any\|as unknown" apps/dashboard/modules` returns nothing unjustified
- [ ] `expectTypeOf` tests pass
- [ ] Lint rules error-level in both `apps/api` and `apps/dashboard`

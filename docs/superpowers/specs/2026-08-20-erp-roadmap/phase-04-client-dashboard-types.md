# Phase 4 — Client & Dashboard Type Safety

**Status:** ⬜ not started  
**Priority:** 🟠 P1  
**Depends on:** —  
**Blocks:** nothing (parallel with Phases 2–3)  
**Findings addressed:** [00-open-issues.md](00-open-issues.md) — type safety  
**Index:** [README](README.md)

---

## Goal

Close the client edge of the type pipeline. Fix `crud-client` generics and remove dashboard escape hatches.

---

## Success criteria

- [ ] Zero `as any` / `as never` in `packages/api-client/src/infra/crud-client.ts`
- [ ] Dashboard `as any` / `as unknown` casts gone or each survivor documented with API fix ticket
- [ ] ESLint escape-hatch rules at error level in `apps/dashboard/**`
- [ ] `expectTypeOf` tests pin `CrudClient` inferred return types

---

## Tasks

### 4.1 — `crud-client.ts`

- [ ] 4.1.1 Root cause: `openapi-fetch` path union widening — document in code comment
- [ ] 4.1.2 Typed private helpers (`getAt`, `postAt`, …) per route
- [ ] 4.1.3 `list`, `show`, `create`, `update`, `destroy` return inferred types without assertion
- [ ] 4.1.4 Model `bulkDelete` / `bulkUpdate` explicitly in resource type
- [ ] 4.1.5 `expectTypeOf` tests in api-client package

### 4.2 — Dashboard escape hatches

- [ ] 4.2.1 Remove 34 casts — fix missing/wrong response DTOs at API source (§4 code-quality)
- [ ] 4.2.2 Priority: `modules/expenses` (7 casts), payments, invoices
- [ ] 4.2.3 ESLint escape-hatch rules at error level in dashboard

### 4.3 — Residual cleanup (F8)

- [ ] 4.3.1 Replace 44 `console.log` with Nest `Logger` (API) or remove (client)
- [ ] 4.3.2 Audit 15 `eslint-disable` comments
- [ ] 4.3.3 Remove `ApiClient` constructor base-URL log

### 4.4 — OpenAPI artifact hygiene (F9 process fix)

- [ ] 4.4.1 Decide: committed vs CI-generated `openapi.yaml` / `types/index.ts`
- [ ] 4.4.2 CI step: regenerate before typecheck if committed
- [ ] 4.4.3 Re-run audit script — target 0 untyped `2xx` responses

---

## Verification

```bash
pnpm --filter @devloggers/api-client build
pnpm turbo run lint typecheck build
grep -n "as any\|as never" packages/api-client/src/infra/crud-client.ts  # expect empty
```

## Done when

- [ ] grep dashboard modules for unjustified casts returns empty
- [ ] `expectTypeOf` tests pass

## Parallelism

Safe to execute **alongside Phase 2** — no GL behaviour changes.

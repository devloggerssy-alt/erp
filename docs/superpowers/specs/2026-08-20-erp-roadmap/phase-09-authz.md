# Phase 9 — AuthZ

**Status:** ⬜ not started  
**Priority:** 🔴 P0 — **blocking before first production tenant**  
**Depends on:** —  
**Blocks:** production go-live  
**Findings addressed:** [00-open-issues.md](00-open-issues.md) — AuthZ  
**Index:** [README](README.md)

> **Merged from:** old architecture refactor Phase 6. Independent of Phases 2–8 — **can parallelize**.

---

## Goal

Permission-gated access with separation of duties on GL operations. Fail closed — no permission metadata = deny.

---

## Success criteria

- [ ] No mutating route without explicit permission
- [ ] User without `journals.reverse` cannot reverse a JE
- [ ] Dashboard UI gated cosmetically; API is enforcement point
- [ ] Permissions resolved from DB per request (not JWT claims)

---

## Tasks

### 9.1 — Permission catalog

- [ ] 9.1.1 Derive `resource.action` from `packages/api-contracts` resources map
- [ ] 9.1.2 Non-CRUD actions: `invoices.post`, `invoices.cancel`, `payments.cancel`, `journals.post`, `journals.reverse`, `periods.close`, `openingBalances.manage`, `businessSetup.manage`, `settings.manage`, `danger.reset`
- [ ] 9.1.3 Export const union for API + dashboard type-checking

### 9.2 — Schema

- [ ] 9.2.1 `Permission` (global catalog) + `RolePermission` join
- [ ] 9.2.2 Idempotent seed: catalog + default roles (Owner, Accountant, Sales, Inventory, Viewer)
- [ ] 9.2.3 `Role.isSystem` — not editable by tenants

### 9.3 — Enforcement

- [ ] 9.3.1 `PermissionsGuard` + `@RequirePermission()` decorator
- [ ] 9.3.2 Wire into `createCrudController` factory
- [ ] 9.3.3 Missing permission metadata → **deny**
- [ ] 9.3.4 Short-lived cache for permission resolution per request

### 9.4 — Separation of duties

- [ ] 9.4.1 `journals.post` ≠ `journals.reverse`
- [ ] 9.4.2 `periods.close` separate
- [ ] 9.4.3 `openingBalances.manage` separate from daily posting
- [ ] 9.4.4 Default roles reflect split

### 9.5 — Dashboard

- [ ] 9.5.1 `/auth/me` returns effective permissions
- [ ] 9.5.2 `usePermissions()` + `can(...)` helper
- [ ] 9.5.3 Gate nav, row actions, form dialogs, setup hub, danger zone
- [ ] 9.5.4 Roles admin UI; i18n en, ar, tr, ar-SY

---

## Open question

**Q3:** Global permission catalog + tenant-scoped `RolePermission` (recommended). Confirm at phase start.

---

## Verification

```bash
pnpm turbo run build
# Negative tests: user without permission → 403 on post/cancel/reverse/opening/setup
```

## Done when

- [ ] Any authenticated user **cannot** post/cancel/reverse JEs without explicit grant
- [ ] Business setup mutations require `businessSetup.manage`

## Parallelism

Start **alongside Phase 2 or 4** — no accounting model dependency. Must complete before production.

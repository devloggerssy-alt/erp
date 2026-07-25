# Phase 6 — AuthZ

**Status:** ⬜ scoped, **not decomposed** — write a dedicated spec before executing
**Depends on:** nothing — independent of Phases 1–5
**Blocks:** 🔴 **the first production tenant**
**Findings addressed:** [F6](00-findings.md#f6--no-permission-system)
**Index:** [README](README.md)

---

## Goal

Permission-gated access with separation of duties on GL operations.

## Success criteria

- [ ] No mutating route reachable without an explicit permission
- [ ] A user without `journals.reverse` cannot reverse a journal entry

> **This is sequenced last but it is blocking, not optional.** It sits at the end because the
> system is pre-production, not because it is low value. Today `JwtAuthGuard` is the only guard:
> **any authenticated user can post, cancel, and reverse journal entries.** Do not ship to a real
> tenant without this.

---

## Scope

### 6.1 — Permission catalog

- [ ] 6.1.1 Derive `resource.action` strings from the existing `resources` map in
      `packages/api-contracts`
- [ ] 6.1.2 Add non-CRUD actions explicitly: `invoices.post`, `invoices.cancel`, `payments.cancel`,
      `journals.post`, `journals.reverse`, `periods.close`, `openingBalances.manage`,
      `settings.manage`, `danger.reset`
- [ ] 6.1.3 Export as a const union so both API and dashboard type-check against it

### 6.2 — Schema

- [ ] 6.2.1 `Permission` (global catalog, not tenant-scoped) and `RolePermission` join
- [ ] 6.2.2 Idempotent seed: catalog sync + default system roles (Owner, Accountant, Sales,
      Inventory, Viewer)
- [ ] 6.2.3 `Role.isSystem` roles are not editable by tenants

### 6.3 — Enforcement

- [ ] 6.3.1 `PermissionsGuard` + `@RequirePermission()` decorator
- [ ] 6.3.2 Default permissions wired into `createCrudController` so new modules are gated **by
      construction** — this is why Phase 1.5 matters here: the more controllers use the factory,
      the more routes this covers automatically
- [ ] 6.3.3 **A route with no permission metadata denies rather than allows.** Fail closed
- [ ] 6.3.4 Resolve permissions from the DB per request with a short-lived cache — **not** from JWT
      claims, so revocation takes effect immediately rather than at token expiry

### 6.4 — Separation of duties

- [ ] 6.4.1 `journals.post` and `journals.reverse` are distinct permissions
- [ ] 6.4.2 `periods.close` is separate from both
- [ ] 6.4.3 Default roles reflect this split

### 6.5 — Dashboard

- [ ] 6.5.1 `/auth/me` returns effective permissions
- [ ] 6.5.2 `usePermissions()` + `can(...)` helper
- [ ] 6.5.3 Gate `navGroups.tsx`, row action menus, `FormDialog` triggers, and the danger zone
- [ ] 6.5.4 **UI gating is cosmetic — the API is the enforcement point.** Never rely on the
      dashboard hiding a control
- [ ] 6.5.5 Roles admin UI for assigning permissions; i18n keys in en, ar, tr, ar-SY

---

## Open question

**Q3 — should `Permission` be global or tenant-scoped?**
Recommendation: global catalog, tenant-scoped `RolePermission`. Confirm at phase start.

## Test obligation

**Negative** authz tests — permission denied returns 403, not 200. A test suite that only asserts
the happy path proves nothing about a guard.

## Before executing

Write `docs/superpowers/specs/YYYY-MM-DD-permissions-design.md` covering Q3, the catalog shape, and
the migration path for existing tenants.

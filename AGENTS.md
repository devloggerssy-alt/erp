# ERP — Agent Guide

Turborepo + **pnpm** monorepo for an ERP system.

## Stack

| Layer | Package | Path |
|-------|---------|------|
| Database | `@devloggers/db-prisma` | `packages/db-prisma` |
| Contracts | `@devloggers/api-contracts` | `packages/api-contracts` |
| API | `@devloggers/api` | `apps/api` |
| HTTP clients | `@devloggers/api-client` | `packages/api-client` |
| Dashboard | `@devloggers/dashboard` | `apps/dashboard` |

## Before you change code

1. Load **`.ai/rules/monorepo.md`** — applies always.
2. Load the **path-scoped rule** from `.ai/rules/` that matches the files you're editing.
3. For **where things live**, use skill **`erp-project-map`** (`.ai/skills/erp-project-map/`).
4. For a **new CRUD entity end-to-end**, use skill **`add-crud-feature`** (`.ai/skills/add-crud-feature/`).
5. For a **single layer**, use the relevant skill from `.ai/skills/`.

## Rules (`.ai/rules/`)

| File | Load when |
|------|-----------|
| `monorepo.md` | Always — cross-cutting architecture constraints |
| `api.md` | Editing `apps/api/**` |
| `dashboard.md` | Editing `apps/dashboard/**` |
| `database.md` | Editing `packages/db-prisma/**` |
| `packages.md` | Editing `packages/**` |

## Skills (`.ai/skills/`)

| Skill | When to use |
|-------|-------------|
| `erp-project-map` | Explore repo, find files, understand domains |
| `add-crud-feature` | End-to-end new entity (full-stack checklist) |
| `api-contracts` | Resources + DTOs in `packages/api-contracts` |
| `api-client` | CrudClient + factory in `packages/api-client` |
| `backend-resource-module` | NestJS 4-layer module in `apps/api` |
| `dashboard-resource-page` | Dashboard CRUD list page |
| `frontend-resource-pattern` | Compound resource architecture + data-view |

## Golden reference: Units vertical slice

```
packages/db-prisma/src/schema/unit.prisma
packages/api-contracts/src/resources/unit.resource.ts
apps/api/src/modules/catalog/units/
packages/api-client/src/clients/units.client.ts
apps/dashboard/modules/units/
apps/dashboard/app/[locale]/(authenticated)/catalog/units/page.tsx
```

## Commands

```bash
pnpm dev
pnpm --filter @devloggers/dashboard dev
pnpm --filter @devloggers/api dev
pnpm --filter @devloggers/db-prisma db:migrate:dev
pnpm turbo run build
```

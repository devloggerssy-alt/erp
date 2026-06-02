# ERP — Agent Guide

Turborepo + **pnpm** monorepo for an ERP system.

| Layer | Package / path |
|-------|----------------|
| Database | `@devloggers/db-prisma` → `packages/db-prisma` |
| Contracts | `@devloggers/api-contracts` → `packages/api-contracts` |
| API | `@devloggers/api` → `apps/api` |
| HTTP clients | `@devloggers/api-client` → `packages/api-client` |
| Dashboard | `@devloggers/dashboard` → `apps/dashboard` |

## Before you change code

1. Read **`.cursor/rules/`** — monorepo rules apply globally; layer rules apply per path.
2. For **where things live**, use skill **`erp-project-map`**.
3. For a **new CRUD entity**, use skill **`add-crud-feature`** and copy the **units** vertical slice.
4. For **layer-specific steps**, use skills in **`.cursor/skills/`** (mirrored from `.ai/skills/`):
   - `api-contracts` — resources + DTOs
   - `api-client` — CrudClient + factory
   - `backend-resource-module` — NestJS 4-layer module
   - `frontend-resource-pattern` — ResourceProvider / compound components

## Golden reference: Units

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

## Rules (non-negotiable)

- **Never duplicate** routes/types — `api-contracts` is the source of truth.
- **Shared code** → `packages/`.
- **Prisma migrations** for all schema changes; idempotent seeds.
- **NestJS** modules with DI — no loose Express in features.
- **Thin Next.js pages** — logic in `apps/dashboard/modules/`.

## Cursor skills (`.cursor/skills/`)

| Skill | When to use |
|-------|-------------|
| `erp-project-map` | Explore repo, find files, understand domains |
| `add-crud-feature` | End-to-end new entity |
| `dashboard-resource-page` | Dashboard CRUD UI only |

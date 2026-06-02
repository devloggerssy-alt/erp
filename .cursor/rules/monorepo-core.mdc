---
description: ERP monorepo core architecture, commands, and cross-cutting rules
alwaysApply: true
---

# ERP Monorepo

## Stack
- **Orchestration:** Turborepo + pnpm workspaces (`apps/*`, `packages/*`)
- **Frontend:** Next.js App Router → `apps/dashboard` (`@devloggers/dashboard`)
- **Backend:** NestJS → `apps/api` (`@devloggers/api`)
- **Database:** PostgreSQL via Prisma → `packages/db-prisma` (`@devloggers/db-prisma`)

## Architectural rules
1. **Never duplicate** types, routes, or DTOs — use `@devloggers/api-contracts`.
2. **Shared logic** used by API + dashboard → extract to `packages/`.
3. **Strict typing:** Prisma types + api-contracts DTOs end-to-end.
4. **DB changes:** Prisma migrations only. Seeds must be idempotent.

## Commands (use pnpm filters)
```bash
pnpm dev
pnpm --filter @devloggers/dashboard dev
pnpm --filter @devloggers/api dev
pnpm turbo run build --filter=@devloggers/api
pnpm --filter @devloggers/db-prisma db:migrate:dev
pnpm --filter @devloggers/db-prisma db:seed
```

## Full-stack data flow
`Prisma model` → `api-contracts resource + DTO` → `NestJS module` → `api-client CrudClient` → `dashboard module (generateResource)`

## Golden reference
Copy the **units** feature end-to-end when adding CRUD entities.

## Skills
- Project map: skill `erp-project-map`
- Full-stack CRUD: skill `add-crud-feature`
- Layer details: `.cursor/skills/` (api-contracts, api-client, backend-resource-module, frontend-resource-pattern)

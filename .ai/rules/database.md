---
name: database
description: Prisma schema, migrations, and seed conventions. Load when editing packages/db-prisma/**.
scope: packages/db-prisma/**
---

# Database (Prisma) — Rules

## File layout
- Schema split: `packages/db-prisma/src/schema/*.prisma`
- Migrations: `src/schema/migrations/`
- Seed: `src/seed/index.ts` — must be idempotent (safe to re-run)
- Import client/types: `@devloggers/db-prisma`
- Nest DI: `@devloggers/db-prisma/nest` (`PrismaModule`)

## Entity conventions
Every tenant-scoped model must have:
- `id String @id @default(uuid())`
- `tenantId String`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

## Rules
- Never edit `generated/client/` manually — it is auto-generated
- All schema changes require a migration (`db:migrate:dev`)
- Seeds must be idempotent

## Commands
```bash
pnpm --filter @devloggers/db-prisma db:generate
pnpm --filter @devloggers/db-prisma db:migrate:dev
pnpm --filter @devloggers/db-prisma db:seed
```

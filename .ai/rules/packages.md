---
name: packages
description: Shared package boundaries and dependency direction. Load when editing packages/**.
scope: packages/**
---

# Shared Packages — Rules

## Dependency direction
```
db-prisma
    ↓
backend-core ← api
    ↑
api-contracts -> db-prisma
    ↓
api-client ← dashboard
```

Both `api` and `dashboard` depend on `api-contracts`.

## Package roles
| Package | Role |
|---------|------|
| `@devloggers/db-prisma` | Prisma schema, migrations, seed, Nest `PrismaModule` |
| `@devloggers/api-contracts` | Resource definitions + shared DTOs (source of truth) |
| `@devloggers/api-client` | Typed HTTP clients (`CrudClient`) |
| `@devloggers/backend-core` | CRUD bases, API response builder, query utils |
| `@devloggers/ui` | Shared UI components |
| `@devloggers/eslint-config`, `@devloggers/typescript-config` | Tooling |

## OpenAPI type generation

`packages/api-contracts/src/types/` is **auto-generated** from the running API's
OpenAPI spec. Never edit files in that directory manually.

```bash
# Regenerate types (requires API to be running):
pnpm generate:dev

# Then rebuild the package so downstream consumers pick up the new types:
pnpm --filter @devloggers/api-contracts build
```

Run `pnpm generate:dev` whenever:
- The API schema changed (new endpoints, renamed fields, added DTOs)
- You see TypeScript errors referencing missing or incorrect API response/request types

## Rules
- Add routes/DTOs in **api-contracts first** — never duplicate in API or dashboard
- New CRUD client: extend `CrudClient`, register in `api.ts` factory
- No domain logic in `backend-core` — infrastructure only
- **Never** patch type errors with `as any`, inline type definitions, or local
  re-declarations — regenerate types instead (see `code-quality.md` § 4)

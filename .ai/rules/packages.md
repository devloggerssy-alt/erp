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
api-contracts
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

## Rules
- Add routes/DTOs in **api-contracts first** — never duplicate in API or dashboard
- New CRUD client: extend `CrudClient`, register in `api.ts` factory
- No domain logic in `backend-core` — infrastructure only

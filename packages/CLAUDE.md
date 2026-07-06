# Shared packages — Claude context

Load when working under `packages/` (excluding db-prisma — see `packages/db-prisma/CLAUDE.md`).

@../../.ai/rules/packages.md

@../../.ai/skills/api-contracts/SKILL.md

@../../.ai/skills/api-client/SKILL.md

## Key packages

| Package | Path |
|---------|------|
| api-contracts | `packages/api-contracts` — DTOs + resources (source of truth) |
| api-client | `packages/api-client` — CrudClient HTTP layer |
| backend-core | `packages/backend-core` — NestJS CRUD infrastructure |

## Verify

```bash
pnpm turbo run build --filter=@devloggers/api-contracts
pnpm turbo run build --filter=@devloggers/api-client
```

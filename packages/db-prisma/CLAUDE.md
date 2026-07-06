# Database (Prisma) — Claude context

Load when working under `packages/db-prisma/`.

@../../.ai/rules/database.md

@../../.ai/skills/_imports/prisma-expert/SKILL.md

## Commands

```bash
pnpm --filter @devloggers/db-prisma db:migrate:dev
pnpm --filter @devloggers/db-prisma db:seed
```

## Rules

- Migrations only — never edit applied migration SQL by hand
- Seeds must be idempotent

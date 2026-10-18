# Claude Code — ERP Workflow

You are working in the **Sanad ERP** monorepo. Follow this workflow unless the user overrides.

## Before coding

1. Load rules and skills referenced in root `CLAUDE.md` (via `@` imports).
2. For **non-trivial features**: check open GitHub issues (`gh issue list`) → write or follow an approved design spec.
3. For **full disciplined cycles**: invoke skill **`caveman`** or `/caveman`.
4. For **where files live**: skill **`erp-project-map`**.

## Spec-driven development (HARD-GATE)

- Design specs and plans are tracked as **GitHub issues** (`gh issue create`; see `docs/agents/issue-tracker.md`)
- **No implementation** until the design spec is explicitly approved.

## Stack reminder

`Prisma` → `api-contracts` → `NestJS API` → `api-client` → `dashboard module (generateResource)`

Golden CRUD reference: **units** (see `AGENTS.md`).

## Verification commands

```bash
pnpm --filter @devloggers/api dev
pnpm --filter @devloggers/dashboard dev
pnpm turbo run build --filter=@devloggers/api
pnpm turbo run build --filter=@devloggers/dashboard
pnpm --filter @devloggers/db-prisma db:migrate:dev
pnpm generate:dev   # after API DTO/Swagger changes — API must be running
```

Never claim work is done without running verification and citing output.

## Team docs

- [docs/ai-engineering.md](docs/ai-engineering.md)
- [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md)
- [.claude/README.md](.claude/README.md)

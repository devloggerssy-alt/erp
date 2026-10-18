# Sanad ERP

Multi-tenant ERP for small and medium businesses in the MENA region. It covers invoicing, parties, inventory, accounting, catalog, reporting, and an in-product AI assistant. The dashboard is Arabic-first (RTL), with English and Turkish.

This file is the front door. The contribution workflow lives in [CONTRIBUTING.md](CONTRIBUTING.md).

## Stack

| Layer        | Package                     | Path                     |
| ------------ | --------------------------- | ------------------------ |
| Database     | `@devloggers/db-prisma`     | `packages/db-prisma`     |
| Contracts    | `@devloggers/api-contracts` | `packages/api-contracts` |
| API          | `@devloggers/api`           | `apps/api`               |
| HTTP clients | `@devloggers/api-client`    | `packages/api-client`    |
| Dashboard    | `@devloggers/dashboard`     | `apps/dashboard`         |

Orchestration is Turborepo with pnpm workspaces. A feature crosses the stack in this order:

`Prisma model` → `api-contracts resource + DTO` → `NestJS module` → `api-client` → `dashboard module`

The reference slice is **units**. Copy it when you add a CRUD entity. Paths are listed in [CONTRIBUTING.md](CONTRIBUTING.md#the-units-slice).

## Requirements

- Node.js 18 or newer
- pnpm 9 (`packageManager` is `pnpm@9.0.0`)
- Docker, for local PostgreSQL

## Quick start

```bash
corepack enable
corepack prepare pnpm@9.0.0 --activate
pnpm install

docker compose up -d db
```

Create the local env files from [CONTRIBUTING.md](CONTRIBUTING.md#local-setup), then:

```bash
pnpm --filter @devloggers/db-prisma db:migrate:dev
pnpm --filter @devloggers/db-prisma db:seed

pnpm --filter @devloggers/api dev          # http://localhost:4040
pnpm --filter @devloggers/dashboard dev    # http://localhost:3000
```

`pnpm dev` starts every workspace dev task. Prefer the two filters above when you are only working on the API and dashboard.

The dashboard `predev` hook calls an API script named `generate`, while the published script is `generate:spec`. If that hook fails, use the workaround in [CONTRIBUTING.md](CONTRIBUTING.md#4-migrate-seed-and-run).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before you open a pull request. Short version:

1. Look for an existing issue, or open one, before you write a large change.
2. Non-trivial features need an approved design (GitHub issue) before code.
3. Keep the change small and on the existing pattern for that layer.
4. Run the checks for the packages you touched, and paste the commands in the pull request.
5. Keep secrets out of the diff. `apps/api/.env.development` is loaded by the API and is not gitignored.

Good first contributions: a reproduced bug with a failing test, a missing Arabic/English/Turkish string, a doc correction, or a small fix inside one existing module.

## Docs

| Topic                     | Where                                                    |
| ------------------------- | -------------------------------------------------------- |
| Product and architecture  | [docs/overview.md](docs/overview.md)                     |
| File map                  | [docs/file-structure.md](docs/file-structure.md)         |
| Environment and scripts   | [docs/deployment.md](docs/deployment.md)                 |
| Spec / issue workflow     | [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md) |
| Decisions                 | [docs/adr/](docs/adr/)                                   |
| Domain rules (accounting) | [.ai/rules/domain.md](.ai/rules/domain.md)               |

## License

This repository has no `LICENSE` file. `@devloggers/api` is marked `UNLICENSED`. Ask the maintainers before you reuse the code outside this project. A pull request contributes that change to this repository. It does not grant a license to republish the codebase.

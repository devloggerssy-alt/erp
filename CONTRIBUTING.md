# Contributing to Sanad ERP

Thanks for helping. This guide is how a change gets from your machine into the repository: setup, what to touch, what to leave alone, and what reviewers expect in a pull request.

The product is a pnpm + Turborepo monorepo. Most features are a vertical slice, not a change in a single app.

## Ways to help

| Kind of change                                      | Start here                                                                                |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Typo, doc fix, or a one-file bug with a clear repro | Open a pull request and link an issue                                                     |
| Missing translation (`ar`, `en`, or `tr`)           | Edit the matching files under `packages/i18n/src/`                                        |
| Bug that crosses API and dashboard                  | Open an issue with repro steps, then a focused pull request                               |
| New entity, new screen, or a behavior change        | Write a design spec and wait for approval before coding                                   |
| Security issue                                      | Email the maintainers. Leave credentials, tokens, and exploit detail out of public issues |

Search open issues before you start. If nothing fits, open an issue that states the user-visible problem and the result you expect.

## Before you write code

1. Read [docs/overview.md](docs/overview.md) so the domain names match the code.
2. For anything larger than a local bugfix, copy [docs/superpowers/templates/spec-template.md](docs/superpowers/templates/spec-template.md) to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`.
3. Wait until a maintainer approves that spec. Implementation of non-trivial work starts after approval.
4. Cross-stack work also gets a plan from [docs/superpowers/templates/plan-template.md](docs/superpowers/templates/plan-template.md), saved under `docs/superpowers/plans/`.

Record lasting technical decisions in `docs/adr/`, numbered after the latest file there.

Financial work (invoices, payments, journal entries, stock that posts to the ledger) follows [.ai/rules/domain.md](.ai/rules/domain.md): balanced double-entry, no manual postings to control accounts, no postings to summary accounts, and reversals in place of deleting posted documents.

## Local setup

### 1. Install tools

- Node.js 18 or newer
- pnpm 9.0.0
- Docker, for PostgreSQL 16

```bash
corepack enable
corepack prepare pnpm@9.0.0 --activate
pnpm install
```

Run commands from the repository root unless a snippet says otherwise.

### 2. Start PostgreSQL

`docker-compose.yml` publishes Postgres on host port **5435**.

```bash
docker compose up -d db
```

Connection string:

```text
postgresql://erp:erp@localhost:5435/erp
```

### 3. Environment files

Create these locally. Use a long random `JWT_ACCESS_SECRET`. AI, S3, and Twilio keys are optional for catalog and CRUD work.

`packages/db-prisma/.env` — Prisma CLI reads this file:

```bash
DATABASE_URL=postgresql://erp:erp@localhost:5435/erp
```

`apps/api/.env.development` — the API loads `.env.development` when `NODE_ENV` is unset or `development`:

```bash
DATABASE_URL=postgresql://erp:erp@localhost:5435/erp
JWT_ACCESS_SECRET=replace-with-a-long-random-string
PORT=4040
```

`apps/dashboard/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4040
```

The dashboard falls back to port `4000` when that variable is missing. The API listens on **4040**. Set the variable so the two match.

`apps/api/.env.development` is not listed in `.gitignore`. Before every commit, run `git status` and keep that file out of the diff. Never paste secrets into issues, pull requests, or specs.

Full variable list: [docs/deployment.md](docs/deployment.md).

### 4. Migrate, seed, and run

```bash
pnpm --filter @devloggers/db-prisma db:migrate:dev
pnpm --filter @devloggers/db-prisma db:seed

pnpm --filter @devloggers/api dev
pnpm --filter @devloggers/dashboard dev
```

| Service   | URL                   |
| --------- | --------------------- |
| API       | http://localhost:4040 |
| Dashboard | http://localhost:3000 |

The dashboard `predev` hook runs `pnpm --filter @devloggers/api run generate`. The API package publishes that step as `generate:spec`, and the root shortcut is `pnpm generate`. When `predev` exits because `generate` is missing, regenerate once from the root, then start Next without the hook:

```bash
pnpm generate
pnpm --filter @devloggers/dashboard exec next dev --turbopack
```

`pnpm generate` boots the API far enough to write the contract, so `apps/api/.env.development` must already be valid.

## Where code lives

```text
apps/api/                 NestJS API, grouped by domain under src/modules/
apps/dashboard/           Next.js App Router
  app/[locale]/           thin routes
  modules/<resource>/     feature UI (table, form, columns)
packages/db-prisma/       Prisma schema, migrations, seed
packages/api-contracts/   shared resources and DTOs
packages/api-client/      typed HTTP clients
packages/i18n/            ar / en / tr messages
packages/backend-core/    shared NestJS CRUD infrastructure
docs/superpowers/specs/   approved designs
docs/adr/                 architecture decisions
```

Shared types, routes, and DTOs belong in `@devloggers/api-contracts`. A type that both the API and the dashboard need is a package, not a copy.

### The units slice

Copy this slice when you add a CRUD entity:

```text
packages/db-prisma/src/schema/unit.prisma
packages/api-contracts/src/resources/unit.resource.ts
apps/api/src/modules/catalog/units/
packages/api-client/src/clients/units.client.ts
apps/dashboard/modules/units/
apps/dashboard/app/[locale]/(authenticated)/catalog/units/page.tsx
```

API modules use four layers: repository, service, presenter, controller. The controller validates and delegates. Business rules stay in the service. The presenter shapes the response.

Dashboard pages stay thin. Lists and forms live in `apps/dashboard/modules/<resource>/`.

## Making a change

### Branch and commits

Branch from `main`:

```text
feat/<topic>
fix/<topic>
docs/<topic>
```

Commit subjects follow the history already in the repo:

```text
feat(invoices): post a balanced journal entry on confirm
fix(units): reject a duplicate code in the same tenant
docs(contributing): document local Postgres on port 5435
```

One pull request, one concern. A drive-by refactor belongs in its own pull request.

### Schema

Share database changes as Prisma migrations:

```bash
pnpm --filter @devloggers/db-prisma db:migrate:dev
```

Commit the new folder under `packages/db-prisma/src/schema/migrations/` and the regenerated client under `packages/db-prisma/generated/client/` when that diff is part of the schema change. Seeds stay idempotent.

### API contracts

When request or response shapes change, regenerate from the repo root:

```bash
pnpm generate
```

That builds the API, writes `apps/api/openapi.yaml`, and refreshes `@devloggers/api-contracts`. Commit the contract diff with the code that produced it.

### User-facing copy

Add the string in all three catalogs:

```text
packages/i18n/src/ar/
packages/i18n/src/en/
packages/i18n/src/tr/
```

Arabic is the primary reading direction. Check the screen in an `ar` locale before you finish a UI change.

### What a pull request includes

- A link to the issue, and to the approved spec when the work is non-trivial
- What changed for a user or for a caller of the API
- The verification commands you ran, and the result
- Screenshots or a short clip for visual changes, including the Arabic layout when copy or layout moved
- A note about migrations or new environment variables

Leave unrelated files, formatting sweeps, and generated noise out of the diff.

## Verify before you open the pull request

Run the checks that match the packages you touched.

```bash
# API
pnpm --filter @devloggers/api lint
pnpm --filter @devloggers/api typecheck
pnpm --filter @devloggers/api test

# Dashboard
pnpm --filter @devloggers/dashboard lint
pnpm --filter @devloggers/dashboard typecheck
pnpm --filter @devloggers/dashboard test:unit

# Contracts and client, after pnpm generate
pnpm --filter @devloggers/api-contracts build
pnpm --filter @devloggers/api-client build
```

Architecture rules for the API:

```bash
pnpm --filter @devloggers/api lint:architecture
```

UI changes also need a pass in the browser: create, edit, and the empty and error states on every route that shares the data you changed. Check a desktop width and a narrow width when layout moved.

Claim the work is done only after those commands have actually succeeded.

## Review

Reviewers check three things:

1. The diff matches the issue or the approved spec.
2. The change follows the layer it touches (units for CRUD, four API layers, dashboard module under `modules/`).
3. The verification you listed is enough for the risk. Accounting, auth, and migrations need tests, not only a successful typecheck.

Expect comments that ask for a smaller diff or a spec. That is the normal path, not a rejection of the idea.

## Reporting bugs

Include:

- What you did, what you expected, and what happened
- Tenant locale (`ar`, `en`, or `tr`) and the route
- API status code and response body, with tokens removed
- Migration or commit you were on

A bug report that names the module (`invoicing`, `accounting`, `catalog`, …) is triaged faster.

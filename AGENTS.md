# ERP — Agent Guide

Turborepo + **pnpm** monorepo for an ERP system.

> **New here?** Read [docs/ai-engineering.md](docs/ai-engineering.md) for the full AI workflow, then [docs/superpowers/README.md](docs/superpowers/README.md) for spec-driven development.

## Stack

| Layer | Package | Path |
|-------|---------|------|
| Database | `@devloggers/db-prisma` | `packages/db-prisma` |
| Contracts | `@devloggers/api-contracts` | `packages/api-contracts` |
| API | `@devloggers/api` | `apps/api` |
| HTTP clients | `@devloggers/api-client` | `packages/api-client` |
| Dashboard | `@devloggers/dashboard` | `apps/dashboard` |

## Before you change code

1. Load **`.ai/rules/monorepo.md`** — applies always.
2. Load **`.ai/rules/code-quality.md`** — applies always (surgical changes + verify-before-complete + lint gates).
3. Load the **path-scoped rule** from `.ai/rules/` that matches the files you're editing.
4. For **non-trivial features**: check `docs/superpowers/specs/` → write or follow a design spec before coding.
5. For **full disciplined cycles**: use skill **`caveman`** (`/caveman`) — orient → brainstorm → spec → implement → review.
6. For **where things live**, use skill **`erp-project-map`** (`.ai/skills/erp-project-map/`).
7. For a **new CRUD entity end-to-end**, use skills **`add-crud-feature`** + **`feature-scaffold`**.
8. For a **dashboard form** (create/edit dialog, schema, mappers), use skill **`dashboard-form`** (`.ai/skills/dashboard-form/`) — architecture at `.ai/docs/forms-architecture.md`.
9. For a **single layer**, use the relevant skill from `.ai/skills/`.
10. For **imported best-practice skills** (NestJS, Prisma, Next.js, testing, DDD, security, …), see `.ai/skills/_imports/README.md`.

## Spec-driven development

| Artifact | Location | When |
|----------|----------|------|
| Design spec | `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` | Non-trivial features (required before code) |
| Implementation plan | `docs/superpowers/plans/YYYY-MM-DD-<topic>.md` | Large cross-stack work |
| Templates | `docs/superpowers/templates/` | Copy to start new spec/plan |

**HARD-GATE:** No implementation until the design spec is explicitly approved.

## Rules (`.ai/rules/`)

| File | Load when |
|------|-----------|
| `monorepo.md` | Always — cross-cutting architecture constraints |
| `code-quality.md` | Always — karpathy + verify-before-complete + lint gates |
| `api.md` | Editing `apps/api/**` |
| `dashboard.md` | Editing `apps/dashboard/**` |
| `database.md` | Editing `packages/db-prisma/**` |
| `packages.md` | Editing `packages/**` |

Cursor tiered rules: `.cursor/rules/` (see `global-rules/project-standards-always.mdc`).

## Skills (`.ai/skills/`)

| Skill | When to use |
|-------|-------------|
| `caveman` | Full cycle: orient → brainstorm → spec → implement → review (`/caveman`) |
| `erp-project-map` | Explore repo, find files, understand domains |
| `feature-scaffold` | File map + naming for new features |
| `add-crud-feature` | End-to-end new entity (full-stack checklist) |
| `api-contracts` | Resources + DTOs in `packages/api-contracts` |
| `api-client` | CrudClient + factory in `packages/api-client` |
| `backend-resource-module` | NestJS 4-layer module in `apps/api` |
| `dashboard-resource-page` | Dashboard CRUD list page |
| `dashboard-form` | Dashboard CRUD forms (config + form component + controller hook) |
| `frontend-resource-pattern` | Compound resource architecture + data-view |

## Plugins (Superpowers)

| Tool | Config | Skills |
|------|--------|--------|
| **Cursor** | `.cursor/settings.json` | `.cursor/skills/`, `.ai/skills/` |
| **Claude Code** | `.claude/settings.json` | `.claude/skills/` (synced from `.ai/skills/` via `pnpm sync:claude`) |
| **OpenCode** | `opencode.json` | `.ai/skills/` |

### Claude Code teammates

1. Read [`.claude/README.md`](.claude/README.md) for first-time setup
2. Trust project plugins when prompted (`superpowers`, `typescript-lsp`)
3. After pulling skill changes: `pnpm sync:claude`
4. Path-scoped context: `apps/api/CLAUDE.md`, `apps/dashboard/CLAUDE.md`, `packages/CLAUDE.md`, `packages/db-prisma/CLAUDE.md`

Superpowers provides: `brainstorming`, `writing-plans`, `executing-plans`, `verification-before-completion`, `systematic-debugging`, and more.

## Imported skills (`.ai/skills/_imports/`)

28 curated skills imported from
[`sickn33/antigravity-awesome-skills`](https://github.com/sickn33/antigravity-awesome-skills)
(MIT, V12.0.0). Each is a wrapper with an ERP-specific trigger + the upstream
body verbatim. Refresh procedure & roll-back: `.ai/skills/_imports/README.md`.

| Group | Skills |
|-------|--------|
| Stack | `nestjs-expert`, `prisma-expert`, `monorepo-architect`, `turborepo-caching`, `zod-validation-expert`, `openapi-spec-generation`, `nextjs-app-router-patterns`, `typescript-expert` |
| Backend / API | `backend-dev-guidelines`, `api-design-principles`, `api-patterns`, `database-migration` |
| Frontend | `frontend-developer`, `react-best-practices`, `shadcn` |
| Architecture / DDD | `ddd-tactical-patterns`, `architecture-patterns`, `architecture-decision-records` |
| Testing / quality | `test-driven-development`, `systematic-debugging`, `e2e-testing-patterns`, `playwright-skill`, `code-review-checklist` |
| Security | `api-security-best-practices`, `auth-implementation-patterns` |
| Anti-slop (also in `code-quality.md`) | `andrej-karpathy`, `verification-before-completion`, `lint-and-validate` |

## Golden reference: Units vertical slice

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

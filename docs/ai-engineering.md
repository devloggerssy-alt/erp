# AI Engineering Guide

How humans and AI agents work together in the **Sanad ERP** monorepo.
Read this once when onboarding; reference it when adding features, rules, or specs.

---

## Philosophy

This project treats AI assistance as **software engineering infrastructure**, not ad-hoc prompts:

1. **Rules** — persistent constraints (what must always be true)
2. **Skills** — repeatable workflows (how to do multi-step tasks)
3. **Specs** — approved designs before non-trivial code (tracked as GitHub issues)
4. **Tracker** — GitHub issues hold specs, plans, and triage labels

The goal: **drop a spec file + minimal context → agent produces correct, reviewable code** across all layers.

---

## Repository map (AI artifacts)

```
erp/
├── AGENTS.md                    ← Agent entry point (start here)
├── CLAUDE.md                    ← Thin adapter → AGENTS.md + key skills
├── opencode.json                ← OpenCode: skills path + plugin config
│
├── .ai/                         ← CANONICAL (portable across AI tools)
│   ├── rules/                   ← monorepo, api, dashboard, database, packages, code-quality
│   ├── skills/                  ← ERP workflows + _imports/ (28 upstream skills)
│   └── docs/                    ← forms-architecture.md, deep dives
│
├── .cursor/                     ← CURSOR-SPECIFIC
│   ├── settings.json            ← Cursor plugin config
│   ├── rules/                   ← tiered .mdc (global, api, dashboard, core, …)
│   └── skills/                  ← mirror of .ai/skills/ for Cursor discovery
│
├── .claude/                     ← CLAUDE CODE TEAM
│   ├── settings.json            ← plugins, permissions, team announcements
│   ├── CLAUDE.md                ← workflow overlay (concatenated with root CLAUDE.md)
│   ├── README.md                ← first-time Claude setup
│   └── skills/                  ← synced from .ai/skills/ (pnpm sync:claude)
│
├── CLAUDE.md                    ← Claude project memory (@ imports rules + skills)
├── apps/api/CLAUDE.md           ← path-scoped API rules
├── apps/dashboard/CLAUDE.md     ← path-scoped dashboard rules
├── packages/CLAUDE.md           ← shared packages rules
├── packages/db-prisma/CLAUDE.md ← database rules
│
└── docs/
    ├── ai-engineering.md        ← this file
    ├── agents/                  ← issue tracker, triage labels, domain docs
    ├── overview.md              ← product + architecture
    ├── architecture.md
    └── code-patterns.md
```

### Canonical vs tool-specific

| Need | Use |
|------|-----|
| Add a rule that works everywhere | `.ai/rules/<name>.md` |
| Cursor glob-based auto-load | `.cursor/rules/<tier>/<name>.mdc` |
| Add a workflow skill | `.ai/skills/<name>/SKILL.md` + mirror in `.cursor/skills/` |
| Write a feature design | GitHub issue (`docs/agents/issue-tracker.md`) |
| Break down large work | GitHub issue (child issues / task list) |

---

## The vertical slice (golden reference)

Every new CRUD entity copies **units** end-to-end:

```
packages/db-prisma/src/schema/unit.prisma
packages/api-contracts/src/resources/unit.resource.ts        ← route/contract definition
apps/api/src/modules/catalog/units/          ← 4-layer NestJS (+ DTO classes = shape source)
packages/api-client/src/clients/units.client.ts
apps/dashboard/modules/units/                ← generateResource pattern
apps/dashboard/app/.../catalog/units/page.tsx ← thin route
```

**Data flow:** `Prisma model` → `api-contracts resource` → `NestJS module (DTO classes)` → `generated OpenAPI types re-exported by api-contracts` → `api-client CrudClient` → `dashboard module (generateResource)`

---

## Workflow: from idea to shipped feature

### 1. Quick orientation

```
User: "Add export to units list"
Agent: reads erp-project-map → finds modules/units/ → checks open GitHub issues for prior specs
```

Skills: `erp-project-map`, `caveman` (full cycle)

### 2. Brainstorm & design

For non-trivial work:

1. Invoke **`/caveman`**
2. Ask clarifying questions **one at a time**
3. Propose 2–3 approaches with trade-offs
4. Draft the spec as a GitHub issue (`gh issue create`)
5. Publish the approved design as a GitHub issue
6. **Do not code** until user approves

### 3. Plan (large features)

1. Break the spec into checkbox tasks per file/layer
2. Track them as child GitHub issues or a task list on the spec issue
3. Link each task back to its source spec issue
4. Execute with the `implement` / `implement-parallel` skills

### 4. Implement

| Task type | Skill |
|-----------|-------|
| Full CRUD entity | `add-crud-feature` + `feature-scaffold` |
| API module only | `backend-resource-module` |
| Dashboard list page | `dashboard-resource-page`, `frontend-resource-pattern` |
| Dashboard form | `dashboard-form` + `.ai/docs/forms-architecture.md` |
| Contracts / DTOs | `api-contracts` |
| HTTP client | `api-client` |

Path-scoped rules auto-apply when editing matching files.

### 5. Verify

From `.ai/rules/code-quality.md`:

```bash
pnpm turbo run build --filter=@devloggers/api      # API changes
pnpm turbo run build --filter=@devloggers/dashboard # UI changes
pnpm generate:dev                                   # if API DTOs/Swagger changed
```

Never claim "done" without terminal evidence.

---

## Rules architecture (3 tiers)

Defined in `.cursor/rules/core-rules/rule-creation-guidelines-agent.mdc`:

| Tier | When loaded | Max size | Example |
|------|-------------|----------|---------|
| Always | Every session | 50 lines | `project-standards-always.mdc` |
| Auto | Matching glob | 150 lines | `nestjs-api.mdc` → `apps/api/**` |
| Agent | On demand | 200 lines | `spec-driven-development-agent.mdc` |

**Never** use broad globs like `**/*` — they bloat context.

### ERP rules index

| Rule | Scope | Path |
|------|-------|------|
| Monorepo core | Always | `.ai/rules/monorepo.md` |
| Code quality | Always | `.ai/rules/code-quality.md` |
| NestJS API | `apps/api/**` | `.ai/rules/api.md` |
| Dashboard | `apps/dashboard/**` | `.ai/rules/dashboard.md` |
| Database | `packages/db-prisma/**` | `.ai/rules/database.md` |
| Packages | `packages/**` | `.ai/rules/packages.md` |

---

## Skills index

### ERP-native orchestration

| Skill | Trigger |
|-------|---------|
| `caveman` | `/caveman`, full disciplined cycle |
| `erp-project-map` | Where does X live? |
| `add-crud-feature` | New entity full-stack |
| `feature-scaffold` | File map + naming for new feature |
| `api-contracts` | Resources + DTOs |
| `api-client` | CrudClient |
| `backend-resource-module` | NestJS 4-layer module |
| `dashboard-resource-page` | CRUD list page |
| `dashboard-form` | Create/edit forms |
| `frontend-resource-pattern` | Resource compound components |

### Imported best practices (`.ai/skills/_imports/`)

28 skills from [antigravity-awesome-skills](https://github.com/sickn33/antigravity-awesome-skills) — NestJS, Prisma, Next.js, TDD, security, DDD, etc.

Refresh / rollback: `.ai/skills/_imports/README.md`

### Tool integration

| Tool | Config | Skills discovery |
|------|--------|------------------|
| Cursor | `.cursor/settings.json` | `.cursor/skills/` + `.ai/skills/` |
| Claude Code | `.claude/settings.json` | `.claude/skills/` (run `pnpm sync:claude` after `.ai/skills/` changes) |
| OpenCode | `opencode.json` | `.ai/skills/` |

**Claude Code setup:** see [`.claude/README.md`](../.claude/README.md)

---

## Adding a new page or component (cheat sheet)

### New CRUD catalog page (e.g. "Brands")

1. Check open GitHub issues for an existing design
2. If none: write the spec as a GitHub issue → get approval
3. Run `add-crud-feature` checklist layer by layer
4. Reference: `modules/units/`
5. Add nav in `config/navGroups.tsx`
6. Add i18n in `messages/en.json`, `ar.json`, `tr.json`
7. Verify builds + UI smoke test

### Modify existing dashboard component

1. Find module: `apps/dashboard/modules/<feature>/`
2. Load `.ai/rules/dashboard.md`
3. UI primitives live in `shared/` — extend there if reusable
4. Small change: no spec needed; large change: update or create spec

### Modify API endpoint

1. Find module: `apps/api/src/modules/<domain>/<feature>/`
2. Load `.ai/rules/api.md` — **Swagger decorators are mandatory**
3. Business logic in service `beforeCreate` / `beforeUpdate`
4. After DTO changes: `pnpm generate:dev`

### Add a new AI rule or skill

1. Read `.cursor/rules/core-rules/rule-creation-guidelines-agent.mdc`
2. Rule → `.ai/rules/` then `.cursor/rules/<tier>/`
3. Skill → `.ai/skills/<name>/SKILL.md` + `.cursor/skills/<name>/`
4. Update `AGENTS.md` index if user-facing

---

## Context you should provide to an agent

Minimum effective context:

```markdown
## Task
Add CSV export to the units list page.

## Spec
#123 — units CSV export (approved)

## Constraints
- Reuse existing import-export utilities in backend-core
- No new dependencies without approval
```

The agent will load rules, skills, and the spec — then implement surgically.

---

## Comparison with Matrix Frontend patterns

This ERP repo adopts the same **software engineering** ideas from Matrix Frontend:

| Pattern | Matrix Frontend | ERP |
|---------|-----------------|-----|
| Spec-driven dev | GitHub issues | Same structure |
| Plans with checkboxes | GitHub issues | Same structure |
| Tiered `.cursor/rules/` | `global-rules/`, `component-rules/`, … | `global-rules/`, `api-rules/`, … |
| Orchestration skill | `caveman` | `caveman` (ERP-adapted) |
| Feature scaffold | `feature-scaffold` | `feature-scaffold` (full-stack monorepo) |

Key difference: ERP is a **Turborepo monorepo** with Prisma + NestJS + shared contracts — not a single React app. The golden slice spans 5 packages, not one `src/app/` folder.

---

## Commands reference

```bash
pnpm dev                                          # all apps
pnpm --filter @devloggers/api dev
pnpm --filter @devloggers/dashboard dev
pnpm --filter @devloggers/db-prisma db:migrate:dev
pnpm --filter @devloggers/db-prisma db:seed
pnpm turbo run build
pnpm generate:dev                                 # OpenAPI → api-client types
```

---

## Further reading

- [Issue tracker](./agents/issue-tracker.md) — where specs and issues live
- [AGENTS.md](../AGENTS.md) — agent quick start
- [Overview](./overview.md) — product domains
- [Architecture](./architecture.md) — system design
- [File structure](./file-structure.md) — directory map
- [Forms architecture](../.ai/docs/forms-architecture.md) — dashboard forms

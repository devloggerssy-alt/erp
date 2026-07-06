# AI Engineering Guide

How humans and AI agents work together in the **Devloggers ERP** monorepo.
Read this once when onboarding; reference it when adding features, rules, or specs.

---

## Philosophy

This project treats AI assistance as **software engineering infrastructure**, not ad-hoc prompts:

1. **Rules** — persistent constraints (what must always be true)
2. **Skills** — repeatable workflows (how to do multi-step tasks)
3. **Specs** — approved designs before non-trivial code (`docs/superpowers/`)
4. **Plugins** — Superpowers for brainstorming, planning, debugging, verification

The goal: **drop a spec file + minimal context → agent produces correct, reviewable code** across all layers.

---

## Repository map (AI artifacts)

```
erp/
├── AGENTS.md                    ← Agent entry point (start here)
├── CLAUDE.md                    ← Thin adapter → AGENTS.md + key skills
├── opencode.json                ← OpenCode: skills path + superpowers plugin
│
├── .ai/                         ← CANONICAL (portable across AI tools)
│   ├── rules/                   ← monorepo, api, dashboard, database, packages, code-quality
│   ├── skills/                  ← ERP workflows + _imports/ (28 upstream skills)
│   └── docs/                    ← forms-architecture.md, deep dives
│
├── .cursor/                     ← CURSOR-SPECIFIC
│   ├── settings.json            ← superpowers plugin enabled
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
    ├── superpowers/             ← spec-driven development
    │   ├── README.md
    │   ├── templates/
    │   ├── specs/               ← approved designs
    │   └── plans/               ← implementation task lists
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
| Write a feature design | `docs/superpowers/specs/` |
| Break down large work | `docs/superpowers/plans/` |

---

## The vertical slice (golden reference)

Every new CRUD entity copies **units** end-to-end:

```
packages/db-prisma/src/schema/unit.prisma
packages/api-contracts/src/resources/unit.resource.ts
packages/api-contracts/src/dto/unit.dto.ts
apps/api/src/modules/catalog/units/          ← 4-layer NestJS
packages/api-client/src/clients/units.client.ts
apps/dashboard/modules/units/                ← generateResource pattern
apps/dashboard/app/.../catalog/units/page.tsx ← thin route
```

**Data flow:** `Prisma model` → `api-contracts resource + DTO` → `NestJS module` → `api-client CrudClient` → `dashboard module (generateResource)`

---

## Workflow: from idea to shipped feature

### 1. Quick orientation

```
User: "Add export to units list"
Agent: reads erp-project-map → finds modules/units/ → checks docs/superpowers/ for prior specs
```

Skills: `erp-project-map`, `caveman` (full cycle)

### 2. Brainstorm & design (Superpowers)

For non-trivial work:

1. Invoke **`/caveman`** or superpowers **brainstorming**
2. Ask clarifying questions **one at a time**
3. Propose 2–3 approaches with trade-offs
4. Copy `docs/superpowers/templates/spec-template.md`
5. Save approved design to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
6. **Do not code** until user approves

### 3. Plan (large features)

1. Copy `docs/superpowers/templates/plan-template.md`
2. Save to `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`
3. Checkbox tasks per file/layer
4. Execute with superpowers **executing-plans** or **subagent-driven-development**

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

### Superpowers plugin (external)

| Tool | Config | Skills discovery |
|------|--------|------------------|
| Cursor | `.cursor/settings.json` | `.cursor/skills/` + `.ai/skills/` |
| Claude Code | `.claude/settings.json` | `.claude/skills/` (run `pnpm sync:claude` after `.ai/skills/` changes) |
| OpenCode | `opencode.json` | `.ai/skills/` |

**Claude Code setup:** see [`.claude/README.md`](../.claude/README.md)

- `brainstorming` — design before code
- `writing-plans` / `executing-plans` — plan lifecycle
- `verification-before-completion` — evidence gates
- `systematic-debugging` — structured debugging
- `subagent-driven-development` — parallel tasks

---

## Adding a new page or component (cheat sheet)

### New CRUD catalog page (e.g. "Brands")

1. Check `docs/superpowers/specs/` for existing design
2. If none: write spec from template → get approval
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
docs/superpowers/specs/2026-07-06-units-export-design.md (approved)

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
| Spec-driven dev | `docs/superpowers/specs/` | Same structure |
| Plans with checkboxes | `docs/superpowers/plans/` | Same structure |
| Tiered `.cursor/rules/` | `global-rules/`, `component-rules/`, … | `global-rules/`, `api-rules/`, … |
| Orchestration skill | `caveman` | `caveman` (ERP-adapted) |
| Feature scaffold | `feature-scaffold` | `feature-scaffold` (full-stack monorepo) |
| Superpowers plugin | `.cursor/settings.json` | Same |

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

- [Superpowers README](./superpowers/README.md) — spec workflow details
- [AGENTS.md](../AGENTS.md) — agent quick start
- [Overview](./overview.md) — product domains
- [Architecture](./architecture.md) — system design
- [File structure](./file-structure.md) — directory map
- [Forms architecture](../.ai/docs/forms-architecture.md) — dashboard forms

# AI Engineering Infrastructure — Design

**Date:** 2026-07-06  
**Author:** AI engineering upgrade  
**Status:** Approved  
**Scope:** Repository-wide — rules, skills, plugins, spec-driven documentation  
**Primary goal:** Enable any developer or agent to enter the project, add context + a spec file, and produce correct full-stack changes with minimal friction.

---

## Context

The ERP monorepo already had:

- `.ai/rules/` and `.ai/skills/` (canonical, portable)
- Partial `.cursor/` mirror (rules + skills)
- `docs/superpowers/specs/` and `plans/` with real feature designs
- Superpowers plugin in `opencode.json` and `.claude/settings.json`

Gaps compared to Matrix Frontend's software-engineering approach:

- No `.cursor/settings.json` for Superpowers in Cursor
- No tiered `.cursor/rules/` structure (global-rules, core-rules, agent rules)
- No orchestration skills (`caveman`, `feature-scaffold`)
- No `docs/superpowers/README.md` or templates
- No unified onboarding doc (`docs/ai-engineering.md`)
- `AGENTS.md` did not reference spec-driven workflow

---

## Requirements

### Functional

- [x] Enable Superpowers plugin in Cursor (`.cursor/settings.json`)
- [x] Add `caveman` skill — full orient → brainstorm → spec → implement → review cycle
- [x] Add `feature-scaffold` skill — ERP file map for new entities
- [x] Add spec/plan templates under `docs/superpowers/templates/`
- [x] Add `docs/superpowers/README.md` workflow guide
- [x] Add `docs/ai-engineering.md` comprehensive onboarding
- [x] Update `AGENTS.md`, `monorepo.md`, `monorepo-core.mdc`
- [x] Add tiered Cursor rules: `rule-creation-guidelines`, `spec-driven-development`, `project-standards-always`

### Non-functional

- Canonical source remains `.ai/` — `.cursor/` mirrors for Cursor-specific features
- No breaking changes to existing rules at root `.cursor/rules/*.mdc`
- Templates must reference ERP golden slice (**units**)
- All docs link to each other for discoverability

---

## Proposed approach

Adopt Matrix Frontend's **3-tier rule architecture** and **Superpowers spec-driven workflow**, adapted for Turborepo + Prisma + NestJS + shared contracts.

### Key adaptations from Matrix Frontend

| Matrix | ERP |
|--------|-----|
| Single React app (`src/app/`) | 5-layer monorepo vertical slice |
| `useApi*` hooks | `api-client` CrudClient + `generateResource` |
| MUI + react-router | Next.js App Router + shadcn + next-intl |
| `feature-scaffold` → one app folder | `feature-scaffold` → Prisma through dashboard |

---

## File map

### Created

| Path | Purpose |
|------|---------|
| `.cursor/settings.json` | Superpowers plugin for Cursor |
| `.cursor/rules/core-rules/rule-creation-guidelines-agent.mdc` | Rule/skill authoring standards |
| `.cursor/rules/global-rules/spec-driven-development-agent.mdc` | When/how to write specs |
| `.cursor/rules/global-rules/project-standards-always.mdc` | Core standards index |
| `.ai/skills/caveman/SKILL.md` | Orchestration workflow |
| `.cursor/skills/caveman/SKILL.md` | Cursor mirror |
| `.ai/skills/feature-scaffold/SKILL.md` | ERP feature file map |
| `.cursor/skills/feature-scaffold/SKILL.md` | Cursor mirror |
| `docs/superpowers/README.md` | Workflow guide |
| `docs/superpowers/templates/spec-template.md` | Design spec template |
| `docs/superpowers/templates/plan-template.md` | Implementation plan template |
| `docs/ai-engineering.md` | Full onboarding |
| `docs/superpowers/specs/2026-07-06-ai-engineering-infrastructure-design.md` | This spec |

### Modified

| Path | Change |
|------|--------|
| `AGENTS.md` | Superpowers, caveman, spec-driven sections |
| `.ai/rules/monorepo.md` | Spec-driven + ai-engineering links |
| `.cursor/rules/monorepo-core.mdc` | Skills index update |
| `CLAUDE.md` | Link to ai-engineering.md |
| `.ai/skills/erp-project-map/reference.md` | Updated root layout |
| `docs/file-structure.md` | AI artifact paths |

---

## Usage (for future contributors)

### New feature

1. Copy `docs/superpowers/templates/spec-template.md` → `specs/YYYY-MM-DD-<topic>-design.md`
2. Run `/caveman` in Cursor or invoke brainstorming skill
3. Get approval → implement with `add-crud-feature` or `feature-scaffold`
4. For large work: copy plan template → `plans/`

### New rule or skill

1. Read `.cursor/rules/core-rules/rule-creation-guidelines-agent.mdc`
2. Add to `.ai/` first, mirror to `.cursor/` if Cursor-specific

---

## Verification

- [x] All new files created and cross-linked
- [x] No duplicate broad globs in new rules
- [x] Templates follow existing spec/plan format in `docs/superpowers/`

---

## Out of scope

- Migrating all existing `.cursor/rules/*.mdc` into subfolders (backward compat kept)
- Adding Matrix-specific skills (api-service, form-generator, etc.) — ERP has equivalent layer skills
- Automated sync script between `.ai/` and `.cursor/`

---

## Approval

- [x] Infrastructure upgrade — self-documenting spec

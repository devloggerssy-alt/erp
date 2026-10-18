---
name: caveman
description: >-
  End-to-end feature workflow: discover skills, orient context, relentlessly
  stress-test design, implement, and code-review. Use when the user invokes
  /caveman or wants a full disciplined cycle from idea to reviewed implementation.
disable-model-invocation: true
---

# Caveman Workflow (ERP)

Orchestrates a disciplined development cycle for the Sanad ERP monorepo.
Do not skip steps unless the user explicitly overrides.

## 1. Context orientation (erp-project-map)

Before writing code or finalizing a design:

- **Zoom out:** Map modules across Prisma → api-contracts → API → api-client → dashboard.
- Read skill **`erp-project-map`** for domain placement and golden **units** slice.
- Check whether other skills apply (even ~1% chance): `add-crud-feature`, `dashboard-form`, `backend-resource-module`, imported `_imports/` skills.
- Load path-scoped rules: `.ai/rules/api.md`, `dashboard.md`, `database.md`, `packages.md`.
- Prefer existing architecture over inventing new patterns.

## 2. Relentless design stress-testing (brainstorming)

Explore project context (files, open GitHub issues, recent changes):

- **Grill the user:** One clarification question at a time when requirements are unclear.
- **Codebase first:** If the answer is in the repo, explore — don't ask.
- **Propose recommendations** with each question, based on ERP patterns.
- Present **2–3 approaches** with trade-offs; recommend one.
- Write approved non-trivial designs as a **GitHub issue**
  (see `docs/agents/issue-tracker.md`)
- For large work, also publish a **plan** as a GitHub issue
  (child issues or a checkbox task list on the spec issue)
- **HARD-GATE:** No implementation code until design is explicitly approved.

## 3. Implementation

After explicit design approval:

- Follow ERP stack: `@devloggers/api-contracts` DTOs, 4-layer NestJS modules, `generateResource` dashboard pages, next-intl i18n (en/ar/tr).
- Keep diffs surgical; match neighboring code style.
- Use layer skills in order when full-stack: `add-crud-feature` checklist.
- Run verification on touched packages before claiming done (see `code-quality.md`).

## 4. Code review

When a logical chunk is complete:

- Compare implementation line-by-line to the approved spec.
- Check: tenant scoping, Swagger decorators, i18n keys, RTL, OpenAPI regen if API DTOs changed.
- Fix valid issues; push back on harmful suggestions with evidence.
- Use `code-review-checklist` or code-reviewer subagent when available.

## 5. Verification before completion

Before telling the user the work is done:

```bash
# Typecheck / build touched packages
pnpm turbo run build --filter=@devloggers/api
pnpm turbo run build --filter=@devloggers/dashboard

# If API DTOs/Swagger changed (API must be running):
pnpm generate:dev
```

- Cite exact terminal output. Do not claim success without evidence.

## When to use Caveman

| User says / Scenario | Action |
|----------------------|--------|
| `/caveman` | Full workflow from current task |
| New feature / large UI or API change | Zoom-out → Brainstorm → Spec → Implement → Review |
| "Grill me on this feature" | Jump to Phase 2 only |
| Typo / minor bugfix | Orientation + implement only; skip heavy brainstorm |

## Output expectations

- Brief summary of what changed and why.
- Link to spec/plan markdown path if written.
- Note manual follow-ups (migration, i18n, permissions, seed data).

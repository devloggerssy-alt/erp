---
name: code-quality
description: ERP code-quality gates — surgical changes, verify-before-complete, lint-and-validate. Load always.
scope: always
---

# ERP Code Quality — Always Loaded

Three behavioral gates imported from `sickn33/antigravity-awesome-skills`
(licensed MIT). Apply on every code change in this repo.

---

## 1. Surgical changes (`andrej-karpathy`)

- Make the **smallest change** that solves the problem. No drive-by refactors.
- **Surface hidden assumptions** explicitly in the plan / commit / response.
- Define "done" with **verifiable success criteria** BEFORE writing code.
- Prefer the existing pattern over a new abstraction. Boring > clever.
- Tradeoff: these rules bias toward caution over speed. For trivial
  edits (typo, single-line tweak) use judgment.

Full body: `.ai/skills/_imports/andrej-karpathy/SKILL.md`

---

## 2. Verify before completion (`verification-before-completion`)

- **Never claim a task is done** without running it / inspecting the output.
- "I think it works" = "it does not work" until proven by output, not by reasoning.
- Verification tiers (use the strongest that's reasonable):
  1. File / import parses (typecheck)
  2. Unit test passes
  3. Integration / e2e test passes
  4. Manual smoke in `pnpm dev`

Full body: `.ai/skills/_imports/verification-before-completion/SKILL.md`

---

## 3. Lint & validate (`lint-and-validate`)

After every meaningful edit, **run the relevant validation** for the touched
package. The exact commands live in each package's `package.json`, but the
defaults for this monorepo are:

```bash
# After touching apps/api/**
pnpm --filter @devloggers/api lint
pnpm --filter @devloggers/api test

# After touching apps/dashboard/**
pnpm --filter @devloggers/dashboard lint
pnpm --filter @devloggers/dashboard test

# After touching packages/db-prisma/**
pnpm --filter @devloggers/db-prisma typecheck
pnpm --filter @devloggers/db-prisma db:migrate:dev

# After touching packages/api-contracts or packages/api-client
pnpm --filter @devloggers/api-contracts build
pnpm --filter @devloggers/api-client build

# Whole repo (when in doubt)
pnpm turbo run lint typecheck build
```

If any of the above fails, **fix it before reporting completion** — do not
defer, do not mark "known issue", do not move on.

Full body: `.ai/skills/_imports/lint-and-validate/SKILL.md`

---

## What this rule does NOT do

- It does **not** override the path-scoped rules in `.ai/rules/api.md`,
  `.ai/rules/dashboard.md`, `.ai/rules/database.md`, `.ai/rules/packages.md`,
  or the cross-cutting `.ai/rules/monorepo.md`. Those still load with the
  files they cover.
- It does **not** promote any of the 25 other imported skills to
  always-loaded. Those stay in `.ai/skills/_imports/` and load on-demand
  by their `name`.

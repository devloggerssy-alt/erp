# <Feature Title> Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** <one sentence>  
**Architecture:** <2–3 sentences on approach>  
**Tech Stack:** Turborepo, Prisma, NestJS, api-contracts, api-client, Next.js dashboard, next-intl  
**Spec:** `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`

---

## File map (what changes where)

**Create**
- `path/to/new/file.ts` — purpose

**Modify**
- `path/to/existing/file.ts` — what changes

**Delete**
- (none)

---

## Task 1: <Title>

**Files:**
- Create: `path/to/file`
- Modify: `path/to/other`

- [ ] **Step 1:** <concrete action>

```ts
// code snippet if helpful
```

- [ ] **Step 2: Verify**

```bash
pnpm turbo run build --filter=@devloggers/api
```

Expected: PASS (no errors).

- [ ] **Step 3: Commit** (if user requested commits)

```bash
git add <files>
git commit -m "feat(domain): <message>"
```

---

## Task 2: <Title>

**Files:**
- Modify: `path/to/file`

- [ ] **Step 1:** <action>
- [ ] **Step 2: Verify** — `pnpm turbo run build --filter=@devloggers/dashboard`
- [ ] **Step 3: Manual smoke** — list/create/edit/delete in UI

---

## Task 3: i18n & nav

**Files:**
- Modify: `apps/dashboard/messages/en.json`, `ar.json`, `tr.json`
- Modify: `apps/dashboard/config/navGroups.tsx`

- [ ] **Step 1:** Add translation keys under `<feature>.*`
- [ ] **Step 2:** Add nav group entry with `titleKey` / `href`

---

## Final verification

```bash
pnpm turbo run build
pnpm generate:dev   # if API DTOs changed
```

- [ ] All checkboxes above complete
- [ ] Implementation matches spec line-by-line
- [ ] No regressions in related features

---

## Follow-ups (post-merge)

- [ ] Seed data update
- [ ] Permission rules (if applicable)
- [ ] E2E test (if applicable)

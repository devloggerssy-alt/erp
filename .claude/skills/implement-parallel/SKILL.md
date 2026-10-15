---
name: implement-parallel
description: Implement multiple GitHub issues in parallel with one subagent per issue on its own git worktree, then review, resolve conflicts, and open PRs. Use whenever user says /implement with 2+ issue numbers like /implement #15 #16 #17 #18, parallel issues, or agent per issue.
---

# Implement Parallel (ERP)

One subagent per GitHub issue, isolated on its own worktree. Main agent orchestrates, reviews, resolves conflicts, verifies, and opens PRs.

Base branch is `main`. Issue source is `gh issue view <n>`. Worktrees live at `.worktrees/issue-<n>/` inside the repo (ignored by git).

## When to use / when not

Use when:
- `/implement #15, #16, #17` or any 2+ issue numbers in one prompt
- User says "parallel", "agent per issue", "worktrees"

Do NOT use when:
- Single issue — use `/implement` single-track / `caveman` instead
- Non-trivial feature without approved spec — write spec to `docs/superpowers/specs/` first per `monorepo.md`, then come back

## Rules always loaded

1. `.ai/rules/monorepo.md` — no duplicated types, Prisma → contracts → API → client → dashboard
2. `.ai/rules/code-quality.md` — surgical diffs + verify-before-complete + lint gates
3. Path-scoped rule matching touched files (`.ai/rules/api.md`, `dashboard.md`, `database.md`, `packages.md`)

## Phase 0 — Parse input

Extract all `#<digits>` from prompt. Example: `/implement #15, #16, #17, #18` → `[15,16,17,18]`.

- Dedupe, sort numeric ascending. That order is the merge order.
- If 0 numbers found: ask user for issue numbers, stop.
- If 1 number: confirm single-track mode (still use worktree, skip merge phase).

## Phase 1 — Validate (main agent, before spawning)

```powershell
git fetch origin main
git worktree list
gh issue view 15 --json number,title,state,labels
gh issue view 16 --json number,title,state,labels
```

Reject and report if:
- Issue is not OPEN
- Worktree `.worktrees/issue-<n>` already exists with dirty changes (`git -C .worktrees/issue-<n> status --short`)
- No spec exists for a non-trivial issue (per `monorepo.md`)

Overlap check (conflict forecast):

```powershell
gh issue view 15 --json title,body
# repeat per issue, note likely overlapping areas:
# same Prisma model, same api-contracts resource, same dashboard module
```

If 2+ issues touch the same Prisma model or same `packages/api-contracts/src/resources/*.resource.ts`, warn user but proceed — Phase 4 handles it serially.

Ensure `.worktrees/` is ignored (do once):

```powershell
Select-String -Pattern "^\.worktrees/" -Path ".gitignore" -Quiet; if (-not $?) { Add-Content ".gitignore" "`n.worktrees/" }
```

## Phase 2 — Setup worktrees (main agent)

One branch + worktree per issue. Slug from issue title (lowercase, non-alnum → `-`, max 40 chars).

```powershell
git worktree add ".worktrees/issue-15" -b "issue-15-ai-chat-audit-files" origin/main
git worktree add ".worktrees/issue-16" -b "issue-16-xyz" origin/main
```

If branch `issue-<n>-*` already exists (e.g. retry), reuse it:

```powershell
git worktree add ".worktrees/issue-15" "issue-15-ai-chat-audit-files"
```

Then per worktree (proves isolation, warms install):

```powershell
pnpm install --prefer-offline
```

Do NOT run `pnpm dev` servers inside worktrees in parallel — port + DB conflicts. Typecheck / lint / test only.

## Phase 3 — Spawn implementers (same turn, one Task per issue)

Launch ALL implementer subagents in a single turn so they run concurrently. One `Task` call per issue, `subagent_type: general`.

Each prompt MUST contain (copy verbatim, fill brackets):

```text
You are implementer for GitHub issue #[N] ONLY.
Worktree: C:\Users\LOQ\Desktop\workspace\devloggers\erp\.worktrees\issue-[N]
  (use this absolute path for every Read/Glob/Grep/Bash workdir call. NEVER touch repo root or sibling worktrees)
Branch: [branch-name] (already checked out in worktree, do NOT create another branch)

Steps:
1. `gh issue view [N] --json number,title,body,labels` + read body for acceptance criteria.
2. Load `.ai/rules/monorepo.md`, `.ai/rules/code-quality.md`, path-scoped rule for your files, skill `erp-project-map`.
   If full-stack CRUD: follow `add-crud-feature` layer order. If backend only: `backend-resource-module`. If dashboard form: `dashboard-form`.
3. Implement ONLY #[N]. Smallest surgical diff. No drive-by refactors.
4. Verify inside YOUR worktree only:
   - touched api-contracts/client: `pnpm --filter @devloggers/api-contracts build`
   - touched apps/api: `pnpm --filter @devloggers/api lint` + relevant `test`
   - touched apps/dashboard: `pnpm --filter @devloggers/dashboard lint`
   - touched db-prisma: `pnpm --filter @devloggers/db-prisma typecheck`
   Cite exact command output. Do NOT claim done without it.
5. Commit in worktree: `git -C <worktree> add -A; git -C <worktree> commit -m "feat(scope): close #[N] <short title>"`. Do NOT push. Do NOT merge to main.
6. Return: branch name, files changed (`git status --short`, `git diff --stat origin/main...HEAD`), verification output, follow-ups.

Constraints: no `as any` / `@ts-ignore` on API data (see code-quality §4 — fix source + `pnpm generate:dev` instead). No `pnpm dev` servers. No cross-issue edits.
```

Main agent MUST NOT start Phase 4 until every implementer returns (or explicitly fails).

## Phase 4 — Main-agent review + conflict resolution

For each finished worktree, in numeric issue order:

1. Inspect: `git -C .worktrees/issue-<N> log origin/main..HEAD --oneline`, `git diff origin/main...HEAD --stat`, then full diff for overlapping files.
2. Review checklist (from `caveman` §4 + `code-quality.md`):
   - Matches `gh issue view <N>` acceptance criteria, nothing extra
   - Tenant scoping, Swagger decorators, i18n keys (en/ar/tr), RTL, OpenAPI regen if DTOs changed
   - No type workarounds, no duplicated contracts, surgical diff
3. Rebase onto latest main to surface conflicts early:

```powershell
git -C ".worktrees/issue-15" fetch origin main
git -C ".worktrees/issue-15" rebase origin/main
```

4. If rebase conflicts in a worktree: resolve in THAT worktree (keep both intents, prefer issue's own logic for its files, ask user if semantic clash), `git rebase --continue`, rerun that worktree's lint/typecheck.
5. Cross-issue overlap (same file changed in 2+ worktrees): merge sequentially in numeric order into a local integration branch `integrate/<run-id>` off `main`, or cherry-pick worktree HEADs one by one. Resolve keeping both features. Never silently drop one side.
6. If an implementer is wrong: send ONE follow-up Task targeting that same worktree with the review findings, then re-review. Max 2 fix rounds per issue, then escalate to user.

## Phase 5 — Final verify (main agent)

After all rebases are clean, verify the integration result (strongest reasonable tier):

```powershell
pnpm turbo run lint typecheck build
```

If API DTOs changed and API is running: `pnpm generate:dev; pnpm --filter @devloggers/api-contracts build`.

Fix failures before PRs. Cite terminal output.

## Phase 6 — Push + PRs (per user choice: Create PRs)

One PR per issue, from its rebased branch:

```powershell
git -C ".worktrees/issue-15" push -u origin "issue-15-ai-chat-audit-files"
gh pr create --head "issue-15-ai-chat-audit-files" --base main --title "close #15: <title>" --body "Closes #15. Implemented on worktree .worktrees/issue-15. Verification: <commands + result>."
```

Repeat per issue in numeric order. Return all PR URLs.

Do NOT merge PRs automatically. Do NOT delete worktrees until user confirms PRs are green — then:

```powershell
git worktree remove ".worktrees/issue-15"
git worktree prune
```

## Failure handling

- Implementer fails / times out: keep its worktree intact, report branch + last output, continue reviewing the others, ask user whether to retry that issue alone.
- Dirty pre-existing worktree: never `add -A` over it — report and stop that issue.
- `pnpm dev` port clash, Turbo cache weirdness across worktrees: kill dev servers, rerun lint/typecheck only.

## Output expectations

- Table: issue → branch → worktree → files changed → verification → PR URL
- Conflict report: which files overlapped, how resolved
- Manual follow-ups: migrations (`db:migrate:dev`), seed, i18n, permissions

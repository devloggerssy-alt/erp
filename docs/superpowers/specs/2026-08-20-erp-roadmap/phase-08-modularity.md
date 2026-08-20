# Phase 8 — Modularity

**Status:** ⬜ not started  
**Priority:** 🟢 P3  
**Depends on:** [Phase 5](phase-05-domain-coupling.md)  
**Blocks:** nothing  
**Findings addressed:** [00-open-issues.md](00-open-issues.md) — modularity  
**Index:** [README](README.md)

> **Merged from:** old architecture refactor Phase 4.

---

## Goal

Each domain independently loadable and testable. Capability manifest matches actual imports. Optional outbox seam for future service extraction.

---

## Success criteria

- [ ] Domain capability manifest with `dependsOn` / `provides`
- [ ] Build-time check: manifest matches import graph
- [ ] Facade contract tests pass with other modules unloaded
- [ ] Outbox model exists; **off by default**

---

## Tasks

### 8.1 — Capability manifest

- [ ] 8.1.1 Each domain declares `{ key, dependsOn[], provides[] }`
- [ ] 8.1.2 Script compares manifest to ESLint import graph
- [ ] 8.1.3 Accounting marked non-optional with documented rationale

### 8.2 — Dynamic registration

- [ ] 8.2.1 `AppModule` composes from config-driven registry
- [ ] 8.2.2 Disabled module → 404 with clear message (not 500)

### 8.3 — Contract tests per facade

- [ ] 8.3.1 `AccountingPostingFacade` isolation test
- [ ] 8.3.2 `InventoryMovementFacade` isolation test (from Phase 5)
- [ ] 8.3.3 Become service-boundary tests if extraction happens

### 8.4 — Outbox seam (optional mode)

- [ ] 8.4.1 `Outbox` model: tenantId, topic, payload, status, attempts, timestamps
- [ ] 8.4.2 `AccountingPostingFacade` optional outbox mode behind config — call sites unchanged
- [ ] 8.4.3 Worker with retry + dead-letter
- [ ] 8.4.4 **Default: off.** Sync posting remains production path until real split needs async GL
- [ ] 8.4.5 **F3 decision:** give `EventEmitter2` CRUD events consumers **or** stop emitting

---

## Verification

```bash
pnpm turbo run build --filter=@devloggers/api
# Each domain module boots in isolation test harness
```

## Done when

- [ ] Manifest drift fails CI
- [ ] Outbox mode tested behind flag; default path unchanged

## Risk

Outbox changes GL consistency model — requires design review before enabling in production (.ai/rules/domain.md §4).

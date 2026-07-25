# Phase 4 — Modularity / Feature-flag Prep

**Status:** ⬜ scoped, **not decomposed** — write a dedicated spec before executing
**Depends on:** [Phase 3](phase-3-remaining-coupling.md)
**Blocks:** nothing
**Findings addressed:** [F3](00-findings.md#f3--the-event-infrastructure-has-zero-consumers)
**Index:** [README](README.md)

---

## Goal

Each domain is independently loadable and independently testable — the precondition for both
feature toggles and service extraction.

## Success criteria

- [ ] Every facade passes its contract tests with all other modules unloaded

---

## Scope

### 4.1 — Capability manifest

- [ ] 4.1.1 Each domain module declares `{ key, dependsOn[], provides[] }`
- [ ] 4.1.2 Build-time check that the declared graph matches the **actual** import graph — a
      manifest that can drift from reality is worse than no manifest

### 4.2 — Dynamic registration

- [ ] 4.2.1 `AppModule` composes domain modules from a config-driven registry
- [ ] 4.2.2 Disabled modules return **404, not 500**, with a clear message
- [ ] 4.2.3 Accounting is non-optional; document why (every sub-ledger posts to it)

### 4.3 — Contract tests per facade

- [ ] 4.3.1 Test each facade against its intent contract in isolation
- [ ] 4.3.2 These become the service-boundary tests if extraction ever happens

### 4.4 — Outbox seam

- [ ] 4.4.1 Add an `Outbox` model (`tenantId`, `topic`, `payload`, `status`, `attempts`, timestamps)
- [ ] 4.4.2 `AccountingPostingFacade` gains an optional outbox mode behind config — writes the
      intent instead of posting inline. **Call sites do not change** — this is the payoff for the
      Phase 1 facade boundary
- [ ] 4.4.3 Worker consuming outbox rows, with retry and dead-letter
- [ ] 4.4.4 **Off by default.** Synchronous posting remains the production path until a real
      service split requires otherwise. Turning this on makes the GL eventually consistent — an
      invoice could be `POSTED` with no journal entry yet
- [ ] 4.4.5 **Decide the fate of the unused `EventEmitter2` CRUD events (F3):** either give them
      consumers or stop emitting them. Emitting events nobody handles is a maintenance tax and a
      false affordance — it looks like an extension point that has never been exercised

---

## Test obligation

Module isolation tests — each domain boots alone.

## Before executing

Write `docs/superpowers/specs/YYYY-MM-DD-modular-domain-registration-design.md`. The outbox in
particular needs its own design review: it changes the consistency model of the GL, which is the
one guarantee `.ai/rules/domain.md` §4 is written to protect.

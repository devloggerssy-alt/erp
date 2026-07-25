# ERP Gap Register (Part B)

**Status:** reference only — **not part of the refactor roadmap**
**Index:** [README](README.md)

---

Functional gaps found during the system review. Named and sized, **not decomposed**. Each requires
its own design spec before implementation.

These are deliberately kept out of Phases 0–6: the roadmap is a *structural* refactor that changes
no behaviour, while everything below is new behaviour. Mixing them would destroy the
golden-master signal that makes the refactor safe.

| Gap | Size | Priority | Notes |
|---|---|---|---|
| Trial Balance / P&L / Balance Sheet | L | **P0** | No financial statements exist today ([F7](00-findings.md#f7--no-financial-statements)) |
| Period close & year-end closing entry | M | **P0** | `FiscalPeriod.status` exists; no retained-earnings rollover |
| Credit notes / sales & purchase returns | L | P1 | Only full cancellation exists |
| Tax rate master | M | P1 | Tax is free-form amounts on invoice lines |
| Bank accounts + reconciliation | L | P1 | Only `Cashbox` exists |
| SO/PO lifecycle (quote → order → invoice) | XL | P2 | |
| Cost centers / dimensions | L | P2 | Required for segment reporting |
| FX revaluation | M | P2 | `exchangeRate` locked at posting, never revalued |
| Batch / lot / serial + expiry | L | P2 | |
| Price lists / discount policies | M | P3 | |
| Approval workflows | L | P3 | Pairs naturally with [Phase 6](phase-6-authz.md) |
| Landed costs | M | P3 | |

---

## Sequencing note

The two **P0** items are the ones a real accounting user will notice first — a ledger you cannot
produce a trial balance from is not yet usable for its primary purpose. They are also the natural
first consumers of the Phase 1 posting port, since both read `JournalLine` rather than the
denormalized balance caches.

Recommended: start the Trial Balance spec once [Phase 1](phase-1-gl-posting-port.md) lands, so it
is written against the clean posting boundary rather than the current one.

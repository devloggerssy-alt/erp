# ERP Gap Register

**Status:** Post-roadmap — each item needs its own spec before implementation  
**Index:** [README](README.md)

Not part of Phases 2–10. Do not mix into structural phases — keeps reconciliation signals clear.

---

## Absorbed into roadmap

| Former gap | Phase |
|------------|-------|
| Bank accounts (entity) | 2 |
| Business setup / onboarding orchestration | 6, 10 |
| Cache vs ledger reconciliation | 3, 7 |
| Audit trail | 7 |

---

## Remaining gaps

| Gap | Size | Priority |
|-----|------|----------|
| Trial Balance / P&L / Balance Sheet | L | **P0** |
| Period close & year-end closing entry | M | **P0** |
| Credit notes / returns | L | P1 |
| Tax rate master | M | P1 |
| Bank statement import & matching | M | P1 |
| SO/PO lifecycle | XL | P2 |
| Cost centers / dimensions | L | P2 |
| FX revaluation | M | P2 |
| Batch / lot / serial | L | P2 |
| Price lists / discounts | M | P3 |
| Approval workflows | L | P3 |
| Landed costs | M | P3 |

**Next spec after Phase 3:** financial statements (reads dimensional `JournalLine`).

# Open Issues

**Index:** [README](README.md)

Issues still unresolved in the codebase. Each maps to a roadmap phase.

## Decisions

- **Q4 — AuditLog retention (Phase 7, decided 2026-09-17):** retain indefinitely; no purge job in Phase 7. A future purge must never delete `source = 'GL'` rows and must issue an explicit `DELETE` (the Phase 7 trigger blocks only `UPDATE`). See the Phase 7 plan.

---

## Accounting & subledger (P0)

| Issue | Evidence | Phase |
|-------|----------|-------|
| `Cashbox.linkedAccountId` implies dedicated GL per cashbox — conflicts with ADR-1 | `cashbox.prisma`, `PaymentsService` requires it | **2** |
| No `cashboxId` / `bankAccountId` on `JournalLine` | `accounting.prisma` — only `partyId` | **2** |
| No `BankAccount` entity | Cashbox used for all money | **2** |
| Opening balances: `exchangeRate: 1` only; no cashbox/party dimensions | `OpeningBalancesService` | **2**, **3** |
| `Party.openingBalance` stored but never posted | `party.prisma`, `PartiesService` | **3** |
| Item create opening stock skips GL | `ItemsService.create()` → `postMovement` only | **3** |
| Cashbox.balance not reconciled to Cash GL subledger | `BalanceDriftService` checks payments only | **3**, **7** |
| No currency-specific party statements | Single scalar `openingBalance` | **3** |

---

## Business Setup (P1)

| Issue | Evidence | Phase |
|-------|----------|-------|
| Linear onboarding wizard; no SetupTask engine | `OnboardingService`, 6-step UI | **6**, **10** |
| Onboarding bypasses domain services (direct Prisma) | `bootstrapChartOfAccounts`, `cashbox.createMany` | **6** |
| `onboardingCompletedAt` = financially ready (false) | No readiness model | **6**, **10** |
| Hardcoded SYP+USD | `CurrenciesStep`, onboarding service | **6** |
| No import pipeline for existing businesses | — | **10** |
| No ADR-7 CoA inspect/map/apply flow | Template bootstrap only | **6** |

---

## Type safety (P1)

| Issue | Evidence | Phase |
|-------|----------|-------|
| ~50 untyped `2xx` OpenAPI responses | F9 measurement in committed types | **4** |
| `crud-client.ts` uses `as never` / `as any` | api-client | **4** |
| Dashboard casts in expenses, payments, etc. | Symptom of missing response DTOs | **4** |
| OpenAPI artifact drift (committed vs source) | F9 process note | **4** |

---

## Domain coupling (P2)

| Issue | Evidence | Phase |
|-------|----------|-------|
| Invoice/stock-count call `InventoryService.postMovementTx` directly | No movement facade | **5** |
| Deletion semantics inconsistent; only CoA has soft delete | F8 | **5** |
| Cross-domain internal imports not lint-gated globally | Accounting boundary only | **5** |
| Oversized services post-extraction | invoices, payments, onboarding | **5** |

---

## Audit & observability (P2)

| Issue | Evidence | Phase |
|-------|----------|-------|
| ~~`AuditLog` never written on mutations~~ — resolved Phase 7 (interceptor + GL hooks) | F5 | ✅ **7** |
| ~~Reconciliation incomplete (no AR/AP/cash GL subledger checks)~~ — resolved Phase 7 (9-check stack) | `BalanceDriftService` | ✅ **7** |
| ~~No scheduled drift job~~ — resolved Phase 7 (daily `ReconciliationScheduler`) | Manual endpoint only | ✅ **7** |
| `console.log` in API/client | F8 | **4** |

---

## AuthZ (P0 — production gate)

| Issue | Evidence | Phase |
|-------|----------|-------|
| Any authenticated user can post/cancel/reverse JEs | F6 — only `JwtAuthGuard` | **9** |
| No permission catalog or `@RequirePermission()` | Schema has Role, not Permission | **9** |

---

## Modularity (P3)

| Issue | Evidence | Phase |
|-------|----------|-------|
| ~~`EventEmitter2` CRUD events have zero consumers~~ — resolved Phase 8 (consumer: `CrudEventsListener`) | F3 | ✅ **8** |
| ~~No capability manifest or module isolation tests~~ — resolved Phase 8 (`src/domain/manifest.ts`, `lint:manifest`, isolation harness) | — | ✅ **8** |
| ~~No outbox seam for future async GL~~ — resolved Phase 8 (dual-write, `OUTBOX_ENABLED`, default off) | — | ✅ **8** |

---

## Post-roadmap (gap register)

Trial balance / P&L / balance sheet, period close, credit notes, FX revaluation, etc. → [`gap-register.md`](gap-register.md).

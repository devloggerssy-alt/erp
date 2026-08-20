# Phase 6 — Business Setup Orchestration

**Status:** ⬜ not started  
**Priority:** 🟠 P1  
**Depends on:** [Phase 2](phase-02-subledger-accounting-foundation.md), [Phase 3](phase-03-opening-balances-subledger-services.md), [Phase 5](phase-05-domain-coupling.md) (partial — boundary lint)  
**Blocks:** [Phase 10](phase-10-business-setup-ui-import-readiness.md)  
**Principles:** [00-accounting-principles.md](00-accounting-principles.md) — setup must orchestrate domain services  
**Index:** [README](README.md)

> **Merged from:** Business Setup design + old Phase 3.2 onboarding saga.

---

## Goal

Replace linear onboarding bootstrap with `SetupTask` dependency engine. Slim onboarding to baseline only. Handlers delegate to domain services — **no raw Prisma** for business entities.

---

## Success criteria

- [ ] `setup_tasks` table + task state machine
- [ ] Discovery inspects tenant and classifies EMPTY | PARTIAL | EXISTING
- [ ] Plan generator produces dependency-aware task graph
- [ ] Onboarding no longer calls `prisma.cashbox.createMany` / direct CoA bootstrap
- [ ] Handlers idempotent (run twice ≠ duplicate entities)

---

## Tasks

### 6.1 — Persistence

- [ ] 6.1.1 `setup_tasks` model: type, status, required, dependencies, progress, metadata
- [ ] 6.1.2 Tenant fields: `businessSetupProfile`, `businessSetupCompletedAt`, `operationalReadiness`
- [ ] 6.1.3 Migrate `onboarding_step` → initial task rows for existing tenants
- [ ] 6.1.4 Keep `onboardingCompletedAt` for baseline gate

### 6.2 — Core services

- [ ] 6.2.1 `BusinessSetupDiscoveryService.inspect(tenantId)`
- [ ] 6.2.2 `BusinessSetupPlanService.generate(profile, inspection)`
- [ ] 6.2.3 `BusinessSetupTaskService` — READY / BLOCKED / COMPLETED resolution
- [ ] 6.2.4 `BusinessSetupOrchestratorService` — routes task execution to handlers

### 6.3 — Task handlers (delegate to domain)

| Handler | Delegates to |
|---------|--------------|
| `CURRENCIES` | Currency service; ADR-6 configurable list |
| `CHART_OF_ACCOUNTS` | ADR-7 inspect/map/apply OR bootstrap via `AccountsService` |
| `FINANCIAL_MAPPINGS` | `FinancialSettingsService.upsert` |
| `CASHBOXES` | `CashboxesService` — no GL link (Phase 2 model) |
| `BANK_ACCOUNTS` | `BankAccountsService` |
| `OPENING_*` | Phase 3 opening services |
| `FISCAL_PERIOD`, `DOCUMENT_SEQUENCES` | Existing domain services |

### 6.4 — Onboarding refactor

- [ ] 6.4.1 Remove `bootstrapChartOfAccounts` direct Prisma loop → handler or `AccountsService`
- [ ] 6.4.2 Remove currencies step direct creates → setup tasks post-baseline
- [ ] 6.4.3 Add business profile step (modules: inventory, sales, purchasing, accounting)
- [ ] 6.4.4 Fix resume bugs: `initialStep` cap, server-persist `codeToId` equivalent
- [ ] 6.4.5 `complete()` → `onboardingCompletedAt` only; redirect to `/setup`

### 6.5 — API

- [ ] 6.5.1 `GET /business-setup/state`, `/plan`
- [ ] 6.5.2 `POST /business-setup/profile`
- [ ] 6.5.3 `PATCH /business-setup/tasks/:type`
- [ ] 6.5.4 api-contracts + api-client resources

### 6.6 — Migration cohorts

- [ ] 6.6.1 Mid-onboarding tenants → task mapping + cashbox remediation
- [ ] 6.6.2 Completed empty → EMPTY profile, baseline COMPLETED
- [ ] 6.6.3 Completed partial → EXISTING discovery

---

## SetupTask types (authoritative)

`CURRENCIES`, `FISCAL_PERIOD`, `CHART_OF_ACCOUNTS`, `FINANCIAL_MAPPINGS`, `DOCUMENT_SEQUENCES`, `CASHBOXES`, `BANK_ACCOUNTS`, `WAREHOUSES`, `PRODUCTS`, `CUSTOMERS`, `SUPPLIERS`, `OPENING_CASH_BALANCES`, `OPENING_BANK_BALANCES`, `OPENING_RECEIVABLES`, `OPENING_PAYABLES`, `OPENING_INVENTORY`, `RECONCILIATION`

See dependency graph in [README](README.md) and [00-accounting-principles.md](00-accounting-principles.md).

---

## Verification

```bash
pnpm turbo run build --filter=@devloggers/api
# Integration: new tenant → onboarding → setup plan with correct BLOCKED/READY tasks
grep -r "prisma.cashbox.create" apps/api/src/modules/identity/onboarding  # expect empty
```

## Done when

- [ ] No direct Prisma business mutations in `OnboardingService`
- [ ] SetupTask dependency tests pass for OPENING_CASH blocked without CASHBOXES

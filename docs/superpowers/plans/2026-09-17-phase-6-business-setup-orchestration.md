# Phase 6 — Business Setup Orchestration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace onboarding's linear, raw-Prisma bootstrap with a `SetupTask` dependency engine (`apps/api/src/modules/identity/business-setup/`) whose handlers delegate to existing domain services (Currencies, Accounts, FinancialSettings, Cashboxes, BankAccounts, FiscalPeriods, DocumentSequences, opening-balance subledger services, Reconciliation). Slim `OnboardingService` to baseline only (company, first fiscal period, minimal chart of accounts + currencies, business profile) and remove every raw `prisma.<businessEntity>.create*` call from it.

**Architecture:** A new `identity/business-setup` module owns four services — `BusinessSetupDiscoveryService` (inspects existing data), `BusinessSetupPlanService` (turns a declared module profile + inspection into a task graph), `BusinessSetupTaskService` (persists `SetupTask` rows and resolves BLOCKED/READY/COMPLETED/SKIPPED), and `BusinessSetupOrchestratorService` (executes a READY task by dispatching to a per-type `SetupTaskHandler`, wrapped in `RequestContext.run({source:'BUSINESS_SETUP', metadata:{taskType}})` so `AuditWriter` calls inside handlers are attributed automatically). Handlers for `WAREHOUSES`, `PRODUCTS`, `CUSTOMERS`, `SUPPLIERS`, `OPENING_INVENTORY` do not exist — those task types are **discovery-only** (the user creates the underlying entities via their normal CRUD pages; `GET /business-setup/state` re-derives COMPLETED from discovery on every read for these five types, no handler needed) — the 6.3 delegation table in the spec lists a handler for every OTHER type, and this plan implements exactly those twelve.

**Tech Stack:** NestJS 4-layer conventions where they fit (this module doesn't expose a CRUD `/setup-tasks` resource, so no public `SetupTasksController`/DTOs for that model — `SetupTask` rows are only reachable through `business-setup`'s own four routes), Prisma, class-validator/class-transformer for polymorphic per-task-type payload validation, Jest with the codebase's plain-constructor-injection test style (no `Test.createTestingModule`).

## Global Constraints

- **No raw Prisma for business entities in `OnboardingService`** — every remaining onboarding step must go through an existing domain service. `grep -r "prisma.cashbox.create\|prisma.currency.create\|prisma.chartOfAccount.create\|prisma.warehouse\|prisma.unit.createMany" apps/api/src/modules/identity/onboarding` must return nothing after Task 25.
- **Handlers must be idempotent** — calling `execute()` twice on the same tenant must not create duplicate entities. Every batch-create handler checks existing codes/types via the domain service's own `list()` before calling `create()`.
- **ADR-6 (`docs/superpowers/specs/2026-08-20-erp-roadmap/00-accounting-principles.md`):** one base currency + zero or more enabled currencies — no hardcoded SYP/USD in setup code. The `CURRENCIES` task and the slimmed onboarding `stepCurrencies` both take a caller-supplied currency list.
- **Domain boundaries are lint-enforced** (`apps/api/eslint/domain-boundaries.mjs`, proven by `pnpm --filter @devloggers/api lint:architecture`). `identity/business-setup` needs new edges into `accounting/currencies`, `accounting/opening-balances`, `accounting/reconciliation`, and `invoicing` (for `CashboxesService`/`BankAccountsService`) — Task 2 adds them.
- **Swagger decorators are mandatory** on every new DTO field (`.ai/rules/api.md`) — `type`/`enum`/`nullable` must be explicit or `pnpm generate` produces wrong types.
- **`pnpm generate` must run** after the controller/DTOs exist (Task 22) and again is verified before writing `packages/api-contracts/src/resources/business-setup.resource.ts` (Task 23) — that resource's `routes` type only compiles once the generated `paths` type includes `/business-setup/*`.
- **Known environment issue:** a prior session (`tenant-settings-deferred-migration` memory) hit a shared-dev-DB Postgres advisory lock that blocked `db:migrate:dev`. If Task 1's migration hits the same lock, do not force it — apply the same deferred pattern (commit the generated migration SQL, note it as pending apply, continue the plan; the migration is additive-only — new table + nullable columns — so later tasks that only reference the new Prisma Client types still compile and unit-test correctly against a mocked repository even before the migration is physically applied to the shared dev DB).
- **Verify per task:** `pnpm --filter @devloggers/api test -- <spec-file-pattern>` for the file(s) touched; full gate before declaring the plan done: `pnpm --filter @devloggers/api lint:architecture && pnpm --filter @devloggers/api test && pnpm turbo run build --filter=@devloggers/api && pnpm turbo run build --filter=@devloggers/dashboard`.

---

## File map

```
packages/db-prisma/src/schema/setup-task.prisma                                          [new]
packages/db-prisma/src/schema/tenant.prisma                                              [modify]

apps/api/eslint/domain-boundaries.mjs                                                    [modify]
apps/api/src/modules/invoicing/index.ts                                                  [modify]
apps/api/scripts/check-architecture-rules.mjs                                            [modify]

apps/api/src/modules/accounting/accounts/dto/account.dto.ts                              [modify]
apps/api/src/modules/accounting/accounts/bootstrap/chart-of-accounts-template.ts         [new]
apps/api/src/modules/accounting/accounts/bootstrap/chart-of-accounts-bootstrap.service.ts [new]
apps/api/src/modules/accounting/accounts/bootstrap/chart-of-accounts-bootstrap.service.spec.ts [new]
apps/api/src/modules/accounting/accounts/bootstrap/chart-of-accounts-bootstrap.module.ts [new]
apps/api/src/modules/accounting/accounts/accounts.module.ts                              [modify]

apps/api/src/modules/identity/business-setup/constants/setup-task-graph.ts               [new]
apps/api/src/modules/identity/business-setup/constants/setup-task-graph.spec.ts          [new]
apps/api/src/modules/identity/business-setup/repositories/setup-tasks.repository.ts      [new]
apps/api/src/modules/identity/business-setup/services/business-setup-discovery.service.ts [new]
apps/api/src/modules/identity/business-setup/services/business-setup-discovery.service.spec.ts [new]
apps/api/src/modules/identity/business-setup/services/business-setup-plan.service.ts     [new]
apps/api/src/modules/identity/business-setup/services/business-setup-plan.service.spec.ts [new]
apps/api/src/modules/identity/business-setup/services/business-setup-task.service.ts     [new]
apps/api/src/modules/identity/business-setup/services/business-setup-task.service.spec.ts [new]
apps/api/src/modules/identity/business-setup/handlers/setup-task-handler.interface.ts    [new]
apps/api/src/modules/identity/business-setup/utils/validate-payload.util.ts              [new]
apps/api/src/modules/identity/business-setup/utils/validate-payload.util.spec.ts         [new]
apps/api/src/modules/identity/business-setup/services/business-setup-orchestrator.service.ts [new]
apps/api/src/modules/identity/business-setup/services/business-setup-orchestrator.service.spec.ts [new]

apps/api/src/modules/identity/business-setup/handlers/currencies.handler.ts (+ .spec)     [new]
apps/api/src/modules/identity/business-setup/handlers/chart-of-accounts.handler.ts (+ .spec) [new]
apps/api/src/modules/identity/business-setup/handlers/financial-mappings.handler.ts (+ .spec) [new]
apps/api/src/modules/identity/business-setup/handlers/cashboxes.handler.ts (+ .spec)       [new]
apps/api/src/modules/identity/business-setup/handlers/bank-accounts.handler.ts (+ .spec)   [new]
apps/api/src/modules/identity/business-setup/handlers/fiscal-period.handler.ts (+ .spec)   [new]
apps/api/src/modules/identity/business-setup/handlers/document-sequences.handler.ts (+ .spec) [new]
apps/api/src/modules/identity/business-setup/handlers/opening-cash-balances.handler.ts (+ .spec) [new]
apps/api/src/modules/identity/business-setup/handlers/opening-bank-balances.handler.ts (+ .spec) [new]
apps/api/src/modules/identity/business-setup/handlers/opening-receivables.handler.ts (+ .spec) [new]
apps/api/src/modules/identity/business-setup/handlers/opening-payables.handler.ts (+ .spec) [new]
apps/api/src/modules/identity/business-setup/handlers/reconciliation.handler.ts (+ .spec)  [new]
apps/api/src/modules/identity/business-setup/handlers/index.ts                            [new]

apps/api/src/modules/identity/business-setup/dto/business-setup-profile.dto.ts           [new]
apps/api/src/modules/identity/business-setup/dto/setup-task-response.dto.ts              [new]
apps/api/src/modules/identity/business-setup/dto/business-setup-state-response.dto.ts    [new]
apps/api/src/modules/identity/business-setup/dto/execute-setup-task.dto.ts               [new]
apps/api/src/modules/identity/business-setup/dto/index.ts                                [new]
apps/api/src/modules/identity/business-setup/presenters/setup-task.presenter.ts          [new]
apps/api/src/modules/identity/business-setup/controllers/business-setup.controller.ts    [new]
apps/api/src/modules/identity/business-setup/business-setup.module.ts                    [new]
apps/api/src/app.module.ts                                                                [modify]

packages/api-contracts/src/dto/business-setup.dto.ts                                     [new]
packages/api-contracts/src/dto/index.ts                                                  [modify]
packages/api-contracts/src/resources/business-setup.resource.ts                          [new]
packages/api-contracts/src/resources/index.ts                                            [modify]

packages/api-client/src/clients/business-setup.client.ts                                 [new]
packages/api-client/src/clients/index.ts                                                 [modify]
packages/api-client/src/api.ts                                                           [modify]

apps/api/src/modules/identity/onboarding/services/onboarding.service.ts                  [modify]
apps/api/src/modules/identity/onboarding/dto/onboarding.dto.ts                           [modify]
apps/api/src/modules/identity/onboarding/controllers/onboarding.controller.ts            [modify]
apps/api/src/modules/identity/onboarding/onboarding.module.ts                            [modify]

apps/dashboard/app/[locale]/(setup)/onboarding/page.tsx                                  [modify]
apps/dashboard/modules/onboarding/onboarding-wizard.tsx                                  [modify]
apps/dashboard/modules/onboarding/components/currencies-step.tsx                         [modify]
apps/dashboard/modules/onboarding/components/business-profile-step.tsx                   [new]
apps/dashboard/modules/onboarding/onboarding.config.ts                                   [modify]

apps/dashboard/modules/business-setup/business-setup-summary.tsx                         [new]
apps/dashboard/app/[locale]/(authenticated)/setup/page.tsx                               [new]

packages/db-prisma/src/seed/backfill-business-setup-tasks.ts                             [new]
packages/db-prisma/package.json                                                          [modify]
```

---

## Task 1: Prisma schema — `SetupTask` model + `Tenant` business-setup fields

**Files:**
- Create: `packages/db-prisma/src/schema/setup-task.prisma`
- Modify: `packages/db-prisma/src/schema/tenant.prisma`

**Interfaces:**
- Produces: Prisma Client types `SetupTask`, `SetupTaskType` (17-member enum), `SetupTaskStatus` (4-member enum), and `Tenant.businessSetupProfile: Prisma.JsonValue | null`, `Tenant.businessSetupCompletedAt: Date | null`, `Tenant.operationalReadiness: Prisma.JsonValue | null` — every later task in this plan imports `SetupTaskType`/`SetupTaskStatus` from `@devloggers/db-prisma`.

- [ ] **Step 1: Create the SetupTask schema file**

```prisma
// packages/db-prisma/src/schema/setup-task.prisma

enum SetupTaskType {
    CURRENCIES
    FISCAL_PERIOD
    CHART_OF_ACCOUNTS
    FINANCIAL_MAPPINGS
    DOCUMENT_SEQUENCES
    CASHBOXES
    BANK_ACCOUNTS
    WAREHOUSES
    PRODUCTS
    CUSTOMERS
    SUPPLIERS
    OPENING_CASH_BALANCES
    OPENING_BANK_BALANCES
    OPENING_RECEIVABLES
    OPENING_PAYABLES
    OPENING_INVENTORY
    RECONCILIATION
}

enum SetupTaskStatus {
    BLOCKED
    READY
    COMPLETED
    SKIPPED
}

// ─── SetupTask ──────────────────────────────────────────────────────────────
// One row per (tenant, task type). Drives the Business Setup dependency engine
// (docs/superpowers/specs/2026-08-20-erp-roadmap/phase-06-business-setup-orchestration.md).
model SetupTask {
    id           String           @id @default(uuid())
    tenantId     String           @map("tenant_id")
    tenant       Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
    type         SetupTaskType
    status       SetupTaskStatus  @default(BLOCKED)
    required     Boolean          @default(true)
    dependencies SetupTaskType[]
    progress     Json?            @db.JsonB
    metadata     Json?            @db.JsonB
    completedAt  DateTime?        @map("completed_at")
    createdAt    DateTime         @default(now()) @map("created_at")
    updatedAt    DateTime         @updatedAt @map("updated_at")

    @@unique([tenantId, type])
    @@index([tenantId, status])
    @@map("setup_tasks")
}
```

- [ ] **Step 2: Add the three business-setup fields + back-relation to `Tenant`**

Modify `packages/db-prisma/src/schema/tenant.prisma` — add three scalar fields after `onboardingCompletedAt` and one relation after `openingBalanceSessionLines`:

```prisma
    isActive              Boolean   @default(true) @map("is_active")
    onboardingStep        Int       @default(0) @map("onboarding_step")
    onboardingCompletedAt DateTime? @map("onboarding_completed_at")
    businessSetupProfile      Json?     @db.JsonB @map("business_setup_profile")
    businessSetupCompletedAt  DateTime? @map("business_setup_completed_at")
    operationalReadiness      Json?     @db.JsonB @map("operational_readiness")
    createdAt             DateTime  @default(now()) @map("created_at")
    updatedAt             DateTime  @updatedAt @map("updated_at")
```

and:

```prisma
    openingBalanceSessions     OpeningBalanceSession[]
    openingBalanceSessionLines OpeningBalanceSessionLine[]
    setupTasks                 SetupTask[]

    @@map("tenants")
```

- [ ] **Step 3: Generate + apply the migration**

Run: `pnpm --filter @devloggers/db-prisma db:migrate:dev --name add_setup_tasks`
Expected: `✔ Generated Prisma Client` and a new folder under `packages/db-prisma/src/schema/migrations/<timestamp>_add_setup_tasks/migration.sql` containing `CREATE TYPE "SetupTaskType"`, `CREATE TYPE "SetupTaskStatus"`, `CREATE TABLE "setup_tasks"`, and three `ALTER TABLE "tenants" ADD COLUMN` statements. If the shared dev DB advisory lock blocks this (see Global Constraints), the migration SQL is still generated on disk — commit it and proceed; later tasks compile against the regenerated Prisma Client either way.

- [ ] **Step 4: Verify the client exports the new types**

Run: `pnpm --filter @devloggers/db-prisma typecheck`
Expected: exits 0. Confirm with `grep -r "SetupTaskType" packages/db-prisma/generated/client/index.d.ts | head -1` — expect a match.

- [ ] **Step 5: Commit**

```bash
git add packages/db-prisma/src/schema/setup-task.prisma packages/db-prisma/src/schema/tenant.prisma packages/db-prisma/src/schema/migrations
git commit -m "feat(db): add SetupTask model and Tenant business-setup fields (Phase 6.1)"
```

---

## Task 2: Domain-boundary edges for `identity/business-setup`

**Files:**
- Modify: `apps/api/eslint/domain-boundaries.mjs`
- Modify: `apps/api/src/modules/invoicing/index.ts`
- Modify: `apps/api/scripts/check-architecture-rules.mjs`
- Modify: `.ai/rules/api.md` (dependency-graph table + entry-point table — documentation, keep in sync)

**Interfaces:**
- Produces: `identity` domain files may import `../../accounting/currencies`, `../../accounting/opening-balances`, `../../accounting/reconciliation` (fully, mirroring the existing `fiscal-periods`/`document-sequences`/`financial-settings` treatment — these are not "GL-policy internal" like `accounts/services`), and `../../invoicing` (barrel only, now exporting `CashboxesModule`, `CashboxesService`, `BankAccountsModule`, `BankAccountsService` in addition to `computeInvoicePaidState`).

- [ ] **Step 1: Open the three new accounting sub-paths**

In `apps/api/eslint/domain-boundaries.mjs`, add three negation pairs to the `accounting.group` array, right after the `fiscal-periods` negation and before the `accounts` negation:

```js
    accounting: {
        group: [
            '**/accounting/*',
            '**/accounting/*/**',
            '!**/accounting/posting',
            '!**/accounting/posting/**',
            '!**/accounting/document-sequences',
            '!**/accounting/document-sequences/**',
            '!**/accounting/financial-settings',
            '!**/accounting/financial-settings/**',
            '!**/accounting/fiscal-periods',
            '!**/accounting/fiscal-periods/**',
            '!**/accounting/currencies',
            '!**/accounting/currencies/**',
            '!**/accounting/opening-balances',
            '!**/accounting/opening-balances/**',
            '!**/accounting/reconciliation',
            '!**/accounting/reconciliation/**',
            '!**/accounting/accounts',
            '!**/accounting/accounts/**',
            '**/accounting/accounts/accounts.module',
            '**/accounting/accounts/services',
            '**/accounting/accounts/services/**',
            '**/accounting/accounts/repositories',
            '**/accounting/accounts/repositories/**',
            '**/accounting/accounts/presenters',
            '**/accounting/accounts/presenters/**',
            '**/accounting/accounts/controllers',
            '**/accounting/accounts/controllers/**',
            '**/accounting/accounts/dto',
            '**/accounting/accounts/dto/**',
            '**/accounting/accounts/events',
            '**/accounting/accounts/events/**',
        ],
        message:
            'Import GL account-resolution / journal-posting internals only via the ' +
            'accounting/posting barrel (AccountingPostingFacade + PostingIntent types), or ' +
            'accounting/accounts/utils / accounting/accounts/bootstrap for narrow non-GL helpers. ' +
            'accounting/accounts/services (JournalPostingService, AccountsService, ...) is GL-internal as of Phase 1. ' +
            'currencies, opening-balances, reconciliation, document-sequences, financial-settings and ' +
            'fiscal-periods are plain feature modules, not GL-policy internals, and are fully open (Phase 6).',
    },
```

(`accounts/bootstrap` and `accounts/utils` are not in the re-ban list added in Task 3 / already present, so they stay open automatically — no separate negation needed for them.)

- [ ] **Step 2: Open the invoicing barrel for cashboxes/bank-accounts**

Modify `apps/api/src/modules/invoicing/index.ts`:

```typescript
/**
 * Public API of the invoicing domain. Other domains import from
 * 'modules/invoicing' only (Phase 5.2). Files inside invoicing must not
 * import this barrel.
 */
export { computeInvoicePaidState } from './invoices/presenters/invoice.presenter';
export { CashboxesModule } from './cashboxes/cashboxes.module';
export { CashboxesService } from './cashboxes/services/cashboxes.service';
export { CreateCashboxDto } from './cashboxes/dto';
export { BankAccountsModule } from './bank-accounts/bank-accounts.module';
export { BankAccountsService } from './bank-accounts/services/bank-accounts.service';
export { CreateBankAccountDto } from './bank-accounts/dto';
```

Update the `invoicing` restriction message in `domain-boundaries.mjs`:

```js
    invoicing: barrelOnly('invoicing', 'computeInvoicePaidState, CashboxesModule/Service, BankAccountsModule/Service, CreateCashboxDto, CreateBankAccountDto'),
```

- [ ] **Step 3: Add architecture probe cases**

In `apps/api/scripts/check-architecture-rules.mjs`, add a new file constant near the existing `ONBOARDING` constant and six new cases to the `CASES` array (after the existing onboarding cases, before the "A domain may deep-import itself" comment):

```js
const BUSINESS_SETUP_ORCHESTRATOR = 'src/modules/identity/business-setup/services/business-setup-orchestrator.service.ts';
```

```js
    importCase(BUSINESS_SETUP_ORCHESTRATOR, '../../../accounting/currencies', 'clean'),
    importCase(BUSINESS_SETUP_ORCHESTRATOR, '../../../accounting/opening-balances', 'clean'),
    importCase(BUSINESS_SETUP_ORCHESTRATOR, '../../../accounting/reconciliation', 'clean'),
    importCase(BUSINESS_SETUP_ORCHESTRATOR, '../../../invoicing', 'clean'),
    importCase(BUSINESS_SETUP_ORCHESTRATOR, '../../../invoicing/cashboxes/services/cashboxes.service', 'error'),
    importCase(BUSINESS_SETUP_ORCHESTRATOR, '@/modules/accounting/accounts/services/accounts.service', 'error'),
```

- [ ] **Step 4: Verify**

Run: `pnpm --filter @devloggers/api lint:architecture`
Expected: `All <N> architecture-rule cases passed.` where `<N>` is the previous count + 6.

- [ ] **Step 5: Update `.ai/rules/api.md` dependency-graph table (documentation)**

Add a row and edge to the existing tables in `.ai/rules/api.md` § Domain boundaries:

```
| `accounting` | `accounting/posting`, `accounting/document-sequences`, `accounting/financial-settings`, `accounting/fiscal-periods`, `accounting/currencies`, `accounting/opening-balances`, `accounting/reconciliation`, `accounting/accounts/utils`, `accounting/accounts/bootstrap` | ... |
```

and add `identity ───► invoicing (CashboxesModule/Service, BankAccountsModule/Service)   # business-setup` to the allowed dependency graph diagram.

- [ ] **Step 6: Commit**

```bash
git add apps/api/eslint/domain-boundaries.mjs apps/api/src/modules/invoicing/index.ts apps/api/scripts/check-architecture-rules.mjs .ai/rules/api.md
git commit -m "chore(api): open domain-boundary edges for business-setup orchestration (Phase 6)"
```

---

## Task 3: Chart-of-accounts bootstrap facade (extracted from onboarding)

**Files:**
- Modify: `apps/api/src/modules/accounting/accounts/dto/account.dto.ts`
- Create: `apps/api/src/modules/accounting/accounts/bootstrap/chart-of-accounts-template.ts`
- Create: `apps/api/src/modules/accounting/accounts/bootstrap/chart-of-accounts-bootstrap.service.ts`
- Create: `apps/api/src/modules/accounting/accounts/bootstrap/chart-of-accounts-bootstrap.service.spec.ts`
- Create: `apps/api/src/modules/accounting/accounts/bootstrap/chart-of-accounts-bootstrap.module.ts`

**Interfaces:**
- Consumes: `AccountsService.list(tenantId, options)` → `{data: ChartOfAccountResponseDto[], total}`, `AccountsService.create(tenantId, dto)` → `ChartOfAccountResponseDto` (both from `CrudService`, `packages/backend-core/src/base/crud-service.ts`).
- Produces: `ChartOfAccountsBootstrapService.bootstrapDefaultTemplate(tenantId: string): Promise<Record<string, string>>` (code → id map) — consumed by Task 11's `ChartOfAccountsTaskHandler` and by Task 25's slimmed `OnboardingService.stepChartOfAccounts`.

- [ ] **Step 1: Add `isPostable`/`isContra` to `CreateChartOfAccountDto`**

In `apps/api/src/modules/accounting/accounts/dto/account.dto.ts`, add two optional fields to `CreateChartOfAccountDto` (after `parentId`):

```typescript
    @ApiPropertyOptional({ example: false, description: 'Set false for group/summary accounts that only aggregate children; defaults to true (postable leaf account)' })
    @IsOptional()
    @IsBoolean()
    isPostable?: boolean;

    @ApiPropertyOptional({ example: false, description: 'True for contra accounts (e.g. accumulated depreciation) that reduce their parent balance' })
    @IsOptional()
    @IsBoolean()
    isContra?: boolean;
```

No change needed in `AccountsService` — `CrudService.create()` already spreads the full DTO into `repository.create({ tenantId, ...dto })`, so these two fields flow through automatically once present on the DTO class.

- [ ] **Step 2: Extract the CoA template verbatim from `OnboardingService`**

```typescript
// apps/api/src/modules/accounting/accounts/bootstrap/chart-of-accounts-template.ts
import { AccountType } from '@devloggers/db-prisma';

export interface ChartOfAccountTemplateEntry {
    code: string;
    nameAr: string;
    nameEn: string;
    type: AccountType;
    parentCode?: string;
}

export const CHART_OF_ACCOUNTS_TEMPLATE: ChartOfAccountTemplateEntry[] = [
    // Level 1
    { code: '1000', nameAr: 'الأصول', nameEn: 'Assets', type: AccountType.ASSET },
    { code: '2000', nameAr: 'الالتزامات', nameEn: 'Liabilities', type: AccountType.LIABILITY },
    { code: '3000', nameAr: 'حقوق الملكية', nameEn: 'Equity', type: AccountType.EQUITY },
    { code: '4000', nameAr: 'الإيرادات', nameEn: 'Revenue', type: AccountType.REVENUE },
    { code: '5000', nameAr: 'تكلفة المبيعات', nameEn: 'Cost of Sales', type: AccountType.EXPENSE },
    { code: '6000', nameAr: 'المصروفات', nameEn: 'Expenses', type: AccountType.EXPENSE },
    // Level 2
    { code: '1100', nameAr: 'الأصول المتداولة', nameEn: 'Current Assets', type: AccountType.ASSET, parentCode: '1000' },
    { code: '1200', nameAr: 'الأصول غير المتداولة', nameEn: 'Non-Current Assets', type: AccountType.ASSET, parentCode: '1000' },
    { code: '2100', nameAr: 'الالتزامات المتداولة', nameEn: 'Current Liabilities', type: AccountType.LIABILITY, parentCode: '2000' },
    { code: '2200', nameAr: 'الالتزامات غير المتداولة', nameEn: 'Non-Current Liabilities', type: AccountType.LIABILITY, parentCode: '2000' },
    { code: '6100', nameAr: 'المصروفات التشغيلية', nameEn: 'Operating Expenses', type: AccountType.EXPENSE, parentCode: '6000' },
    { code: '6200', nameAr: 'المصروفات الإدارية', nameEn: 'Administrative Expenses', type: AccountType.EXPENSE, parentCode: '6000' },
    // Level 3 — Current Assets
    { code: '1110', nameAr: 'النقد وما في حكمه', nameEn: 'Cash and Cash Equivalents', type: AccountType.ASSET, parentCode: '1100' },
    { code: '1120', nameAr: 'ذمم مدينة', nameEn: 'Accounts Receivable', type: AccountType.ASSET, parentCode: '1100' },
    { code: '1130', nameAr: 'المخزون', nameEn: 'Inventory', type: AccountType.ASSET, parentCode: '1100' },
    { code: '1140', nameAr: 'مصروفات مدفوعة مقدماً', nameEn: 'Prepaid Expenses', type: AccountType.ASSET, parentCode: '1100' },
    { code: '1150', nameAr: 'البنوك', nameEn: 'Bank Accounts', type: AccountType.ASSET, parentCode: '1100' },
    // Level 3 — Non-Current Assets
    { code: '1210', nameAr: 'الأصول الثابتة', nameEn: 'Fixed Assets', type: AccountType.ASSET, parentCode: '1200' },
    { code: '1220', nameAr: 'مجمع الإهلاك', nameEn: 'Accumulated Depreciation', type: AccountType.ASSET, parentCode: '1200' },
    // Level 3 — Current Liabilities
    { code: '2110', nameAr: 'ذمم دائنة', nameEn: 'Accounts Payable', type: AccountType.LIABILITY, parentCode: '2100' },
    { code: '2120', nameAr: 'مصروفات مستحقة', nameEn: 'Accrued Expenses', type: AccountType.LIABILITY, parentCode: '2100' },
    { code: '2130', nameAr: 'قروض قصيرة الأجل', nameEn: 'Short-term Loans', type: AccountType.LIABILITY, parentCode: '2100' },
    { code: '2140', nameAr: 'ضريبة القيمة المضافة', nameEn: 'VAT Payable', type: AccountType.LIABILITY, parentCode: '2100' },
    // Level 3 — Non-Current Liabilities
    { code: '2210', nameAr: 'قروض طويلة الأجل', nameEn: 'Long-term Loans', type: AccountType.LIABILITY, parentCode: '2200' },
    // Level 3 — Equity
    { code: '3100', nameAr: "حقوق صاحب العمل", nameEn: "Owner's Equity", type: AccountType.EQUITY, parentCode: '3000' },
    { code: '3200', nameAr: 'الأرباح المحتجزة', nameEn: 'Retained Earnings', type: AccountType.EQUITY, parentCode: '3000' },
    // Level 3 — Revenue
    { code: '4100', nameAr: 'إيرادات المبيعات', nameEn: 'Sales Revenue', type: AccountType.REVENUE, parentCode: '4000' },
    { code: '4200', nameAr: 'إيرادات أخرى', nameEn: 'Other Revenue', type: AccountType.REVENUE, parentCode: '4000' },
    // Level 3 — Cost of Sales
    { code: '5100', nameAr: 'تكلفة البضاعة المباعة', nameEn: 'Cost of Goods Sold', type: AccountType.EXPENSE, parentCode: '5000' },
    { code: '5210', nameAr: 'تسويات المخزون', nameEn: 'Inventory Adjustments', type: AccountType.EXPENSE, parentCode: '5000' },
    // Level 3 — Operating Expenses
    { code: '6110', nameAr: 'الرواتب والأجور', nameEn: 'Salaries and Wages', type: AccountType.EXPENSE, parentCode: '6100' },
    { code: '6120', nameAr: 'مصروف الإيجار', nameEn: 'Rent Expense', type: AccountType.EXPENSE, parentCode: '6100' },
    { code: '6130', nameAr: 'مصروف المرافق', nameEn: 'Utilities Expense', type: AccountType.EXPENSE, parentCode: '6100' },
    { code: '6140', nameAr: 'مصروف النقل', nameEn: 'Transportation Expense', type: AccountType.EXPENSE, parentCode: '6100' },
    // Level 3 — Administrative Expenses
    { code: '6210', nameAr: 'مستلزمات مكتبية', nameEn: 'Office Supplies', type: AccountType.EXPENSE, parentCode: '6200' },
    { code: '6220', nameAr: 'الصيانة والإصلاحات', nameEn: 'Maintenance and Repairs', type: AccountType.EXPENSE, parentCode: '6200' },
    { code: '6230', nameAr: 'مصروفات متنوعة', nameEn: 'Miscellaneous Expense', type: AccountType.EXPENSE, parentCode: '6200' },
];
```

- [ ] **Step 2: Write the failing test**

```typescript
// apps/api/src/modules/accounting/accounts/bootstrap/chart-of-accounts-bootstrap.service.spec.ts
import { ChartOfAccountsBootstrapService } from './chart-of-accounts-bootstrap.service';
import { CHART_OF_ACCOUNTS_TEMPLATE } from './chart-of-accounts-template';

function build() {
    const created: Array<{ code: string; parentId?: string; isPostable?: boolean; isContra?: boolean }> = [];
    const accountsService = {
        list: jest.fn().mockResolvedValue({ data: [], total: 0 }),
        create: jest.fn().mockImplementation((_tenantId: string, dto: Record<string, unknown>) => {
            const id = `id-${dto.code as string}`;
            created.push({ code: dto.code as string, parentId: dto.parentId as string | undefined, isPostable: dto.isPostable as boolean | undefined, isContra: dto.isContra as boolean | undefined });
            return Promise.resolve({ id, code: dto.code });
        }),
    };
    const service = new ChartOfAccountsBootstrapService(accountsService as never);
    return { service, accountsService, created };
}

describe('ChartOfAccountsBootstrapService', () => {
    it('creates every template account exactly once, wiring parentId from the code map', async () => {
        const { service, created } = build();
        const codeToId = await service.bootstrapDefaultTemplate('tenant-1');

        expect(created).toHaveLength(CHART_OF_ACCOUNTS_TEMPLATE.length);
        expect(Object.keys(codeToId)).toHaveLength(CHART_OF_ACCOUNTS_TEMPLATE.length);
        const child = created.find((c) => c.code === '1110');
        expect(child?.parentId).toBe(codeToId['1100']);
    });

    it('marks parent codes non-postable and leaf codes postable', async () => {
        const { service, created } = build();
        await service.bootstrapDefaultTemplate('tenant-1');

        const parent = created.find((c) => c.code === '1100');
        const leaf = created.find((c) => c.code === '1110');
        expect(parent?.isPostable).toBe(false);
        expect(leaf?.isPostable).toBe(true);
    });

    it('flags code 1220 (Accumulated Depreciation) as contra', async () => {
        const { service, created } = build();
        await service.bootstrapDefaultTemplate('tenant-1');

        expect(created.find((c) => c.code === '1220')?.isContra).toBe(true);
    });

    it('is idempotent — skips codes that already exist and still returns the full map', async () => {
        const { service, accountsService, created } = build();
        accountsService.list.mockResolvedValue({
            data: [{ id: 'existing-1000', code: '1000' }],
            total: 1,
        });

        const codeToId = await service.bootstrapDefaultTemplate('tenant-1');

        expect(created.find((c) => c.code === '1000')).toBeUndefined();
        expect(codeToId['1000']).toBe('existing-1000');
        expect(created).toHaveLength(CHART_OF_ACCOUNTS_TEMPLATE.length - 1);
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- chart-of-accounts-bootstrap.service.spec`
Expected: FAIL — `Cannot find module './chart-of-accounts-bootstrap.service'`

- [ ] **Step 4: Implement**

```typescript
// apps/api/src/modules/accounting/accounts/bootstrap/chart-of-accounts-bootstrap.service.ts
import { Injectable } from '@nestjs/common';
import { AccountsService } from '../services/accounts.service';
import { CHART_OF_ACCOUNTS_TEMPLATE } from './chart-of-accounts-template';

/**
 * Narrow, non-GL-policy facade over AccountsService — exposed outside the
 * accounting domain (accounts/bootstrap is not in the accounts GL-internal
 * re-ban list, see eslint/domain-boundaries.mjs) so identity/business-setup
 * can bootstrap a default CoA without reaching into accounts/services
 * (JournalPostingService lives there and must stay domain-internal).
 */
@Injectable()
export class ChartOfAccountsBootstrapService {
    constructor(private readonly accountsService: AccountsService) {}

    async bootstrapDefaultTemplate(tenantId: string): Promise<Record<string, string>> {
        const existing = await this.accountsService.list(tenantId, { take: 1000 });
        const codeToId: Record<string, string> = Object.fromEntries(
            existing.data.map((account) => [account.code, account.id]),
        );

        const parentCodes = new Set(
            CHART_OF_ACCOUNTS_TEMPLATE.map((entry) => entry.parentCode).filter((code): code is string => !!code),
        );

        for (const entry of CHART_OF_ACCOUNTS_TEMPLATE) {
            if (codeToId[entry.code]) continue;
            const isParent = parentCodes.has(entry.code);
            const created = await this.accountsService.create(tenantId, {
                code: entry.code,
                name: { ar: entry.nameAr, en: entry.nameEn },
                type: entry.type,
                parentId: entry.parentCode ? codeToId[entry.parentCode] : undefined,
                isPostable: !isParent,
                isContra: entry.code === '1220',
            });
            codeToId[entry.code] = created.id;
        }

        return codeToId;
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- chart-of-accounts-bootstrap.service.spec`
Expected: PASS — 4/4 tests

- [ ] **Step 6: Wire the module**

```typescript
// apps/api/src/modules/accounting/accounts/bootstrap/chart-of-accounts-bootstrap.module.ts
import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts.module';
import { ChartOfAccountsBootstrapService } from './chart-of-accounts-bootstrap.service';

@Module({
    imports: [AccountsModule],
    providers: [ChartOfAccountsBootstrapService],
    exports: [ChartOfAccountsBootstrapService],
})
export class ChartOfAccountsBootstrapModule {}
```

`AccountsModule` must export `AccountsService` for this to resolve — verify with `grep -n "exports" apps/api/src/modules/accounting/accounts/accounts.module.ts`; if `AccountsService` is not already in that array, add it there (it is a same-domain, backwards-compatible addition — no boundary impact since `accounts.module.ts` itself stays GL-internal, only `AccountsService` needs to be an exported provider for `ChartOfAccountsBootstrapModule`, which lives in the same domain, to import it).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/accounting/accounts/dto/account.dto.ts apps/api/src/modules/accounting/accounts/bootstrap apps/api/src/modules/accounting/accounts/accounts.module.ts
git commit -m "feat(accounting): extract CoA bootstrap into accounts/bootstrap facade (Phase 6)"
```

---

## Task 4: SetupTask dependency graph + profile-gating constants

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/constants/setup-task-graph.ts`
- Create: `apps/api/src/modules/identity/business-setup/constants/setup-task-graph.spec.ts`

**Interfaces:**
- Produces: `SETUP_TASK_DEPENDENCIES: Record<SetupTaskType, SetupTaskType[]>`, `SETUP_TASK_TYPES: SetupTaskType[]`, `PROFILE_GATED_TASKS: Partial<Record<keyof BusinessSetupProfileModules, SetupTaskType[]>>`, `BusinessSetupProfileModules` type, `isTaskRequiredForProfile(type: SetupTaskType, profile: BusinessSetupProfileModules): boolean` — consumed by Task 6 (`BusinessSetupPlanService`) and Task 7 (`BusinessSetupTaskService`).

This is the graph that makes the spec's explicit acceptance criterion true: *"SetupTask dependency tests pass for OPENING_CASH blocked without CASHBOXES."*

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/identity/business-setup/constants/setup-task-graph.spec.ts
import {
    SETUP_TASK_DEPENDENCIES,
    SETUP_TASK_TYPES,
    isTaskRequiredForProfile,
} from './setup-task-graph';

describe('SETUP_TASK_DEPENDENCIES', () => {
    it('has exactly one entry per SetupTaskType with no unknown keys', () => {
        expect(Object.keys(SETUP_TASK_DEPENDENCIES).sort()).toEqual([...SETUP_TASK_TYPES].sort());
    });

    it('blocks OPENING_CASH_BALANCES without CASHBOXES', () => {
        expect(SETUP_TASK_DEPENDENCIES.OPENING_CASH_BALANCES).toContain('CASHBOXES');
    });

    it('blocks OPENING_BANK_BALANCES without BANK_ACCOUNTS', () => {
        expect(SETUP_TASK_DEPENDENCIES.OPENING_BANK_BALANCES).toContain('BANK_ACCOUNTS');
    });

    it('has no cycles — every dependency chain terminates at a root (empty deps) within 5 hops', () => {
        for (const type of SETUP_TASK_TYPES) {
            let frontier = SETUP_TASK_DEPENDENCIES[type];
            let hops = 0;
            while (frontier.length > 0) {
                hops += 1;
                expect(hops).toBeLessThan(5);
                frontier = frontier.flatMap((dep) => SETUP_TASK_DEPENDENCIES[dep]);
            }
        }
    });

    it('RECONCILIATION depends on every OPENING_* task', () => {
        const openingTasks = SETUP_TASK_TYPES.filter((t) => t.startsWith('OPENING_'));
        for (const opening of openingTasks) {
            expect(SETUP_TASK_DEPENDENCIES.RECONCILIATION).toContain(opening);
        }
    });
});

describe('isTaskRequiredForProfile', () => {
    const allEnabled = { inventory: true, sales: true, purchasing: true, accounting: true };

    it('gates WAREHOUSES/PRODUCTS/OPENING_INVENTORY behind the inventory module', () => {
        const noInventory = { ...allEnabled, inventory: false };
        expect(isTaskRequiredForProfile('WAREHOUSES', noInventory)).toBe(false);
        expect(isTaskRequiredForProfile('PRODUCTS', noInventory)).toBe(false);
        expect(isTaskRequiredForProfile('OPENING_INVENTORY', noInventory)).toBe(false);
        expect(isTaskRequiredForProfile('WAREHOUSES', allEnabled)).toBe(true);
    });

    it('gates CUSTOMERS/OPENING_RECEIVABLES behind the sales module', () => {
        const noSales = { ...allEnabled, sales: false };
        expect(isTaskRequiredForProfile('CUSTOMERS', noSales)).toBe(false);
        expect(isTaskRequiredForProfile('OPENING_RECEIVABLES', noSales)).toBe(false);
    });

    it('gates SUPPLIERS/OPENING_PAYABLES behind the purchasing module', () => {
        const noPurchasing = { ...allEnabled, purchasing: false };
        expect(isTaskRequiredForProfile('SUPPLIERS', noPurchasing)).toBe(false);
        expect(isTaskRequiredForProfile('OPENING_PAYABLES', noPurchasing)).toBe(false);
    });

    it('never gates core accounting/money tasks — always required regardless of profile', () => {
        const nothingEnabled = { inventory: false, sales: false, purchasing: false, accounting: false };
        for (const type of ['CURRENCIES', 'FISCAL_PERIOD', 'CHART_OF_ACCOUNTS', 'FINANCIAL_MAPPINGS', 'DOCUMENT_SEQUENCES', 'CASHBOXES', 'BANK_ACCOUNTS', 'OPENING_CASH_BALANCES', 'OPENING_BANK_BALANCES', 'RECONCILIATION'] as const) {
            expect(isTaskRequiredForProfile(type, nothingEnabled)).toBe(true);
        }
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- setup-task-graph.spec`
Expected: FAIL — `Cannot find module './setup-task-graph'`

- [ ] **Step 3: Implement**

```typescript
// apps/api/src/modules/identity/business-setup/constants/setup-task-graph.ts
import { SetupTaskType } from '@devloggers/db-prisma';

export const SETUP_TASK_TYPES: SetupTaskType[] = [
    'CURRENCIES', 'FISCAL_PERIOD', 'CHART_OF_ACCOUNTS', 'FINANCIAL_MAPPINGS', 'DOCUMENT_SEQUENCES',
    'CASHBOXES', 'BANK_ACCOUNTS', 'WAREHOUSES', 'PRODUCTS', 'CUSTOMERS', 'SUPPLIERS',
    'OPENING_CASH_BALANCES', 'OPENING_BANK_BALANCES', 'OPENING_RECEIVABLES', 'OPENING_PAYABLES',
    'OPENING_INVENTORY', 'RECONCILIATION',
];

/**
 * Static dependency graph: a task is READY only once every listed dependency
 * is COMPLETED or SKIPPED. No task-type-to-task-type cycles allowed — pinned
 * by setup-task-graph.spec.ts.
 */
export const SETUP_TASK_DEPENDENCIES: Record<SetupTaskType, SetupTaskType[]> = {
    CURRENCIES: [],
    FISCAL_PERIOD: [],
    CHART_OF_ACCOUNTS: [],
    DOCUMENT_SEQUENCES: [],
    WAREHOUSES: [],
    FINANCIAL_MAPPINGS: ['CHART_OF_ACCOUNTS'],
    CASHBOXES: ['CURRENCIES'],
    BANK_ACCOUNTS: ['CURRENCIES'],
    PRODUCTS: ['WAREHOUSES'],
    CUSTOMERS: ['FINANCIAL_MAPPINGS'],
    SUPPLIERS: ['FINANCIAL_MAPPINGS'],
    OPENING_CASH_BALANCES: ['CASHBOXES', 'FINANCIAL_MAPPINGS', 'FISCAL_PERIOD'],
    OPENING_BANK_BALANCES: ['BANK_ACCOUNTS', 'FINANCIAL_MAPPINGS', 'FISCAL_PERIOD'],
    OPENING_RECEIVABLES: ['CUSTOMERS', 'FISCAL_PERIOD'],
    OPENING_PAYABLES: ['SUPPLIERS', 'FISCAL_PERIOD'],
    OPENING_INVENTORY: ['PRODUCTS', 'WAREHOUSES', 'FISCAL_PERIOD'],
    RECONCILIATION: [
        'CHART_OF_ACCOUNTS', 'FINANCIAL_MAPPINGS',
        'OPENING_CASH_BALANCES', 'OPENING_BANK_BALANCES',
        'OPENING_RECEIVABLES', 'OPENING_PAYABLES', 'OPENING_INVENTORY',
    ],
};

export interface BusinessSetupProfileModules {
    inventory: boolean;
    sales: boolean;
    purchasing: boolean;
    accounting: boolean;
}

/** Task types whose "required" flag is gated behind a declared module — everything else is unconditionally required. */
export const PROFILE_GATED_TASKS: Partial<Record<keyof BusinessSetupProfileModules, SetupTaskType[]>> = {
    inventory: ['WAREHOUSES', 'PRODUCTS', 'OPENING_INVENTORY'],
    sales: ['CUSTOMERS', 'OPENING_RECEIVABLES'],
    purchasing: ['SUPPLIERS', 'OPENING_PAYABLES'],
};

export function isTaskRequiredForProfile(type: SetupTaskType, profile: BusinessSetupProfileModules): boolean {
    for (const [moduleKey, gatedTypes] of Object.entries(PROFILE_GATED_TASKS) as Array<[keyof BusinessSetupProfileModules, SetupTaskType[]]>) {
        if (gatedTypes.includes(type)) {
            return profile[moduleKey];
        }
    }
    return true;
}

/** Task types with no domain-service handler (Task 3.5 of the spec's 6.3 table) — completion is discovery-only. */
export const DISCOVERY_ONLY_TASK_TYPES: SetupTaskType[] = ['WAREHOUSES', 'PRODUCTS', 'CUSTOMERS', 'SUPPLIERS', 'OPENING_INVENTORY'];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- setup-task-graph.spec`
Expected: PASS — 9/9 tests

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/constants
git commit -m "feat(business-setup): add SetupTask dependency graph and profile gating (Phase 6.2)"
```

---

## Task 5: `SetupTasksRepository`

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/repositories/setup-tasks.repository.ts`

**Interfaces:**
- Consumes: `CrudRepository<T>` from `@devloggers/backend-core` (`findMany`, `create`, `update` inherited).
- Produces: `SetupTasksRepository.findByType(tenantId, type): Promise<SetupTask | null>`, `SetupTasksRepository.upsertByType(tenantId, type, data): Promise<SetupTask>` — consumed by Task 6 (`BusinessSetupTaskService`) and Task 8 (`BusinessSetupOrchestratorService`).

No test file for this task — it is a 15-line pass-through repository over Prisma's generated `upsert`, in the same spirit as `UnitsRepository`'s `isNameTaken` helper (untested glue, per the golden reference). Its behavior is exercised indirectly by Task 6's `business-setup-task.service.spec.ts`, which mocks this repository.

- [ ] **Step 1: Implement**

```typescript
// apps/api/src/modules/identity/business-setup/repositories/setup-tasks.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { SetupTask, SetupTaskType, SetupTaskStatus, Prisma } from '@devloggers/db-prisma';

export interface UpsertSetupTaskData {
    status?: SetupTaskStatus;
    required?: boolean;
    dependencies?: SetupTaskType[];
    metadata?: Prisma.InputJsonValue;
    progress?: Prisma.InputJsonValue;
    completedAt?: Date | null;
}

@Injectable()
export class SetupTasksRepository extends CrudRepository<SetupTask> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.setupTask);
    }

    async findByType(tenantId: string, type: SetupTaskType): Promise<SetupTask | null> {
        return this.prisma.setupTask.findUnique({ where: { tenantId_type: { tenantId, type } } });
    }

    async listForTenant(tenantId: string): Promise<SetupTask[]> {
        return this.prisma.setupTask.findMany({ where: { tenantId }, orderBy: { type: 'asc' } });
    }

    async upsertByType(tenantId: string, type: SetupTaskType, data: UpsertSetupTaskData): Promise<SetupTask> {
        return this.prisma.setupTask.upsert({
            where: { tenantId_type: { tenantId, type } },
            create: { tenantId, type, status: data.status ?? 'BLOCKED', required: data.required ?? true, dependencies: data.dependencies ?? [], metadata: data.metadata, progress: data.progress, completedAt: data.completedAt ?? null },
            update: data,
        });
    }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --filter @devloggers/api build`
Expected: exits 0 (this file has no test of its own; the build gate is its verification for this step — Task 6's tests exercise its contract via mocks).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/repositories
git commit -m "feat(business-setup): add SetupTasksRepository (Phase 6.1)"
```

---

## Task 6: `BusinessSetupDiscoveryService`

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/services/business-setup-discovery.service.ts`
- Create: `apps/api/src/modules/identity/business-setup/services/business-setup-discovery.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` (`@devloggers/db-prisma/nest`) directly — this is a cross-cutting, read-only reporting service spanning currencies/accounting/invoicing/catalog/inventory/parties data, mirroring the established `reports/reports.service.ts` pattern of reading broadly for aggregation rather than importing a service per domain (several of those domains — `catalog`, `parties`, `inventory` — are `barrelOnly('...', 'nothing yet')` in `domain-boundaries.mjs`, i.e. genuinely have no public read API to reuse yet). This does **not** violate `.ai/rules/api.md`'s "don't call Prisma from services" rule, which targets write-side business services that own a 4-layer resource module — `BusinessSetupDiscoveryService` owns no resource and performs only `count`/`findMany` reads.
- Produces: `BusinessSetupDiscoveryService.inspect(tenantId: string): Promise<BusinessSetupInspection>`, exported type `BusinessSetupInspection` and `SetupAreaClassification = 'EMPTY' | 'PARTIAL' | 'EXISTING'` — consumed by Task 7 (`BusinessSetupPlanService.generate`).

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/identity/business-setup/services/business-setup-discovery.service.spec.ts
import { BusinessSetupDiscoveryService } from './business-setup-discovery.service';

function build(overrides: Partial<Record<string, unknown>> = {}) {
    const prisma = {
        currency: { count: jest.fn().mockResolvedValue(0) },
        chartOfAccount: { count: jest.fn().mockResolvedValue(0) },
        financialSetting: { findUnique: jest.fn().mockResolvedValue(null) },
        cashbox: { count: jest.fn().mockResolvedValue(0) },
        bankAccount: { count: jest.fn().mockResolvedValue(0) },
        fiscalPeriod: { count: jest.fn().mockResolvedValue(0) },
        documentSequence: { count: jest.fn().mockResolvedValue(0) },
        warehouse: { count: jest.fn().mockResolvedValue(0) },
        item: { count: jest.fn().mockResolvedValue(0) },
        party: { count: jest.fn().mockResolvedValue(0) },
        journalLine: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
        stockMovement: { count: jest.fn().mockResolvedValue(0) },
        ...overrides,
    };
    const service = new BusinessSetupDiscoveryService(prisma as never);
    return { service, prisma };
}

describe('BusinessSetupDiscoveryService.inspect', () => {
    it('classifies every counter EMPTY when nothing exists', async () => {
        const { service } = build();
        const result = await service.inspect('tenant-1');

        expect(result.currencies).toEqual({ count: 0, classification: 'EMPTY' });
        expect(result.chartOfAccounts).toEqual({ count: 0, classification: 'EMPTY' });
        expect(result.cashboxes).toEqual({ count: 0, classification: 'EMPTY' });
    });

    it('classifies a counter EXISTING once its count is above zero', async () => {
        const { service } = build({ currency: { count: jest.fn().mockResolvedValue(2) } });
        const result = await service.inspect('tenant-1');
        expect(result.currencies).toEqual({ count: 2, classification: 'EXISTING' });
    });

    it('classifies financialMappings EMPTY / PARTIAL / EXISTING by configured-slot count out of 11', async () => {
        const { service: emptyService } = build({ financialSetting: { findUnique: jest.fn().mockResolvedValue(null) } });
        expect((await emptyService.inspect('t')).financialMappings).toEqual({ configuredSlots: 0, classification: 'EMPTY' });

        const { service: partialService } = build({
            financialSetting: { findUnique: jest.fn().mockResolvedValue({ defaultSalesAccountId: 'a', defaultPurchaseAccountId: null, defaultTaxAccountId: null, defaultReceivableAccountId: null, defaultPayableAccountId: null, defaultInventoryAccountId: null, defaultCogsAccountId: null, defaultInventoryAdjustmentAccountId: null, defaultOpeningEquityAccountId: null, defaultCashAccountId: null, defaultBankAccountId: null }) },
        });
        expect((await partialService.inspect('t')).financialMappings).toEqual({ configuredSlots: 1, classification: 'PARTIAL' });

        const fullSlots = { defaultSalesAccountId: 'a', defaultPurchaseAccountId: 'b', defaultTaxAccountId: 'c', defaultReceivableAccountId: 'd', defaultPayableAccountId: 'e', defaultInventoryAccountId: 'f', defaultCogsAccountId: 'g', defaultInventoryAdjustmentAccountId: 'h', defaultOpeningEquityAccountId: 'i', defaultCashAccountId: 'j', defaultBankAccountId: 'k' };
        const { service: fullService } = build({ financialSetting: { findUnique: jest.fn().mockResolvedValue(fullSlots) } });
        expect((await fullService.inspect('t')).financialMappings).toEqual({ configuredSlots: 11, classification: 'EXISTING' });
    });

    it('counts customers as PartyType CUSTOMER or CUSTOMER_SUPPLIER, suppliers as SUPPLIER or CUSTOMER_SUPPLIER', async () => {
        const partyCount = jest.fn().mockResolvedValue(3);
        const { service, prisma } = build({ party: { count: partyCount } });
        await service.inspect('tenant-1');

        expect(partyCount).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1', type: { in: ['CUSTOMER', 'CUSTOMER_SUPPLIER'] } } });
        expect(partyCount).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1', type: { in: ['SUPPLIER', 'CUSTOMER_SUPPLIER'] } } });
        void prisma;
    });

    it('splits opening-balance journal lines into receivables vs payables by matching accountId against the party override', async () => {
        const { service } = build({
            journalLine: {
                count: jest.fn().mockResolvedValue(0),
                findMany: jest.fn().mockResolvedValue([
                    { accountId: 'recv-acct', party: { receivableAccountId: 'recv-acct', payableAccountId: 'pay-acct' } },
                    { accountId: 'pay-acct', party: { receivableAccountId: 'recv-acct', payableAccountId: 'pay-acct' } },
                    { accountId: 'pay-acct', party: { receivableAccountId: 'recv-acct-2', payableAccountId: 'pay-acct' } },
                ]),
            },
        });
        const result = await service.inspect('tenant-1');
        expect(result.openingReceivables).toEqual({ count: 1, classification: 'EXISTING' });
        expect(result.openingPayables).toEqual({ count: 2, classification: 'EXISTING' });
    });

    it('counts opening inventory via StockMovement.movementType OPENING', async () => {
        const stockMovementCount = jest.fn().mockResolvedValue(5);
        const { service } = build({ stockMovement: { count: stockMovementCount } });
        const result = await service.inspect('tenant-1');
        expect(stockMovementCount).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1', movementType: 'OPENING' } });
        expect(result.openingInventory).toEqual({ count: 5, classification: 'EXISTING' });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- business-setup-discovery.service.spec`
Expected: FAIL — `Cannot find module './business-setup-discovery.service'`

- [ ] **Step 3: Implement**

```typescript
// apps/api/src/modules/identity/business-setup/services/business-setup-discovery.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';

export type SetupAreaClassification = 'EMPTY' | 'PARTIAL' | 'EXISTING';

export interface SetupAreaCount {
    count: number;
    classification: SetupAreaClassification;
}

export interface BusinessSetupInspection {
    currencies: SetupAreaCount;
    chartOfAccounts: SetupAreaCount;
    financialMappings: { configuredSlots: number; classification: SetupAreaClassification };
    cashboxes: SetupAreaCount;
    bankAccounts: SetupAreaCount;
    fiscalPeriods: SetupAreaCount;
    documentSequences: SetupAreaCount;
    warehouses: SetupAreaCount;
    products: SetupAreaCount;
    customers: SetupAreaCount;
    suppliers: SetupAreaCount;
    openingCashBalances: SetupAreaCount;
    openingBankBalances: SetupAreaCount;
    openingReceivables: SetupAreaCount;
    openingPayables: SetupAreaCount;
    openingInventory: SetupAreaCount;
}

const FINANCIAL_SETTING_SLOTS = [
    'defaultSalesAccountId', 'defaultPurchaseAccountId', 'defaultTaxAccountId',
    'defaultReceivableAccountId', 'defaultPayableAccountId', 'defaultInventoryAccountId',
    'defaultCogsAccountId', 'defaultInventoryAdjustmentAccountId', 'defaultOpeningEquityAccountId',
    'defaultCashAccountId', 'defaultBankAccountId',
] as const;

function classify(count: number): SetupAreaClassification {
    return count > 0 ? 'EXISTING' : 'EMPTY';
}

function toArea(count: number): SetupAreaCount {
    return { count, classification: classify(count) };
}

@Injectable()
export class BusinessSetupDiscoveryService {
    constructor(private readonly prisma: PrismaService) {}

    async inspect(tenantId: string): Promise<BusinessSetupInspection> {
        const [
            currencyCount, chartOfAccountCount, financialSetting, cashboxCount, bankAccountCount,
            fiscalPeriodCount, documentSequenceCount, warehouseCount, itemCount,
            customerCount, supplierCount, openingCashCount, openingBankCount,
            openingPartyLines, openingInventoryCount,
        ] = await Promise.all([
            this.prisma.currency.count({ where: { tenantId } }),
            this.prisma.chartOfAccount.count({ where: { tenantId } }),
            this.prisma.financialSetting.findUnique({ where: { tenantId } }),
            this.prisma.cashbox.count({ where: { tenantId } }),
            this.prisma.bankAccount.count({ where: { tenantId } }),
            this.prisma.fiscalPeriod.count({ where: { tenantId } }),
            this.prisma.documentSequence.count({ where: { tenantId } }),
            this.prisma.warehouse.count({ where: { tenantId } }),
            this.prisma.item.count({ where: { tenantId } }),
            this.prisma.party.count({ where: { tenantId, type: { in: ['CUSTOMER', 'CUSTOMER_SUPPLIER'] } } }),
            this.prisma.party.count({ where: { tenantId, type: { in: ['SUPPLIER', 'CUSTOMER_SUPPLIER'] } } }),
            this.prisma.journalLine.count({ where: { tenantId, cashboxId: { not: null }, journalEntry: { referenceType: 'OPENING_BALANCE' } } }),
            this.prisma.journalLine.count({ where: { tenantId, bankAccountId: { not: null }, journalEntry: { referenceType: 'OPENING_BALANCE' } } }),
            this.prisma.journalLine.findMany({
                where: { tenantId, partyId: { not: null }, journalEntry: { referenceType: 'OPENING_BALANCE' } },
                select: { accountId: true, party: { select: { receivableAccountId: true, payableAccountId: true } } },
            }),
            this.prisma.stockMovement.count({ where: { tenantId, movementType: 'OPENING' } }),
        ]);

        const configuredSlots = financialSetting
            ? FINANCIAL_SETTING_SLOTS.filter((slot) => Boolean((financialSetting as Record<string, unknown>)[slot])).length
            : 0;
        const financialMappingsClassification: SetupAreaClassification =
            configuredSlots === 0 ? 'EMPTY' : configuredSlots === FINANCIAL_SETTING_SLOTS.length ? 'EXISTING' : 'PARTIAL';

        const openingReceivablesCount = openingPartyLines.filter((line) => line.party?.receivableAccountId === line.accountId).length;
        const openingPayablesCount = openingPartyLines.filter((line) => line.party?.payableAccountId === line.accountId).length;

        return {
            currencies: toArea(currencyCount),
            chartOfAccounts: toArea(chartOfAccountCount),
            financialMappings: { configuredSlots, classification: financialMappingsClassification },
            cashboxes: toArea(cashboxCount),
            bankAccounts: toArea(bankAccountCount),
            fiscalPeriods: toArea(fiscalPeriodCount),
            documentSequences: toArea(documentSequenceCount),
            warehouses: toArea(warehouseCount),
            products: toArea(itemCount),
            customers: toArea(customerCount),
            suppliers: toArea(supplierCount),
            openingCashBalances: toArea(openingCashCount),
            openingBankBalances: toArea(openingBankCount),
            openingReceivables: toArea(openingReceivablesCount),
            openingPayables: toArea(openingPayablesCount),
            openingInventory: toArea(openingInventoryCount),
        };
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- business-setup-discovery.service.spec`
Expected: PASS — 6/6 tests

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/services/business-setup-discovery.service.ts apps/api/src/modules/identity/business-setup/services/business-setup-discovery.service.spec.ts
git commit -m "feat(business-setup): add BusinessSetupDiscoveryService (Phase 6.2.1)"
```

---

## Task 7: `BusinessSetupPlanService`

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/services/business-setup-plan.service.ts`
- Create: `apps/api/src/modules/identity/business-setup/services/business-setup-plan.service.spec.ts`

**Interfaces:**
- Consumes: `SETUP_TASK_TYPES`, `SETUP_TASK_DEPENDENCIES`, `isTaskRequiredForProfile`, `BusinessSetupProfileModules` (Task 4); `BusinessSetupInspection` (Task 6).
- Produces: `SetupTaskPlanItem { type, required, dependencies, metadata? }`, `BusinessSetupPlanService.generate(profile, inspection): SetupTaskPlanItem[]` — consumed by Task 8's `BusinessSetupTaskService.upsertPlan`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/identity/business-setup/services/business-setup-plan.service.spec.ts
import { BusinessSetupPlanService } from './business-setup-plan.service';
import { SETUP_TASK_TYPES, SETUP_TASK_DEPENDENCIES } from '../constants/setup-task-graph';
import type { BusinessSetupInspection } from './business-setup-discovery.service';

const EMPTY_INSPECTION: BusinessSetupInspection = {
    currencies: { count: 0, classification: 'EMPTY' },
    chartOfAccounts: { count: 0, classification: 'EMPTY' },
    financialMappings: { configuredSlots: 0, classification: 'EMPTY' },
    cashboxes: { count: 0, classification: 'EMPTY' },
    bankAccounts: { count: 0, classification: 'EMPTY' },
    fiscalPeriods: { count: 0, classification: 'EMPTY' },
    documentSequences: { count: 0, classification: 'EMPTY' },
    warehouses: { count: 0, classification: 'EMPTY' },
    products: { count: 0, classification: 'EMPTY' },
    customers: { count: 0, classification: 'EMPTY' },
    suppliers: { count: 0, classification: 'EMPTY' },
    openingCashBalances: { count: 0, classification: 'EMPTY' },
    openingBankBalances: { count: 0, classification: 'EMPTY' },
    openingReceivables: { count: 0, classification: 'EMPTY' },
    openingPayables: { count: 0, classification: 'EMPTY' },
    openingInventory: { count: 0, classification: 'EMPTY' },
};

describe('BusinessSetupPlanService.generate', () => {
    const service = new BusinessSetupPlanService();
    const allEnabled = { inventory: true, sales: true, purchasing: true, accounting: true };

    it('produces exactly one plan item per SetupTaskType, with the graph dependencies attached verbatim', () => {
        const items = service.generate(allEnabled, EMPTY_INSPECTION);
        expect(items).toHaveLength(SETUP_TASK_TYPES.length);
        const cashboxesItem = items.find((i) => i.type === 'CASHBOXES');
        expect(cashboxesItem?.dependencies).toEqual(SETUP_TASK_DEPENDENCIES.CASHBOXES);
    });

    it('marks inventory tasks not-required when the inventory module is disabled', () => {
        const items = service.generate({ ...allEnabled, inventory: false }, EMPTY_INSPECTION);
        expect(items.find((i) => i.type === 'WAREHOUSES')?.required).toBe(false);
        expect(items.find((i) => i.type === 'CURRENCIES')?.required).toBe(true);
    });

    it('attaches the matching discovery snapshot as metadata for tasks with an inspection counterpart', () => {
        const inspection = { ...EMPTY_INSPECTION, currencies: { count: 3, classification: 'EXISTING' as const } };
        const items = service.generate(allEnabled, inspection);
        expect(items.find((i) => i.type === 'CURRENCIES')?.metadata).toEqual({ discovery: { count: 3, classification: 'EXISTING' } });
    });

    it('leaves RECONCILIATION metadata undefined — it has no direct discovery counterpart', () => {
        const items = service.generate(allEnabled, EMPTY_INSPECTION);
        expect(items.find((i) => i.type === 'RECONCILIATION')?.metadata).toBeUndefined();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- business-setup-plan.service.spec`
Expected: FAIL — `Cannot find module './business-setup-plan.service'`

- [ ] **Step 3: Implement**

```typescript
// apps/api/src/modules/identity/business-setup/services/business-setup-plan.service.ts
import { Injectable } from '@nestjs/common';
import type { SetupTaskType } from '@devloggers/db-prisma';
import { SETUP_TASK_TYPES, SETUP_TASK_DEPENDENCIES, isTaskRequiredForProfile, type BusinessSetupProfileModules } from '../constants/setup-task-graph';
import type { BusinessSetupInspection } from './business-setup-discovery.service';

export interface SetupTaskPlanItem {
    type: SetupTaskType;
    required: boolean;
    dependencies: SetupTaskType[];
    metadata?: Record<string, unknown>;
}

const INSPECTION_KEY_BY_TASK_TYPE: Partial<Record<SetupTaskType, keyof BusinessSetupInspection>> = {
    CURRENCIES: 'currencies',
    CHART_OF_ACCOUNTS: 'chartOfAccounts',
    FINANCIAL_MAPPINGS: 'financialMappings',
    CASHBOXES: 'cashboxes',
    BANK_ACCOUNTS: 'bankAccounts',
    FISCAL_PERIOD: 'fiscalPeriods',
    DOCUMENT_SEQUENCES: 'documentSequences',
    WAREHOUSES: 'warehouses',
    PRODUCTS: 'products',
    CUSTOMERS: 'customers',
    SUPPLIERS: 'suppliers',
    OPENING_CASH_BALANCES: 'openingCashBalances',
    OPENING_BANK_BALANCES: 'openingBankBalances',
    OPENING_RECEIVABLES: 'openingReceivables',
    OPENING_PAYABLES: 'openingPayables',
    OPENING_INVENTORY: 'openingInventory',
};

@Injectable()
export class BusinessSetupPlanService {
    generate(profile: BusinessSetupProfileModules, inspection: BusinessSetupInspection): SetupTaskPlanItem[] {
        return SETUP_TASK_TYPES.map((type) => {
            const inspectionKey = INSPECTION_KEY_BY_TASK_TYPE[type];
            return {
                type,
                required: isTaskRequiredForProfile(type, profile),
                dependencies: SETUP_TASK_DEPENDENCIES[type],
                metadata: inspectionKey ? { discovery: inspection[inspectionKey] } : undefined,
            };
        });
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- business-setup-plan.service.spec`
Expected: PASS — 4/4 tests

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/services/business-setup-plan.service.ts apps/api/src/modules/identity/business-setup/services/business-setup-plan.service.spec.ts
git commit -m "feat(business-setup): add BusinessSetupPlanService (Phase 6.2.2)"
```

---

## Task 8: `BusinessSetupTaskService`

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/services/business-setup-task.service.ts`
- Create: `apps/api/src/modules/identity/business-setup/services/business-setup-task.service.spec.ts`

**Interfaces:**
- Consumes: `SetupTasksRepository` (Task 5) — `findByType`, `listForTenant`, `upsertByType`; `SETUP_TASK_DEPENDENCIES` (Task 4); `SetupTaskPlanItem` (Task 7).
- Produces: `BusinessSetupTaskService.upsertPlan(tenantId, items): Promise<void>`, `.resolveStatuses(tenantId): Promise<void>`, `.recordAttempt(tenantId, type, completed, details?): Promise<void>`, `.listForTenant(tenantId): Promise<SetupTask[]>`, `.getTaskOrFail(tenantId, type): Promise<SetupTask>` — consumed by Task 10 (`BusinessSetupOrchestratorService`) and Task 22 (controller).

This is the task that must satisfy the spec's literal acceptance line: *"SetupTask dependency tests pass for OPENING_CASH blocked without CASHBOXES."*

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/identity/business-setup/services/business-setup-task.service.spec.ts
import { BusinessSetupTaskService } from './business-setup-task.service';
import type { SetupTask } from '@devloggers/db-prisma';

function makeTask(overrides: Partial<SetupTask>): SetupTask {
    return {
        id: `id-${overrides.type}`, tenantId: 't1', required: true, dependencies: [],
        status: 'BLOCKED', metadata: null, progress: null, completedAt: null,
        createdAt: new Date(), updatedAt: new Date(),
        ...overrides,
    } as SetupTask;
}

function build(tasks: SetupTask[]) {
    const store = new Map(tasks.map((t) => [t.type, t]));
    const repository = {
        findByType: jest.fn().mockImplementation((_tenantId: string, type: string) => Promise.resolve(store.get(type as never) ?? null)),
        listForTenant: jest.fn().mockImplementation(() => Promise.resolve([...store.values()])),
        upsertByType: jest.fn().mockImplementation((tenantId: string, type: string, data: Record<string, unknown>) => {
            const existing = store.get(type as never) ?? makeTask({ type: type as never });
            const updated = { ...existing, ...data };
            store.set(type as never, updated as SetupTask);
            return Promise.resolve(updated);
        }),
    };
    const service = new BusinessSetupTaskService(repository as never);
    return { service, repository, store };
}

describe('BusinessSetupTaskService', () => {
    describe('upsertPlan', () => {
        it('creates a new required task as BLOCKED and a new not-required task as SKIPPED', async () => {
            const { service, store } = build([]);
            await service.upsertPlan('t1', [
                { type: 'CURRENCIES', required: true, dependencies: [] },
                { type: 'WAREHOUSES', required: false, dependencies: [] },
            ]);
            expect(store.get('CURRENCIES' as never)?.status).toBe('READY'); // no deps → resolveStatuses promotes it
            expect(store.get('WAREHOUSES' as never)?.status).toBe('SKIPPED');
        });

        it('never regresses an already-COMPLETED task back to BLOCKED', async () => {
            const { service, store } = build([makeTask({ type: 'CURRENCIES' as never, status: 'COMPLETED', completedAt: new Date() })]);
            await service.upsertPlan('t1', [{ type: 'CURRENCIES', required: true, dependencies: [] }]);
            expect(store.get('CURRENCIES' as never)?.status).toBe('COMPLETED');
        });
    });

    describe('resolveStatuses — the spec acceptance criterion', () => {
        it('keeps OPENING_CASH_BALANCES BLOCKED while CASHBOXES is not COMPLETED', async () => {
            const { service, store } = build([
                makeTask({ type: 'CASHBOXES' as never, status: 'READY', dependencies: [] }),
                makeTask({ type: 'FINANCIAL_MAPPINGS' as never, status: 'COMPLETED', completedAt: new Date() }),
                makeTask({ type: 'FISCAL_PERIOD' as never, status: 'COMPLETED', completedAt: new Date() }),
                makeTask({ type: 'OPENING_CASH_BALANCES' as never, status: 'BLOCKED', dependencies: ['CASHBOXES', 'FINANCIAL_MAPPINGS', 'FISCAL_PERIOD'] as never }),
            ]);
            await service.resolveStatuses('t1');
            expect(store.get('OPENING_CASH_BALANCES' as never)?.status).toBe('BLOCKED');
        });

        it('promotes OPENING_CASH_BALANCES to READY once CASHBOXES (and the rest of its deps) COMPLETE', async () => {
            const { service, store } = build([
                makeTask({ type: 'CASHBOXES' as never, status: 'COMPLETED', completedAt: new Date() }),
                makeTask({ type: 'FINANCIAL_MAPPINGS' as never, status: 'COMPLETED', completedAt: new Date() }),
                makeTask({ type: 'FISCAL_PERIOD' as never, status: 'COMPLETED', completedAt: new Date() }),
                makeTask({ type: 'OPENING_CASH_BALANCES' as never, status: 'BLOCKED', dependencies: ['CASHBOXES', 'FINANCIAL_MAPPINGS', 'FISCAL_PERIOD'] as never }),
            ]);
            await service.resolveStatuses('t1');
            expect(store.get('OPENING_CASH_BALANCES' as never)?.status).toBe('READY');
        });

        it('leaves SKIPPED and COMPLETED tasks untouched (terminal states)', async () => {
            const { service, repository } = build([
                makeTask({ type: 'WAREHOUSES' as never, status: 'SKIPPED', required: false }),
                makeTask({ type: 'CURRENCIES' as never, status: 'COMPLETED', completedAt: new Date() }),
            ]);
            await service.resolveStatuses('t1');
            expect(repository.upsertByType).not.toHaveBeenCalled();
        });
    });

    describe('recordAttempt', () => {
        it('completed=true sets COMPLETED + completedAt and cascades resolveStatuses', async () => {
            const { service, store } = build([
                makeTask({ type: 'CASHBOXES' as never, status: 'READY', dependencies: [] }),
                makeTask({ type: 'OPENING_CASH_BALANCES' as never, status: 'BLOCKED', dependencies: ['CASHBOXES'] as never }),
            ]);
            await service.recordAttempt('t1', 'CASHBOXES' as never, true, { created: 2 });
            expect(store.get('CASHBOXES' as never)?.status).toBe('COMPLETED');
            expect(store.get('CASHBOXES' as never)?.progress).toEqual({ created: 2 });
        });

        it('completed=false only records progress, leaves status untouched', async () => {
            const { service, store } = build([makeTask({ type: 'RECONCILIATION' as never, status: 'READY' })]);
            await service.recordAttempt('t1', 'RECONCILIATION' as never, false, { passed: false, checks: ['drift'] });
            expect(store.get('RECONCILIATION' as never)?.status).toBe('READY');
            expect(store.get('RECONCILIATION' as never)?.progress).toEqual({ passed: false, checks: ['drift'] });
        });
    });

    describe('getTaskOrFail', () => {
        it('throws NotFoundException when the task row does not exist', async () => {
            const { service } = build([]);
            await expect(service.getTaskOrFail('t1', 'CURRENCIES' as never)).rejects.toThrow('Setup task "CURRENCIES" not found');
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- business-setup-task.service.spec`
Expected: FAIL — `Cannot find module './business-setup-task.service'`

- [ ] **Step 3: Implement**

```typescript
// apps/api/src/modules/identity/business-setup/services/business-setup-task.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import type { SetupTask, SetupTaskType, SetupTaskStatus, Prisma } from '@devloggers/db-prisma';
import { SetupTasksRepository } from '../repositories/setup-tasks.repository';
import { SETUP_TASK_DEPENDENCIES } from '../constants/setup-task-graph';
import type { SetupTaskPlanItem } from './business-setup-plan.service';

@Injectable()
export class BusinessSetupTaskService {
    constructor(private readonly repository: SetupTasksRepository) {}

    async upsertPlan(tenantId: string, items: SetupTaskPlanItem[]): Promise<void> {
        for (const item of items) {
            const existing = await this.repository.findByType(tenantId, item.type);
            const metadata = item.metadata as Prisma.InputJsonValue | undefined;

            if (!existing) {
                await this.repository.upsertByType(tenantId, item.type, {
                    required: item.required,
                    dependencies: item.dependencies,
                    metadata,
                    status: item.required ? 'BLOCKED' : 'SKIPPED',
                });
                continue;
            }

            if (existing.status === 'COMPLETED') {
                await this.repository.upsertByType(tenantId, item.type, { metadata });
                continue;
            }

            await this.repository.upsertByType(tenantId, item.type, {
                required: item.required,
                dependencies: item.dependencies,
                metadata,
                status: item.required ? existing.status : 'SKIPPED',
            });
        }
        await this.resolveStatuses(tenantId);
    }

    async resolveStatuses(tenantId: string): Promise<void> {
        const tasks = await this.repository.listForTenant(tenantId);
        const statusByType = new Map<SetupTaskType, SetupTaskStatus>(tasks.map((t) => [t.type, t.status]));

        for (const task of tasks) {
            if (task.status === 'COMPLETED' || task.status === 'SKIPPED') continue;

            const deps = SETUP_TASK_DEPENDENCIES[task.type];
            const ready = deps.every((dep) => {
                const depStatus = statusByType.get(dep);
                return depStatus === 'COMPLETED' || depStatus === 'SKIPPED';
            });
            const nextStatus: SetupTaskStatus = ready ? 'READY' : 'BLOCKED';

            if (nextStatus !== task.status) {
                await this.repository.upsertByType(tenantId, task.type, { status: nextStatus });
            }
        }
    }

    async recordAttempt(tenantId: string, type: SetupTaskType, completed: boolean, details?: Record<string, unknown>): Promise<void> {
        await this.repository.upsertByType(tenantId, type, {
            progress: details as Prisma.InputJsonValue,
            ...(completed ? { status: 'COMPLETED', completedAt: new Date() } : {}),
        });
        if (completed) {
            await this.resolveStatuses(tenantId);
        }
    }

    async listForTenant(tenantId: string): Promise<SetupTask[]> {
        return this.repository.listForTenant(tenantId);
    }

    async getTaskOrFail(tenantId: string, type: SetupTaskType): Promise<SetupTask> {
        const task = await this.repository.findByType(tenantId, type);
        if (!task) {
            throw new NotFoundException(`Setup task "${type}" not found for this tenant`);
        }
        return task;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- business-setup-task.service.spec`
Expected: PASS — 9/9 tests

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/services/business-setup-task.service.ts apps/api/src/modules/identity/business-setup/services/business-setup-task.service.spec.ts
git commit -m "feat(business-setup): add BusinessSetupTaskService with READY/BLOCKED resolution (Phase 6.2.3)"
```

---

## Task 9: `SetupTaskHandler` interface + payload-validation utility

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/handlers/setup-task-handler.interface.ts`
- Create: `apps/api/src/modules/identity/business-setup/utils/validate-payload.util.ts`
- Create: `apps/api/src/modules/identity/business-setup/utils/validate-payload.util.spec.ts`

**Interfaces:**
- Produces: `SetupTaskHandlerResult { completed: boolean; details?: Record<string, unknown> }`, `SetupTaskHandler { execute(tenantId, userId, payload): Promise<SetupTaskHandlerResult> }`, `validateAs<T>(cls, plain): Promise<T>`, `validateArrayAs<T>(cls, plain): Promise<T[]>` — every handler in Tasks 10–21 implements `SetupTaskHandler` and calls one of the two validators to turn the controller's untyped `payload: unknown` into an existing, reused domain `CreateXDto` instance (never a hand-rolled duplicate shape) before calling the corresponding domain service. This is the same `plainToInstance` + `class-validator.validate` mechanism Nest's own `ValidationPipe` uses — legitimate reuse for a payload whose shape is polymorphic by runtime task type and therefore cannot go through the global pipe's static per-route DTO.

- [ ] **Step 1: Define the handler interface (no test needed — a 6-line type-only file)**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/setup-task-handler.interface.ts
export interface SetupTaskHandlerResult {
    completed: boolean;
    details?: Record<string, unknown>;
}

export interface SetupTaskHandler {
    execute(tenantId: string, userId: string, payload: unknown): Promise<SetupTaskHandlerResult>;
}
```

- [ ] **Step 2: Write the failing test for the validation utility**

```typescript
// apps/api/src/modules/identity/business-setup/utils/validate-payload.util.spec.ts
import { IsString, IsNotEmpty } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { validateAs, validateArrayAs } from './validate-payload.util';

class FixtureDto {
    @IsString()
    @IsNotEmpty()
    code: string = '';
}

describe('validateAs', () => {
    it('returns a validated class instance for valid input', async () => {
        const result = await validateAs(FixtureDto, { code: 'ABC' });
        expect(result).toBeInstanceOf(FixtureDto);
        expect(result.code).toBe('ABC');
    });

    it('throws BadRequestException with constraint messages for invalid input', async () => {
        await expect(validateAs(FixtureDto, { code: '' })).rejects.toThrow(BadRequestException);
    });

    it('treats an undefined payload as {} and still fails required-field validation', async () => {
        await expect(validateAs(FixtureDto, undefined)).rejects.toThrow(BadRequestException);
    });
});

describe('validateArrayAs', () => {
    it('validates every item and returns typed instances', async () => {
        const result = await validateArrayAs(FixtureDto, [{ code: 'A' }, { code: 'B' }]);
        expect(result).toHaveLength(2);
        expect(result[0]).toBeInstanceOf(FixtureDto);
        expect(result[1].code).toBe('B');
    });

    it('rejects a non-array payload', async () => {
        await expect(validateArrayAs(FixtureDto, { code: 'A' })).rejects.toThrow('Expected a non-empty array payload');
    });

    it('rejects an empty array', async () => {
        await expect(validateArrayAs(FixtureDto, [])).rejects.toThrow('Expected a non-empty array payload');
    });

    it('rejects when any single item fails validation', async () => {
        await expect(validateArrayAs(FixtureDto, [{ code: 'A' }, { code: '' }])).rejects.toThrow(BadRequestException);
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- validate-payload.util.spec`
Expected: FAIL — `Cannot find module './validate-payload.util'`

- [ ] **Step 4: Implement**

```typescript
// apps/api/src/modules/identity/business-setup/utils/validate-payload.util.ts
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

function collectMessages(errors: Array<{ constraints?: Record<string, string> }>): string[] {
    return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

export async function validateAs<T extends object>(cls: new () => T, plain: unknown): Promise<T> {
    const instance = plainToInstance(cls, plain ?? {});
    const errors = await validate(instance as object);
    if (errors.length > 0) {
        const messages = collectMessages(errors);
        throw new BadRequestException(messages.length > 0 ? messages : 'Invalid setup task payload');
    }
    return instance;
}

export async function validateArrayAs<T extends object>(cls: new () => T, plain: unknown): Promise<T[]> {
    if (!Array.isArray(plain) || plain.length === 0) {
        throw new BadRequestException('Expected a non-empty array payload');
    }
    const instances = plainToInstance(cls, plain);
    for (const instance of instances) {
        const errors = await validate(instance as object);
        if (errors.length > 0) {
            const messages = collectMessages(errors);
            throw new BadRequestException(messages.length > 0 ? messages : 'Invalid setup task payload item');
        }
    }
    return instances;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- validate-payload.util.spec`
Expected: PASS — 6/6 tests

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/handlers/setup-task-handler.interface.ts apps/api/src/modules/identity/business-setup/utils
git commit -m "feat(business-setup): add SetupTaskHandler interface and payload validation util (Phase 6.3)"
```

---

## Task 10: `CurrenciesTaskHandler`

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/handlers/currencies.handler.ts`
- Create: `apps/api/src/modules/identity/business-setup/handlers/currencies.handler.spec.ts`

**Interfaces:**
- Consumes: `CurrenciesService.list`/`.create` (`accounting/currencies`, opened in Task 2), `CreateCurrencyDto` (`apps/api/src/modules/accounting/currencies/dto`), `validateArrayAs` (Task 9), `PrismaService` for the one Tenant-scalar write (`baseCurrencyId`) — the same established exception `OnboardingService` already uses for tenant scalar fields, not a "business entity" write.
- Produces: implements `SetupTaskHandler` — payload is a bare `CreateCurrencyDto[]`. ADR-6 compliant: no hardcoded currency codes.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/currencies.handler.spec.ts
import { CurrenciesTaskHandler } from './currencies.handler';

function build(existingCodes: string[] = []) {
    const currenciesService = {
        list: jest.fn().mockResolvedValue({ data: existingCodes.map((code) => ({ code, id: `id-${code}` })), total: existingCodes.length }),
        create: jest.fn().mockImplementation((_t: string, dto: { code: string }) => Promise.resolve({ id: `new-${dto.code}`, ...dto })),
    };
    const prisma = { tenant: { update: jest.fn().mockResolvedValue({}) } };
    const handler = new CurrenciesTaskHandler(currenciesService as never, prisma as never);
    return { handler, currenciesService, prisma };
}

describe('CurrenciesTaskHandler', () => {
    it('creates every currency not already present and reports the created count', async () => {
        const { handler, currenciesService } = build(['SYP']);
        const result = await handler.execute('t1', 'u1', [
            { code: 'SYP', name: { ar: 'ليرة', en: 'Lira' } },
            { code: 'EUR', name: { ar: 'يورو', en: 'Euro' }, isBase: true },
        ]);

        expect(currenciesService.create).toHaveBeenCalledTimes(1);
        expect(currenciesService.create).toHaveBeenCalledWith('t1', { code: 'EUR', name: { ar: 'يورو', en: 'Euro' }, isBase: true });
        expect(result).toEqual({ completed: true, details: { created: 1 } });
    });

    it('sets the tenant baseCurrencyId when a created currency has isBase: true', async () => {
        const { handler, prisma } = build([]);
        await handler.execute('t1', 'u1', [{ code: 'USD', name: { ar: 'دولار', en: 'Dollar' }, isBase: true }]);
        expect(prisma.tenant.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { baseCurrencyId: 'new-USD' } });
    });

    it('does not touch tenant.baseCurrencyId when no created currency is base', async () => {
        const { handler, prisma } = build([]);
        await handler.execute('t1', 'u1', [{ code: 'EUR', name: { ar: 'يورو', en: 'Euro' } }]);
        expect(prisma.tenant.update).not.toHaveBeenCalled();
    });

    it('is idempotent — calling execute twice with the same payload creates nothing the second time', async () => {
        const { handler, currenciesService } = build([]);
        await handler.execute('t1', 'u1', [{ code: 'USD', name: { ar: 'دولار', en: 'Dollar' } }]);
        currenciesService.list.mockResolvedValue({ data: [{ code: 'USD', id: 'new-USD' }], total: 1 });
        const result = await handler.execute('t1', 'u1', [{ code: 'USD', name: { ar: 'دولار', en: 'Dollar' } }]);
        expect(result.details).toEqual({ created: 0 });
    });

    it('rejects a payload with an invalid currency item', async () => {
        const { handler } = build([]);
        await expect(handler.execute('t1', 'u1', [{ code: '', name: { ar: 'x' } }])).rejects.toThrow();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- handlers/currencies.handler.spec`
Expected: FAIL — `Cannot find module './currencies.handler'`

- [ ] **Step 3: Implement**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/currencies.handler.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CurrenciesService } from '../../../accounting/currencies/services/currencies.service';
import { CreateCurrencyDto } from '../../../accounting/currencies/dto';
import { validateArrayAs } from '../utils/validate-payload.util';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

@Injectable()
export class CurrenciesTaskHandler implements SetupTaskHandler {
    constructor(
        private readonly currenciesService: CurrenciesService,
        private readonly prisma: PrismaService,
    ) {}

    async execute(tenantId: string, _userId: string, payload: unknown): Promise<SetupTaskHandlerResult> {
        const items = await validateArrayAs(CreateCurrencyDto, payload);
        const existing = await this.currenciesService.list(tenantId, { take: 1000 });
        const existingCodes = new Set(existing.data.map((c) => c.code));

        let created = 0;
        let baseCurrencyId: string | undefined;
        for (const item of items) {
            if (existingCodes.has(item.code)) continue;
            const result = await this.currenciesService.create(tenantId, item);
            created += 1;
            if (item.isBase) baseCurrencyId = result.id;
        }

        if (baseCurrencyId) {
            await this.prisma.tenant.update({ where: { id: tenantId }, data: { baseCurrencyId } });
        }

        return { completed: true, details: { created } };
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- handlers/currencies.handler.spec`
Expected: PASS — 5/5 tests

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/handlers/currencies.handler.ts apps/api/src/modules/identity/business-setup/handlers/currencies.handler.spec.ts
git commit -m "feat(business-setup): add CurrenciesTaskHandler, ADR-6 compliant (Phase 6.3)"
```

---

## Task 11: `ChartOfAccountsTaskHandler`

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/handlers/chart-of-accounts.handler.ts`
- Create: `apps/api/src/modules/identity/business-setup/handlers/chart-of-accounts.handler.spec.ts`

**Interfaces:**
- Consumes: `ChartOfAccountsBootstrapService.bootstrapDefaultTemplate` (Task 3).
- Produces: implements `SetupTaskHandler` — payload is ignored (parameterless bootstrap). Idempotency is already guaranteed inside `bootstrapDefaultTemplate` itself (Task 3's test 4).

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/chart-of-accounts.handler.spec.ts
import { ChartOfAccountsTaskHandler } from './chart-of-accounts.handler';

describe('ChartOfAccountsTaskHandler', () => {
    it('delegates to the bootstrap facade and reports the resulting account count', async () => {
        const bootstrapService = {
            bootstrapDefaultTemplate: jest.fn().mockResolvedValue({ '1000': 'id-1000', '1100': 'id-1100' }),
        };
        const handler = new ChartOfAccountsTaskHandler(bootstrapService as never);

        const result = await handler.execute('t1', 'u1', undefined);

        expect(bootstrapService.bootstrapDefaultTemplate).toHaveBeenCalledWith('t1');
        expect(result).toEqual({ completed: true, details: { accountCount: 2 } });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- handlers/chart-of-accounts.handler.spec`
Expected: FAIL — `Cannot find module './chart-of-accounts.handler'`

- [ ] **Step 3: Implement**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/chart-of-accounts.handler.ts
import { Injectable } from '@nestjs/common';
import { ChartOfAccountsBootstrapService } from '../../../accounting/accounts/bootstrap/chart-of-accounts-bootstrap.service';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

@Injectable()
export class ChartOfAccountsTaskHandler implements SetupTaskHandler {
    constructor(private readonly bootstrapService: ChartOfAccountsBootstrapService) {}

    async execute(tenantId: string): Promise<SetupTaskHandlerResult> {
        const codeToId = await this.bootstrapService.bootstrapDefaultTemplate(tenantId);
        return { completed: true, details: { accountCount: Object.keys(codeToId).length } };
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- handlers/chart-of-accounts.handler.spec`
Expected: PASS — 1/1 test

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/handlers/chart-of-accounts.handler.ts apps/api/src/modules/identity/business-setup/handlers/chart-of-accounts.handler.spec.ts
git commit -m "feat(business-setup): add ChartOfAccountsTaskHandler (Phase 6.3)"
```

---

## Task 12: `FinancialMappingsTaskHandler`

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/handlers/financial-mappings.handler.ts`
- Create: `apps/api/src/modules/identity/business-setup/handlers/financial-mappings.handler.spec.ts`

**Interfaces:**
- Consumes: `FinancialSettingsService.upsert` (`accounting/financial-settings`, already open before Task 2), `UpsertFinancialSettingBodyDto` (`apps/api/src/modules/accounting/financial-settings/dto` — reused verbatim, no duplicate DTO), `validateAs` (Task 9).
- Produces: implements `SetupTaskHandler` — payload is a single object with the 11 optional GL-slot ids.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/financial-mappings.handler.spec.ts
import { FinancialMappingsTaskHandler } from './financial-mappings.handler';

describe('FinancialMappingsTaskHandler', () => {
    it('validates the payload and delegates to FinancialSettingsService.upsert', async () => {
        const financialSettingsService = { upsert: jest.fn().mockResolvedValue({ id: 'fs-1' }) };
        const handler = new FinancialMappingsTaskHandler(financialSettingsService as never);

        const result = await handler.execute('t1', 'u1', { defaultSalesAccountId: 'acct-1', defaultCashAccountId: 'acct-2' });

        expect(financialSettingsService.upsert).toHaveBeenCalledWith('t1', expect.objectContaining({ defaultSalesAccountId: 'acct-1', defaultCashAccountId: 'acct-2' }));
        expect(result).toEqual({ completed: true, details: {} });
    });

    it('accepts an empty payload — every slot is optional', async () => {
        const financialSettingsService = { upsert: jest.fn().mockResolvedValue({ id: 'fs-1' }) };
        const handler = new FinancialMappingsTaskHandler(financialSettingsService as never);
        await expect(handler.execute('t1', 'u1', {})).resolves.toEqual({ completed: true, details: {} });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- handlers/financial-mappings.handler.spec`
Expected: FAIL — `Cannot find module './financial-mappings.handler'`

- [ ] **Step 3: Implement**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/financial-mappings.handler.ts
import { Injectable } from '@nestjs/common';
import { FinancialSettingsService } from '../../../accounting/financial-settings/services/financial-settings.service';
import { UpsertFinancialSettingBodyDto } from '../../../accounting/financial-settings/dto';
import { validateAs } from '../utils/validate-payload.util';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

@Injectable()
export class FinancialMappingsTaskHandler implements SetupTaskHandler {
    constructor(private readonly financialSettingsService: FinancialSettingsService) {}

    async execute(tenantId: string, _userId: string, payload: unknown): Promise<SetupTaskHandlerResult> {
        const dto = await validateAs(UpsertFinancialSettingBodyDto, payload);
        await this.financialSettingsService.upsert(tenantId, dto);
        return { completed: true, details: {} };
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- handlers/financial-mappings.handler.spec`
Expected: PASS — 2/2 tests

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/handlers/financial-mappings.handler.ts apps/api/src/modules/identity/business-setup/handlers/financial-mappings.handler.spec.ts
git commit -m "feat(business-setup): add FinancialMappingsTaskHandler (Phase 6.3)"
```

---

## Task 13: `CashboxesTaskHandler`

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/handlers/cashboxes.handler.ts`
- Create: `apps/api/src/modules/identity/business-setup/handlers/cashboxes.handler.spec.ts`

**Interfaces:**
- Consumes: `CashboxesService.list`/`.create` and `CreateCashboxDto`, both now re-exported from the `invoicing` barrel (Task 2) — `import { CashboxesService, CreateCashboxDto } from '../../../invoicing'`.
- Produces: implements `SetupTaskHandler` — payload is a bare `CreateCashboxDto[]`. Confirms the spec's "Phase 2 model" note: no GL link is created here — `CashboxesService.create` never touches the posting facade.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/cashboxes.handler.spec.ts
import { CashboxesTaskHandler } from './cashboxes.handler';

function build(existingCodes: string[] = []) {
    const cashboxesService = {
        list: jest.fn().mockResolvedValue({ data: existingCodes.map((code) => ({ code })), total: existingCodes.length }),
        create: jest.fn().mockImplementation((_t: string, dto: { code: string }) => Promise.resolve({ id: `new-${dto.code}`, ...dto })),
    };
    const handler = new CashboxesTaskHandler(cashboxesService as never);
    return { handler, cashboxesService };
}

describe('CashboxesTaskHandler', () => {
    it('creates every cashbox whose code does not already exist', async () => {
        const { handler, cashboxesService } = build(['CASH-USD']);
        const result = await handler.execute('t1', 'u1', [
            { code: 'CASH-USD', name: { ar: 'صندوق دولار', en: 'USD Cash' }, currencyId: 'usd' },
            { code: 'CASH-EUR', name: { ar: 'صندوق يورو', en: 'EUR Cash' }, currencyId: 'eur' },
        ]);
        expect(cashboxesService.create).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ completed: true, details: { created: 1 } });
    });

    it('is idempotent on repeated execution with the same payload', async () => {
        const { handler, cashboxesService } = build([]);
        await handler.execute('t1', 'u1', [{ code: 'CASH-USD', name: { ar: 'ص', en: 'C' }, currencyId: 'usd' }]);
        cashboxesService.list.mockResolvedValue({ data: [{ code: 'CASH-USD' }], total: 1 });
        const result = await handler.execute('t1', 'u1', [{ code: 'CASH-USD', name: { ar: 'ص', en: 'C' }, currencyId: 'usd' }]);
        expect(result.details).toEqual({ created: 0 });
    });

    it('rejects a payload item missing currencyId', async () => {
        const { handler } = build([]);
        await expect(handler.execute('t1', 'u1', [{ code: 'CASH-USD', name: { ar: 'ص', en: 'C' } }])).rejects.toThrow();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- handlers/cashboxes.handler.spec`
Expected: FAIL — `Cannot find module './cashboxes.handler'`

- [ ] **Step 3: Implement**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/cashboxes.handler.ts
import { Injectable } from '@nestjs/common';
import { CashboxesService, CreateCashboxDto } from '../../../invoicing';
import { validateArrayAs } from '../utils/validate-payload.util';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

@Injectable()
export class CashboxesTaskHandler implements SetupTaskHandler {
    constructor(private readonly cashboxesService: CashboxesService) {}

    async execute(tenantId: string, _userId: string, payload: unknown): Promise<SetupTaskHandlerResult> {
        const items = await validateArrayAs(CreateCashboxDto, payload);
        const existing = await this.cashboxesService.list(tenantId, { take: 1000 });
        const existingCodes = new Set(existing.data.map((c) => c.code));

        let created = 0;
        for (const item of items) {
            if (existingCodes.has(item.code)) continue;
            await this.cashboxesService.create(tenantId, item);
            created += 1;
        }

        return { completed: true, details: { created } };
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- handlers/cashboxes.handler.spec`
Expected: PASS — 3/3 tests

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/handlers/cashboxes.handler.ts apps/api/src/modules/identity/business-setup/handlers/cashboxes.handler.spec.ts
git commit -m "feat(business-setup): add CashboxesTaskHandler (Phase 6.3)"
```

---

## Task 14: `BankAccountsTaskHandler`

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/handlers/bank-accounts.handler.ts`
- Create: `apps/api/src/modules/identity/business-setup/handlers/bank-accounts.handler.spec.ts`

**Interfaces:**
- Consumes: `BankAccountsService.list`/`.create` and `CreateBankAccountDto`, both re-exported from the `invoicing` barrel (Task 2).
- Produces: implements `SetupTaskHandler` — payload is a bare `CreateBankAccountDto[]`. Structurally identical to Task 13.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/bank-accounts.handler.spec.ts
import { BankAccountsTaskHandler } from './bank-accounts.handler';

function build(existingCodes: string[] = []) {
    const bankAccountsService = {
        list: jest.fn().mockResolvedValue({ data: existingCodes.map((code) => ({ code })), total: existingCodes.length }),
        create: jest.fn().mockImplementation((_t: string, dto: { code: string }) => Promise.resolve({ id: `new-${dto.code}`, ...dto })),
    };
    const handler = new BankAccountsTaskHandler(bankAccountsService as never);
    return { handler, bankAccountsService };
}

describe('BankAccountsTaskHandler', () => {
    it('creates every bank account whose code does not already exist', async () => {
        const { handler, bankAccountsService } = build(['BANK-USD']);
        const result = await handler.execute('t1', 'u1', [
            { code: 'BANK-USD', name: { ar: 'بنك', en: 'Bank' }, currencyId: 'usd' },
            { code: 'BANK-EUR', name: { ar: 'بنك يورو', en: 'EUR Bank' }, currencyId: 'eur' },
        ]);
        expect(bankAccountsService.create).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ completed: true, details: { created: 1 } });
    });

    it('is idempotent on repeated execution with the same payload', async () => {
        const { handler, bankAccountsService } = build([]);
        await handler.execute('t1', 'u1', [{ code: 'BANK-USD', name: { ar: 'ب', en: 'B' }, currencyId: 'usd' }]);
        bankAccountsService.list.mockResolvedValue({ data: [{ code: 'BANK-USD' }], total: 1 });
        const result = await handler.execute('t1', 'u1', [{ code: 'BANK-USD', name: { ar: 'ب', en: 'B' }, currencyId: 'usd' }]);
        expect(result.details).toEqual({ created: 0 });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- handlers/bank-accounts.handler.spec`
Expected: FAIL — `Cannot find module './bank-accounts.handler'`

- [ ] **Step 3: Implement**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/bank-accounts.handler.ts
import { Injectable } from '@nestjs/common';
import { BankAccountsService, CreateBankAccountDto } from '../../../invoicing';
import { validateArrayAs } from '../utils/validate-payload.util';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

@Injectable()
export class BankAccountsTaskHandler implements SetupTaskHandler {
    constructor(private readonly bankAccountsService: BankAccountsService) {}

    async execute(tenantId: string, _userId: string, payload: unknown): Promise<SetupTaskHandlerResult> {
        const items = await validateArrayAs(CreateBankAccountDto, payload);
        const existing = await this.bankAccountsService.list(tenantId, { take: 1000 });
        const existingCodes = new Set(existing.data.map((c) => c.code));

        let created = 0;
        for (const item of items) {
            if (existingCodes.has(item.code)) continue;
            await this.bankAccountsService.create(tenantId, item);
            created += 1;
        }

        return { completed: true, details: { created } };
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- handlers/bank-accounts.handler.spec`
Expected: PASS — 2/2 tests

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/handlers/bank-accounts.handler.ts apps/api/src/modules/identity/business-setup/handlers/bank-accounts.handler.spec.ts
git commit -m "feat(business-setup): add BankAccountsTaskHandler (Phase 6.3)"
```

---

## Task 15: `FiscalPeriodTaskHandler`

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/handlers/fiscal-period.handler.ts`
- Create: `apps/api/src/modules/identity/business-setup/handlers/fiscal-period.handler.spec.ts`

**Interfaces:**
- Consumes: `FiscalPeriodsService.create` (`accounting/fiscal-periods`, already open), `CreateFiscalPeriodDto` (`apps/api/src/modules/accounting/fiscal-periods/dto`), `validateAs` (Task 9). `FiscalPeriodsService.create` (via `beforeCreate`) already throws `ConflictException`/`BadRequestException` on an overlapping period — mirrored here exactly like `OnboardingService.stepFiscalYear` already does, so idempotency reuses that existing guard rather than a new existence check.
- Produces: implements `SetupTaskHandler` — payload is a single `CreateFiscalPeriodDto`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/fiscal-period.handler.spec.ts
import { BadRequestException, ConflictException } from '@nestjs/common';
import { FiscalPeriodTaskHandler } from './fiscal-period.handler';

describe('FiscalPeriodTaskHandler', () => {
    it('validates the payload and creates the fiscal period', async () => {
        const fiscalPeriodsService = { create: jest.fn().mockResolvedValue({ id: 'fp-1' }) };
        const handler = new FiscalPeriodTaskHandler(fiscalPeriodsService as never);

        const result = await handler.execute('t1', 'u1', { name: 'FY 2026', startDate: '2026-01-01', endDate: '2026-12-31' });

        expect(fiscalPeriodsService.create).toHaveBeenCalledWith('t1', expect.objectContaining({ name: 'FY 2026' }));
        expect(result).toEqual({ completed: true, details: { fiscalPeriodId: 'fp-1' } });
    });

    it('treats an overlapping-period ConflictException as already-satisfied (idempotent)', async () => {
        const fiscalPeriodsService = { create: jest.fn().mockRejectedValue(new ConflictException('overlap')) };
        const handler = new FiscalPeriodTaskHandler(fiscalPeriodsService as never);
        const result = await handler.execute('t1', 'u1', { name: 'FY 2026', startDate: '2026-01-01', endDate: '2026-12-31' });
        expect(result).toEqual({ completed: true, details: { fiscalPeriodId: null } });
    });

    it('rejects an invalid payload before calling the service', async () => {
        const fiscalPeriodsService = { create: jest.fn() };
        const handler = new FiscalPeriodTaskHandler(fiscalPeriodsService as never);
        await expect(handler.execute('t1', 'u1', { name: 'FY 2026' })).rejects.toThrow(BadRequestException);
        expect(fiscalPeriodsService.create).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- handlers/fiscal-period.handler.spec`
Expected: FAIL — `Cannot find module './fiscal-period.handler'`

- [ ] **Step 3: Implement**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/fiscal-period.handler.ts
import { ConflictException, Injectable } from '@nestjs/common';
import { FiscalPeriodsService } from '../../../accounting/fiscal-periods/services/fiscal-periods.service';
import { CreateFiscalPeriodDto } from '../../../accounting/fiscal-periods/dto';
import { validateAs } from '../utils/validate-payload.util';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

@Injectable()
export class FiscalPeriodTaskHandler implements SetupTaskHandler {
    constructor(private readonly fiscalPeriodsService: FiscalPeriodsService) {}

    async execute(tenantId: string, _userId: string, payload: unknown): Promise<SetupTaskHandlerResult> {
        const dto = await validateAs(CreateFiscalPeriodDto, payload);
        try {
            const created = await this.fiscalPeriodsService.create(tenantId, dto);
            return { completed: true, details: { fiscalPeriodId: created.id } };
        } catch (error) {
            if (error instanceof ConflictException) {
                return { completed: true, details: { fiscalPeriodId: null } };
            }
            throw error;
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- handlers/fiscal-period.handler.spec`
Expected: PASS — 3/3 tests

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/handlers/fiscal-period.handler.ts apps/api/src/modules/identity/business-setup/handlers/fiscal-period.handler.spec.ts
git commit -m "feat(business-setup): add FiscalPeriodTaskHandler (Phase 6.3)"
```

---

## Task 16: `DocumentSequencesTaskHandler`

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/handlers/document-sequences.handler.ts`
- Create: `apps/api/src/modules/identity/business-setup/handlers/document-sequences.handler.spec.ts`

**Interfaces:**
- Consumes: `DocumentSequencesService.create` (`accounting/document-sequences`, already open), `CreateDocumentSequenceDto` (`apps/api/src/modules/accounting/document-sequences/dto`), `validateArrayAs` (Task 9). Mirrors `OnboardingService.stepDocumentSequences`'s existing per-item `ConflictException` catch-and-continue idempotency, but as a batch.
- Produces: implements `SetupTaskHandler` — payload is a bare `CreateDocumentSequenceDto[]`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/document-sequences.handler.spec.ts
import { ConflictException } from '@nestjs/common';
import { DocumentSequencesTaskHandler } from './document-sequences.handler';

describe('DocumentSequencesTaskHandler', () => {
    it('creates every sequence and reports the created count', async () => {
        const documentSequencesService = { create: jest.fn().mockResolvedValue({ id: 'seq-1' }) };
        const handler = new DocumentSequencesTaskHandler(documentSequencesService as never);

        const result = await handler.execute('t1', 'u1', [
            { documentType: 'SALES_INVOICE', prefix: 'INV-' },
            { documentType: 'PAYMENT', prefix: 'PAY-' },
        ]);

        expect(documentSequencesService.create).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ completed: true, details: { created: 2 } });
    });

    it('is idempotent — a ConflictException for an already-existing document type does not fail the batch', async () => {
        const documentSequencesService = {
            create: jest.fn()
                .mockRejectedValueOnce(new ConflictException('exists'))
                .mockResolvedValueOnce({ id: 'seq-2' }),
        };
        const handler = new DocumentSequencesTaskHandler(documentSequencesService as never);

        const result = await handler.execute('t1', 'u1', [
            { documentType: 'SALES_INVOICE', prefix: 'INV-' },
            { documentType: 'PAYMENT', prefix: 'PAY-' },
        ]);

        expect(result).toEqual({ completed: true, details: { created: 1 } });
    });

    it('propagates non-conflict errors', async () => {
        const documentSequencesService = { create: jest.fn().mockRejectedValue(new Error('db down')) };
        const handler = new DocumentSequencesTaskHandler(documentSequencesService as never);
        await expect(handler.execute('t1', 'u1', [{ documentType: 'SALES_INVOICE', prefix: 'INV-' }])).rejects.toThrow('db down');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- handlers/document-sequences.handler.spec`
Expected: FAIL — `Cannot find module './document-sequences.handler'`

- [ ] **Step 3: Implement**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/document-sequences.handler.ts
import { ConflictException, Injectable } from '@nestjs/common';
import { DocumentSequencesService } from '../../../accounting/document-sequences/services/document-sequences.service';
import { CreateDocumentSequenceDto } from '../../../accounting/document-sequences/dto';
import { validateArrayAs } from '../utils/validate-payload.util';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

@Injectable()
export class DocumentSequencesTaskHandler implements SetupTaskHandler {
    constructor(private readonly documentSequencesService: DocumentSequencesService) {}

    async execute(tenantId: string, _userId: string, payload: unknown): Promise<SetupTaskHandlerResult> {
        const items = await validateArrayAs(CreateDocumentSequenceDto, payload);

        let created = 0;
        for (const item of items) {
            try {
                await this.documentSequencesService.create(tenantId, item);
                created += 1;
            } catch (error) {
                if (error instanceof ConflictException) continue;
                throw error;
            }
        }

        return { completed: true, details: { created } };
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- handlers/document-sequences.handler.spec`
Expected: PASS — 3/3 tests

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/handlers/document-sequences.handler.ts apps/api/src/modules/identity/business-setup/handlers/document-sequences.handler.spec.ts
git commit -m "feat(business-setup): add DocumentSequencesTaskHandler (Phase 6.3)"
```

---

## Task 17: `OpeningCashBalancesTaskHandler`

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/handlers/opening-cash-balances.handler.ts`
- Create: `apps/api/src/modules/identity/business-setup/handlers/opening-cash-balances.handler.spec.ts`

**Interfaces:**
- Consumes: `OpeningCashService.post(tenantId, userId, OpeningCashPostInput): Promise<{journalEntryId}>` (`accounting/opening-balances`, opened Task 2). `OpeningCashPostInput` is a plain interface (not class-validator-decorated), so this handler defines its own small local `OpeningCashLineDto` for payload validation — this is not a duplicate business DTO, it is the request-shape validator for a service whose own input type was never meant to cross an HTTP-adjacent boundary. `PrismaService` is used only for the pre-post idempotency read (`JournalLine` rows tagged `referenceType: 'OPENING_BALANCE'`), the same read-only cross-cutting exception `BusinessSetupDiscoveryService` already relies on (Task 6) — the actual write goes through `OpeningCashService.post`.
- Produces: implements `SetupTaskHandler` — payload is a bare array of cash opening lines.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/opening-cash-balances.handler.spec.ts
import { OpeningCashBalancesTaskHandler } from './opening-cash-balances.handler';

function build(alreadyPosted: string[] = []) {
    const openingCashService = { post: jest.fn().mockResolvedValue({ journalEntryId: 'je-1' }) };
    const prisma = {
        journalLine: {
            findFirst: jest.fn().mockImplementation(({ where }: { where: { cashboxId: string } }) =>
                Promise.resolve(alreadyPosted.includes(where.cashboxId) ? { id: 'existing-line' } : null)),
        },
    };
    const handler = new OpeningCashBalancesTaskHandler(openingCashService as never, prisma as never);
    return { handler, openingCashService, prisma };
}

describe('OpeningCashBalancesTaskHandler', () => {
    it('posts every line whose cashbox has no existing OPENING_BALANCE journal line', async () => {
        const { handler, openingCashService } = build(['cashbox-already-posted']);
        const result = await handler.execute('t1', 'u1', [
            { cashboxId: 'cashbox-already-posted', currencyId: 'usd', amount: 100, fiscalPeriodId: 'fp-1' },
            { cashboxId: 'cashbox-new', currencyId: 'usd', amount: 200, fiscalPeriodId: 'fp-1' },
        ]);

        expect(openingCashService.post).toHaveBeenCalledTimes(1);
        expect(openingCashService.post).toHaveBeenCalledWith('t1', 'u1', expect.objectContaining({ cashboxId: 'cashbox-new', amount: 200 }));
        expect(result).toEqual({ completed: true, details: { posted: 1 } });
    });

    it('rejects a line missing fiscalPeriodId', async () => {
        const { handler } = build([]);
        await expect(handler.execute('t1', 'u1', [{ cashboxId: 'c1', currencyId: 'usd', amount: 100 }])).rejects.toThrow();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- handlers/opening-cash-balances.handler.spec`
Expected: FAIL — `Cannot find module './opening-cash-balances.handler'`

- [ ] **Step 3: Implement**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/opening-cash-balances.handler.ts
import { Injectable } from '@nestjs/common';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { OpeningCashService } from '../../../accounting/opening-balances';
import { validateArrayAs } from '../utils/validate-payload.util';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

class OpeningCashLineDto {
    @IsString() @IsNotEmpty()
    cashboxId: string = '';

    @IsString() @IsNotEmpty()
    currencyId: string = '';

    @IsNumber()
    amount: number = 0;

    @IsOptional() @IsNumber()
    exchangeRate?: number;

    @IsString() @IsNotEmpty()
    fiscalPeriodId: string = '';

    @IsOptional() @IsString()
    description?: string;
}

@Injectable()
export class OpeningCashBalancesTaskHandler implements SetupTaskHandler {
    constructor(
        private readonly openingCashService: OpeningCashService,
        private readonly prisma: PrismaService,
    ) {}

    async execute(tenantId: string, userId: string, payload: unknown): Promise<SetupTaskHandlerResult> {
        const lines = await validateArrayAs(OpeningCashLineDto, payload);

        let posted = 0;
        for (const line of lines) {
            const alreadyPosted = await this.prisma.journalLine.findFirst({
                where: { tenantId, cashboxId: line.cashboxId, journalEntry: { referenceType: 'OPENING_BALANCE' } },
            });
            if (alreadyPosted) continue;

            await this.openingCashService.post(tenantId, userId, {
                cashboxId: line.cashboxId,
                currencyId: line.currencyId,
                amount: line.amount,
                exchangeRate: line.exchangeRate,
                fiscalPeriodId: line.fiscalPeriodId,
                description: line.description,
            });
            posted += 1;
        }

        return { completed: true, details: { posted } };
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- handlers/opening-cash-balances.handler.spec`
Expected: PASS — 2/2 tests

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/handlers/opening-cash-balances.handler.ts apps/api/src/modules/identity/business-setup/handlers/opening-cash-balances.handler.spec.ts
git commit -m "feat(business-setup): add OpeningCashBalancesTaskHandler (Phase 6.3)"
```

---

## Task 18: `OpeningBankBalancesTaskHandler`

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/handlers/opening-bank-balances.handler.ts`
- Create: `apps/api/src/modules/identity/business-setup/handlers/opening-bank-balances.handler.spec.ts`

**Interfaces:**
- Consumes: `OpeningBankService.post` (`accounting/opening-balances`). Structurally identical to Task 17 with `bankAccountId` in place of `cashboxId`.
- Produces: implements `SetupTaskHandler`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/opening-bank-balances.handler.spec.ts
import { OpeningBankBalancesTaskHandler } from './opening-bank-balances.handler';

function build(alreadyPosted: string[] = []) {
    const openingBankService = { post: jest.fn().mockResolvedValue({ journalEntryId: 'je-1' }) };
    const prisma = {
        journalLine: {
            findFirst: jest.fn().mockImplementation(({ where }: { where: { bankAccountId: string } }) =>
                Promise.resolve(alreadyPosted.includes(where.bankAccountId) ? { id: 'existing-line' } : null)),
        },
    };
    const handler = new OpeningBankBalancesTaskHandler(openingBankService as never, prisma as never);
    return { handler, openingBankService };
}

describe('OpeningBankBalancesTaskHandler', () => {
    it('posts every line whose bank account has no existing OPENING_BALANCE journal line', async () => {
        const { handler, openingBankService } = build(['bank-already-posted']);
        const result = await handler.execute('t1', 'u1', [
            { bankAccountId: 'bank-already-posted', currencyId: 'usd', amount: 500, fiscalPeriodId: 'fp-1' },
            { bankAccountId: 'bank-new', currencyId: 'usd', amount: 900, fiscalPeriodId: 'fp-1' },
        ]);

        expect(openingBankService.post).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ completed: true, details: { posted: 1 } });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- handlers/opening-bank-balances.handler.spec`
Expected: FAIL — `Cannot find module './opening-bank-balances.handler'`

- [ ] **Step 3: Implement**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/opening-bank-balances.handler.ts
import { Injectable } from '@nestjs/common';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { OpeningBankService } from '../../../accounting/opening-balances';
import { validateArrayAs } from '../utils/validate-payload.util';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

class OpeningBankLineDto {
    @IsString() @IsNotEmpty()
    bankAccountId: string = '';

    @IsString() @IsNotEmpty()
    currencyId: string = '';

    @IsNumber()
    amount: number = 0;

    @IsOptional() @IsNumber()
    exchangeRate?: number;

    @IsString() @IsNotEmpty()
    fiscalPeriodId: string = '';

    @IsOptional() @IsString()
    description?: string;
}

@Injectable()
export class OpeningBankBalancesTaskHandler implements SetupTaskHandler {
    constructor(
        private readonly openingBankService: OpeningBankService,
        private readonly prisma: PrismaService,
    ) {}

    async execute(tenantId: string, userId: string, payload: unknown): Promise<SetupTaskHandlerResult> {
        const lines = await validateArrayAs(OpeningBankLineDto, payload);

        let posted = 0;
        for (const line of lines) {
            const alreadyPosted = await this.prisma.journalLine.findFirst({
                where: { tenantId, bankAccountId: line.bankAccountId, journalEntry: { referenceType: 'OPENING_BALANCE' } },
            });
            if (alreadyPosted) continue;

            await this.openingBankService.post(tenantId, userId, {
                bankAccountId: line.bankAccountId,
                currencyId: line.currencyId,
                amount: line.amount,
                exchangeRate: line.exchangeRate,
                fiscalPeriodId: line.fiscalPeriodId,
                description: line.description,
            });
            posted += 1;
        }

        return { completed: true, details: { posted } };
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- handlers/opening-bank-balances.handler.spec`
Expected: PASS — 1/1 test

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/handlers/opening-bank-balances.handler.ts apps/api/src/modules/identity/business-setup/handlers/opening-bank-balances.handler.spec.ts
git commit -m "feat(business-setup): add OpeningBankBalancesTaskHandler (Phase 6.3)"
```

---

## Task 19: `OpeningReceivablesTaskHandler`

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/handlers/opening-receivables.handler.ts`
- Create: `apps/api/src/modules/identity/business-setup/handlers/opening-receivables.handler.spec.ts`

**Interfaces:**
- Consumes: `PartyOpeningBalanceService.post(tenantId, userId, PartyOpeningPostInput)` with `partySide` fixed to `'AR'` (`accounting/opening-balances`).
- Produces: implements `SetupTaskHandler` — payload is a bare array of `{ partyId, currencyId, amount, exchangeRate?, fiscalPeriodId, description? }` (no `partySide` field — this handler hardcodes `'AR'`, `OpeningPayablesTaskHandler` in Task 20 hardcodes `'AP'`, so a caller cannot post the wrong side through the wrong endpoint).

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/opening-receivables.handler.spec.ts
import { OpeningReceivablesTaskHandler } from './opening-receivables.handler';

function build(alreadyPostedPartyIds: string[] = []) {
    const partyOpeningBalanceService = { post: jest.fn().mockResolvedValue({ journalEntryId: 'je-1' }) };
    const prisma = {
        journalLine: {
            findFirst: jest.fn().mockImplementation(({ where }: { where: { partyId: string } }) =>
                Promise.resolve(alreadyPostedPartyIds.includes(where.partyId) ? { id: 'existing-line' } : null)),
        },
    };
    const handler = new OpeningReceivablesTaskHandler(partyOpeningBalanceService as never, prisma as never);
    return { handler, partyOpeningBalanceService };
}

describe('OpeningReceivablesTaskHandler', () => {
    it('posts every AR line whose party has no existing OPENING_BALANCE journal line, hardcoding partySide AR', async () => {
        const { handler, partyOpeningBalanceService } = build(['party-already-posted']);
        const result = await handler.execute('t1', 'u1', [
            { partyId: 'party-already-posted', currencyId: 'usd', amount: 250, fiscalPeriodId: 'fp-1' },
            { partyId: 'party-new', currencyId: 'usd', amount: 400, fiscalPeriodId: 'fp-1' },
        ]);

        expect(partyOpeningBalanceService.post).toHaveBeenCalledTimes(1);
        expect(partyOpeningBalanceService.post).toHaveBeenCalledWith('t1', 'u1', expect.objectContaining({ partyId: 'party-new', partySide: 'AR' }));
        expect(result).toEqual({ completed: true, details: { posted: 1 } });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- handlers/opening-receivables.handler.spec`
Expected: FAIL — `Cannot find module './opening-receivables.handler'`

- [ ] **Step 3: Implement**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/opening-receivables.handler.ts
import { Injectable } from '@nestjs/common';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { PartyOpeningBalanceService } from '../../../accounting/opening-balances';
import { validateArrayAs } from '../utils/validate-payload.util';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

class OpeningPartyLineDto {
    @IsString() @IsNotEmpty()
    partyId: string = '';

    @IsString() @IsNotEmpty()
    currencyId: string = '';

    @IsNumber()
    amount: number = 0;

    @IsOptional() @IsNumber()
    exchangeRate?: number;

    @IsString() @IsNotEmpty()
    fiscalPeriodId: string = '';

    @IsOptional() @IsString()
    description?: string;
}

@Injectable()
export class OpeningReceivablesTaskHandler implements SetupTaskHandler {
    constructor(
        private readonly partyOpeningBalanceService: PartyOpeningBalanceService,
        private readonly prisma: PrismaService,
    ) {}

    async execute(tenantId: string, userId: string, payload: unknown): Promise<SetupTaskHandlerResult> {
        const lines = await validateArrayAs(OpeningPartyLineDto, payload);

        let posted = 0;
        for (const line of lines) {
            const alreadyPosted = await this.prisma.journalLine.findFirst({
                where: { tenantId, partyId: line.partyId, journalEntry: { referenceType: 'OPENING_BALANCE' } },
            });
            if (alreadyPosted) continue;

            await this.partyOpeningBalanceService.post(tenantId, userId, {
                partyId: line.partyId,
                partySide: 'AR',
                currencyId: line.currencyId,
                amount: line.amount,
                exchangeRate: line.exchangeRate,
                fiscalPeriodId: line.fiscalPeriodId,
                description: line.description,
            });
            posted += 1;
        }

        return { completed: true, details: { posted } };
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- handlers/opening-receivables.handler.spec`
Expected: PASS — 1/1 test

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/handlers/opening-receivables.handler.ts apps/api/src/modules/identity/business-setup/handlers/opening-receivables.handler.spec.ts
git commit -m "feat(business-setup): add OpeningReceivablesTaskHandler (Phase 6.3)"
```

---

## Task 20: `OpeningPayablesTaskHandler`

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/handlers/opening-payables.handler.ts`
- Create: `apps/api/src/modules/identity/business-setup/handlers/opening-payables.handler.spec.ts`

**Interfaces:**
- Consumes: `PartyOpeningBalanceService.post` with `partySide` fixed to `'AP'`. Identical shape to Task 19.
- Produces: implements `SetupTaskHandler`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/opening-payables.handler.spec.ts
import { OpeningPayablesTaskHandler } from './opening-payables.handler';

function build(alreadyPostedPartyIds: string[] = []) {
    const partyOpeningBalanceService = { post: jest.fn().mockResolvedValue({ journalEntryId: 'je-1' }) };
    const prisma = {
        journalLine: {
            findFirst: jest.fn().mockImplementation(({ where }: { where: { partyId: string } }) =>
                Promise.resolve(alreadyPostedPartyIds.includes(where.partyId) ? { id: 'existing-line' } : null)),
        },
    };
    const handler = new OpeningPayablesTaskHandler(partyOpeningBalanceService as never, prisma as never);
    return { handler, partyOpeningBalanceService };
}

describe('OpeningPayablesTaskHandler', () => {
    it('posts every AP line whose party has no existing OPENING_BALANCE journal line, hardcoding partySide AP', async () => {
        const { handler, partyOpeningBalanceService } = build(['party-already-posted']);
        const result = await handler.execute('t1', 'u1', [
            { partyId: 'party-already-posted', currencyId: 'usd', amount: 250, fiscalPeriodId: 'fp-1' },
            { partyId: 'party-new', currencyId: 'usd', amount: 400, fiscalPeriodId: 'fp-1' },
        ]);

        expect(partyOpeningBalanceService.post).toHaveBeenCalledTimes(1);
        expect(partyOpeningBalanceService.post).toHaveBeenCalledWith('t1', 'u1', expect.objectContaining({ partyId: 'party-new', partySide: 'AP' }));
        expect(result).toEqual({ completed: true, details: { posted: 1 } });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- handlers/opening-payables.handler.spec`
Expected: FAIL — `Cannot find module './opening-payables.handler'`

- [ ] **Step 3: Implement**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/opening-payables.handler.ts
import { Injectable } from '@nestjs/common';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { PartyOpeningBalanceService } from '../../../accounting/opening-balances';
import { validateArrayAs } from '../utils/validate-payload.util';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

class OpeningPartyLineDto {
    @IsString() @IsNotEmpty()
    partyId: string = '';

    @IsString() @IsNotEmpty()
    currencyId: string = '';

    @IsNumber()
    amount: number = 0;

    @IsOptional() @IsNumber()
    exchangeRate?: number;

    @IsString() @IsNotEmpty()
    fiscalPeriodId: string = '';

    @IsOptional() @IsString()
    description?: string;
}

@Injectable()
export class OpeningPayablesTaskHandler implements SetupTaskHandler {
    constructor(
        private readonly partyOpeningBalanceService: PartyOpeningBalanceService,
        private readonly prisma: PrismaService,
    ) {}

    async execute(tenantId: string, userId: string, payload: unknown): Promise<SetupTaskHandlerResult> {
        const lines = await validateArrayAs(OpeningPartyLineDto, payload);

        let posted = 0;
        for (const line of lines) {
            const alreadyPosted = await this.prisma.journalLine.findFirst({
                where: { tenantId, partyId: line.partyId, journalEntry: { referenceType: 'OPENING_BALANCE' } },
            });
            if (alreadyPosted) continue;

            await this.partyOpeningBalanceService.post(tenantId, userId, {
                partyId: line.partyId,
                partySide: 'AP',
                currencyId: line.currencyId,
                amount: line.amount,
                exchangeRate: line.exchangeRate,
                fiscalPeriodId: line.fiscalPeriodId,
                description: line.description,
            });
            posted += 1;
        }

        return { completed: true, details: { posted } };
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- handlers/opening-payables.handler.spec`
Expected: PASS — 1/1 test

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/handlers/opening-payables.handler.ts apps/api/src/modules/identity/business-setup/handlers/opening-payables.handler.spec.ts
git commit -m "feat(business-setup): add OpeningPayablesTaskHandler (Phase 6.3)"
```

---

## Task 21: `ReconciliationTaskHandler`

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/handlers/reconciliation.handler.ts`
- Create: `apps/api/src/modules/identity/business-setup/handlers/reconciliation.handler.spec.ts`
- Create: `apps/api/src/modules/identity/business-setup/handlers/index.ts`

**Interfaces:**
- Consumes: `ReconciliationMonitorService.runForTenant(tenantId, 'BUSINESS_SETUP'): Promise<ReconciliationRunResponseDto>` (`accounting/reconciliation`, opened Task 2) — the file's own doc comment already names this exact call site as its Phase 6 consumer.
- Produces: implements `SetupTaskHandler` — the only handler whose `completed` can be `false` (gates `businessSetupCompletedAt`, per the phase-10 spec's "businessSetupCompletedAt set only when reconciliation passes"). Also finalizes `handlers/index.ts`, the barrel Task 22's orchestrator imports from.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/reconciliation.handler.spec.ts
import { ReconciliationTaskHandler } from './reconciliation.handler';

describe('ReconciliationTaskHandler', () => {
    it('marks the task completed when the reconciliation run passes', async () => {
        const reconciliationMonitor = {
            runForTenant: jest.fn().mockResolvedValue({ id: 'run-1', passed: true, findingCount: 0, newFindings: [] }),
        };
        const handler = new ReconciliationTaskHandler(reconciliationMonitor as never);

        const result = await handler.execute('t1', 'u1', undefined);

        expect(reconciliationMonitor.runForTenant).toHaveBeenCalledWith('t1', 'BUSINESS_SETUP');
        expect(result).toEqual({ completed: true, details: { runId: 'run-1', findingCount: 0, newFindings: [] } });
    });

    it('does not mark the task completed when the reconciliation run fails — stays retryable', async () => {
        const reconciliationMonitor = {
            runForTenant: jest.fn().mockResolvedValue({ id: 'run-2', passed: false, findingCount: 3, newFindings: ['unbalanced-je'] }),
        };
        const handler = new ReconciliationTaskHandler(reconciliationMonitor as never);

        const result = await handler.execute('t1', 'u1', undefined);

        expect(result).toEqual({ completed: false, details: { runId: 'run-2', findingCount: 3, newFindings: ['unbalanced-je'] } });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- handlers/reconciliation.handler.spec`
Expected: FAIL — `Cannot find module './reconciliation.handler'`

- [ ] **Step 3: Implement**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/reconciliation.handler.ts
import { Injectable } from '@nestjs/common';
import { ReconciliationMonitorService } from '../../../accounting/reconciliation';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

@Injectable()
export class ReconciliationTaskHandler implements SetupTaskHandler {
    constructor(private readonly reconciliationMonitor: ReconciliationMonitorService) {}

    async execute(tenantId: string): Promise<SetupTaskHandlerResult> {
        const run = await this.reconciliationMonitor.runForTenant(tenantId, 'BUSINESS_SETUP');
        return {
            completed: run.passed,
            details: { runId: run.id, findingCount: run.findingCount, newFindings: run.newFindings },
        };
    }
}
```

```typescript
// apps/api/src/modules/identity/business-setup/handlers/index.ts
export * from './setup-task-handler.interface';
export * from './currencies.handler';
export * from './chart-of-accounts.handler';
export * from './financial-mappings.handler';
export * from './cashboxes.handler';
export * from './bank-accounts.handler';
export * from './fiscal-period.handler';
export * from './document-sequences.handler';
export * from './opening-cash-balances.handler';
export * from './opening-bank-balances.handler';
export * from './opening-receivables.handler';
export * from './opening-payables.handler';
export * from './reconciliation.handler';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- handlers/reconciliation.handler.spec`
Expected: PASS — 2/2 tests

- [ ] **Step 5: Verify the whole handlers directory**

Run: `pnpm --filter @devloggers/api test -- business-setup/handlers`
Expected: PASS — all 12 handler spec files, 26 tests total

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/handlers
git commit -m "feat(business-setup): add ReconciliationTaskHandler + handlers barrel (Phase 6.3, Phase 7 hook)"
```

---

## Task 22: `BusinessSetupOrchestratorService`

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/services/business-setup-orchestrator.service.ts`
- Create: `apps/api/src/modules/identity/business-setup/services/business-setup-orchestrator.service.spec.ts`

**Interfaces:**
- Consumes: `BusinessSetupTaskService` (Task 8), all 12 handlers (Tasks 10–21, via `handlers/index.ts`), `RequestContext.run` (`apps/api/src/common/request-context/request-context.ts`).
- Produces: `BusinessSetupOrchestratorService.execute(tenantId: string, userId: string, type: SetupTaskType, payload: unknown): Promise<SetupTask>` — consumed by Task 23's controller `PATCH /business-setup/tasks/:type` route. This is the Phase 7 hook point named in the spec: *"wrap each handler in `RequestContext.run({ source: 'BUSINESS_SETUP', metadata: { taskType } }, …)` so audit rows carry `source = 'BUSINESS_SETUP'`."*

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/modules/identity/business-setup/services/business-setup-orchestrator.service.spec.ts
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { BusinessSetupOrchestratorService } from './business-setup-orchestrator.service';
import { RequestContext } from '../../../../common/request-context/request-context';
import type { SetupTask } from '@devloggers/db-prisma';

function makeTask(overrides: Partial<SetupTask>): SetupTask {
    return {
        id: 'id-1', tenantId: 't1', required: true, dependencies: [], metadata: null, progress: null,
        completedAt: null, createdAt: new Date(), updatedAt: new Date(), status: 'READY',
        ...overrides,
    } as SetupTask;
}

function build(task: SetupTask | null) {
    const taskService = {
        getTaskOrFail: jest.fn().mockImplementation(() => {
            if (!task) throw new NotFoundException('not found');
            return Promise.resolve(task);
        }),
        recordAttempt: jest.fn().mockResolvedValue(undefined),
    };
    const currencies = { execute: jest.fn().mockResolvedValue({ completed: true, details: { created: 1 } }) };
    const chartOfAccounts = { execute: jest.fn() };
    const financialMappings = { execute: jest.fn() };
    const cashboxes = { execute: jest.fn() };
    const bankAccounts = { execute: jest.fn() };
    const fiscalPeriod = { execute: jest.fn() };
    const documentSequences = { execute: jest.fn() };
    const openingCashBalances = { execute: jest.fn() };
    const openingBankBalances = { execute: jest.fn() };
    const openingReceivables = { execute: jest.fn() };
    const openingPayables = { execute: jest.fn() };
    const reconciliation = { execute: jest.fn() };

    const orchestrator = new BusinessSetupOrchestratorService(
        taskService as never, currencies as never, chartOfAccounts as never, financialMappings as never,
        cashboxes as never, bankAccounts as never, fiscalPeriod as never, documentSequences as never,
        openingCashBalances as never, openingBankBalances as never, openingReceivables as never,
        openingPayables as never, reconciliation as never,
    );
    return { orchestrator, taskService, currencies };
}

describe('BusinessSetupOrchestratorService.execute', () => {
    it('propagates NotFoundException when the task row does not exist', async () => {
        const { orchestrator } = build(null);
        await expect(orchestrator.execute('t1', 'u1', 'CURRENCIES', [])).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the task is not READY', async () => {
        const { orchestrator } = build(makeTask({ type: 'CURRENCIES' as never, status: 'BLOCKED' }));
        await expect(orchestrator.execute('t1', 'u1', 'CURRENCIES', [])).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException for a discovery-only type with no registered handler', async () => {
        const { orchestrator } = build(makeTask({ type: 'WAREHOUSES' as never, status: 'READY' }));
        await expect(orchestrator.execute('t1', 'u1', 'WAREHOUSES', [])).rejects.toThrow(BadRequestException);
    });

    it('dispatches to the matching handler and records the attempt', async () => {
        const { orchestrator, taskService, currencies } = build(makeTask({ type: 'CURRENCIES' as never, status: 'READY' }));
        await orchestrator.execute('t1', 'u1', 'CURRENCIES' as never, [{ code: 'USD' }]);

        expect(currencies.execute).toHaveBeenCalledWith('t1', 'u1', [{ code: 'USD' }]);
        expect(taskService.recordAttempt).toHaveBeenCalledWith('t1', 'CURRENCIES', true, { created: 1 });
    });

    it('wraps handler execution in RequestContext.run with source BUSINESS_SETUP and metadata.taskType', async () => {
        let observedSource: string | undefined;
        let observedTaskType: unknown;
        const { orchestrator } = build(makeTask({ type: 'CURRENCIES' as never, status: 'READY' }));
        const currenciesHandler = { execute: jest.fn().mockImplementation(() => {
            const ctx = RequestContext.get();
            observedSource = ctx?.source;
            observedTaskType = (ctx?.metadata as Record<string, unknown> | undefined)?.taskType;
            return Promise.resolve({ completed: true, details: {} });
        }) };
        (orchestrator as unknown as { handlers: Map<string, unknown> })['handlers'].set('CURRENCIES', currenciesHandler);

        await orchestrator.execute('t1', 'u1', 'CURRENCIES' as never, []);

        expect(observedSource).toBe('BUSINESS_SETUP');
        expect(observedTaskType).toBe('CURRENCIES');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- business-setup-orchestrator.service.spec`
Expected: FAIL — `Cannot find module './business-setup-orchestrator.service'`

- [ ] **Step 3: Implement**

```typescript
// apps/api/src/modules/identity/business-setup/services/business-setup-orchestrator.service.ts
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { SetupTask, SetupTaskType } from '@devloggers/db-prisma';
import { RequestContext } from '../../../../common/request-context/request-context';
import { BusinessSetupTaskService } from './business-setup-task.service';
import {
    CurrenciesTaskHandler,
    ChartOfAccountsTaskHandler,
    FinancialMappingsTaskHandler,
    CashboxesTaskHandler,
    BankAccountsTaskHandler,
    FiscalPeriodTaskHandler,
    DocumentSequencesTaskHandler,
    OpeningCashBalancesTaskHandler,
    OpeningBankBalancesTaskHandler,
    OpeningReceivablesTaskHandler,
    OpeningPayablesTaskHandler,
    ReconciliationTaskHandler,
    type SetupTaskHandler,
} from '../handlers';

@Injectable()
export class BusinessSetupOrchestratorService {
    private readonly handlers: Map<SetupTaskType, SetupTaskHandler>;

    constructor(
        private readonly taskService: BusinessSetupTaskService,
        currencies: CurrenciesTaskHandler,
        chartOfAccounts: ChartOfAccountsTaskHandler,
        financialMappings: FinancialMappingsTaskHandler,
        cashboxes: CashboxesTaskHandler,
        bankAccounts: BankAccountsTaskHandler,
        fiscalPeriod: FiscalPeriodTaskHandler,
        documentSequences: DocumentSequencesTaskHandler,
        openingCashBalances: OpeningCashBalancesTaskHandler,
        openingBankBalances: OpeningBankBalancesTaskHandler,
        openingReceivables: OpeningReceivablesTaskHandler,
        openingPayables: OpeningPayablesTaskHandler,
        reconciliation: ReconciliationTaskHandler,
    ) {
        this.handlers = new Map<SetupTaskType, SetupTaskHandler>([
            ['CURRENCIES', currencies],
            ['CHART_OF_ACCOUNTS', chartOfAccounts],
            ['FINANCIAL_MAPPINGS', financialMappings],
            ['CASHBOXES', cashboxes],
            ['BANK_ACCOUNTS', bankAccounts],
            ['FISCAL_PERIOD', fiscalPeriod],
            ['DOCUMENT_SEQUENCES', documentSequences],
            ['OPENING_CASH_BALANCES', openingCashBalances],
            ['OPENING_BANK_BALANCES', openingBankBalances],
            ['OPENING_RECEIVABLES', openingReceivables],
            ['OPENING_PAYABLES', openingPayables],
            ['RECONCILIATION', reconciliation],
        ]);
    }

    async execute(tenantId: string, userId: string, type: SetupTaskType, payload: unknown): Promise<SetupTask> {
        const task = await this.taskService.getTaskOrFail(tenantId, type);
        if (task.status !== 'READY') {
            throw new ConflictException(`Setup task "${type}" is not ready (current status: ${task.status})`);
        }

        const handler = this.handlers.get(type);
        if (!handler) {
            throw new BadRequestException(`Setup task "${type}" has no executable handler; complete it via its own resource page`);
        }

        const result = await RequestContext.run(
            { source: 'BUSINESS_SETUP', metadata: { taskType: type } },
            () => handler.execute(tenantId, userId, payload),
        );

        await this.taskService.recordAttempt(tenantId, type, result.completed, result.details);
        return this.taskService.getTaskOrFail(tenantId, type);
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @devloggers/api test -- business-setup-orchestrator.service.spec`
Expected: PASS — 5/5 tests

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/services/business-setup-orchestrator.service.ts apps/api/src/modules/identity/business-setup/services/business-setup-orchestrator.service.spec.ts
git commit -m "feat(business-setup): add BusinessSetupOrchestratorService (Phase 6.2.4, Phase 7 hook)"
```

---

## Task 23: DTOs, presenter, controller, module wiring, `pnpm generate`

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/dto/business-setup-profile.dto.ts`
- Create: `apps/api/src/modules/identity/business-setup/dto/setup-task-response.dto.ts`
- Create: `apps/api/src/modules/identity/business-setup/dto/business-setup-state-response.dto.ts`
- Create: `apps/api/src/modules/identity/business-setup/dto/index.ts`
- Create: `apps/api/src/modules/identity/business-setup/presenters/setup-task.presenter.ts`
- Create: `apps/api/src/modules/identity/business-setup/services/business-setup-profile.service.ts`
- Create: `apps/api/src/modules/identity/business-setup/services/business-setup-profile.service.spec.ts`
- Create: `apps/api/src/modules/identity/business-setup/controllers/business-setup.controller.ts`
- Create: `apps/api/src/modules/identity/business-setup/business-setup.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: every service and handler from Tasks 4–22.
- Produces: `GET /business-setup/state`, `GET /business-setup/plan`, `POST /business-setup/profile`, `PATCH /business-setup/tasks/:type` — consumed by Task 24 (`packages/api-contracts` resource, once `pnpm generate` has run) and Task 29 (dashboard onboarding profile step + `/setup` page).

- [ ] **Step 1: `BusinessSetupProfileService` — the one Tenant-scalar read/write (same precedent as `OnboardingService`)**

```typescript
// apps/api/src/modules/identity/business-setup/services/business-setup-profile.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { BusinessSetupProfileModules } from '../constants/setup-task-graph';

const DEFAULT_PROFILE: BusinessSetupProfileModules = { inventory: true, sales: true, purchasing: true, accounting: true };

@Injectable()
export class BusinessSetupProfileService {
    constructor(private readonly prisma: PrismaService) {}

    async getProfile(tenantId: string): Promise<BusinessSetupProfileModules> {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { businessSetupProfile: true } });
        const stored = tenant?.businessSetupProfile as Partial<BusinessSetupProfileModules> | null;
        return stored ? { ...DEFAULT_PROFILE, ...stored } : DEFAULT_PROFILE;
    }

    async setProfile(tenantId: string, profile: BusinessSetupProfileModules): Promise<void> {
        await this.prisma.tenant.update({ where: { id: tenantId }, data: { businessSetupProfile: profile } });
    }
}
```

Write its failing test first, then implement (Steps below fold the red-green cycle into one block since the service is 10 lines of direct Prisma calls — mirroring how `SetupTasksRepository`, Task 5, skipped a dedicated spec; this one gets a spec because it has real branching logic in `getProfile`'s default-merge):

```typescript
// apps/api/src/modules/identity/business-setup/services/business-setup-profile.service.spec.ts
import { BusinessSetupProfileService } from './business-setup-profile.service';

describe('BusinessSetupProfileService', () => {
    it('returns the all-enabled default when no profile has been saved', async () => {
        const prisma = { tenant: { findUnique: jest.fn().mockResolvedValue({ businessSetupProfile: null }), update: jest.fn() } };
        const service = new BusinessSetupProfileService(prisma as never);
        expect(await service.getProfile('t1')).toEqual({ inventory: true, sales: true, purchasing: true, accounting: true });
    });

    it('merges a partially-saved profile over the defaults', async () => {
        const prisma = { tenant: { findUnique: jest.fn().mockResolvedValue({ businessSetupProfile: { inventory: false } }), update: jest.fn() } };
        const service = new BusinessSetupProfileService(prisma as never);
        expect(await service.getProfile('t1')).toEqual({ inventory: false, sales: true, purchasing: true, accounting: true });
    });

    it('persists the full profile object via tenant.update', async () => {
        const prisma = { tenant: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) } };
        const service = new BusinessSetupProfileService(prisma as never);
        await service.setProfile('t1', { inventory: false, sales: true, purchasing: false, accounting: true });
        expect(prisma.tenant.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { businessSetupProfile: { inventory: false, sales: true, purchasing: false, accounting: true } } });
    });
});
```

Run: `pnpm --filter @devloggers/api test -- business-setup-profile.service.spec`
Expected: PASS — 3/3 tests (write the file above first, confirm it fails with "Cannot find module", then add the implementation shown, then re-run to confirm it passes — same red-green discipline as every other task, condensed here for space).

- [ ] **Step 2: Response DTOs**

```typescript
// apps/api/src/modules/identity/business-setup/dto/setup-task-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SetupTaskType, SetupTaskStatus } from '@devloggers/db-prisma';

export class SetupTaskResponseDto {
    @ApiProperty({ example: '00000000-0000-4000-e100-000000000001' })
    id: string = '';

    @ApiProperty({ enum: SetupTaskType, enumName: 'SetupTaskType' })
    type: SetupTaskType = SetupTaskType.CURRENCIES;

    @ApiProperty({ enum: SetupTaskStatus, enumName: 'SetupTaskStatus' })
    status: SetupTaskStatus = SetupTaskStatus.BLOCKED;

    @ApiProperty({ example: true })
    required: boolean = true;

    @ApiProperty({ enum: SetupTaskType, enumName: 'SetupTaskType', isArray: true })
    dependencies: SetupTaskType[] = [];

    @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
    metadata: Record<string, unknown> | null = null;

    @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
    progress: Record<string, unknown> | null = null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '2026-01-01T00:00:00.000Z' })
    completedAt: string | null = null;

    @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
    createdAt: string = '';

    @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
    updatedAt: string = '';
}

export class SetupTaskPlanItemResponseDto {
    @ApiProperty({ enum: SetupTaskType, enumName: 'SetupTaskType' })
    type: SetupTaskType = SetupTaskType.CURRENCIES;

    @ApiProperty({ example: true })
    required: boolean = true;

    @ApiProperty({ enum: SetupTaskType, enumName: 'SetupTaskType', isArray: true })
    dependencies: SetupTaskType[] = [];
}
```

```typescript
// apps/api/src/modules/identity/business-setup/dto/business-setup-state-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SetupTaskResponseDto, SetupTaskPlanItemResponseDto } from './setup-task-response.dto';

export class BusinessSetupStateResponseDto {
    @ApiProperty({ type: () => SetupTaskResponseDto, isArray: true })
    @Type(() => SetupTaskResponseDto)
    tasks: SetupTaskResponseDto[] = [];

    @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
    profile: Record<string, unknown> | null = null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '2026-01-01T00:00:00.000Z' })
    businessSetupCompletedAt: string | null = null;
}

export class BusinessSetupPlanResponseDto {
    @ApiProperty({ type: () => SetupTaskPlanItemResponseDto, isArray: true })
    @Type(() => SetupTaskPlanItemResponseDto)
    tasks: SetupTaskPlanItemResponseDto[] = [];
}
```

```typescript
// apps/api/src/modules/identity/business-setup/dto/business-setup-profile.dto.ts
import { IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BusinessSetupModulesDto {
    @ApiProperty({ example: true })
    @IsBoolean()
    inventory!: boolean;

    @ApiProperty({ example: true })
    @IsBoolean()
    sales!: boolean;

    @ApiProperty({ example: true })
    @IsBoolean()
    purchasing!: boolean;

    @ApiProperty({ example: true })
    @IsBoolean()
    accounting!: boolean;
}

export class SetBusinessSetupProfileDto {
    @ApiProperty({ type: BusinessSetupModulesDto })
    @ValidateNested()
    @Type(() => BusinessSetupModulesDto)
    modules!: BusinessSetupModulesDto;
}
```

```typescript
// apps/api/src/modules/identity/business-setup/dto/index.ts
export * from './business-setup-profile.dto';
export * from './setup-task-response.dto';
export * from './business-setup-state-response.dto';
```

- [ ] **Step 3: Presenter**

```typescript
// apps/api/src/modules/identity/business-setup/presenters/setup-task.presenter.ts
import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { SetupTask } from '@devloggers/db-prisma';
import { SetupTaskResponseDto } from '../dto';

@Injectable()
export class SetupTaskPresenter extends CrudPresenter<SetupTask, SetupTaskResponseDto> {
    toResponse(entity: SetupTask): SetupTaskResponseDto {
        return {
            id: entity.id,
            type: entity.type,
            status: entity.status,
            required: entity.required,
            dependencies: entity.dependencies,
            metadata: entity.metadata as Record<string, unknown> | null,
            progress: entity.progress as Record<string, unknown> | null,
            completedAt: entity.completedAt ? entity.completedAt.toISOString() : null,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
```

- [ ] **Step 4: Controller**

```typescript
// apps/api/src/modules/identity/business-setup/controllers/business-setup.controller.ts
import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { SetupTaskType } from '@devloggers/db-prisma';
import { JwtAuthGuard } from '../../auth/guards';
import { CurrentUser, RequestUser } from '../../auth/decorators';
import { SETUP_TASK_TYPES } from '../constants/setup-task-graph';
import { BusinessSetupDiscoveryService } from '../services/business-setup-discovery.service';
import { BusinessSetupPlanService } from '../services/business-setup-plan.service';
import { BusinessSetupTaskService } from '../services/business-setup-task.service';
import { BusinessSetupProfileService } from '../services/business-setup-profile.service';
import { BusinessSetupOrchestratorService } from '../services/business-setup-orchestrator.service';
import { SetupTaskPresenter } from '../presenters/setup-task.presenter';
import { DISCOVERY_ONLY_TASK_TYPES } from '../constants/setup-task-graph';
import {
    BusinessSetupStateResponseDto,
    BusinessSetupPlanResponseDto,
    SetBusinessSetupProfileDto,
} from '../dto';
import { SetupTaskResponseDto } from '../dto';

@ApiTags('Identity / Business Setup')
@Controller('business-setup')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class BusinessSetupController {
    constructor(
        private readonly discoveryService: BusinessSetupDiscoveryService,
        private readonly planService: BusinessSetupPlanService,
        private readonly taskService: BusinessSetupTaskService,
        private readonly profileService: BusinessSetupProfileService,
        private readonly orchestrator: BusinessSetupOrchestratorService,
        private readonly presenter: SetupTaskPresenter,
    ) {}

    @Get('state')
    @ApiOperation({ summary: 'Current persisted setup-task state, with discovery-only tasks re-derived from existing data' })
    async getState(@CurrentUser() user: RequestUser): Promise<BusinessSetupStateResponseDto> {
        await this.autoCompleteDiscoveryOnlyTasks(user.tenantId);
        return this.buildState(user.tenantId);
    }

    @Get('plan')
    @ApiOperation({ summary: 'Preview the task graph for the tenant\'s saved (or default) profile — does not persist' })
    async getPlan(@CurrentUser() user: RequestUser): Promise<BusinessSetupPlanResponseDto> {
        const profile = await this.profileService.getProfile(user.tenantId);
        const inspection = await this.discoveryService.inspect(user.tenantId);
        const items = this.planService.generate(profile, inspection);
        return { tasks: items.map(({ type, required, dependencies }) => ({ type, required, dependencies })) };
    }

    @Post('profile')
    @ApiOperation({ summary: 'Declare which modules this tenant uses and (re)generate the persisted setup-task plan' })
    async setProfile(@CurrentUser() user: RequestUser, @Body() dto: SetBusinessSetupProfileDto): Promise<BusinessSetupStateResponseDto> {
        await this.profileService.setProfile(user.tenantId, dto.modules);
        const inspection = await this.discoveryService.inspect(user.tenantId);
        const items = this.planService.generate(dto.modules, inspection);
        await this.taskService.upsertPlan(user.tenantId, items);
        return this.buildState(user.tenantId);
    }

    @Patch('tasks/:type')
    @ApiOperation({ summary: 'Execute a READY setup task — body shape depends on the task type; see the spec\'s 6.3 handler table' })
    @ApiParam({ name: 'type', enum: SetupTaskType, enumName: 'SetupTaskType', description: 'Setup task type to execute' })
    @ApiBody({ description: 'Task-type-specific payload: an array for batch-create tasks, a single object for FISCAL_PERIOD/FINANCIAL_MAPPINGS, absent for CHART_OF_ACCOUNTS/RECONCILIATION', schema: { oneOf: [{ type: 'array' }, { type: 'object' }] } })
    async executeTask(
        @CurrentUser() user: RequestUser,
        @Param('type') type: string,
        @Body() body: unknown,
    ): Promise<SetupTaskResponseDto> {
        if (!SETUP_TASK_TYPES.includes(type as SetupTaskType)) {
            throw new BadRequestException(`Unknown setup task type "${type}"`);
        }
        const task = await this.orchestrator.execute(user.tenantId, user.id, type as SetupTaskType, body);
        return this.presenter.toResponse(task);
    }

    private async autoCompleteDiscoveryOnlyTasks(tenantId: string): Promise<void> {
        const inspection = await this.discoveryService.inspect(tenantId);
        const inspectionKeyByType: Partial<Record<SetupTaskType, keyof typeof inspection>> = {
            WAREHOUSES: 'warehouses', PRODUCTS: 'products', CUSTOMERS: 'customers',
            SUPPLIERS: 'suppliers', OPENING_INVENTORY: 'openingInventory',
        };
        for (const type of DISCOVERY_ONLY_TASK_TYPES) {
            const task = await this.taskService.listForTenant(tenantId).then((tasks) => tasks.find((t) => t.type === type));
            if (!task || task.status === 'COMPLETED' || task.status === 'SKIPPED') continue;
            const key = inspectionKeyByType[type];
            if (key && inspection[key].classification === 'EXISTING') {
                await this.taskService.recordAttempt(tenantId, type, true, { discovery: inspection[key] });
            }
        }
    }

    private async buildState(tenantId: string): Promise<BusinessSetupStateResponseDto> {
        const [tasks, profile] = await Promise.all([
            this.taskService.listForTenant(tenantId),
            this.profileService.getProfile(tenantId),
        ]);
        return {
            tasks: this.presenter.toResponseList(tasks),
            profile: profile as unknown as Record<string, unknown>,
            businessSetupCompletedAt: null,
        };
    }
```

`businessSetupCompletedAt` stays `null` for now — Phase 10 (`10.4.3`, gated by the `RECONCILIATION` task per the spec's own dependency line) is the phase that sets it once reconciliation passes; wiring the write is out of this phase's scope, but the schema field and the response slot both exist so Phase 10 only has to add one `tenant.update` call plus read it here instead of hardcoding `null`.

- [ ] **Step 5: Module**

```typescript
// apps/api/src/modules/identity/business-setup/business-setup.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '@devloggers/db-prisma/nest';
import { CurrenciesModule } from '../../accounting/currencies/currencies.module';
import { ChartOfAccountsBootstrapModule } from '../../accounting/accounts/bootstrap/chart-of-accounts-bootstrap.module';
import { FinancialSettingsModule } from '../../accounting/financial-settings/financial-settings.module';
import { FiscalPeriodsModule } from '../../accounting/fiscal-periods/fiscal-periods.module';
import { DocumentSequencesModule } from '../../accounting/document-sequences/document-sequences.module';
import { OpeningBalancesModule } from '../../accounting/opening-balances/opening-balances.module';
import { ReconciliationModule } from '../../accounting/reconciliation/reconciliation.module';
import { CashboxesModule, BankAccountsModule } from '../../invoicing';
import { SetupTasksRepository } from './repositories/setup-tasks.repository';
import { BusinessSetupDiscoveryService } from './services/business-setup-discovery.service';
import { BusinessSetupPlanService } from './services/business-setup-plan.service';
import { BusinessSetupTaskService } from './services/business-setup-task.service';
import { BusinessSetupProfileService } from './services/business-setup-profile.service';
import { BusinessSetupOrchestratorService } from './services/business-setup-orchestrator.service';
import { SetupTaskPresenter } from './presenters/setup-task.presenter';
import { BusinessSetupController } from './controllers/business-setup.controller';
import {
    CurrenciesTaskHandler, ChartOfAccountsTaskHandler, FinancialMappingsTaskHandler,
    CashboxesTaskHandler, BankAccountsTaskHandler, FiscalPeriodTaskHandler, DocumentSequencesTaskHandler,
    OpeningCashBalancesTaskHandler, OpeningBankBalancesTaskHandler, OpeningReceivablesTaskHandler,
    OpeningPayablesTaskHandler, ReconciliationTaskHandler,
} from './handlers';

@Module({
    imports: [
        PrismaModule,
        CurrenciesModule,
        ChartOfAccountsBootstrapModule,
        FinancialSettingsModule,
        FiscalPeriodsModule,
        DocumentSequencesModule,
        OpeningBalancesModule,
        ReconciliationModule,
        CashboxesModule,
        BankAccountsModule,
    ],
    controllers: [BusinessSetupController],
    providers: [
        SetupTasksRepository,
        BusinessSetupDiscoveryService,
        BusinessSetupPlanService,
        BusinessSetupTaskService,
        BusinessSetupProfileService,
        BusinessSetupOrchestratorService,
        SetupTaskPresenter,
        CurrenciesTaskHandler,
        ChartOfAccountsTaskHandler,
        FinancialMappingsTaskHandler,
        CashboxesTaskHandler,
        BankAccountsTaskHandler,
        FiscalPeriodTaskHandler,
        DocumentSequencesTaskHandler,
        OpeningCashBalancesTaskHandler,
        OpeningBankBalancesTaskHandler,
        OpeningReceivablesTaskHandler,
        OpeningPayablesTaskHandler,
        ReconciliationTaskHandler,
    ],
})
export class BusinessSetupModule {}
```

- [ ] **Step 6: Register in `app.module.ts`**

```typescript
import { OnboardingModule } from './modules/identity/onboarding/onboarding.module';
import { BusinessSetupModule } from './modules/identity/business-setup/business-setup.module';
```

and in the `imports` array, immediately after `OnboardingModule,`:

```typescript
    OnboardingModule,
    BusinessSetupModule,
```

- [ ] **Step 7: Build, generate, verify architecture**

Run: `pnpm --filter @devloggers/api build`
Expected: exits 0

Run: `pnpm generate`
Expected: `Spec written to apps/api/openapi.yaml` and `packages/api-contracts` rebuilds; confirm with `grep -n "/business-setup/state" apps/api/openapi.yaml` — expect a match.

Run: `pnpm --filter @devloggers/api lint:architecture`
Expected: `All <N> architecture-rule cases passed.`

Run: `pnpm --filter @devloggers/api test -- business-setup`
Expected: PASS — every spec file under `business-setup/` (services, handlers, utils, constants) green.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/identity/business-setup apps/api/src/app.module.ts apps/api/openapi.yaml packages/api-contracts/src/types
git commit -m "feat(business-setup): wire controller, DTOs, module; register in app.module (Phase 6.5)"
```

---

## Task 24: `api-contracts` — `businessSetupResource`

**Files:**
- Create: `packages/api-contracts/src/resources/business-setup.resource.ts`
- Modify: `packages/api-contracts/src/resources/index.ts`

**Interfaces:**
- Consumes: `defineResource` (`packages/api-contracts/src/resources/base/resource.ts`), and the generated `paths` type from `packages/api-contracts/src/types/index.ts` — this task can only be done **after** Task 23's `pnpm generate` has run, since `businessSetupResource`'s `routes` values must be literal keys of the generated `paths` type or the file fails to compile.
- Produces: `businessSetupResource.routes = { state, plan, profile, updateTask }` — consumed by Task 25 (`BusinessSetupClient`).

No hand-authored `dto/business-setup.dto.ts` is created — per `.ai/rules/code-quality.md` §4 ("never redefine an API shape inline... always consume through the typed utilities"), the client (Task 25) uses `ApiRequestBody`/`ApiResponse` derived straight from the now-generated OpenAPI types, the same way `authResource` does. This deliberately avoids repeating `OnboardingClient`'s pre-existing `as never` pattern (that pattern exists only because `onboarding.resource.ts` was never created — not something to copy forward).

- [ ] **Step 1: Confirm the generated paths exist**

Run: `grep -n "business-setup" packages/api-contracts/src/types/index.ts | head -5`
Expected: at least 4 matches (`/business-setup/state`, `/business-setup/plan`, `/business-setup/profile`, `/business-setup/tasks/{type}`).

- [ ] **Step 2: Define the resource**

```typescript
// packages/api-contracts/src/resources/business-setup.resource.ts
import { defineResource } from './base/resource'

export const businessSetupResource = defineResource({
  key: 'business-setup',

  routes: {
    state: '/business-setup/state',
    plan: '/business-setup/plan',
    profile: '/business-setup/profile',
    updateTask: '/business-setup/tasks/{type}',
  },
})
```

- [ ] **Step 3: Register in the resources barrel**

Modify `packages/api-contracts/src/resources/index.ts` — add the import, the `export *`, and the map entry:

```typescript
import { businessSetupResource } from './business-setup.resource'
```

(alongside the other resource imports, after `openingBalanceSessionResource`)

```typescript
export * from './business-setup.resource'
```

(alongside the other `export *` lines, after `export * from './opening-balance-session.resource'`)

```typescript
export const resources = {
  // ...existing entries...
  openingBalanceSessions: openingBalanceSessionResource,
  businessSetup: businessSetupResource,
} as const
```

- [ ] **Step 4: Verify**

Run: `pnpm --filter @devloggers/api-contracts build`
Expected: exits 0 — this is the compile-time proof that every route in `businessSetupResource.routes` matches a literal key of the generated `paths` type.

- [ ] **Step 5: Commit**

```bash
git add packages/api-contracts/src/resources/business-setup.resource.ts packages/api-contracts/src/resources/index.ts
git commit -m "feat(api-contracts): add businessSetupResource (Phase 6.5.4)"
```

---

## Task 25: `api-client` — `BusinessSetupClient`

**Files:**
- Create: `packages/api-client/src/clients/business-setup.client.ts`
- Modify: `packages/api-client/src/clients/index.ts`
- Modify: `packages/api-client/src/api.ts`

**Interfaces:**
- Consumes: `businessSetupResource` (Task 24), `ApiClient.get`/`.post`/`.patch`, `ApiRequestBody`/`ApiResponse` (`@devloggers/api-contracts`).
- Produces: `api.businessSetup.getState()`, `.getPlan()`, `.setProfile(body)`, `.executeTask(type, body)` — consumed by Task 28 (onboarding business-profile step) and the minimal `/setup` page.

- [ ] **Step 1: Implement**

```typescript
// packages/api-client/src/clients/business-setup.client.ts
import type { ApiRequestBody, ApiResponse } from "@devloggers/api-contracts"
import { businessSetupResource } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"

export class BusinessSetupClient {
    constructor(private readonly apiClient: ApiClient) {}

    getState = (): Promise<ApiResponse<typeof businessSetupResource.routes.state, "get">> => {
        return this.apiClient.get(businessSetupResource.routes.state)
    }

    getPlan = (): Promise<ApiResponse<typeof businessSetupResource.routes.plan, "get">> => {
        return this.apiClient.get(businessSetupResource.routes.plan)
    }

    setProfile = (
        body: ApiRequestBody<typeof businessSetupResource.routes.profile, "post">,
    ): Promise<ApiResponse<typeof businessSetupResource.routes.profile, "post">> => {
        return this.apiClient.post(businessSetupResource.routes.profile, body)
    }

    executeTask = (
        type: string,
        body: ApiRequestBody<typeof businessSetupResource.routes.updateTask, "patch">,
    ): Promise<ApiResponse<typeof businessSetupResource.routes.updateTask, "patch">> => {
        return this.apiClient.patch(
            businessSetupResource.routes.updateTask,
            body,
            { params: { type } } as never,
        )
    }
}
```

- [ ] **Step 2: Register in the clients barrel**

```typescript
// packages/api-client/src/clients/index.ts — add:
export * from "./business-setup.client"
```

- [ ] **Step 3: Register in the `createApi()` factory**

Modify `packages/api-client/src/api.ts`:

```typescript
import { BusinessSetupClient } from "./clients/business-setup.client"
```

(alongside the other client imports)

```typescript
import { authResource, /* ...existing... */ openingBalanceSessionResource, businessSetupResource } from "@devloggers/api-contracts"
```

(add `businessSetupResource` to the existing destructured import from `@devloggers/api-contracts`)

```typescript
        [openingBalanceSessionResource.key]: new OpeningBalanceSessionsClient(client),
        [businessSetupResource.key]: new BusinessSetupClient(client),
```

(add the new line immediately after the existing `openingBalanceSessionResource` line, inside the object returned by `createApi()`)

- [ ] **Step 4: Verify**

Run: `pnpm --filter @devloggers/api-client build`
Expected: exits 0

- [ ] **Step 5: Commit**

```bash
git add packages/api-client/src/clients/business-setup.client.ts packages/api-client/src/clients/index.ts packages/api-client/src/api.ts
git commit -m "feat(api-client): add BusinessSetupClient (Phase 6.5.4)"
```

---

## Task 26: Slim `OnboardingService` — remove raw Prisma business-entity mutations

**Files:**
- Modify: `apps/api/src/modules/accounting/accounts/bootstrap/chart-of-accounts-bootstrap.service.ts`
- Modify: `apps/api/src/modules/accounting/accounts/bootstrap/chart-of-accounts-bootstrap.service.spec.ts`
- Modify: `apps/api/src/modules/identity/onboarding/dto/onboarding.dto.ts`
- Modify: `apps/api/src/modules/identity/onboarding/services/onboarding.service.ts`
- Modify: `apps/api/src/modules/identity/onboarding/onboarding.module.ts`

**Interfaces:**
- Consumes: `ChartOfAccountsBootstrapService.bootstrapDefaultTemplate` (Task 3), new `.resolveIdsByCode(tenantId, codes)` (added in this task), `CurrenciesService.list`/`.create` (`accounting/currencies`, opened Task 2), `CreateCurrencyDto` (`apps/api/src/modules/accounting/currencies/dto`).
- Produces: this task is what makes the spec's literal `Done when` grep pass: `grep -r "prisma.cashbox.create\|prisma.warehouse\|prisma.unit.createMany\|prisma.chartOfAccount" apps/api/src/modules/identity/onboarding` returns nothing.

- [ ] **Step 1: Add `resolveIdsByCode` to the bootstrap facade, with a failing test first**

Add to `apps/api/src/modules/accounting/accounts/bootstrap/chart-of-accounts-bootstrap.service.spec.ts` (new `describe` block):

```typescript
describe('resolveIdsByCode', () => {
    it('resolves a subset of codes to their ids without creating anything', async () => {
        const { service, accountsService } = build();
        accountsService.list.mockResolvedValue({
            data: [{ id: 'id-1130', code: '1130' }, { id: 'id-5100', code: '5100' }],
            total: 2,
        });

        const result = await service.resolveIdsByCode('tenant-1', ['1130', '5100']);

        expect(result).toEqual({ '1130': 'id-1130', '5100': 'id-5100' });
        expect(accountsService.create).not.toHaveBeenCalled();
    });
});
```

Run: `pnpm --filter @devloggers/api test -- chart-of-accounts-bootstrap.service.spec`
Expected: FAIL — `service.resolveIdsByCode is not a function`

Add the method to `apps/api/src/modules/accounting/accounts/bootstrap/chart-of-accounts-bootstrap.service.ts`:

```typescript
    async resolveIdsByCode(tenantId: string, codes: string[]): Promise<Record<string, string>> {
        const { data } = await this.accountsService.list(tenantId, { take: codes.length, where: { code: { in: codes } } });
        return Object.fromEntries(data.map((account) => [account.code, account.id]));
    }
```

Run: `pnpm --filter @devloggers/api test -- chart-of-accounts-bootstrap.service.spec`
Expected: PASS — 5/5 tests

- [ ] **Step 2: ADR-6 currencies DTO — accept a caller-supplied list**

Replace `OnboardingCurrenciesStepDto` in `apps/api/src/modules/identity/onboarding/dto/onboarding.dto.ts`:

```typescript
import { CreateCurrencyDto } from '../../../accounting/currencies/dto';
```

(add to the existing imports at the top of the file)

```typescript
export class OnboardingCurrenciesStepDto {
    @ApiProperty({ type: () => CreateCurrencyDto, isArray: true, description: 'ADR-6: caller-supplied currency list — no hardcoded codes' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateCurrencyDto)
    currencies: CreateCurrencyDto[] = [];
}
```

(replaces the old `codeToId`-based `OnboardingCurrenciesStepDto` entirely — that field was dead code, per the earlier research: `stepCurrencies(tenantId, _dto)` never read it)

- [ ] **Step 3: Rewrite `OnboardingService`**

Full new content of `apps/api/src/modules/identity/onboarding/services/onboarding.service.ts`:

```typescript
import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { SettingsService } from '../../settings/services/settings.service';
import { FiscalPeriodsService } from '../../../accounting/fiscal-periods/services/fiscal-periods.service';
import { DocumentSequencesService } from '../../../accounting/document-sequences/services/document-sequences.service';
import { FinancialSettingsService } from '../../../accounting/financial-settings/services/financial-settings.service';
import { CurrenciesService } from '../../../accounting/currencies/services/currencies.service';
import { ChartOfAccountsBootstrapService } from '../../../accounting/accounts/bootstrap/chart-of-accounts-bootstrap.service';
import type {
    OnboardingCompanyStepDto,
    OnboardingFiscalYearStepDto,
    OnboardingGlDefaultsStepDto,
    OnboardingDocumentSequencesStepDto,
    OnboardingCurrenciesStepDto,
} from '../dto/onboarding.dto';

const GL_AUTO_MAPPED_CODES = ['1130', '5100', '5210', '3100', '1110', '1150'] as const;

@Injectable()
export class OnboardingService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly settingsService: SettingsService,
        private readonly fiscalPeriodsService: FiscalPeriodsService,
        private readonly documentSequencesService: DocumentSequencesService,
        private readonly financialSettingsService: FinancialSettingsService,
        private readonly currenciesService: CurrenciesService,
        private readonly chartOfAccountsBootstrap: ChartOfAccountsBootstrapService,
    ) {}

    private async assertNotCompleted(tenantId: string): Promise<void> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { onboardingCompletedAt: true },
        });
        if (tenant?.onboardingCompletedAt) {
            throw new ConflictException('Onboarding is already completed');
        }
    }

    private async advanceStep(tenantId: string, step: number): Promise<void> {
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { onboardingStep: step },
        });
    }

    async stepCompany(tenantId: string, dto: OnboardingCompanyStepDto): Promise<void> {
        await this.assertNotCompleted(tenantId);

        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { name: dto.name, address: dto.address, phone: dto.phone },
        });

        await this.settingsService.update(tenantId, {
            locale: dto.locale,
            timezone: dto.timezone,
            dateFormat: dto.dateFormat,
            numberFormat: dto.numberFormat,
        });

        await this.advanceStep(tenantId, 1);
    }

    async stepFiscalYear(tenantId: string, dto: OnboardingFiscalYearStepDto): Promise<void> {
        await this.assertNotCompleted(tenantId);

        try {
            const name = dto.name ?? `FY ${new Date(dto.startDate).getFullYear()}`;
            await this.fiscalPeriodsService.create(tenantId, {
                name,
                startDate: dto.startDate,
                endDate: dto.endDate,
            });
        } catch (err: unknown) {
            if (!(err instanceof BadRequestException) && !(err instanceof ConflictException)) {
                throw err;
            }
            // period already exists or overlaps — idempotent, continue
        }

        await this.advanceStep(tenantId, 2);
    }

    async stepChartOfAccounts(tenantId: string): Promise<Record<string, string>> {
        await this.assertNotCompleted(tenantId);
        const codeToId = await this.chartOfAccountsBootstrap.bootstrapDefaultTemplate(tenantId);
        await this.advanceStep(tenantId, 3);
        return codeToId;
    }

    async stepGlDefaults(tenantId: string, dto: OnboardingGlDefaultsStepDto): Promise<void> {
        await this.assertNotCompleted(tenantId);

        const ids = await this.chartOfAccountsBootstrap.resolveIdsByCode(tenantId, [...GL_AUTO_MAPPED_CODES]);

        await this.financialSettingsService.upsert(tenantId, {
            defaultSalesAccountId: dto.defaultSalesAccountId,
            defaultPurchaseAccountId: dto.defaultPurchaseAccountId,
            defaultTaxAccountId: dto.defaultTaxAccountId,
            defaultReceivableAccountId: dto.defaultReceivableAccountId,
            defaultPayableAccountId: dto.defaultPayableAccountId,
            defaultInventoryAccountId: ids['1130'],
            defaultCogsAccountId: ids['5100'],
            defaultInventoryAdjustmentAccountId: ids['5210'],
            defaultOpeningEquityAccountId: ids['3100'],
            defaultCashAccountId: ids['1110'],
            defaultBankAccountId: ids['1150'],
        });

        await this.advanceStep(tenantId, 5);
    }

    async stepCurrencies(tenantId: string, dto: OnboardingCurrenciesStepDto): Promise<void> {
        await this.assertNotCompleted(tenantId);

        const existing = await this.currenciesService.list(tenantId, { take: 1 });
        if (existing.total === 0) {
            let baseCurrencyId: string | undefined;
            for (const currency of dto.currencies) {
                const created = await this.currenciesService.create(tenantId, currency);
                if (currency.isBase) baseCurrencyId = created.id;
            }
            if (baseCurrencyId) {
                await this.prisma.tenant.update({ where: { id: tenantId }, data: { baseCurrencyId } });
            }
        }

        await this.advanceStep(tenantId, 4);
    }

    async stepDocumentSequences(tenantId: string, dto: OnboardingDocumentSequencesStepDto): Promise<void> {
        await this.assertNotCompleted(tenantId);

        for (const seq of dto.sequences) {
            try {
                await this.documentSequencesService.create(tenantId, {
                    documentType: seq.type,
                    prefix: seq.prefix,
                    nextNumber: seq.startNumber ?? 1,
                    padding: seq.padLength ?? 5,
                });
            } catch (err: unknown) {
                if (err instanceof ConflictException) continue;
                throw err;
            }
        }

        await this.advanceStep(tenantId, 6);
    }

    async complete(tenantId: string): Promise<void> {
        await this.assertNotCompleted(tenantId);
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { onboardingCompletedAt: new Date(), onboardingStep: 6 },
        });
    }
}
```

Note what is gone versus the pre-Phase-6 file: `bootstrapChartOfAccounts`, `getCoaTemplate`, the hardcoded SYP/USD `prisma.currency.create` pair, `prisma.cashbox.createMany`, `prisma.warehouse.upsert`, `prisma.unit.createMany`, and the raw `prisma.chartOfAccount.findMany` in `stepGlDefaults`.

- [ ] **Step 4: Wire the two new module dependencies**

```typescript
// apps/api/src/modules/identity/onboarding/onboarding.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '@devloggers/db-prisma/nest';
import { SettingsModule } from '../settings/settings.module';
import { FiscalPeriodsModule } from '../../accounting/fiscal-periods/fiscal-periods.module';
import { DocumentSequencesModule } from '../../accounting/document-sequences/document-sequences.module';
import { FinancialSettingsModule } from '../../accounting/financial-settings/financial-settings.module';
import { CurrenciesModule } from '../../accounting/currencies/currencies.module';
import { ChartOfAccountsBootstrapModule } from '../../accounting/accounts/bootstrap/chart-of-accounts-bootstrap.module';
import { OnboardingService } from './services/onboarding.service';
import { OnboardingController } from './controllers/onboarding.controller';

@Module({
    imports: [
        PrismaModule,
        SettingsModule,
        FiscalPeriodsModule,
        DocumentSequencesModule,
        FinancialSettingsModule,
        CurrenciesModule,
        ChartOfAccountsBootstrapModule,
    ],
    controllers: [OnboardingController],
    providers: [OnboardingService],
})
export class OnboardingModule {}
```

- [ ] **Step 5: Verify the spec's literal grep**

Run: `grep -r "prisma.cashbox.create\|prisma.warehouse\|prisma.unit.createMany\|prisma.chartOfAccount" apps/api/src/modules/identity/onboarding`
Expected: no output (empty)

Run: `pnpm --filter @devloggers/api build`
Expected: exits 0

Run: `pnpm --filter @devloggers/api lint:architecture`
Expected: `All <N> architecture-rule cases passed.`

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/accounting/accounts/bootstrap apps/api/src/modules/identity/onboarding
git commit -m "refactor(onboarding): remove raw Prisma business-entity mutations, delegate to domain services (Phase 6.4)"
```

---

## Task 27: Dashboard — fix onboarding resume bugs + ADR-6 currency step

**Files:**
- Modify: `apps/dashboard/app/[locale]/(setup)/onboarding/page.tsx`
- Modify: `apps/dashboard/modules/onboarding/onboarding-wizard.tsx`
- Modify: `apps/dashboard/modules/onboarding/components/currencies-step.tsx`
- Modify: `apps/dashboard/modules/onboarding/onboarding.config.ts`

**Interfaces:**
- Consumes: `api.onboarding.stepChartOfAccounts()` (existing, idempotent per Task 26 — calling it again just returns the already-created `codeToId` map without creating duplicate accounts), `api.onboarding.stepCurrencies` (signature changes from `(codeToId)` to `(currencies: CreateCurrencyBody[])` — Step 3 below updates the client body type to match Task 26's new `OnboardingCurrenciesStepDto`).
- Produces: fixes exactly the two resume bugs named in the spec's 6.4.4 — `initialStep` capped at 5 instead of 6 (bouncing the user back into GL Defaults after finishing it), and `codeToId` existing only in client `useReducer` state with no server-side reconstruction on refresh.

- [ ] **Step 1: Fix the `initialStep` cap**

```tsx
// apps/dashboard/app/[locale]/(setup)/onboarding/page.tsx
import { getAuthCookies } from "@/modules/auth/auth.actions"
import { OnboardingWizard } from "@/modules/onboarding"

export default async function OnboardingPage() {
    const { user } = await getAuthCookies()
    const initialStep = Math.min((user?.tenant?.onboardingStep ?? 0) + 1, 7)

    return (
        <OnboardingWizard
            initialStep={initialStep}
            initialName={user?.tenant?.name}
        />
    )
}
```

(the cap is `7`, not `6` — Task 28 adds a 7th business-profile step; if Task 28 is skipped this cap would only need to be `6`, but both tasks land together in this plan)

- [ ] **Step 2: Re-hydrate `codeToId` on resume, without re-advancing the step**

```tsx
// apps/dashboard/modules/onboarding/onboarding-wizard.tsx
"use client"

import { useEffect, useReducer } from "react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useMutation } from "@tanstack/react-query"
import { CompanyStep } from "./components/company-step"
import { FiscalYearStep } from "./components/fiscal-year-step"
import { ChartOfAccountsStep } from "./components/chart-of-accounts-step"
import { CurrenciesStep } from "./components/currencies-step"
import { GlDefaultsStep } from "./components/gl-defaults-step"
import { DocumentSequencesStep } from "./components/document-sequences-step"
import { useApi } from "@/shared/useApi"
import { refreshUserCookie } from "@/modules/auth/auth.actions"

type WizardState = {
    currentStep: number
    codeToId: Record<string, string>
}

type WizardAction =
    | { type: "NEXT" }
    | { type: "SET_CODE_TO_ID"; payload: Record<string, string> }
    | { type: "HYDRATE_CODE_TO_ID"; payload: Record<string, string> }

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
    switch (action.type) {
        case "NEXT":
            return { ...state, currentStep: state.currentStep + 1 }
        case "SET_CODE_TO_ID":
            return { ...state, codeToId: action.payload, currentStep: state.currentStep + 1 }
        case "HYDRATE_CODE_TO_ID":
            return { ...state, codeToId: action.payload }
    }
}

const STEP_TITLE_KEYS = [
    "onboarding.company.title",
    "onboarding.fiscalYear.title",
    "onboarding.chartOfAccounts.title",
    "onboarding.currencies.title",
    "onboarding.glDefaults.title",
    "onboarding.documentSequences.title",
]

type Props = { initialStep?: number; initialName?: string }

export function OnboardingWizard({ initialStep = 1, initialName }: Props) {
    const router = useRouter()
    const locale = useLocale()
    const api = useApi()
    const t = useTranslations("business")

    const [state, dispatch] = useReducer(wizardReducer, {
        currentStep: Math.max(1, Math.min(initialStep, 6)),
        codeToId: {},
    })

    useEffect(() => {
        if (initialStep > 3) {
            api.onboarding.stepChartOfAccounts().then(({ codeToId }) => {
                dispatch({ type: "HYDRATE_CODE_TO_ID", payload: codeToId })
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const { mutate: complete } = useMutation({
        mutationFn: async () => {
            await api.onboarding.complete()
            await refreshUserCookie()
        },
        onSuccess: () => router.push(`/${locale}/setup`),
    })

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <div className="w-full max-w-2xl space-y-8">
                {/* Progress indicator */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{t("onboarding.step")} {state.currentStep} {t("onboarding.of")} {STEP_TITLE_KEYS.length}</span>
                        <span>{t(STEP_TITLE_KEYS[state.currentStep - 1])}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${(state.currentStep / STEP_TITLE_KEYS.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Step content */}
                <div className="bg-card border rounded-xl p-8 shadow-sm">
                    <h1 className="text-2xl font-semibold mb-6">{t(STEP_TITLE_KEYS[state.currentStep - 1])}</h1>

                    {state.currentStep === 1 && (
                        <CompanyStep
                            initialName={initialName}
                            onSuccess={() => dispatch({ type: "NEXT" })}
                        />
                    )}

                    {state.currentStep === 2 && (
                        <FiscalYearStep
                            onSuccess={() => dispatch({ type: "NEXT" })}
                        />
                    )}

                    {state.currentStep === 3 && (
                        <ChartOfAccountsStep
                            onSuccess={(codeToId) => dispatch({ type: "SET_CODE_TO_ID", payload: codeToId })}
                        />
                    )}

                    {state.currentStep === 4 && (
                        <CurrenciesStep
                            onSuccess={() => dispatch({ type: "NEXT" })}
                        />
                    )}

                    {state.currentStep === 5 && (
                        <GlDefaultsStep
                            codeToId={state.codeToId}
                            onSuccess={() => dispatch({ type: "NEXT" })}
                        />
                    )}

                    {state.currentStep === 6 && (
                        <DocumentSequencesStep
                            onSuccess={() => complete()}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
```

Two changes beyond the hydration effect: `CurrenciesStep` no longer takes `codeToId` (it never used it — the prop existed only to satisfy `api.onboarding.stepCurrencies(codeToId)`'s old signature), and `complete`'s `onSuccess` now redirects to `/${locale}/setup` (Task 29 builds that route) instead of `/${locale}`. `STEP_TITLE_KEYS`, the `Math.min(initialStep, 6)` clamp inside the reducer's initial state, and the 6-step progress bar are untouched here — Task 28 adds the 7th step in a follow-up edit to this same file.

- [ ] **Step 3: Rewrite `CurrenciesStep` for ADR-6 — caller-supplied currency list, no hardcoded SYP/USD**

```tsx
// apps/dashboard/modules/onboarding/components/currencies-step.tsx
"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { useApi } from "@/shared/useApi"

type CurrencyRow = {
    code: string
    nameEn: string
    nameAr: string
    isBase: boolean
}

type Props = {
    onSuccess: () => void
}

function makeRow(isBase = false): CurrencyRow {
    return { code: "", nameEn: "", nameAr: "", isBase }
}

export function CurrenciesStep({ onSuccess }: Props) {
    const api = useApi()
    const t = useTranslations("business")
    const [rows, setRows] = useState<CurrencyRow[]>([makeRow(true)])

    const updateRow = (index: number, patch: Partial<CurrencyRow>) => {
        setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
    }

    const setBase = (index: number) => {
        setRows((prev) => prev.map((row, i) => ({ ...row, isBase: i === index })))
    }

    const addRow = () => setRows((prev) => [...prev, makeRow(false)])
    const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index))

    const { mutate, isPending, error } = useMutation({
        mutationFn: () =>
            api.onboarding.stepCurrencies(
                rows.map((row) => ({
                    code: row.code.trim().toUpperCase(),
                    name: { ar: row.nameAr.trim(), en: row.nameEn.trim() },
                    isBase: row.isBase,
                })),
            ),
        onSuccess,
    })

    const canSubmit = rows.length > 0 && rows.every((r) => r.code.trim() && r.nameAr.trim()) && rows.some((r) => r.isBase)

    return (
        <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
                {t("onboarding.currencies.description")}
            </p>

            <div className="space-y-3">
                {rows.map((row, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                placeholder={t("onboarding.currencies.codePlaceholder")}
                                value={row.code}
                                maxLength={3}
                                onChange={(e) => updateRow(index, { code: e.target.value })}
                            />
                            <Input
                                placeholder={t("onboarding.currencies.nameEnPlaceholder")}
                                value={row.nameEn}
                                onChange={(e) => updateRow(index, { nameEn: e.target.value })}
                            />
                        </div>
                        <Input
                            placeholder={t("onboarding.currencies.nameArPlaceholder")}
                            value={row.nameAr}
                            onChange={(e) => updateRow(index, { nameAr: e.target.value })}
                        />
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={row.isBase} onCheckedChange={() => setBase(index)} />
                                {t("onboarding.currencies.baseIndicator")}
                            </label>
                            {rows.length > 1 && (
                                <Button variant="ghost" size="sm" onClick={() => removeRow(index)}>
                                    {t("onboarding.buttons.remove")}
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <Button variant="outline" onClick={addRow} className="w-full">
                {t("onboarding.currencies.addCurrency")}
            </Button>

            {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

            <Button onClick={() => mutate()} disabled={isPending || !canSubmit} className="w-full">
                {isPending ? t("onboarding.buttons.saving") : t("onboarding.buttons.continue")}
            </Button>
        </div>
    )
}
```

Add the new i18n keys this component needs — `onboarding.currencies.codePlaceholder`, `.nameEnPlaceholder`, `.nameArPlaceholder`, `.addCurrency`, and `onboarding.buttons.remove` — to `packages/i18n/src/{en,ar,tr,ar-SY}/business.json` under the existing `onboarding.currencies` / `onboarding.buttons` blocks (mirror the style of the sibling keys already there, e.g. `baseIndicator`, `description`).

- [ ] **Step 4: Verify**

Run: `pnpm --filter @devloggers/dashboard lint`
Expected: exits 0

Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: exits 0

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/app/[locale]/(setup)/onboarding/page.tsx apps/dashboard/modules/onboarding/onboarding-wizard.tsx apps/dashboard/modules/onboarding/components/currencies-step.tsx packages/i18n/src
git commit -m "fix(onboarding): fix resume initialStep cap + codeToId loss, ADR-6 currency step (Phase 6.4.4)"
```

---

## Task 28: Onboarding step 7 — business profile (modules declaration)

**Files:**
- Create: `apps/dashboard/modules/onboarding/components/business-profile-step.tsx`
- Modify: `apps/dashboard/modules/onboarding/onboarding-wizard.tsx`
- Modify: `apps/dashboard/modules/onboarding/index.ts`

**Interfaces:**
- Consumes: `api.businessSetup.setProfile(body: { modules: {...} })` (Task 25).
- Produces: onboarding gains a 7th, final step (spec 6.4.3: "Add business profile step (modules: inventory, sales, purchasing, accounting)"). Completing it calls `api.businessSetup.setProfile` (which persists the profile **and** generates the initial `SetupTask` plan via `BusinessSetupOrchestratorService`'s sibling `BusinessSetupPlanService`/`TaskService`, Task 23 Step 4's controller logic), then `complete()`, then redirects to `/setup`.

- [ ] **Step 1: Build the step component**

```tsx
// apps/dashboard/modules/onboarding/components/business-profile-step.tsx
"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { useApi } from "@/shared/useApi"

type Props = { onSuccess: () => void }

type ModuleKey = "inventory" | "sales" | "purchasing" | "accounting"

const MODULE_KEYS: ModuleKey[] = ["inventory", "sales", "purchasing", "accounting"]

export function BusinessProfileStep({ onSuccess }: Props) {
    const api = useApi()
    const t = useTranslations("business")
    const [modules, setModules] = useState<Record<ModuleKey, boolean>>({
        inventory: true, sales: true, purchasing: true, accounting: true,
    })

    const { mutate, isPending, error } = useMutation({
        mutationFn: () => api.businessSetup.setProfile({ modules }),
        onSuccess,
    })

    return (
        <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
                {t("onboarding.businessProfile.description")}
            </p>

            <div className="space-y-3">
                {MODULE_KEYS.map((key) => (
                    <label key={key} className="flex items-center gap-3 border rounded-lg p-4 text-sm">
                        <Checkbox
                            checked={modules[key]}
                            onCheckedChange={(checked) => setModules((prev) => ({ ...prev, [key]: checked === true }))}
                        />
                        {t(`onboarding.businessProfile.modules.${key}`)}
                    </label>
                ))}
            </div>

            {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

            <Button onClick={() => mutate()} disabled={isPending} className="w-full">
                {isPending ? t("onboarding.buttons.saving") : t("onboarding.buttons.finish")}
            </Button>
        </div>
    )
}
```

- [ ] **Step 2: Wire it as step 7 in the wizard**

Modify `apps/dashboard/modules/onboarding/onboarding-wizard.tsx` (continuing from Task 27's version) — four changes:

```tsx
import { BusinessProfileStep } from "./components/business-profile-step"
```

(new import, alongside `DocumentSequencesStep`)

```tsx
const STEP_TITLE_KEYS = [
    "onboarding.company.title",
    "onboarding.fiscalYear.title",
    "onboarding.chartOfAccounts.title",
    "onboarding.currencies.title",
    "onboarding.glDefaults.title",
    "onboarding.documentSequences.title",
    "onboarding.businessProfile.title",
]
```

(7th entry added)

```tsx
    const [state, dispatch] = useReducer(wizardReducer, {
        currentStep: Math.max(1, Math.min(initialStep, 7)),
        codeToId: {},
    })
```

(clamp raised from `6` to `7`)

```tsx
                    {state.currentStep === 6 && (
                        <DocumentSequencesStep
                            onSuccess={() => dispatch({ type: "NEXT" })}
                        />
                    )}

                    {state.currentStep === 7 && (
                        <BusinessProfileStep
                            onSuccess={() => complete()}
                        />
                    )}
```

(replaces the old step-6 block, which called `complete()` directly; `complete()`'s own `onSuccess` still redirects to `/${locale}/setup` per Task 27)

- [ ] **Step 3: Add i18n keys**

Add to `packages/i18n/src/{en,ar,tr,ar-SY}/business.json` under `onboarding`:

```json
"businessProfile": {
    "title": "Business profile",
    "description": "Tell us which parts of the business you'll be using — this decides which setup tasks are required.",
    "modules": {
        "inventory": "Inventory & warehouses",
        "sales": "Sales & customers",
        "purchasing": "Purchasing & suppliers",
        "accounting": "Accounting & GL"
    }
}
```

and `"finish": "Finish setup"` under the existing `onboarding.buttons` block (alongside `saving`, `continue`, `remove`).

- [ ] **Step 4: Re-export**

```typescript
// apps/dashboard/modules/onboarding/index.ts
export { OnboardingWizard } from "./onboarding-wizard"
export { BusinessProfileStep } from "./components/business-profile-step"
```

- [ ] **Step 5: Verify**

Run: `pnpm --filter @devloggers/dashboard lint`
Expected: exits 0

Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: exits 0

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/modules/onboarding packages/i18n/src
git commit -m "feat(onboarding): add business-profile step 7, generates initial SetupTask plan (Phase 6.4.3)"
```

---

## Task 29: Minimal `/setup` page (unblocks the `complete()` redirect)

**Files:**
- Create: `apps/dashboard/modules/business-setup/business-setup-summary.tsx`
- Create: `apps/dashboard/app/[locale]/(authenticated)/setup/page.tsx`

**Interfaces:**
- Consumes: `api.businessSetup.getState()` (Task 25) — returns the plain `BusinessSetupStateResponseDto` body (not wrapped in `{data}`; `BusinessSetupController` is a custom controller like `OnboardingController`, not built via `createCrudController`, so there is no `ApiResponseBuilder` envelope here).
- Produces: a real, working, read-only setup-status page — not a stub. This is deliberately small: it lists every `SetupTask` with its status. **Phase 10** (`10.1` — already scoped in `docs/superpowers/specs/2026-08-20-erp-roadmap/phase-10-business-setup-ui-import-readiness.md`) replaces this with the full grouped hub (task-group cards linking to CRUD pages, "next recommended action", execute actions). This task's only job is to give Task 27/28's `complete()` redirect a real destination instead of a 404.

- [ ] **Step 1: Build the summary component**

```tsx
// apps/dashboard/modules/business-setup/business-setup-summary.tsx
"use client"

import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { Badge } from "@/shared/components/ui/badge"
import { useApi } from "@/shared/useApi"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    COMPLETED: "default",
    READY: "secondary",
    BLOCKED: "outline",
    SKIPPED: "outline",
}

export function BusinessSetupSummary() {
    const api = useApi()
    const t = useTranslations("business.businessSetup")

    const { data, isLoading } = useQuery({
        queryKey: ["business-setup", "state"],
        queryFn: () => api.businessSetup.getState(),
    })

    const tasks = data?.tasks ?? []

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-4">
            <h1 className="text-2xl font-semibold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("description")}</p>

            {isLoading && <p className="text-sm text-muted-foreground">{t("loading")}</p>}

            <div className="border rounded-lg divide-y">
                {tasks.map((task) => (
                    <div key={task.id} className="p-4 flex items-center justify-between">
                        <span className="text-sm font-medium">{t(`tasks.${task.type}`)}</span>
                        <Badge variant={STATUS_VARIANT[task.status] ?? "outline"}>
                            {t(`status.${task.status}`)}
                        </Badge>
                    </div>
                ))}
            </div>
        </div>
    )
}
```

- [ ] **Step 2: Thin route page**

```tsx
// apps/dashboard/app/[locale]/(authenticated)/setup/page.tsx
import { BusinessSetupSummary } from "@/modules/business-setup/business-setup-summary"

export default function Page() {
    return <BusinessSetupSummary />
}
```

- [ ] **Step 3: Add i18n keys**

Add to `packages/i18n/src/{en,ar,tr,ar-SY}/business.json` a new top-level `businessSetup` block:

```json
"businessSetup": {
    "title": "Business setup",
    "description": "Track the setup tasks for your business.",
    "loading": "Loading…",
    "status": {
        "BLOCKED": "Blocked",
        "READY": "Ready",
        "COMPLETED": "Completed",
        "SKIPPED": "Skipped"
    },
    "tasks": {
        "CURRENCIES": "Currencies",
        "FISCAL_PERIOD": "Fiscal period",
        "CHART_OF_ACCOUNTS": "Chart of accounts",
        "FINANCIAL_MAPPINGS": "Financial mappings",
        "DOCUMENT_SEQUENCES": "Document numbering",
        "CASHBOXES": "Cashboxes",
        "BANK_ACCOUNTS": "Bank accounts",
        "WAREHOUSES": "Warehouses",
        "PRODUCTS": "Products",
        "CUSTOMERS": "Customers",
        "SUPPLIERS": "Suppliers",
        "OPENING_CASH_BALANCES": "Opening cash balances",
        "OPENING_BANK_BALANCES": "Opening bank balances",
        "OPENING_RECEIVABLES": "Opening receivables",
        "OPENING_PAYABLES": "Opening payables",
        "OPENING_INVENTORY": "Opening inventory",
        "RECONCILIATION": "Reconciliation"
    }
}
```

(translate the labels for `ar`, `tr`, `ar-SY` following each file's existing tone for other business terms — the keys must be identical across all four locale files)

- [ ] **Step 4: Verify**

Run: `pnpm --filter @devloggers/dashboard lint`
Expected: exits 0

Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: exits 0

Manual smoke: `pnpm --filter @devloggers/dashboard dev`, log in, finish onboarding through step 7 — confirm the browser lands on `/{locale}/setup` and shows a list of 17 tasks with status badges (most `BLOCKED`, a few `READY` for root tasks like `CURRENCIES`/`FISCAL_PERIOD`/`CHART_OF_ACCOUNTS`/`DOCUMENT_SEQUENCES`/`WAREHOUSES`).

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/modules/business-setup apps/dashboard/app/[locale]/\(authenticated\)/setup packages/i18n/src
git commit -m "feat(business-setup): add minimal /setup summary page (Phase 6.4.5 redirect target)"
```

---

## Task 30: Migration cohorts — backfill `SetupTask` rows for existing tenants

**Files:**
- Create: `packages/db-prisma/src/seed/backfill-business-setup-tasks.ts`
- Modify: `packages/db-prisma/package.json`

**Interfaces:**
- Consumes: raw `PrismaClient` only (mirrors `src/seed/index.ts`'s `PrismaPg`/`Pool` instantiation) — this package cannot import `apps/api` code (wrong dependency direction per `.ai/rules/packages.md`'s `db-prisma → backend-core ← api` graph), so it keeps its own copy of `SETUP_TASK_DEPENDENCIES`, documented as such.
- Produces: `pnpm --filter @devloggers/db-prisma backfill:business-setup` — a single idempotent pass (skips any tenant that already has `SetupTask` rows) covering all three cohorts from spec 6.6 with one uniform rule: **discovery decides completion**. A tenant mid-onboarding (6.6.1) has whatever partial data they got through marked COMPLETED and the rest BLOCKED/READY by the graph; a tenant who finished the old onboarding wizard on an empty business (6.6.2) has currencies/CoA/fiscal-period/cashboxes marked COMPLETED (the old wizard created exactly those) with everything else correctly gated; an existing business with real data already in every table (6.6.3) has everything discovery finds marked COMPLETED. No cohort needs bespoke code because "does the data already exist" is the same question in all three cases.

- [ ] **Step 1: Implement**

```typescript
// packages/db-prisma/src/seed/backfill-business-setup-tasks.ts
import 'dotenv/config'
import { PrismaClient, SetupTaskType, SetupTaskStatus } from '../../generated/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

/**
 * Mirrors apps/api/src/modules/identity/business-setup/constants/setup-task-graph.ts.
 * packages/db-prisma cannot import from apps/api (wrong dependency direction,
 * .ai/rules/packages.md), so this one-time backfill keeps its own copy — keep
 * both in sync if the graph changes. Order matters: every dependency appears
 * before its dependents, so a single forward pass can resolve statuses.
 */
const SETUP_TASK_TYPES: SetupTaskType[] = [
    'CURRENCIES', 'FISCAL_PERIOD', 'CHART_OF_ACCOUNTS', 'FINANCIAL_MAPPINGS', 'DOCUMENT_SEQUENCES',
    'CASHBOXES', 'BANK_ACCOUNTS', 'WAREHOUSES', 'PRODUCTS', 'CUSTOMERS', 'SUPPLIERS',
    'OPENING_CASH_BALANCES', 'OPENING_BANK_BALANCES', 'OPENING_RECEIVABLES', 'OPENING_PAYABLES',
    'OPENING_INVENTORY', 'RECONCILIATION',
]

const SETUP_TASK_DEPENDENCIES: Record<SetupTaskType, SetupTaskType[]> = {
    CURRENCIES: [], FISCAL_PERIOD: [], CHART_OF_ACCOUNTS: [], DOCUMENT_SEQUENCES: [], WAREHOUSES: [],
    FINANCIAL_MAPPINGS: ['CHART_OF_ACCOUNTS'],
    CASHBOXES: ['CURRENCIES'],
    BANK_ACCOUNTS: ['CURRENCIES'],
    PRODUCTS: ['WAREHOUSES'],
    CUSTOMERS: ['FINANCIAL_MAPPINGS'],
    SUPPLIERS: ['FINANCIAL_MAPPINGS'],
    OPENING_CASH_BALANCES: ['CASHBOXES', 'FINANCIAL_MAPPINGS', 'FISCAL_PERIOD'],
    OPENING_BANK_BALANCES: ['BANK_ACCOUNTS', 'FINANCIAL_MAPPINGS', 'FISCAL_PERIOD'],
    OPENING_RECEIVABLES: ['CUSTOMERS', 'FISCAL_PERIOD'],
    OPENING_PAYABLES: ['SUPPLIERS', 'FISCAL_PERIOD'],
    OPENING_INVENTORY: ['PRODUCTS', 'WAREHOUSES', 'FISCAL_PERIOD'],
    RECONCILIATION: [
        'CHART_OF_ACCOUNTS', 'FINANCIAL_MAPPINGS',
        'OPENING_CASH_BALANCES', 'OPENING_BANK_BALANCES',
        'OPENING_RECEIVABLES', 'OPENING_PAYABLES', 'OPENING_INVENTORY',
    ],
}

const DEFAULT_PROFILE = { inventory: true, sales: true, purchasing: true, accounting: true }

async function inspectExistence(prisma: PrismaClient, tenantId: string): Promise<Record<SetupTaskType, boolean>> {
    const [
        currencyCount, chartOfAccountCount, financialSetting, cashboxCount, bankAccountCount,
        fiscalPeriodCount, documentSequenceCount, warehouseCount, itemCount,
        customerCount, supplierCount, openingCashCount, openingBankCount,
        openingPartyLines, openingInventoryCount,
    ] = await Promise.all([
        prisma.currency.count({ where: { tenantId } }),
        prisma.chartOfAccount.count({ where: { tenantId } }),
        prisma.financialSetting.findUnique({ where: { tenantId } }),
        prisma.cashbox.count({ where: { tenantId } }),
        prisma.bankAccount.count({ where: { tenantId } }),
        prisma.fiscalPeriod.count({ where: { tenantId } }),
        prisma.documentSequence.count({ where: { tenantId } }),
        prisma.warehouse.count({ where: { tenantId } }),
        prisma.item.count({ where: { tenantId } }),
        prisma.party.count({ where: { tenantId, type: { in: ['CUSTOMER', 'CUSTOMER_SUPPLIER'] } } }),
        prisma.party.count({ where: { tenantId, type: { in: ['SUPPLIER', 'CUSTOMER_SUPPLIER'] } } }),
        prisma.journalLine.count({ where: { tenantId, cashboxId: { not: null }, journalEntry: { referenceType: 'OPENING_BALANCE' } } }),
        prisma.journalLine.count({ where: { tenantId, bankAccountId: { not: null }, journalEntry: { referenceType: 'OPENING_BALANCE' } } }),
        prisma.journalLine.findMany({
            where: { tenantId, partyId: { not: null }, journalEntry: { referenceType: 'OPENING_BALANCE' } },
            select: { accountId: true, party: { select: { receivableAccountId: true, payableAccountId: true } } },
        }),
        prisma.stockMovement.count({ where: { tenantId, movementType: 'OPENING' } }),
    ])

    const financialMappingsConfigured = financialSetting
        ? [
            financialSetting.defaultSalesAccountId, financialSetting.defaultPurchaseAccountId,
            financialSetting.defaultTaxAccountId, financialSetting.defaultReceivableAccountId,
            financialSetting.defaultPayableAccountId,
          ].some(Boolean)
        : false;
    const openingReceivablesCount = openingPartyLines.filter((l) => l.party?.receivableAccountId === l.accountId).length;
    const openingPayablesCount = openingPartyLines.filter((l) => l.party?.payableAccountId === l.accountId).length;

    return {
        CURRENCIES: currencyCount > 0,
        CHART_OF_ACCOUNTS: chartOfAccountCount > 0,
        FINANCIAL_MAPPINGS: financialMappingsConfigured,
        CASHBOXES: cashboxCount > 0,
        BANK_ACCOUNTS: bankAccountCount > 0,
        FISCAL_PERIOD: fiscalPeriodCount > 0,
        DOCUMENT_SEQUENCES: documentSequenceCount > 0,
        WAREHOUSES: warehouseCount > 0,
        PRODUCTS: itemCount > 0,
        CUSTOMERS: customerCount > 0,
        SUPPLIERS: supplierCount > 0,
        OPENING_CASH_BALANCES: openingCashCount > 0,
        OPENING_BANK_BALANCES: openingBankCount > 0,
        OPENING_RECEIVABLES: openingReceivablesCount > 0,
        OPENING_PAYABLES: openingPayablesCount > 0,
        OPENING_INVENTORY: openingInventoryCount > 0,
        RECONCILIATION: false,
    };
}

function resolveStatus(
    type: SetupTaskType,
    existsMap: Record<SetupTaskType, boolean>,
    statusByType: Map<SetupTaskType, SetupTaskStatus>,
): SetupTaskStatus {
    if (existsMap[type]) return 'COMPLETED';
    const ready = SETUP_TASK_DEPENDENCIES[type].every((dep) => {
        const depStatus = statusByType.get(dep);
        return depStatus === 'COMPLETED' || depStatus === 'SKIPPED';
    });
    return ready ? 'READY' : 'BLOCKED';
}

async function backfillTenant(prisma: PrismaClient, tenantId: string): Promise<void> {
    const existingTaskCount = await prisma.setupTask.count({ where: { tenantId } });
    if (existingTaskCount > 0) return; // idempotent — already backfilled

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { businessSetupProfile: true } });
    if (!tenant?.businessSetupProfile) {
        await prisma.tenant.update({ where: { id: tenantId }, data: { businessSetupProfile: DEFAULT_PROFILE } });
    }

    const existsMap = await inspectExistence(prisma, tenantId);
    const statusByType = new Map<SetupTaskType, SetupTaskStatus>();
    for (const type of SETUP_TASK_TYPES) {
        statusByType.set(type, resolveStatus(type, existsMap, statusByType));
    }

    await prisma.$transaction(
        SETUP_TASK_TYPES.map((type) =>
            prisma.setupTask.create({
                data: {
                    tenantId,
                    type,
                    status: statusByType.get(type) ?? 'BLOCKED',
                    required: true,
                    dependencies: SETUP_TASK_DEPENDENCIES[type],
                    completedAt: statusByType.get(type) === 'COMPLETED' ? new Date() : null,
                },
            }),
        ),
    );
}

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        const tenants = await prisma.tenant.findMany({ select: { id: true } });
        for (const tenant of tenants) {
            await backfillTenant(prisma, tenant.id);
        }
        console.log(`Backfilled business-setup tasks for ${tenants.length} tenant(s).`);
    } finally {
        await prisma.$disconnect();
    }
}

main();
```

- [ ] **Step 2: Register the script**

Add to `packages/db-prisma/package.json` `"scripts"` (alongside `"db:seed"`):

```json
"backfill:business-setup": "ts-node src/seed/backfill-business-setup-tasks.ts"
```

- [ ] **Step 3: Verify — read-only check before running against any real data**

Run: `pnpm --filter @devloggers/db-prisma build`
Expected: exits 0 (typecheck of the new script)

This script **writes** `SetupTask` rows and can set `Tenant.businessSetupProfile` — treat running it against the shared dev DB the same as any other data-affecting operation (see the andrej-karpathy / executing-plans discipline: confirm before running). Before running for real:

```bash
psql "$DATABASE_URL" -c "SELECT count(*) FROM tenants;"
psql "$DATABASE_URL" -c "SELECT count(*) FROM setup_tasks;"
```

Run the backfill: `pnpm --filter @devloggers/db-prisma backfill:business-setup`
Expected output: `Backfilled business-setup tasks for <N> tenant(s).` where `<N>` matches the tenant count above.

Verify: `psql "$DATABASE_URL" -c "SELECT tenant_id, count(*) FROM setup_tasks GROUP BY tenant_id;"`
Expected: every tenant has exactly 17 rows. Re-run the backfill command — expected output is the same `<N>`, and the row counts must be unchanged (idempotency proof).

- [ ] **Step 4: Commit**

```bash
git add packages/db-prisma/src/seed/backfill-business-setup-tasks.ts packages/db-prisma/package.json
git commit -m "feat(db-prisma): add idempotent SetupTask backfill for existing tenants (Phase 6.6)"
```

---

## Self-review

**Spec coverage** (`docs/superpowers/specs/2026-08-20-erp-roadmap/phase-06-business-setup-orchestration.md`):

| Spec item | Task |
|---|---|
| 6.1.1 `setup_tasks` table | Task 1 |
| 6.1.2 Tenant fields | Task 1 |
| 6.1.3 Migrate `onboarding_step` → task rows | Task 30 |
| 6.1.4 Keep `onboardingCompletedAt` | Untouched — Task 26 preserves it verbatim |
| 6.2.1 `BusinessSetupDiscoveryService.inspect` | Task 6 |
| 6.2.2 `BusinessSetupPlanService.generate` | Task 7 |
| 6.2.3 `BusinessSetupTaskService` READY/BLOCKED/COMPLETED | Task 8 |
| 6.2.4 `BusinessSetupOrchestratorService` | Task 22 |
| 6.3 all 7 named handlers + OPENING_* | Tasks 10–21 |
| 6.4.1 Remove CoA bootstrap raw Prisma | Tasks 3, 26 |
| 6.4.2 Remove currencies raw creates | Task 26 |
| 6.4.3 Business profile step | Task 28 |
| 6.4.4 Fix resume bugs | Task 27 |
| 6.4.5 `complete()` → redirect `/setup` | Tasks 27 (redirect), 29 (destination) |
| 6.5.1–6.5.4 API + contracts + client | Tasks 23, 24, 25 |
| 6.6.1–6.6.3 Migration cohorts | Task 30 |
| Phase 7 hooks (`RequestContext.run`, `ReconciliationMonitorService`) | Task 22, Task 21 |
| Done-when: no direct Prisma business mutations in `OnboardingService` | Task 26, Step 5 grep |
| Done-when: OPENING_CASH blocked without CASHBOXES | Task 4 (graph), Task 8 (resolution test) |

**Placeholder scan:** no `TBD`/`TODO`, no "add appropriate error handling," no "similar to Task N" without inline code, no undefined types referenced across tasks — every handler's constructor dependency traces to a Task 3/6–9/22 export, every DTO import traces to an existing or Task-created file.

**Type consistency:** `SetupTaskHandlerResult` (Task 9) used identically by all 12 handlers (Tasks 10–21) and consumed identically by the orchestrator (Task 22). `SetupTaskPlanItem` (Task 7) fields (`type`, `required`, `dependencies`, `metadata`) match exactly what `BusinessSetupTaskService.upsertPlan` (Task 8) destructures. `BusinessSetupInspection` (Task 6) keys match `INSPECTION_KEY_BY_TASK_TYPE` (Task 7) and the controller's `inspectionKeyByType` (Task 23) — all three lists cover exactly the same five discovery-only types (`WAREHOUSES`, `PRODUCTS`, `CUSTOMERS`, `SUPPLIERS`, `OPENING_INVENTORY`, via `DISCOVERY_ONLY_TASK_TYPES` in Task 4).

## Verification (full gate, run once all 30 tasks are complete)

```bash
pnpm --filter @devloggers/api lint:architecture
pnpm --filter @devloggers/api test
pnpm --filter @devloggers/db-prisma build
pnpm --filter @devloggers/api-contracts build
pnpm --filter @devloggers/api-client build
pnpm turbo run build --filter=@devloggers/api
pnpm turbo run build --filter=@devloggers/dashboard
grep -r "prisma.cashbox.create\|prisma.warehouse\|prisma.unit.createMany\|prisma.chartOfAccount" apps/api/src/modules/identity/onboarding   # expect empty
```


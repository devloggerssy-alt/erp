# Phase 10 — Setup Hub, Readiness & Remediation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the read-only `/setup` summary into a real Business Setup hub — accurate task states derived from discovery, next recommended action, per-module operational readiness with nav soft warnings, reconciliation gating of `businessSetupCompletedAt`, and a remediation panel that lists exactly what blocks completion.

**Architecture:** Extend the existing `apps/api/src/modules/identity/business-setup/` module (Phase 6, already shipped): generalize discovery auto-completion to all non-reconciliation tasks, add a `BusinessSetupReadinessService` that caches per-module readiness into `Tenant.operationalReadiness`, set `Tenant.businessSetupCompletedAt` only when the `RECONCILIATION` task passes, add a `skip` action for not-applicable tasks, and compute the next action server-side from the dependency graph. The dashboard replaces `business-setup-summary.tsx` with a grouped hub (`Accounting / Money / Inventory / Parties`), adds readiness warning icons to the sidebar and a soft "continue setup" banner — **no hard redirect (Q10 decided: soft warnings only)** because legacy tenants carry accepted reconciliation drift and must not be locked out.

**Tech Stack:** NestJS (4-layer + module conventions), Prisma JSON columns (no migration needed), Jest mocked-unit specs (`*.spec.ts`, plain constructor injection), api-contracts resources + OpenAPI codegen (`pnpm generate`), api-client, Next.js App Router + TanStack Query + next-intl (en/ar/tr), Vitest for dashboard pure-logic tests (`modules/**/*.test.ts` only).

## Global Constraints

- **No new Prisma migration.** `Tenant.businessSetupCompletedAt` and `Tenant.operationalReadiness` already exist (`packages/db-prisma/src/schema/tenant.prisma:21-22`). If you think you need one, stop and re-read this plan.
- **10.5 legacy columns are gone.** `parties.opening_balance` was dropped in `20260821014711_drop_party_opening_balance` and `cashboxes.linked_account_id` was backfilled + dropped in `20260821000000_subledger_foundation`. Do **not** write code that reads them. Remediation UI surfaces the *actual* blockers: failed reconciliation checks.
- **Q10 decision: soft warnings only.** No hard redirect to `/setup`. `businessSetupCompletedAt` gates nothing at the router; it is a hub/banner readiness signal.
- **`businessSetupCompletedAt` is written in exactly one place** — the orchestrator, after a `RECONCILIATION` task completes (i.e. `run.passed === true`). Never unset.
- **Every non-factory controller route needs `@RequirePermission`** (`apps/api/src/modules/identity/auth/permissions/enforcement-coverage.spec.ts` fails otherwise). Reuse `businessSetup.manage`.
- **Swagger decorators are mandatory** on every new DTO field, with explicit `type`/`enum`/`nullable` (`.ai/rules/api.md`). Run `pnpm generate` after every DTO/controller change and commit `apps/api/openapi.yaml` + `packages/api-contracts/types/index.ts`.
- **Do not call Prisma from services for writes** — use repositories (`repositories/`). `BusinessSetupDiscoveryService` stays read-only Prisma (established Phase 6 exception).
- **i18n:** every new user string goes under `business.businessSetup.*` in `packages/i18n/src/{en,ar,tr}/business.json` (all three locales; Arabic RTL, logical CSS only).
- **Dashboard tests:** Vitest only picks up `modules/**/*.test.ts` (node env, no jsdom). Component correctness is verified by `pnpm --filter @devloggers/dashboard typecheck` + build.
- **Verify per task:** `pnpm --filter @devloggers/api test -- <spec-pattern>` for touched backend specs; `pnpm --filter @devloggers/dashboard test:unit` for dashboard config tests. Full gate in Task 17.
- **Existing uncommitted files:** `git status` currently shows modified `apps/api/openapi.yaml` and `packages/api-contracts/types/index.ts` (Phase 9 regeneration). Commit or stash them before starting (Task 0).

---

## File map

```
apps/api/src/modules/identity/business-setup/
  constants/skippable-tasks.ts                                  [new]
  constants/skippable-tasks.spec.ts                             [new]
  constants/operational-readiness.ts                            [new]
  constants/operational-readiness.spec.ts                       [new]
  constants/discovery-completion.ts                             [new]
  constants/discovery-completion.spec.ts                        [new]
  utils/next-action.util.ts                                     [new]
  utils/next-action.util.spec.ts                                [new]
  repositories/business-setup-tenant.repository.ts              [new]
  services/business-setup-readiness.service.ts                  [new]
  services/business-setup-readiness.service.spec.ts             [new]
  services/business-setup-task.service.ts                       [modify]
  services/business-setup-task.service.spec.ts                  [modify]
  services/business-setup-discovery.service.ts                  [modify]
  services/business-setup-discovery.service.spec.ts             [modify]
  services/business-setup-plan.service.ts                       [modify]
  services/business-setup-orchestrator.service.ts               [modify]
  services/business-setup-orchestrator.service.spec.ts          [modify]
  handlers/reconciliation.handler.ts                            [modify]
  handlers/reconciliation.handler.spec.ts                       [modify]
  presenters/setup-task.presenter.ts                            [modify]
  dto/setup-task-response.dto.ts                                [modify]
  dto/operational-readiness.dto.ts                              [new]
  dto/next-setup-action.dto.ts                                  [new]
  dto/business-setup-state-response.dto.ts                      [modify]
  dto/index.ts                                                  [modify]
  controllers/business-setup.controller.ts                      [modify]
  business-setup.module.ts                                      [modify]

packages/api-contracts/src/resources/business-setup.resource.ts  [modify]
packages/api-contracts/types/index.ts                            [regenerated]
apps/api/openapi.yaml                                            [regenerated]
packages/api-client/src/clients/business-setup.client.ts         [modify]

packages/i18n/src/en/business.json                               [modify]
packages/i18n/src/ar/business.json                               [modify]
packages/i18n/src/tr/business.json                               [modify]

apps/dashboard/shared/hooks/use-setup-readiness.ts               [new]
apps/dashboard/modules/business-setup/hooks/use-business-setup.ts [new]
apps/dashboard/modules/business-setup/setup.config.ts            [new]
apps/dashboard/modules/business-setup/setup.config.test.ts       [new]
apps/dashboard/modules/business-setup/index.ts                   [new]
apps/dashboard/modules/business-setup/business-setup-summary.tsx [delete]
apps/dashboard/modules/business-setup/components/setup-hub.tsx   [new]
apps/dashboard/modules/business-setup/components/setup-task-card.tsx [new]
apps/dashboard/modules/business-setup/components/setup-next-action.tsx [new]
apps/dashboard/modules/business-setup/components/setup-readiness-panel.tsx [new]
apps/dashboard/modules/business-setup/components/setup-reconciliation-panel.tsx [new]
apps/dashboard/modules/business-setup/components/setup-progress-banner.tsx [new]

apps/dashboard/infrastructure/types/navigation.ts               [modify]
apps/dashboard/config/navGroups.tsx                             [modify]
apps/dashboard/infrastructure/components/layout/dashboard/app-sidebar.tsx [modify]
apps/dashboard/app/[locale]/(authenticated)/layout.tsx          [modify]
apps/dashboard/app/[locale]/(authenticated)/setup/page.tsx      [modify]

docs/superpowers/specs/2026-08-20-erp-roadmap/README.md         [modify]
docs/superpowers/specs/2026-08-20-erp-roadmap/phase-10-business-setup-ui-import-readiness.md [modify]
```

---

## Task 0: Preflight

**Files:** none (verification only)

- [ ] **Step 1: Check the working tree**

Run: `git status --short`
Expected: only the pre-existing `apps/api/openapi.yaml` + `packages/api-contracts/types/index.ts` modifications (Phase 9 regeneration). Commit them (`git add apps/api/openapi.yaml packages/api-contracts/types/index.ts && git commit -m "chore: regenerate openapi and api-contracts types after Phase 9"`) or confirm with the user they should be stashed. Do not start Task 1 on top of unexplained changes.

- [ ] **Step 2: Baseline the backend suite**

Run: `pnpm --filter @devloggers/api test -- business-setup`
Expected: PASS — all `business-setup/*.spec.ts` green before you touch anything.

- [ ] **Step 3: Baseline the dashboard unit tests**

Run: `pnpm --filter @devloggers/dashboard test:unit`
Expected: PASS (3 test files: accounts ×2, settings).

---

## Task 1: Reconciliation handler stores per-check results

The hub needs to list *which* checks failed. `ReconciliationRunResponseDto` only carries `findingCount`/`newFindings`, so the handler evaluates once and stores the per-check summary in the task's `progress` JSON (the monitor still runs for history/audit).

**Files:**
- Modify: `apps/api/src/modules/identity/business-setup/handlers/reconciliation.handler.ts`
- Modify: `apps/api/src/modules/identity/business-setup/handlers/reconciliation.handler.spec.ts`

**Interfaces:**
- Consumes: `BusinessSetupReconciliationService.evaluate(tenantId): Promise<ReconciliationResultDto>` (`checks: { number, code, passed, findingCount }[]`), `ReconciliationMonitorService.runForTenant(tenantId, 'BUSINESS_SETUP')`.
- Produces: handler details `{ runId, findingCount, newFindings, checks: { code, passed, findingCount }[] }` — read by the dashboard via `task.progress.checks` (Task 12 parses it).

- [ ] **Step 1: Replace the handler spec with the new contract**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/reconciliation.handler.spec.ts
import { ReconciliationTaskHandler } from './reconciliation.handler';

function build(passed: boolean, checks: Array<{ code: string; passed: boolean; findingCount: number }>) {
    const reconciliationMonitor = {
        runForTenant: jest.fn().mockResolvedValue({
            id: passed ? 'run-1' : 'run-2',
            passed,
            findingCount: checks.reduce((sum, check) => sum + check.findingCount, 0),
            newFindings: passed ? [] : ['JE_UNBALANCED:je-1'],
        }),
    };
    const reconciliation = {
        evaluate: jest.fn().mockResolvedValue({
            generatedAt: '2026-09-21T00:00:00.000Z',
            passed,
            checks,
            report: {},
        }),
    };
    const handler = new ReconciliationTaskHandler(reconciliationMonitor as never, reconciliation as never);
    return { handler, reconciliationMonitor, reconciliation };
}

describe('ReconciliationTaskHandler', () => {
    it('marks the task completed when the run passes and stores the per-check summary', async () => {
        const checks = [
            { code: 'JOURNAL_ENTRIES_BALANCED', passed: true, findingCount: 0 },
            { code: 'MULTI_CURRENCY_BASE_CONSISTENT', passed: true, findingCount: 0 },
        ];
        const { handler } = build(true, checks);

        const result = await handler.execute('t1', 'u1', undefined);

        expect(result).toEqual({
            completed: true,
            details: { runId: 'run-1', findingCount: 0, newFindings: [], checks },
        });
    });

    it('does not complete when the run fails — stays retryable and stores failed checks', async () => {
        const checks = [
            { code: 'JOURNAL_ENTRIES_BALANCED', passed: false, findingCount: 3 },
            { code: 'CASH_GL_VS_CASHBOX_SUBLEDGER', passed: true, findingCount: 0 },
        ];
        const { handler } = build(false, checks);

        const result = await handler.execute('t1', 'u1', undefined);

        expect(result.completed).toBe(false);
        expect(result.details).toEqual({
            runId: 'run-2',
            findingCount: 3,
            newFindings: ['JE_UNBALANCED:je-1'],
            checks,
        });
    });

    it('runs the monitor with the BUSINESS_SETUP trigger', async () => {
        const { handler, reconciliationMonitor } = build(true, []);
        await handler.execute('t1', 'u1', undefined);
        expect(reconciliationMonitor.runForTenant).toHaveBeenCalledWith('t1', 'BUSINESS_SETUP');
    });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `pnpm --filter @devloggers/api test -- reconciliation.handler.spec`
Expected: FAIL — `evaluate` is not a function / constructor arity mismatch.

- [ ] **Step 3: Implement the handler**

```typescript
// apps/api/src/modules/identity/business-setup/handlers/reconciliation.handler.ts
import { Injectable } from '@nestjs/common';
import { BusinessSetupReconciliationService } from '../../../accounting/reconciliation/services/business-setup-reconciliation.service';
import { ReconciliationMonitorService } from '../../../accounting/reconciliation/services/reconciliation-monitor.service';
import type { SetupTaskHandler, SetupTaskHandlerResult } from './setup-task-handler.interface';

/**
 * Runs the Phase 7 reconciliation stack and stores both the run reference and a
 * per-check summary in the task's `progress` JSON. The summary is what the setup
 * hub renders as explicit blockers when the run fails (Phase 10.4.3). The
 * monitor is the source of truth for pass/fail (history + drift diffing); the
 * extra `evaluate()` call only fetches the per-check breakdown, which the run
 * response does not include. Both calls are read-only and back-to-back.
 */
@Injectable()
export class ReconciliationTaskHandler implements SetupTaskHandler {
    constructor(
        private readonly reconciliationMonitor: ReconciliationMonitorService,
        private readonly reconciliation: BusinessSetupReconciliationService,
    ) {}

    async execute(tenantId: string, _userId: string, _payload: unknown): Promise<SetupTaskHandlerResult> {
        const evaluation = await this.reconciliation.evaluate(tenantId);
        const run = await this.reconciliationMonitor.runForTenant(tenantId, 'BUSINESS_SETUP');
        return {
            completed: run.passed,
            details: {
                runId: run.id,
                findingCount: run.findingCount,
                newFindings: run.newFindings,
                checks: evaluation.checks.map((check) => ({
                    code: check.code,
                    passed: check.passed,
                    findingCount: check.findingCount,
                })),
            },
        };
    }
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `pnpm --filter @devloggers/api test -- reconciliation.handler.spec`
Expected: PASS — 3/3.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/handlers/reconciliation.handler.ts apps/api/src/modules/identity/business-setup/handlers/reconciliation.handler.spec.ts
git commit -m "feat(business-setup): store per-check reconciliation results on task progress (Phase 10.4)"
```

---

## Task 2: Discovery — resolve party opening lines against default AR/AP accounts

`OpeningSessionPostedPolicy` resolves a PARTY line to `party.receivableAccountId ?? settings.defaultReceivableAccountId` (`apps/api/src/modules/accounting/posting/policies/opening-session.policy.ts:155-165`). The discovery service only matches the party override, so tenants that use the default control accounts never auto-complete `OPENING_RECEIVABLES`/`OPENING_PAYABLES`. Fix the count to mirror the policy.

**Files:**
- Modify: `apps/api/src/modules/identity/business-setup/services/business-setup-discovery.service.ts:82-83`
- Modify: `apps/api/src/modules/identity/business-setup/services/business-setup-discovery.service.spec.ts`

**Interfaces:**
- Produces: `inspection.openingReceivables` / `inspection.openingPayables` now count lines resolved via party override **or** `financialSetting.defaultReceivableAccountId` / `defaultPayableAccountId`.

- [ ] **Step 1: Add the failing test**

Append inside `describe('BusinessSetupDiscoveryService.inspect')` in `business-setup-discovery.service.spec.ts`:

```typescript
    it('resolves party opening lines against the party override or the default AR/AP control account', async () => {
        const { service } = build({
            financialSetting: {
                findUnique: jest.fn().mockResolvedValue({ defaultReceivableAccountId: 'default-ar', defaultPayableAccountId: 'default-ap' }),
            },
            journalLine: {
                count: jest.fn().mockResolvedValue(0),
                findMany: jest.fn().mockResolvedValue([
                    { accountId: 'default-ar', party: { receivableAccountId: null, payableAccountId: null } },
                    { accountId: 'override-ar', party: { receivableAccountId: 'override-ar', payableAccountId: null } },
                    { accountId: 'default-ap', party: { receivableAccountId: null, payableAccountId: null } },
                    { accountId: 'other', party: { receivableAccountId: null, payableAccountId: null } },
                ]),
            },
        });

        const result = await service.inspect('tenant-1');
        expect(result.openingReceivables).toEqual({ count: 2, classification: 'EXISTING' });
        expect(result.openingPayables).toEqual({ count: 1, classification: 'EXISTING' });
    });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @devloggers/api test -- business-setup-discovery.service.spec`
Expected: FAIL — receivables count is `1` (only the override), expected `2`.

- [ ] **Step 3: Implement the resolved-account match**

Replace lines 82-83 of `business-setup-discovery.service.ts` with:

```typescript
        const openingReceivablesCount = openingPartyLines.filter((line) => {
            const resolvedAccountId = line.party?.receivableAccountId ?? financialSetting?.defaultReceivableAccountId ?? null;
            return resolvedAccountId !== null && line.accountId === resolvedAccountId;
        }).length;
        const openingPayablesCount = openingPartyLines.filter((line) => {
            const resolvedAccountId = line.party?.payableAccountId ?? financialSetting?.defaultPayableAccountId ?? null;
            return resolvedAccountId !== null && line.accountId === resolvedAccountId;
        }).length;
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `pnpm --filter @devloggers/api test -- business-setup-discovery.service.spec`
Expected: PASS — all cases including the pre-existing override-only ones.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/services/business-setup-discovery.service.ts apps/api/src/modules/identity/business-setup/services/business-setup-discovery.service.spec.ts
git commit -m "fix(business-setup): count party opening lines via resolved AR/AP account (Phase 10.4)"
```

---

## Task 3: Skip support — constant, task service, presenter flag

An empty or cash-only business must be able to declare tasks not applicable, otherwise required tasks block readiness forever. Skip is restricted to operational setup tasks; the accounting core and `RECONCILIATION` are never skippable.

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/constants/skippable-tasks.ts`
- Create: `apps/api/src/modules/identity/business-setup/constants/skippable-tasks.spec.ts`
- Modify: `apps/api/src/modules/identity/business-setup/services/business-setup-task.service.ts`
- Modify: `apps/api/src/modules/identity/business-setup/services/business-setup-task.service.spec.ts`
- Modify: `apps/api/src/modules/identity/business-setup/presenters/setup-task.presenter.ts`
- Modify: `apps/api/src/modules/identity/business-setup/dto/setup-task-response.dto.ts`

**Interfaces:**
- Produces: `isSkippableTask(type: SetupTaskType): boolean`, `SKIPPABLE_TASK_TYPES: SetupTaskType[]`; `BusinessSetupTaskService.skip(tenantId, type): Promise<SetupTask>`; `SetupTaskResponseDto.skippable: boolean` (type-skippable AND not COMPLETED/SKIPPED).

- [ ] **Step 1: Write the failing constant spec**

```typescript
// apps/api/src/modules/identity/business-setup/constants/skippable-tasks.spec.ts
import { SKIPPABLE_TASK_TYPES, isSkippableTask } from './skippable-tasks';
import { SETUP_TASK_TYPES } from './setup-task-graph';

describe('skippable setup tasks', () => {
    it('allows skipping operational tasks', () => {
        for (const type of ['CASHBOXES', 'BANK_ACCOUNTS', 'OPENING_CASH_BALANCES', 'OPENING_RECEIVABLES', 'PRODUCTS', 'SUPPLIERS'] as const) {
            expect(isSkippableTask(type)).toBe(true);
        }
    });

    it('never allows skipping accounting core tasks', () => {
        for (const type of ['CURRENCIES', 'FISCAL_PERIOD', 'CHART_OF_ACCOUNTS', 'FINANCIAL_MAPPINGS', 'DOCUMENT_SEQUENCES'] as const) {
            expect(isSkippableTask(type)).toBe(false);
        }
    });

    it('never allows skipping RECONCILIATION — it is the completion gate', () => {
        expect(isSkippableTask('RECONCILIATION')).toBe(false);
    });

    it('only lists known task types', () => {
        for (const type of SKIPPABLE_TASK_TYPES) {
            expect(SETUP_TASK_TYPES).toContain(type);
        }
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @devloggers/api test -- skippable-tasks.spec`
Expected: FAIL — `Cannot find module './skippable-tasks'`.

- [ ] **Step 3: Implement the constant**

```typescript
// apps/api/src/modules/identity/business-setup/constants/skippable-tasks.ts
import type { SetupTaskType } from '@devloggers/db-prisma';

/**
 * Task types a user may explicitly declare not applicable ("skip"). Core
 * accounting configuration is never skippable — a tenant cannot post without
 * currencies, accounts, mappings or document numbers. RECONCILIATION is never
 * skippable: it is the completion gate (Phase 10.4.3).
 */
export const SKIPPABLE_TASK_TYPES: SetupTaskType[] = [
    'CASHBOXES',
    'BANK_ACCOUNTS',
    'WAREHOUSES',
    'PRODUCTS',
    'CUSTOMERS',
    'SUPPLIERS',
    'OPENING_CASH_BALANCES',
    'OPENING_BANK_BALANCES',
    'OPENING_RECEIVABLES',
    'OPENING_PAYABLES',
    'OPENING_INVENTORY',
];

export function isSkippableTask(type: SetupTaskType): boolean {
    return SKIPPABLE_TASK_TYPES.includes(type);
}
```

- [ ] **Step 4: Run the constant spec to verify it passes**

Run: `pnpm --filter @devloggers/api test -- skippable-tasks.spec`
Expected: PASS — 4/4.

- [ ] **Step 5: Add the failing service test**

In `business-setup-task.service.spec.ts`, add a new `describe` inside the top-level `describe('BusinessSetupTaskService')`:

```typescript
    describe('skip', () => {
        it('marks a skippable task SKIPPED and unblocks its dependents', async () => {
            // resolveStatuses reads the STATIC SETUP_TASK_DEPENDENCIES graph, so every
            // dependency of OPENING_BANK_BALANCES must have a row here
            // (BANK_ACCOUNTS, FINANCIAL_MAPPINGS, FISCAL_PERIOD).
            const { service, store } = build([
                makeTask({ type: 'BANK_ACCOUNTS' as never, status: 'READY', dependencies: [] }),
                makeTask({ type: 'FINANCIAL_MAPPINGS' as never, status: 'COMPLETED', completedAt: new Date() }),
                makeTask({ type: 'FISCAL_PERIOD' as never, status: 'COMPLETED', completedAt: new Date() }),
                makeTask({ type: 'OPENING_BANK_BALANCES' as never, status: 'BLOCKED', dependencies: ['BANK_ACCOUNTS', 'FINANCIAL_MAPPINGS', 'FISCAL_PERIOD'] as never }),
            ]);

            const skipped = await service.skip('t1', 'BANK_ACCOUNTS' as never);

            expect(skipped.status).toBe('SKIPPED');
            expect(store.get('OPENING_BANK_BALANCES' as never)?.status).toBe('READY');
        });

        it('refuses to skip a core accounting task', async () => {
            const { service } = build([makeTask({ type: 'CURRENCIES' as never, status: 'READY' })]);
            await expect(service.skip('t1', 'CURRENCIES' as never)).rejects.toThrow('cannot be skipped');
        });

        it('refuses to skip a completed task', async () => {
            const { service } = build([makeTask({ type: 'CASHBOXES' as never, status: 'COMPLETED', completedAt: new Date() })]);
            await expect(service.skip('t1', 'CASHBOXES' as never)).rejects.toThrow('already completed');
        });

        it('is idempotent — skipping an already SKIPPED task returns it unchanged', async () => {
            const { service, repository } = build([makeTask({ type: 'CASHBOXES' as never, status: 'SKIPPED' })]);
            const result = await service.skip('t1', 'CASHBOXES' as never);
            expect(result.status).toBe('SKIPPED');
            expect(repository.upsertByType).not.toHaveBeenCalled();
        });
    });
```

- [ ] **Step 6: Run it to verify it fails**

Run: `pnpm --filter @devloggers/api test -- business-setup-task.service.spec`
Expected: FAIL — `service.skip is not a function`.

- [ ] **Step 7: Implement `skip`**

In `business-setup-task.service.ts`:
1. Change the first import to `import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';`
2. Add `import { isSkippableTask } from '../constants/skippable-tasks';`
3. Add the method after `recordAttempt`:

```typescript
    async skip(tenantId: string, type: SetupTaskType): Promise<SetupTask> {
        if (!isSkippableTask(type)) {
            throw new BadRequestException(`Setup task "${type}" cannot be skipped`);
        }
        const task = await this.getTaskOrFail(tenantId, type);
        if (task.status === 'COMPLETED') {
            throw new ConflictException(`Setup task "${type}" is already completed`);
        }
        if (task.status !== 'SKIPPED') {
            await this.repository.upsertByType(tenantId, type, {
                status: 'SKIPPED',
                progress: { skippedByUser: true } as Prisma.InputJsonValue,
            });
            await this.resolveStatuses(tenantId);
        }
        return this.getTaskOrFail(tenantId, type);
    }
```

- [ ] **Step 8: Run the service spec to verify it passes**

Run: `pnpm --filter @devloggers/api test -- business-setup-task.service.spec`
Expected: PASS — previous cases + 4 new.

- [ ] **Step 9: Expose `skippable` on the task DTO and presenter**

In `dto/setup-task-response.dto.ts`, add after `required`:

```typescript
    @ApiProperty({ example: true, description: 'True when the user may mark this task as not applicable (skippable type, not completed/skipped)' })
    skippable: boolean = false;
```

In `presenters/setup-task.presenter.ts`:
1. Add `import { isSkippableTask } from '../constants/skippable-tasks';`
2. Add to the returned object after `required`:

```typescript
            skippable: isSkippableTask(entity.type) && entity.status !== 'COMPLETED' && entity.status !== 'SKIPPED',
```

- [ ] **Step 10: Verify the module compiles**

Run: `pnpm --filter @devloggers/api build`
Expected: exit 0.

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/constants/skippable-tasks.ts apps/api/src/modules/identity/business-setup/constants/skippable-tasks.spec.ts apps/api/src/modules/identity/business-setup/services/business-setup-task.service.ts apps/api/src/modules/identity/business-setup/services/business-setup-task.service.spec.ts apps/api/src/modules/identity/business-setup/presenters/setup-task.presenter.ts apps/api/src/modules/identity/business-setup/dto/setup-task-response.dto.ts
git commit -m "feat(business-setup): add skippable task support and skip action (Phase 10.1)"
```

---

## Task 4: Skip route + contracts + client

**Files:**
- Modify: `apps/api/src/modules/identity/business-setup/controllers/business-setup.controller.ts`
- Modify: `packages/api-contracts/src/resources/business-setup.resource.ts`
- Modify: `packages/api-client/src/clients/business-setup.client.ts`
- Regenerated: `apps/api/openapi.yaml`, `packages/api-contracts/types/index.ts`

**Interfaces:**
- Produces: `POST /business-setup/tasks/{type}/skip` → `SetupTaskResponseDto`; `BusinessSetupClient.skipTask(type: string)`; resource route key `skipTask`.

- [ ] **Step 1: Add the controller route**

In `business-setup.controller.ts`, add after the `executeTask` method (keep the existing imports; `Post`, `ApiParam` are already imported):

```typescript
    @Post('tasks/:type/skip')
    @RequirePermission('businessSetup.manage')
    @ApiOperation({ summary: 'Mark a setup task as not applicable (SKIPPED) — only skippable task types' })
    @ApiParam({ name: 'type', enum: SetupTaskType, enumName: 'SetupTaskType', description: 'Setup task type to skip' })
    async skipTask(@CurrentUser() user: RequestUser, @Param('type') type: string): Promise<SetupTaskResponseDto> {
        if (!SETUP_TASK_TYPES.includes(type as SetupTaskType)) {
            throw new BadRequestException(`Unknown setup task type "${type}"`);
        }
        const task = await this.taskService.skip(user.tenantId, type as SetupTaskType);
        return this.presenter.toResponse(task);
    }
```

(`taskService.skip` throws `BadRequestException` for non-skippable types and `ConflictException` for completed ones — no extra handling needed.)

- [ ] **Step 2: Regenerate the OpenAPI contract**

Run: `pnpm generate`
Expected: exit 0; `grep "tasks/{type}/skip" apps/api/openapi.yaml` returns a match.

- [ ] **Step 3: Add the resource route**

```typescript
// packages/api-contracts/src/resources/business-setup.resource.ts
import type { ApiPath } from '../api'
import { defineResource } from './base/resource'

export const businessSetupResource = defineResource({
  key: 'business-setup',

  routes: {
    state: '/business-setup/state',
    plan: '/business-setup/plan',
    profile: '/business-setup/profile',
    updateTask: '/business-setup/tasks/{type}',
    skipTask: '/business-setup/tasks/{type}/skip' as ApiPath,
  },
})
```

- [ ] **Step 4: Add the client method**

In `packages/api-client/src/clients/business-setup.client.ts`, add after `executeTask`:

```typescript
    skipTask = (
        type: string,
    ): Promise<ApiResponse<typeof businessSetupResource.routes.skipTask, "post">> => {
        return this.apiClient.post(
            businessSetupResource.routes.skipTask,
            undefined,
            { params: { type } } as never,
        )
    }
```

- [ ] **Step 5: Build contracts + client**

Run: `pnpm turbo run build --filter=@devloggers/api-contracts --filter=@devloggers/api-client`
Expected: exit 0.

- [ ] **Step 6: Prove route permission coverage still passes**

Run: `pnpm --filter @devloggers/api test -- enforcement-coverage.spec`
Expected: PASS (the new route has `@RequirePermission`).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/controllers/business-setup.controller.ts packages/api-contracts/src/resources/business-setup.resource.ts packages/api-client/src/clients/business-setup.client.ts apps/api/openapi.yaml packages/api-contracts/types/index.ts
git commit -m "feat(business-setup): expose task skip route through contracts and client (Phase 10.1)"
```

---

## Task 5: Operational readiness — constants + pure computation

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/constants/operational-readiness.ts`
- Create: `apps/api/src/modules/identity/business-setup/constants/operational-readiness.spec.ts`

**Interfaces:**
- Produces: `OperationalReadinessModule` (`'sales' | 'purchasing' | 'inventory' | 'cashOps' | 'bankOps' | 'accounting'`), `OPERATIONAL_READINESS_MODULES: OperationalReadinessModule[]`, `READINESS_MODULE_TASKS: Record<OperationalReadinessModule, SetupTaskType[]>`, `ModuleReadiness`, `OperationalReadiness`, `computeOperationalReadiness(tasks, computedAt): OperationalReadiness`. Consumed by Task 6's service and Task 10's DTO.

- [ ] **Step 1: Write the failing spec**

```typescript
// apps/api/src/modules/identity/business-setup/constants/operational-readiness.spec.ts
import { computeOperationalReadiness, OPERATIONAL_READINESS_MODULES, READINESS_MODULE_TASKS } from './operational-readiness';
import type { SetupTask } from '@devloggers/db-prisma';

type ReadinessTask = { type: SetupTask['type']; status: SetupTask['status']; required: boolean };

function task(type: SetupTask['type'], status: SetupTask['status'], required = true): ReadinessTask {
    return { type, status, required };
}

const ALL_TYPES = [...new Set(Object.values(READINESS_MODULE_TASKS).flat())];

function allCompleted(overrides: ReadinessTask[] = []): ReadinessTask[] {
    const overrideByType = new Map(overrides.map((t) => [t.type, t]));
    return ALL_TYPES.map((type) => overrideByType.get(type) ?? task(type, 'COMPLETED'));
}

describe('computeOperationalReadiness', () => {
    it('marks every module ready when all required tasks are completed or skipped', () => {
        const readiness = computeOperationalReadiness(allCompleted([task('OPENING_CASH_BALANCES', 'SKIPPED')]), new Date('2026-09-21T00:00:00.000Z'));
        for (const moduleKey of OPERATIONAL_READINESS_MODULES) {
            expect(readiness.modules[moduleKey]).toEqual({ ready: true, blockers: [] });
        }
        expect(readiness.computedAt).toBe('2026-09-21T00:00:00.000Z');
    });

    it('blocks only the module(s) that own an incomplete task, listing it as a blocker', () => {
        const readiness = computeOperationalReadiness(
            allCompleted([task('OPENING_CASH_BALANCES', 'READY'), task('OPENING_RECEIVABLES', 'BLOCKED')]),
            new Date(),
        );
        expect(readiness.modules.cashOps).toEqual({ ready: false, blockers: ['OPENING_CASH_BALANCES'] });
        expect(readiness.modules.sales).toEqual({ ready: false, blockers: ['OPENING_RECEIVABLES'] });
        expect(readiness.modules.accounting).toEqual({ ready: true, blockers: [] });
        expect(readiness.modules.bankOps).toEqual({ ready: true, blockers: [] });
    });

    it('treats a missing task row as a blocker — never ready by absence', () => {
        const readiness = computeOperationalReadiness([task('CURRENCIES', 'COMPLETED')], new Date());
        expect(readiness.modules.accounting.ready).toBe(false);
        expect(readiness.modules.accounting.blockers).toContain('CHART_OF_ACCOUNTS');
    });

    it('ignores not-required tasks (profile-gated, SKIPPED by the plan service)', () => {
        const tasks = allCompleted([task('OPENING_INVENTORY', 'BLOCKED', false)]);
        expect(computeOperationalReadiness(tasks, new Date()).modules.inventory.ready).toBe(true);
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @devloggers/api test -- operational-readiness.spec`
Expected: FAIL — `Cannot find module './operational-readiness'`.

- [ ] **Step 3: Implement the constants + pure function**

```typescript
// apps/api/src/modules/identity/business-setup/constants/operational-readiness.ts
import type { SetupTaskType } from '@devloggers/db-prisma';

export type OperationalReadinessModule = 'sales' | 'purchasing' | 'inventory' | 'cashOps' | 'bankOps' | 'accounting';

export const OPERATIONAL_READINESS_MODULES: OperationalReadinessModule[] = [
    'accounting',
    'cashOps',
    'bankOps',
    'inventory',
    'sales',
    'purchasing',
];

const ACCOUNTING_BASE: SetupTaskType[] = [
    'CURRENCIES',
    'FISCAL_PERIOD',
    'CHART_OF_ACCOUNTS',
    'FINANCIAL_MAPPINGS',
    'DOCUMENT_SEQUENCES',
];

/**
 * A module is operationally ready when every task it depends on is COMPLETED or
 * SKIPPED. Every operational module builds on the accounting baseline: without a
 * chart of accounts, mappings, sequences, currencies and a fiscal period nothing
 * can be posted. Reconciliation is deliberately NOT part of readiness — it is the
 * business-setup completion gate (`businessSetupCompletedAt`), not a precondition
 * for daily operations.
 */
export const READINESS_MODULE_TASKS: Record<OperationalReadinessModule, SetupTaskType[]> = {
    accounting: ACCOUNTING_BASE,
    cashOps: [...ACCOUNTING_BASE, 'CASHBOXES', 'OPENING_CASH_BALANCES'],
    bankOps: [...ACCOUNTING_BASE, 'BANK_ACCOUNTS', 'OPENING_BANK_BALANCES'],
    inventory: [...ACCOUNTING_BASE, 'WAREHOUSES', 'PRODUCTS', 'OPENING_INVENTORY'],
    sales: [...ACCOUNTING_BASE, 'CUSTOMERS', 'OPENING_RECEIVABLES'],
    purchasing: [...ACCOUNTING_BASE, 'SUPPLIERS', 'OPENING_PAYABLES'],
};

export interface ModuleReadiness {
    ready: boolean;
    blockers: SetupTaskType[];
}

export interface OperationalReadiness {
    computedAt: string;
    modules: Record<OperationalReadinessModule, ModuleReadiness>;
}

interface ReadinessTask {
    type: SetupTaskType;
    status: string;
    required: boolean;
}

export function computeOperationalReadiness(tasks: ReadinessTask[], computedAt: Date): OperationalReadiness {
    const byType = new Map(tasks.map((task) => [task.type, task]));
    const modules = {} as Record<OperationalReadinessModule, ModuleReadiness>;

    for (const moduleKey of OPERATIONAL_READINESS_MODULES) {
        const blockers = READINESS_MODULE_TASKS[moduleKey].filter((type) => {
            const task = byType.get(type);
            if (!task) return true; // missing row = not configured = blocker
            if (!task.required) return false;
            return task.status !== 'COMPLETED' && task.status !== 'SKIPPED';
        });
        modules[moduleKey] = { ready: blockers.length === 0, blockers };
    }

    return { computedAt: computedAt.toISOString(), modules };
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `pnpm --filter @devloggers/api test -- operational-readiness.spec`
Expected: PASS — 4/4.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/constants/operational-readiness.ts apps/api/src/modules/identity/business-setup/constants/operational-readiness.spec.ts
git commit -m "feat(business-setup): add operational readiness computation (Phase 10.4)"
```

---

## Task 6: Tenant repository + readiness service

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/repositories/business-setup-tenant.repository.ts`
- Create: `apps/api/src/modules/identity/business-setup/services/business-setup-readiness.service.ts`
- Create: `apps/api/src/modules/identity/business-setup/services/business-setup-readiness.service.spec.ts`

**Interfaces:**
- Consumes: `SetupTasksRepository.listForTenant(tenantId)`, `computeOperationalReadiness` (Task 5).
- Produces: `BusinessSetupTenantRepository.findSetupState(tenantId): Promise<{ businessSetupCompletedAt: Date | null; operationalReadiness: Prisma.JsonValue | null } | null>`, `.setCompletedAt(tenantId, date)`, `.setOperationalReadiness(tenantId, readiness)`; `BusinessSetupReadinessService.refresh(tenantId, tasks?): Promise<OperationalReadiness>` — writes the cache only when the modules actually changed.
- Consumed by: Task 7 (orchestrator), Task 10 (controller + module wiring).

- [ ] **Step 1: Write the failing service spec**

```typescript
// apps/api/src/modules/identity/business-setup/services/business-setup-readiness.service.spec.ts
import { BusinessSetupReadinessService } from './business-setup-readiness.service';
import type { SetupTask } from '@devloggers/db-prisma';

function makeTask(type: string, status: string): SetupTask {
    return {
        id: `id-${type}`, tenantId: 't1', type, status, required: true, dependencies: [],
        metadata: null, progress: null, completedAt: null, createdAt: new Date(), updatedAt: new Date(),
    } as SetupTask;
}

function build(tasks: SetupTask[], storedReadiness: unknown = null) {
    const tasksRepository = { listForTenant: jest.fn().mockResolvedValue(tasks) };
    const tenantRepository = {
        findSetupState: jest.fn().mockResolvedValue({ businessSetupCompletedAt: null, operationalReadiness: storedReadiness }),
        setOperationalReadiness: jest.fn().mockResolvedValue(undefined),
        setCompletedAt: jest.fn().mockResolvedValue(undefined),
    };
    const service = new BusinessSetupReadinessService(tasksRepository as never, tenantRepository as never);
    return { service, tasksRepository, tenantRepository };
}

const ALL_TASKS = [
    'CURRENCIES', 'FISCAL_PERIOD', 'CHART_OF_ACCOUNTS', 'FINANCIAL_MAPPINGS', 'DOCUMENT_SEQUENCES',
    'CASHBOXES', 'BANK_ACCOUNTS', 'WAREHOUSES', 'PRODUCTS', 'CUSTOMERS', 'SUPPLIERS',
    'OPENING_CASH_BALANCES', 'OPENING_BANK_BALANCES', 'OPENING_RECEIVABLES', 'OPENING_PAYABLES', 'OPENING_INVENTORY',
].map((type) => makeTask(type, 'COMPLETED'));

describe('BusinessSetupReadinessService.refresh', () => {
    it('computes readiness from the task rows and persists it when the stored cache differs', async () => {
        const { service, tenantRepository } = build(ALL_TASKS);

        const readiness = await service.refresh('t1');

        expect(readiness.modules.accounting.ready).toBe(true);
        expect(tenantRepository.setOperationalReadiness).toHaveBeenCalledTimes(1);
        expect(tenantRepository.setOperationalReadiness.mock.calls[0][0]).toBe('t1');
    });

    it('skips the write when the stored module states are unchanged', async () => {
        const { service, tenantRepository } = build(ALL_TASKS);
        const first = await service.refresh('t1');
        tenantRepository.findSetupState.mockResolvedValue({ businessSetupCompletedAt: null, operationalReadiness: first });

        await service.refresh('t1');

        expect(tenantRepository.setOperationalReadiness).toHaveBeenCalledTimes(1);
    });

    it('uses caller-supplied tasks instead of re-querying', async () => {
        const { service, tasksRepository } = build(ALL_TASKS);
        await service.refresh('t1', ALL_TASKS);
        expect(tasksRepository.listForTenant).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @devloggers/api test -- business-setup-readiness.service.spec`
Expected: FAIL — `Cannot find module './business-setup-readiness.service'`.

- [ ] **Step 3: Implement the repository**

```typescript
// apps/api/src/modules/identity/business-setup/repositories/business-setup-tenant.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { Prisma } from '@devloggers/db-prisma';

export interface TenantSetupState {
    businessSetupCompletedAt: Date | null;
    operationalReadiness: Prisma.JsonValue | null;
}

@Injectable()
export class BusinessSetupTenantRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findSetupState(tenantId: string): Promise<TenantSetupState | null> {
        return this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { businessSetupCompletedAt: true, operationalReadiness: true },
        });
    }

    async setCompletedAt(tenantId: string, completedAt: Date): Promise<void> {
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { businessSetupCompletedAt: completedAt },
        });
    }

    async setOperationalReadiness(tenantId: string, readiness: Prisma.InputJsonValue): Promise<void> {
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { operationalReadiness: readiness },
        });
    }
}
```

- [ ] **Step 4: Implement the service**

```typescript
// apps/api/src/modules/identity/business-setup/services/business-setup-readiness.service.ts
import { Injectable } from '@nestjs/common';
import type { SetupTask, Prisma } from '@devloggers/db-prisma';
import { SetupTasksRepository } from '../repositories/setup-tasks.repository';
import { BusinessSetupTenantRepository } from '../repositories/business-setup-tenant.repository';
import { computeOperationalReadiness, type OperationalReadiness } from '../constants/operational-readiness';

@Injectable()
export class BusinessSetupReadinessService {
    constructor(
        private readonly tasksRepository: SetupTasksRepository,
        private readonly tenantRepository: BusinessSetupTenantRepository,
    ) {}

    /**
     * Recomputes the per-module readiness from the tenant's setup tasks and
     * caches it on `Tenant.operationalReadiness`. The write is skipped when the
     * module states are unchanged so `GET /business-setup/state` stays read-mostly.
     */
    async refresh(tenantId: string, tasks?: SetupTask[]): Promise<OperationalReadiness> {
        const current = tasks ?? (await this.tasksRepository.listForTenant(tenantId));
        const computed = computeOperationalReadiness(current, new Date());

        const stored = await this.tenantRepository.findSetupState(tenantId);
        const storedModules = (stored?.operationalReadiness as { modules?: unknown } | null)?.modules ?? null;

        if (JSON.stringify(storedModules) !== JSON.stringify(computed.modules)) {
            await this.tenantRepository.setOperationalReadiness(
                tenantId,
                computed as unknown as Prisma.InputJsonValue,
            );
        }

        return computed;
    }
}
```

- [ ] **Step 5: Run the spec to verify it passes**

Run: `pnpm --filter @devloggers/api test -- business-setup-readiness.service.spec`
Expected: PASS — 3/3.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/repositories/business-setup-tenant.repository.ts apps/api/src/modules/identity/business-setup/services/business-setup-readiness.service.ts apps/api/src/modules/identity/business-setup/services/business-setup-readiness.service.spec.ts
git commit -m "feat(business-setup): add tenant setup-state repository and readiness cache service (Phase 10.4)"
```

---

## Task 7: Orchestrator — completion gate + readiness refresh

**Files:**
- Modify: `apps/api/src/modules/identity/business-setup/services/business-setup-orchestrator.service.ts`
- Modify: `apps/api/src/modules/identity/business-setup/services/business-setup-orchestrator.service.spec.ts`

**Interfaces:**
- Constructor becomes `(taskService, readinessService, tenantRepository, currencies, chartOfAccounts, financialMappings, cashboxes, bankAccounts, fiscalPeriod, documentSequences, openingCashBalances, openingBankBalances, openingReceivables, openingPayables, reconciliation)`.
- Produces: after `execute`, `Tenant.businessSetupCompletedAt` is set when `type === 'RECONCILIATION' && result.completed`; readiness is refreshed after every execute.

- [ ] **Step 1: Update the spec's `build` helper and add the gating tests**

Replace the `build` function in `business-setup-orchestrator.service.spec.ts` with:

```typescript
function build(task: SetupTask | null) {
    const taskService = {
        getTaskOrFail: jest.fn().mockImplementation(() => {
            if (!task) throw new NotFoundException('not found');
            return Promise.resolve(task);
        }),
        recordAttempt: jest.fn().mockResolvedValue(undefined),
    };
    const readinessService = { refresh: jest.fn().mockResolvedValue(undefined) };
    const tenantRepository = { setCompletedAt: jest.fn().mockResolvedValue(undefined) };
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
        taskService as never, readinessService as never, tenantRepository as never,
        currencies as never, chartOfAccounts as never, financialMappings as never,
        cashboxes as never, bankAccounts as never, fiscalPeriod as never, documentSequences as never,
        openingCashBalances as never, openingBankBalances as never, openingReceivables as never,
        openingPayables as never, reconciliation as never,
    );
    return { orchestrator, taskService, readinessService, tenantRepository, currencies, reconciliation };
}
```

Append these tests inside the existing `describe('BusinessSetupOrchestratorService.execute')`:

```typescript
    it('refreshes operational readiness after every task execution', async () => {
        const { orchestrator, readinessService } = build(makeTask({ type: 'CURRENCIES' as never, status: 'READY' }));
        await orchestrator.execute('t1', 'u1', 'CURRENCIES' as never, []);
        expect(readinessService.refresh).toHaveBeenCalledWith('t1');
    });

    it('sets businessSetupCompletedAt when RECONCILIATION completes', async () => {
        const { orchestrator, tenantRepository, reconciliation } = build(makeTask({ type: 'RECONCILIATION' as never, status: 'READY' }));
        reconciliation.execute.mockResolvedValue({ completed: true, details: { runId: 'run-1' } });

        await orchestrator.execute('t1', 'u1', 'RECONCILIATION' as never, undefined);

        expect(tenantRepository.setCompletedAt).toHaveBeenCalledWith('t1', expect.any(Date));
    });

    it('does not set businessSetupCompletedAt when RECONCILIATION fails', async () => {
        const { orchestrator, tenantRepository, reconciliation } = build(makeTask({ type: 'RECONCILIATION' as never, status: 'READY' }));
        reconciliation.execute.mockResolvedValue({ completed: false, details: { passed: false } });

        await orchestrator.execute('t1', 'u1', 'RECONCILIATION' as never, undefined);

        expect(tenantRepository.setCompletedAt).not.toHaveBeenCalled();
    });

    it('does not set businessSetupCompletedAt for non-reconciliation tasks', async () => {
        const { orchestrator, tenantRepository } = build(makeTask({ type: 'CURRENCIES' as never, status: 'READY' }));
        await orchestrator.execute('t1', 'u1', 'CURRENCIES' as never, []);
        expect(tenantRepository.setCompletedAt).not.toHaveBeenCalled();
    });
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `pnpm --filter @devloggers/api test -- business-setup-orchestrator.service.spec`
Expected: FAIL — constructor arity / `setCompletedAt` not called.

- [ ] **Step 3: Implement the orchestrator changes**

In `business-setup-orchestrator.service.ts`:

1. Add imports:

```typescript
import { BusinessSetupReadinessService } from './business-setup-readiness.service';
import { BusinessSetupTenantRepository } from '../repositories/business-setup-tenant.repository';
```

2. Change the constructor signature and body (the handler list stays identical):

```typescript
    constructor(
        private readonly taskService: BusinessSetupTaskService,
        private readonly readinessService: BusinessSetupReadinessService,
        private readonly tenantRepository: BusinessSetupTenantRepository,
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
```

3. Replace the tail of `execute` (after `RequestContext.run(...)`) with:

```typescript
        await this.taskService.recordAttempt(tenantId, type, result.completed, result.details);

        // Phase 10.4.3 — businessSetupCompletedAt is written in exactly one place:
        // when the reconciliation task completes (i.e. the Phase 7 run passed).
        if (type === 'RECONCILIATION' && result.completed) {
            await this.tenantRepository.setCompletedAt(tenantId, new Date());
        }

        await this.readinessService.refresh(tenantId);
        return this.taskService.getTaskOrFail(tenantId, type);
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `pnpm --filter @devloggers/api test -- business-setup-orchestrator.service.spec`
Expected: PASS — all pre-existing + 4 new.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/services/business-setup-orchestrator.service.ts apps/api/src/modules/identity/business-setup/services/business-setup-orchestrator.service.spec.ts
git commit -m "feat(business-setup): gate businessSetupCompletedAt on reconciliation and refresh readiness (Phase 10.4)"
```

---

## Task 8: Discovery-completion — generalize auto-completion

The hub must show tasks complete when the underlying data exists — including when the user created it through the normal CRUD pages. Phase 6 only did this for 5 discovery-only types; extend it to every non-reconciliation task and reuse the inspection-key map from the plan service.

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/constants/discovery-completion.ts`
- Create: `apps/api/src/modules/identity/business-setup/constants/discovery-completion.spec.ts`
- Modify: `apps/api/src/modules/identity/business-setup/services/business-setup-plan.service.ts`
- Modify: `apps/api/src/modules/identity/business-setup/controllers/business-setup.controller.ts` (`autoCompleteDiscoveryOnlyTasks` → `syncTasksFromDiscovery`)

**Interfaces:**
- Produces: `INSPECTION_KEY_BY_TASK_TYPE: Partial<Record<SetupTaskType, keyof BusinessSetupInspection>>`, `DISCOVERY_COMPLETABLE_TASK_TYPES: SetupTaskType[]` (16 — everything except `RECONCILIATION`), `inspectionAreaFor(type, inspection)`, `isDiscoverablyComplete(type, inspection): boolean`.
- `PLAN` service now imports the shared map (behavior unchanged).

- [ ] **Step 1: Write the failing spec**

```typescript
// apps/api/src/modules/identity/business-setup/constants/discovery-completion.spec.ts
import { DISCOVERY_COMPLETABLE_TASK_TYPES, isDiscoverablyComplete } from './discovery-completion';
import type { BusinessSetupInspection } from '../services/business-setup-discovery.service';
import { SETUP_TASK_TYPES } from './setup-task-graph';

function inspectionWith(overrides: Partial<Record<keyof BusinessSetupInspection, { count: number; classification: string }>> = {}): BusinessSetupInspection {
    const empty = { count: 0, classification: 'EMPTY' as const };
    const exist = { count: 1, classification: 'EXISTING' as const };
    return {
        currencies: exist, chartOfAccounts: empty, financialMappings: { configuredSlots: 0, classification: 'EMPTY' },
        cashboxes: empty, bankAccounts: empty, fiscalPeriods: empty, documentSequences: empty,
        warehouses: empty, products: empty, customers: empty, suppliers: empty,
        openingCashBalances: empty, openingBankBalances: empty, openingReceivables: empty,
        openingPayables: empty, openingInventory: empty,
        ...overrides,
    } as BusinessSetupInspection;
}

describe('isDiscoverablyComplete', () => {
    it('completes a task when its discovery area is EXISTING', () => {
        expect(isDiscoverablyComplete('CURRENCIES', inspectionWith())).toBe(true);
    });

    it('does not complete when the area is EMPTY or PARTIAL', () => {
        const empty = inspectionWith({ currencies: { count: 0, classification: 'EMPTY' } });
        expect(isDiscoverablyComplete('CURRENCIES', empty)).toBe(false);
        const partial = inspectionWith({ financialMappings: { configuredSlots: 5, classification: 'PARTIAL' } });
        expect(isDiscoverablyComplete('FINANCIAL_MAPPINGS', partial)).toBe(false);
    });

    it('completes FINANCIAL_MAPPINGS only when every slot is configured (EXISTING)', () => {
        const full = inspectionWith({ financialMappings: { configuredSlots: 11, classification: 'EXISTING' } });
        expect(isDiscoverablyComplete('FINANCIAL_MAPPINGS', full)).toBe(true);
    });

    it('never completes RECONCILIATION from discovery', () => {
        expect(isDiscoverablyComplete('RECONCILIATION', inspectionWith())).toBe(false);
    });

    it('covers every task type except RECONCILIATION', () => {
        expect([...DISCOVERY_COMPLETABLE_TASK_TYPES].sort()).toEqual(
            SETUP_TASK_TYPES.filter((type) => type !== 'RECONCILIATION').sort(),
        );
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @devloggers/api test -- discovery-completion.spec`
Expected: FAIL — `Cannot find module './discovery-completion'`.

- [ ] **Step 3: Implement the constant + helpers**

```typescript
// apps/api/src/modules/identity/business-setup/constants/discovery-completion.ts
import type { SetupTaskType } from '@devloggers/db-prisma';
import type { BusinessSetupInspection } from '../services/business-setup-discovery.service';
import { SETUP_TASK_TYPES } from './setup-task-graph';

/** Maps a setup task type to the discovery area that proves it is done in the tenant's data. */
export const INSPECTION_KEY_BY_TASK_TYPE: Partial<Record<SetupTaskType, keyof BusinessSetupInspection>> = {
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

/**
 * Every task type whose state can be derived from existing tenant data — i.e.
 * everything except RECONCILIATION, which must actually run the Phase 7 stack.
 * When the user configures one of these through its normal CRUD page (or posts
 * opening balances through the session workflow), `GET /business-setup/state`
 * marks the task complete without the executable handler ever running.
 */
export const DISCOVERY_COMPLETABLE_TASK_TYPES: SetupTaskType[] = SETUP_TASK_TYPES.filter(
    (type) => type !== 'RECONCILIATION',
);

export function inspectionAreaFor(
    type: SetupTaskType,
    inspection: BusinessSetupInspection,
): BusinessSetupInspection[keyof BusinessSetupInspection] | undefined {
    const key = INSPECTION_KEY_BY_TASK_TYPE[type];
    return key ? inspection[key] : undefined;
}

export function isDiscoverablyComplete(type: SetupTaskType, inspection: BusinessSetupInspection): boolean {
    if (!DISCOVERY_COMPLETABLE_TASK_TYPES.includes(type)) return false;
    const area = inspectionAreaFor(type, inspection);
    return area?.classification === 'EXISTING';
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `pnpm --filter @devloggers/api test -- discovery-completion.spec`
Expected: PASS — 5/5.

- [ ] **Step 5: Reuse the shared map in the plan service**

In `business-setup-plan.service.ts`, delete the local `INSPECTION_KEY_BY_TASK_TYPE` constant (lines 13-30) and add:

```typescript
import { INSPECTION_KEY_BY_TASK_TYPE } from '../constants/discovery-completion';
```

- [ ] **Step 6: Verify the plan service spec still passes**

Run: `pnpm --filter @devloggers/api test -- business-setup-plan.service.spec`
Expected: PASS (unchanged behavior).

- [ ] **Step 7: Replace the controller's auto-complete loop**

In `business-setup.controller.ts`:

1. Replace the import of `DISCOVERY_ONLY_TASK_TYPES`:

```typescript
import { SETUP_TASK_TYPES } from '../constants/setup-task-graph';
import { inspectionAreaFor, isDiscoverablyComplete } from '../constants/discovery-completion';
```

2. In `getState`, rename the call:

```typescript
        await this.syncTasksFromDiscovery(user.tenantId);
        return this.buildState(user.tenantId);
```

3. Replace the private `autoCompleteDiscoveryOnlyTasks` method with:

```typescript
    private async syncTasksFromDiscovery(tenantId: string): Promise<void> {
        const [inspection, tasks] = await Promise.all([
            this.discoveryService.inspect(tenantId),
            this.taskService.listForTenant(tenantId),
        ]);
        for (const task of tasks) {
            if (task.status === 'COMPLETED' || task.status === 'SKIPPED') continue;
            if (!isDiscoverablyComplete(task.type, inspection)) continue;
            await this.taskService.recordAttempt(tenantId, task.type, true, {
                discovery: inspectionAreaFor(task.type, inspection),
            });
        }
    }
```

- [ ] **Step 8: Build the API**

Run: `pnpm --filter @devloggers/api build`
Expected: exit 0.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/constants/discovery-completion.ts apps/api/src/modules/identity/business-setup/constants/discovery-completion.spec.ts apps/api/src/modules/identity/business-setup/services/business-setup-plan.service.ts apps/api/src/modules/identity/business-setup/controllers/business-setup.controller.ts
git commit -m "feat(business-setup): derive task completion from discovery for all non-reconciliation tasks (Phase 10.1)"
```

---

## Task 9: Next recommended action util

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/utils/next-action.util.ts`
- Create: `apps/api/src/modules/identity/business-setup/utils/next-action.util.spec.ts`

**Interfaces:**
- Produces: `NextSetupAction { type: SetupTaskType; reason: 'READY' | 'WAITING_FOR_DEPENDENCIES'; blockedBy: SetupTaskType[] }`, `selectNextAction(tasks): NextSetupAction | null` — canonical order comes from `SETUP_TASK_TYPES`. Consumed by Task 10's state DTO.

- [ ] **Step 1: Write the failing spec**

```typescript
// apps/api/src/modules/identity/business-setup/utils/next-action.util.spec.ts
import { selectNextAction } from './next-action.util';
import type { SetupTaskType, SetupTaskStatus } from '@devloggers/db-prisma';

function task(type: SetupTaskType, status: SetupTaskStatus, dependencies: SetupTaskType[] = [], required = true) {
    return { type, status, dependencies, required };
}

describe('selectNextAction', () => {
    it('returns the first READY required task in canonical order', () => {
        const action = selectNextAction([
            task('CURRENCIES', 'COMPLETED'),
            task('BANK_ACCOUNTS', 'READY'),
            task('CHART_OF_ACCOUNTS', 'READY'),
        ]);
        expect(action).toEqual({ type: 'CHART_OF_ACCOUNTS', reason: 'READY', blockedBy: [] });
    });

    it('returns the first blocked task with its unmet dependencies when nothing is READY', () => {
        const action = selectNextAction([
            task('CURRENCIES', 'COMPLETED'),
            task('CASHBOXES', 'BLOCKED', ['CURRENCIES']),
        ]);
        expect(action).toEqual({
            type: 'CASHBOXES',
            reason: 'WAITING_FOR_DEPENDENCIES',
            blockedBy: ['CURRENCIES'],
        });
    });

    it('reports dependencies that are SKIPPED as satisfied', () => {
        const action = selectNextAction([
            task('CURRENCIES', 'SKIPPED'),
            task('CASHBOXES', 'BLOCKED', ['CURRENCIES']),
        ]);
        expect(action?.blockedBy).toEqual([]);
    });

    it('returns null when every required task is terminal', () => {
        const action = selectNextAction([
            task('CURRENCIES', 'COMPLETED'),
            task('OPENING_INVENTORY', 'SKIPPED'),
            task('WAREHOUSES', 'SKIPPED', [], false),
        ]);
        expect(action).toBeNull();
    });

    it('ignores not-required tasks entirely', () => {
        const action = selectNextAction([task('CURRENCIES', 'COMPLETED'), task('WAREHOUSES', 'READY', [], false)]);
        expect(action).toBeNull();
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @devloggers/api test -- next-action.util.spec`
Expected: FAIL — `Cannot find module './next-action.util'`.

- [ ] **Step 3: Implement the util**

```typescript
// apps/api/src/modules/identity/business-setup/utils/next-action.util.ts
import type { SetupTaskType } from '@devloggers/db-prisma';
import { SETUP_TASK_TYPES } from '../constants/setup-task-graph';

export interface NextSetupAction {
    type: SetupTaskType;
    reason: 'READY' | 'WAITING_FOR_DEPENDENCIES';
    blockedBy: SetupTaskType[];
}

interface ActionableTask {
    type: SetupTaskType;
    status: string;
    required: boolean;
    dependencies: SetupTaskType[];
}

/**
 * Picks the next required task in the canonical `SETUP_TASK_TYPES` order. When
 * none is READY yet, returns the first blocked task plus the dependencies that
 * are not terminal, which the hub renders as the "waiting on" explanation.
 */
export function selectNextAction(tasks: ActionableTask[]): NextSetupAction | null {
    const byType = new Map(tasks.map((task) => [task.type, task]));

    const open = SETUP_TASK_TYPES
        .map((type) => byType.get(type))
        .filter((task): task is ActionableTask => Boolean(task?.required))
        .filter((task) => task.status !== 'COMPLETED' && task.status !== 'SKIPPED');

    if (open.length === 0) return null;

    const ready = open.find((task) => task.status === 'READY');
    if (ready) return { type: ready.type, reason: 'READY', blockedBy: [] };

    const first = open[0];
    const blockedBy = first.dependencies.filter((dependency) => {
        const dependencyTask = byType.get(dependency);
        return !dependencyTask || (dependencyTask.status !== 'COMPLETED' && dependencyTask.status !== 'SKIPPED');
    });
    return { type: first.type, reason: 'WAITING_FOR_DEPENDENCIES', blockedBy };
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `pnpm --filter @devloggers/api test -- next-action.util.spec`
Expected: PASS — 5/5.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/utils/next-action.util.ts apps/api/src/modules/identity/business-setup/utils/next-action.util.spec.ts
git commit -m "feat(business-setup): compute next recommended setup action from the dependency graph (Phase 10.1)"
```

---

## Task 10: State response — readiness, next action, real completion; module wiring

**Files:**
- Create: `apps/api/src/modules/identity/business-setup/dto/operational-readiness.dto.ts`
- Create: `apps/api/src/modules/identity/business-setup/dto/next-setup-action.dto.ts`
- Modify: `apps/api/src/modules/identity/business-setup/dto/business-setup-state-response.dto.ts`
- Modify: `apps/api/src/modules/identity/business-setup/dto/index.ts`
- Modify: `apps/api/src/modules/identity/business-setup/controllers/business-setup.controller.ts`
- Modify: `apps/api/src/modules/identity/business-setup/business-setup.module.ts`
- Regenerated: `apps/api/openapi.yaml`, `packages/api-contracts/types/index.ts`

**Interfaces:**
- Produces: `BusinessSetupStateResponseDto` gains `readiness: OperationalReadinessDto | null` and `nextAction: NextSetupActionDto | null`, and `businessSetupCompletedAt` is now read from the tenant. Generated schema names: `OperationalReadinessDto`, `OperationalReadinessModulesDto`, `ModuleReadinessDto`, `NextSetupActionDto`.

- [ ] **Step 1: Create the readiness DTO**

```typescript
// apps/api/src/modules/identity/business-setup/dto/operational-readiness.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SetupTaskType } from '@devloggers/db-prisma';

export class ModuleReadinessDto {
    @ApiProperty({ type: 'boolean', example: true })
    ready: boolean = false;

    @ApiProperty({ enum: SetupTaskType, enumName: 'SetupTaskType', isArray: true })
    blockers: SetupTaskType[] = [];
}

export class OperationalReadinessModulesDto {
    @ApiProperty({ type: () => ModuleReadinessDto })
    accounting: ModuleReadinessDto = new ModuleReadinessDto();

    @ApiProperty({ type: () => ModuleReadinessDto })
    cashOps: ModuleReadinessDto = new ModuleReadinessDto();

    @ApiProperty({ type: () => ModuleReadinessDto })
    bankOps: ModuleReadinessDto = new ModuleReadinessDto();

    @ApiProperty({ type: () => ModuleReadinessDto })
    inventory: ModuleReadinessDto = new ModuleReadinessDto();

    @ApiProperty({ type: () => ModuleReadinessDto })
    sales: ModuleReadinessDto = new ModuleReadinessDto();

    @ApiProperty({ type: () => ModuleReadinessDto })
    purchasing: ModuleReadinessDto = new ModuleReadinessDto();
}

export class OperationalReadinessDto {
    @ApiProperty({ type: 'string', example: '2026-09-21T00:00:00.000Z' })
    computedAt: string = '';

    @ApiProperty({ type: () => OperationalReadinessModulesDto })
    modules: OperationalReadinessModulesDto = new OperationalReadinessModulesDto();
}
```

- [ ] **Step 2: Create the next-action DTO**

```typescript
// apps/api/src/modules/identity/business-setup/dto/next-setup-action.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SetupTaskType } from '@devloggers/db-prisma';

export class NextSetupActionDto {
    @ApiProperty({ enum: SetupTaskType, enumName: 'SetupTaskType' })
    type: SetupTaskType = SetupTaskType.CURRENCIES;

    @ApiProperty({ enum: ['READY', 'WAITING_FOR_DEPENDENCIES'], enumName: 'NextSetupActionReason' })
    reason: 'READY' | 'WAITING_FOR_DEPENDENCIES' = 'READY';

    @ApiProperty({ enum: SetupTaskType, enumName: 'SetupTaskType', isArray: true })
    blockedBy: SetupTaskType[] = [];
}
```

- [ ] **Step 3: Extend the state DTO**

Replace `business-setup-state-response.dto.ts` with:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SetupTaskResponseDto, SetupTaskPlanItemResponseDto } from './setup-task-response.dto';
import { OperationalReadinessDto } from './operational-readiness.dto';
import { NextSetupActionDto } from './next-setup-action.dto';

export class BusinessSetupStateResponseDto {
    @ApiProperty({ type: () => SetupTaskResponseDto, isArray: true })
    @Type(() => SetupTaskResponseDto)
    tasks: SetupTaskResponseDto[] = [];

    @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
    profile: Record<string, unknown> | null = null;

    @ApiPropertyOptional({ type: 'string', nullable: true, example: '2026-01-01T00:00:00.000Z' })
    businessSetupCompletedAt: string | null = null;

    @ApiPropertyOptional({ type: () => OperationalReadinessDto, nullable: true })
    @Type(() => OperationalReadinessDto)
    readiness: OperationalReadinessDto | null = null;

    @ApiPropertyOptional({ type: () => NextSetupActionDto, nullable: true })
    @Type(() => NextSetupActionDto)
    nextAction: NextSetupActionDto | null = null;
}

export class BusinessSetupPlanResponseDto {
    @ApiProperty({ type: () => SetupTaskPlanItemResponseDto, isArray: true })
    @Type(() => SetupTaskPlanItemResponseDto)
    tasks: SetupTaskPlanItemResponseDto[] = [];
}
```

- [ ] **Step 4: Export the new DTOs**

In `dto/index.ts`, add:

```typescript
export * from './operational-readiness.dto';
export * from './next-setup-action.dto';
```

- [ ] **Step 5: Wire the controller**

In `business-setup.controller.ts`:

1. Add imports:

```typescript
import { BusinessSetupReadinessService } from '../services/business-setup-readiness.service';
import { BusinessSetupTenantRepository } from '../repositories/business-setup-tenant.repository';
import { selectNextAction } from '../utils/next-action.util';
```

2. Add to the constructor (after `orchestrator`):

```typescript
        private readonly readinessService: BusinessSetupReadinessService,
        private readonly tenantRepository: BusinessSetupTenantRepository,
```

3. In `skipTask`, refresh readiness after the skip (so dependents' readiness updates immediately):

```typescript
        const task = await this.taskService.skip(user.tenantId, type as SetupTaskType);
        await this.readinessService.refresh(user.tenantId);
        return this.presenter.toResponse(task);
```

4. Replace `buildState` with:

```typescript
    private async buildState(tenantId: string): Promise<BusinessSetupStateResponseDto> {
        const [tasks, profile, tenant] = await Promise.all([
            this.taskService.listForTenant(tenantId),
            this.profileService.getProfile(tenantId),
            this.tenantRepository.findSetupState(tenantId),
        ]);
        const readiness = await this.readinessService.refresh(tenantId, tasks);

        return {
            tasks: this.presenter.toResponseList(tasks),
            profile: profile as unknown as Record<string, unknown>,
            businessSetupCompletedAt: tenant?.businessSetupCompletedAt?.toISOString() ?? null,
            readiness,
            nextAction: selectNextAction(tasks),
        };
    }
```

(`OperationalReadiness` and `NextSetupAction` are structurally assignable to their DTO classes — no casts.)

- [ ] **Step 6: Wire the module**

In `business-setup.module.ts`:

1. Add imports:

```typescript
import { BusinessSetupTenantRepository } from './repositories/business-setup-tenant.repository';
import { BusinessSetupReadinessService } from './services/business-setup-readiness.service';
```

2. Add to `providers` (after `SetupTasksRepository`):

```typescript
        BusinessSetupTenantRepository,
        BusinessSetupReadinessService,
```

- [ ] **Step 7: Regenerate + build**

Run: `pnpm generate`
Expected: exit 0; `grep -n "OperationalReadinessModulesDto" packages/api-contracts/types/index.ts` returns matches.

Run: `pnpm turbo run build --filter=@devloggers/api-contracts --filter=@devloggers/api-client --filter=@devloggers/api`
Expected: exit 0.

- [ ] **Step 8: Run the full business-setup suite**

Run: `pnpm --filter @devloggers/api test -- business-setup`
Expected: PASS — all specs.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/identity/business-setup/dto apps/api/src/modules/identity/business-setup/controllers/business-setup.controller.ts apps/api/src/modules/identity/business-setup/business-setup.module.ts apps/api/openapi.yaml packages/api-contracts/types/index.ts
git commit -m "feat(business-setup): expose readiness, next action and real completion in setup state (Phase 10.1/10.4)"
```

---

## Task 11: i18n keys (en / ar / tr)

**Files:**
- Modify: `packages/i18n/src/en/business.json` (the `businessSetup` object at line 1176)
- Modify: `packages/i18n/src/ar/business.json` (the `businessSetup` object at line 1287)
- Modify: `packages/i18n/src/tr/business.json` (the `businessSetup` object at line 1102)

**Interfaces:**
- Produces keys consumed by Tasks 13-15: `hubDescription`, `progress.*`, `groups.*`, `nextAction.*`, `actions.*`, `blockedBy`, `readiness.*`, `reconciliation.*`, `checks.*`, `legacy.*`, `banner.*`, `navWarning`, `completedAt`.

- [ ] **Step 1: Extend the English `businessSetup` object**

Add these keys inside the existing `"businessSetup"` object (keep the existing `noAccess`, `title`, `description`, `loading`, `status`, `tasks`):

```json
    "hubDescription": "Complete these steps to make your business ready to operate.",
    "completedAt": "Setup completed on {date}",
    "progress": {
      "title": "Setup progress",
      "description": "{completed} of {total} required tasks complete",
      "percent": "{percent}% complete"
    },
    "groups": {
      "accounting": "Accounting",
      "money": "Money",
      "inventory": "Inventory",
      "parties": "Parties"
    },
    "nextAction": {
      "title": "Next recommended step",
      "ready": "Continue with {task}.",
      "waitingOn": "{task} is waiting on: {blockers}.",
      "open": "Open"
    },
    "actions": {
      "open": "Open",
      "run": "Run now",
      "running": "Running…",
      "skip": "Not applicable",
      "skipping": "Skipping…"
    },
    "blockedBy": "Blocked by {tasks}",
    "readiness": {
      "title": "Operational readiness",
      "ready": "Ready",
      "notReady": "Not ready",
      "modules": {
        "accounting": "Accounting",
        "cashOps": "Cash operations",
        "bankOps": "Bank operations",
        "inventory": "Inventory",
        "sales": "Sales",
        "purchasing": "Purchasing"
      }
    },
    "reconciliation": {
      "title": "Reconciliation",
      "run": "Run reconciliation",
      "running": "Running…",
      "passed": "All reconciliation checks passed.",
      "failed": "{count} reconciliation checks are failing.",
      "neverRun": "Reconciliation has not run yet.",
      "findings": "{count} findings"
    },
    "checks": {
      "CASH_GL_VS_CASHBOX_SUBLEDGER": "The cash control account does not match cashbox balances.",
      "CASHBOX_SUBLEDGER_VS_PROJECTION": "Cashbox balances do not match the ledger.",
      "BANK_GL_VS_BANK_SUBLEDGER": "The bank control account does not match bank account balances.",
      "AR_CONTROL_VS_CUSTOMER_SUBLEDGER": "The receivables control account does not match customer balances.",
      "AP_CONTROL_VS_SUPPLIER_SUBLEDGER": "The payables control account does not match supplier balances.",
      "INVENTORY_GL_VS_STOCK_VALUATION": "The inventory account does not match stock valuation.",
      "JOURNAL_ENTRIES_BALANCED": "Some journal entries are unbalanced.",
      "MULTI_CURRENCY_BASE_CONSISTENT": "Some foreign-currency lines are missing an amount or exchange rate.",
      "STOCK_QUANTITY_PROJECTION": "Stock quantities do not match the movement ledger."
    },
    "legacy": {
      "title": "Legacy data",
      "description": "Entries created before the current accounting model can be incomplete. The failing checks above name exactly what must be corrected."
    },
    "banner": {
      "text": "Business setup is {percent}% complete.",
      "cta": "Continue setup"
    },
    "navWarning": "This module is not ready yet — complete business setup first."
```

- [ ] **Step 2: Extend the Arabic `businessSetup` object**

Add the same key structure with these values (keep existing keys):

```json
    "hubDescription": "أكمل هذه الخطوات لتصبح منشأتك جاهزة للعمل.",
    "completedAt": "اكتمل الإعداد في {date}",
    "progress": {
      "title": "تقدم الإعداد",
      "description": "اكتملت {completed} من {total} مهمة مطلوبة",
      "percent": "اكتمل {percent}%"
    },
    "groups": {
      "accounting": "المحاسبة",
      "money": "الأموال",
      "inventory": "المخزون",
      "parties": "الأطراف"
    },
    "nextAction": {
      "title": "الخطوة التالية الموصى بها",
      "ready": "تابع {task}.",
      "waitingOn": "{task} بانتظار: {blockers}.",
      "open": "فتح"
    },
    "actions": {
      "open": "فتح",
      "run": "تشغيل الآن",
      "running": "جارٍ التشغيل…",
      "skip": "غير مطبّق",
      "skipping": "جارٍ التخطي…"
    },
    "blockedBy": "محظورة بسبب {tasks}",
    "readiness": {
      "title": "الجاهزية التشغيلية",
      "ready": "جاهز",
      "notReady": "غير جاهز",
      "modules": {
        "accounting": "المحاسبة",
        "cashOps": "عمليات النقد",
        "bankOps": "عمليات البنوك",
        "inventory": "المخزون",
        "sales": "المبيعات",
        "purchasing": "المشتريات"
      }
    },
    "reconciliation": {
      "title": "التسوية",
      "run": "تشغيل التسوية",
      "running": "جارٍ التشغيل…",
      "passed": "اجتازت جميع فحوص التسوية.",
      "failed": "{count} من فحوص التسوية فاشلة.",
      "neverRun": "لم يتم تشغيل التسوية بعد.",
      "findings": "{count} ملاحظة"
    },
    "checks": {
      "CASH_GL_VS_CASHBOX_SUBLEDGER": "حساب النقد لا يطابق أرصدة الصناديق.",
      "CASHBOX_SUBLEDGER_VS_PROJECTION": "أرصدة الصناديق لا تطابق دفتر اليومية.",
      "BANK_GL_VS_BANK_SUBLEDGER": "حساب البنوك لا يطابق أرصدة الحسابات البنكية.",
      "AR_CONTROL_VS_CUSTOMER_SUBLEDGER": "حساب الذمم المدينة لا يطابق أرصدة العملاء.",
      "AP_CONTROL_VS_SUPPLIER_SUBLEDGER": "حساب الذمم الدائنة لا يطابق أرصدة الموردين.",
      "INVENTORY_GL_VS_STOCK_VALUATION": "حساب المخزون لا يطابق تقييم المخزون.",
      "JOURNAL_ENTRIES_BALANCED": "بعض القيود المحاسبية غير متوازنة.",
      "MULTI_CURRENCY_BASE_CONSISTENT": "بعض سطور العملات الأجنبية تفتقد المبلغ أو سعر الصرف.",
      "STOCK_QUANTITY_PROJECTION": "كميات المخزون لا تطابق دفتر الحركات."
    },
    "legacy": {
      "title": "بيانات قديمة",
      "description": "القيود المنشأة قبل نموذج المحاسبة الحالي قد تكون ناقصة. الفحوص الفاشلة أعلاه تحدد ما يجب تصحيحه."
    },
    "banner": {
      "text": "اكتمل إعداد النشاط بنسبة {percent}%.",
      "cta": "متابعة الإعداد"
    },
    "navWarning": "هذه الوحدة غير جاهزة بعد — أكمل إعداد النشاط أولاً."
```

- [ ] **Step 3: Extend the Turkish `businessSetup` object**

Add the same key structure with these values (keep existing keys):

```json
    "hubDescription": "İşletmenizin çalışmaya hazır olması için bu adımları tamamlayın.",
    "completedAt": "Kurulum {date} tarihinde tamamlandı",
    "progress": {
      "title": "Kurulum ilerlemesi",
      "description": "{total} gerekli görevden {completed} tamamlandı",
      "percent": "%{percent} tamamlandı"
    },
    "groups": {
      "accounting": "Muhasebe",
      "money": "Para",
      "inventory": "Stok",
      "parties": "Taraflar"
    },
    "nextAction": {
      "title": "Önerilen sonraki adım",
      "ready": "{task} ile devam edin.",
      "waitingOn": "{task} şunları bekliyor: {blockers}.",
      "open": "Aç"
    },
    "actions": {
      "open": "Aç",
      "run": "Şimdi çalıştır",
      "running": "Çalışıyor…",
      "skip": "Uygulanamaz",
      "skipping": "Atlanıyor…"
    },
    "blockedBy": "{tasks} tarafından engellendi",
    "readiness": {
      "title": "Operasyonel hazırlık",
      "ready": "Hazır",
      "notReady": "Hazır değil",
      "modules": {
        "accounting": "Muhasebe",
        "cashOps": "Nakit işlemleri",
        "bankOps": "Banka işlemleri",
        "inventory": "Stok",
        "sales": "Satış",
        "purchasing": "Satın alma"
      }
    },
    "reconciliation": {
      "title": "Mutabakat",
      "run": "Mutabakatı çalıştır",
      "running": "Çalışıyor…",
      "passed": "Tüm mutabakat kontrolleri geçti.",
      "failed": "{count} mutabakat kontrolü başarısız.",
      "neverRun": "Mutabakat henüz çalıştırılmadı.",
      "findings": "{count} bulgu"
    },
    "checks": {
      "CASH_GL_VS_CASHBOX_SUBLEDGER": "Nakit kontrol hesabı kasa bakiyeleriyle uyuşmuyor.",
      "CASHBOX_SUBLEDGER_VS_PROJECTION": "Kasa bakiyeleri defterle uyuşmuyor.",
      "BANK_GL_VS_BANK_SUBLEDGER": "Banka kontrol hesabı banka hesabı bakiyeleriyle uyuşmuyor.",
      "AR_CONTROL_VS_CUSTOMER_SUBLEDGER": "Alacak kontrol hesabı müşteri bakiyeleriyle uyuşmuyor.",
      "AP_CONTROL_VS_SUPPLIER_SUBLEDGER": "Borç kontrol hesabı tedarikçi bakiyeleriyle uyuşmuyor.",
      "INVENTORY_GL_VS_STOCK_VALUATION": "Stok hesabı stok değerlemesiyle uyuşmuyor.",
      "JOURNAL_ENTRIES_BALANCED": "Bazı yevmiye kayıtları dengesiz.",
      "MULTI_CURRENCY_BASE_CONSISTENT": "Bazı döviz satırlarında tutar veya kur eksik.",
      "STOCK_QUANTITY_PROJECTION": "Stok miktarları hareket defteriyle uyuşmuyor."
    },
    "legacy": {
      "title": "Eski veriler",
      "description": "Mevcut muhasebe modelinden önce oluşturulan kayıtlar eksik olabilir. Başarısız kontroller düzeltilmesi gerekenleri gösterir."
    },
    "banner": {
      "text": "İş kurulumu %{percent} tamamlandı.",
      "cta": "Kuruluma devam et"
    },
    "navWarning": "Bu modül henüz hazır değil — önce iş kurulumunu tamamlayın."
```

- [ ] **Step 4: Verify the i18n package builds**

Run: `pnpm turbo run build --filter=@devloggers/i18n`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/i18n/src/en/business.json packages/i18n/src/ar/business.json packages/i18n/src/tr/business.json
git commit -m "feat(i18n): add business setup hub, readiness and remediation strings (Phase 10)"
```

---

## Task 12: Dashboard readiness hook + hub config

**Files:**
- Create: `apps/dashboard/shared/hooks/use-setup-readiness.ts`
- Create: `apps/dashboard/modules/business-setup/hooks/use-business-setup.ts`
- Create: `apps/dashboard/modules/business-setup/setup.config.ts`
- Create: `apps/dashboard/modules/business-setup/setup.config.test.ts`

**Interfaces:**
- Produces: `businessSetupStateKey`; `useSetupReadiness()` (query only — used by the sidebar, Task 14); `useBusinessSetup()` (query + `executeTask`/`skipTask` mutations); types `BusinessSetupState`, `SetupTask`, `SetupTaskType`, `SetupReadiness`, `ReadinessModuleKey`, `SetupNextAction`; config `SETUP_GROUPS`, `SETUP_TASK_LINKS`, `EXECUTABLE_TASK_TYPES`, `computeSetupProgress`, `parseReconciliationChecks`.

- [ ] **Step 1: Write the failing config tests**

```typescript
// apps/dashboard/modules/business-setup/setup.config.test.ts
import { describe, expect, it } from "vitest"
import {
  EXECUTABLE_TASK_TYPES,
  SETUP_GROUPS,
  SETUP_TASK_LINKS,
  computeSetupProgress,
  parseReconciliationChecks,
} from "./setup.config"
import type { SetupTask, SetupTaskType } from "./hooks/use-business-setup"

function task(type: SetupTaskType, status: string, required = true): SetupTask {
  return { id: `id-${type}`, type, status, required, dependencies: [], metadata: null, progress: null, completedAt: null, createdAt: "", updatedAt: "", skippable: false } as SetupTask
}

describe("setup config", () => {
  it("assigns every task type to exactly one group", () => {
    const grouped = SETUP_GROUPS.flatMap((group) => group.tasks)
    expect([...grouped].sort()).toEqual([...Object.keys(SETUP_TASK_LINKS)].sort())
    expect(new Set(grouped).size).toBe(grouped.length)
  })

  it("has a link for every task type", () => {
    for (const type of Object.keys(SETUP_TASK_LINKS) as SetupTaskType[]) {
      expect(SETUP_TASK_LINKS[type]).toMatch(/^\//)
    }
  })

  it("only marks known task types as executable", () => {
    for (const type of EXECUTABLE_TASK_TYPES) {
      expect(Object.keys(SETUP_TASK_LINKS)).toContain(type)
    }
  })
})

describe("computeSetupProgress", () => {
  it("counts required tasks only and treats SKIPPED as done", () => {
    const progress = computeSetupProgress([
      task("CURRENCIES", "COMPLETED"),
      task("CASHBOXES", "SKIPPED"),
      task("BANK_ACCOUNTS", "READY"),
      task("WAREHOUSES", "SKIPPED", false),
    ])
    expect(progress).toEqual({ completed: 2, total: 3, percent: 67 })
  })

  it("returns 100% when there are no required tasks", () => {
    expect(computeSetupProgress([])).toEqual({ completed: 0, total: 0, percent: 100 })
  })
})

describe("parseReconciliationChecks", () => {
  it("parses the stored per-check summary", () => {
    const checks = parseReconciliationChecks({
      checks: [
        { code: "JOURNAL_ENTRIES_BALANCED", passed: false, findingCount: 2 },
        { code: "CASH_GL_VS_CASHBOX_SUBLEDGER", passed: true, findingCount: 0 },
      ],
    })
    expect(checks).toEqual([
      { code: "JOURNAL_ENTRIES_BALANCED", passed: false, findingCount: 2 },
      { code: "CASH_GL_VS_CASHBOX_SUBLEDGER", passed: true, findingCount: 0 },
    ])
  })

  it("returns an empty list for missing or malformed progress", () => {
    expect(parseReconciliationChecks(null)).toEqual([])
    expect(parseReconciliationChecks({ checks: "nope" })).toEqual([])
    expect(parseReconciliationChecks({ checks: [null, { code: 1 }] })).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @devloggers/dashboard test:unit`
Expected: FAIL — `Cannot find module './setup.config'`.

- [ ] **Step 3: Implement the shared readiness hook**

```typescript
// apps/dashboard/shared/hooks/use-setup-readiness.ts
"use client"

import { useQuery } from "@tanstack/react-query"
import type { BusinessSetupClient } from "@devloggers/api-client"
import { useApi } from "@/shared/useApi"
import { usePermissions } from "@/shared/hooks/use-permissions"

export type BusinessSetupState = Awaited<ReturnType<BusinessSetupClient["getState"]>>
export type SetupReadiness = NonNullable<BusinessSetupState["readiness"]>
export type ReadinessModuleKey = keyof SetupReadiness["modules"]

export const businessSetupStateKey = ["business-setup", "state"] as const

/**
 * Readiness is exposed through the business-setup state endpoint, which requires
 * `businessSetup.manage` — the soft warnings therefore render for setup managers
 * only (the people the hub is for). The API remains the enforcement point.
 */
export function useSetupReadiness() {
  const api = useApi()
  const { can } = usePermissions()
  const allowed = can("businessSetup.manage")

  const query = useQuery({
    queryKey: businessSetupStateKey,
    queryFn: () => api["business-setup"].getState(),
    enabled: allowed,
  })

  return { allowed, isLoading: query.isLoading, state: query.data ?? null }
}
```

- [ ] **Step 4: Implement the feature hook**

```typescript
// apps/dashboard/modules/business-setup/hooks/use-business-setup.ts
"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useApi } from "@/shared/useApi"
import { toastErrorMessage } from "@/shared/lib/utils"
import { businessSetupStateKey, useSetupReadiness, type BusinessSetupState } from "@/shared/hooks/use-setup-readiness"

export type SetupTask = BusinessSetupState["tasks"][number]
export type SetupTaskType = SetupTask["type"]
export type SetupTaskStatus = SetupTask["status"]
export type SetupNextAction = NonNullable<BusinessSetupState["nextAction"]>

export function useBusinessSetup() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { allowed, isLoading, state } = useSetupReadiness()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: businessSetupStateKey })

  const executeTask = useMutation({
    mutationFn: (type: SetupTaskType) => api["business-setup"].executeTask(type, {}),
    onSuccess: invalidate,
    onError: (error) => toast.error(toastErrorMessage(error)),
  })

  const skipTask = useMutation({
    mutationFn: (type: SetupTaskType) => api["business-setup"].skipTask(type),
    onSuccess: invalidate,
    onError: (error) => toast.error(toastErrorMessage(error)),
  })

  return { allowed, isLoading, state, executeTask, skipTask }
}
```

- [ ] **Step 5: Implement the config**

```typescript
// apps/dashboard/modules/business-setup/setup.config.ts
import type { SetupTask, SetupTaskType } from "./hooks/use-business-setup"

export type SetupGroupKey = "accounting" | "money" | "inventory" | "parties"

/** Hub grouping (Phase 10.1.2). Every task type appears in exactly one group — pinned by setup.config.test.ts. */
export const SETUP_GROUPS: { key: SetupGroupKey; tasks: SetupTaskType[] }[] = [
  {
    key: "accounting",
    tasks: ["CURRENCIES", "FISCAL_PERIOD", "CHART_OF_ACCOUNTS", "FINANCIAL_MAPPINGS", "DOCUMENT_SEQUENCES", "RECONCILIATION"],
  },
  {
    key: "money",
    tasks: ["CASHBOXES", "BANK_ACCOUNTS", "OPENING_CASH_BALANCES", "OPENING_BANK_BALANCES"],
  },
  {
    key: "inventory",
    tasks: ["WAREHOUSES", "PRODUCTS", "OPENING_INVENTORY"],
  },
  {
    key: "parties",
    tasks: ["CUSTOMERS", "SUPPLIERS", "OPENING_RECEIVABLES", "OPENING_PAYABLES"],
  },
]

/** Where each task's work actually happens — existing CRUD pages and opening workflows (Phase 10.1.3). */
export const SETUP_TASK_LINKS: Record<SetupTaskType, string> = {
  CURRENCIES: "/settings/currencies",
  FISCAL_PERIOD: "/settings/fiscal-periods",
  CHART_OF_ACCOUNTS: "/finance/chart-of-accounts",
  FINANCIAL_MAPPINGS: "/settings/gl-accounts",
  DOCUMENT_SEQUENCES: "/settings/document-sequences",
  CASHBOXES: "/finance/cashboxes",
  BANK_ACCOUNTS: "/finance/bank-accounts",
  WAREHOUSES: "/inventory/warehouses",
  PRODUCTS: "/catalog/items",
  CUSTOMERS: "/parties/customers",
  SUPPLIERS: "/parties/suppliers",
  OPENING_CASH_BALANCES: "/finance/opening-balances",
  OPENING_BANK_BALANCES: "/finance/opening-balances",
  OPENING_RECEIVABLES: "/finance/opening-balances",
  OPENING_PAYABLES: "/finance/opening-balances",
  OPENING_INVENTORY: "/inventory/opening-balances",
  RECONCILIATION: "/setup",
}

/** Tasks the hub runs server-side (payload-free handlers). Everything else completes via discovery. */
export const EXECUTABLE_TASK_TYPES: SetupTaskType[] = ["CHART_OF_ACCOUNTS", "RECONCILIATION"]

export function computeSetupProgress(tasks: SetupTask[]): { completed: number; total: number; percent: number } {
  const required = tasks.filter((task) => task.required)
  const completed = required.filter((task) => task.status === "COMPLETED" || task.status === "SKIPPED").length
  const total = required.length
  return { completed, total, percent: total === 0 ? 100 : Math.round((completed / total) * 100) }
}

export type ReconciliationCheck = { code: string; passed: boolean; findingCount: number }

/** Defensively parses the per-check summary stored on the RECONCILIATION task's `progress` JSON. */
export function parseReconciliationChecks(progress: Record<string, unknown> | null): ReconciliationCheck[] {
  const raw = progress?.checks
  if (!Array.isArray(raw)) return []
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return []
    const { code, passed, findingCount } = entry as Record<string, unknown>
    if (typeof code !== "string" || typeof passed !== "boolean") return []
    return [{ code, passed, findingCount: typeof findingCount === "number" ? findingCount : 0 }]
  })
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @devloggers/dashboard test:unit`
Expected: PASS — existing suites + 4 new.

- [ ] **Step 7: Commit**

```bash
git add apps/dashboard/shared/hooks/use-setup-readiness.ts apps/dashboard/modules/business-setup/hooks/use-business-setup.ts apps/dashboard/modules/business-setup/setup.config.ts apps/dashboard/modules/business-setup/setup.config.test.ts
git commit -m "feat(dashboard): add setup hub config, progress and readiness hooks (Phase 10.1)"
```

---

## Task 13: Setup hub UI

**Files:**
- Create: `apps/dashboard/modules/business-setup/components/setup-hub.tsx`
- Create: `apps/dashboard/modules/business-setup/components/setup-task-card.tsx`
- Create: `apps/dashboard/modules/business-setup/components/setup-next-action.tsx`
- Create: `apps/dashboard/modules/business-setup/components/setup-readiness-panel.tsx`
- Create: `apps/dashboard/modules/business-setup/components/setup-reconciliation-panel.tsx`
- Create: `apps/dashboard/modules/business-setup/index.ts`
- Delete: `apps/dashboard/modules/business-setup/business-setup-summary.tsx`
- Modify: `apps/dashboard/app/[locale]/(authenticated)/setup/page.tsx`

**Interfaces:**
- Consumes: Task 12 hooks/config, Task 10 state DTO.
- Produces: `SetupHub` and `SetupProgressBanner` exported from `@/modules/business-setup`.

- [ ] **Step 1: Implement the task card**

```tsx
// apps/dashboard/modules/business-setup/components/setup-task-card.tsx
"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import type { SetupTask, SetupTaskType } from "../hooks/use-business-setup"
import { EXECUTABLE_TASK_TYPES, SETUP_TASK_LINKS } from "../setup.config"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  COMPLETED: "default",
  READY: "secondary",
  BLOCKED: "outline",
  SKIPPED: "outline",
}

type Props = {
  task: SetupTask
  taskByType: ReadonlyMap<SetupTaskType, SetupTask>
  onExecute: (type: SetupTaskType) => void
  onSkip: (type: SetupTaskType) => void
  pendingType: SetupTaskType | null
}

export function SetupTaskCard({ task, taskByType, onExecute, onSkip, pendingType }: Props) {
  const t = useTranslations("business.businessSetup")
  const blockingDependencies = task.dependencies.filter((dependency) => {
    const dependencyTask = taskByType.get(dependency)
    return !dependencyTask || (dependencyTask.status !== "COMPLETED" && dependencyTask.status !== "SKIPPED")
  })
  const isExecutable = EXECUTABLE_TASK_TYPES.includes(task.type) && task.status === "READY"
  const isTerminal = task.status === "COMPLETED" || task.status === "SKIPPED"
  const isPending = pendingType === task.type

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t(`tasks.${task.type}`)}</p>
            {blockingDependencies.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {t("blockedBy", { tasks: blockingDependencies.map((dependency) => t(`tasks.${dependency}`)).join(", ") })}
              </p>
            )}
          </div>
          <Badge variant={STATUS_VARIANT[task.status] ?? "outline"}>{t(`status.${task.status}`)}</Badge>
        </div>

        {!isTerminal && (
          <div className="flex flex-wrap gap-2">
            {task.type !== "RECONCILIATION" && (
              <Button asChild size="sm" variant="outline">
                <Link href={SETUP_TASK_LINKS[task.type]}>{t("actions.open")}</Link>
              </Button>
            )}
            {isExecutable && (
              <Button size="sm" disabled={isPending} onClick={() => onExecute(task.type)}>
                {isPending ? t("actions.running") : t("actions.run")}
              </Button>
            )}
            {task.skippable && (
              <Button size="sm" variant="ghost" disabled={isPending} onClick={() => onSkip(task.type)}>
                {isPending ? t("actions.skipping") : t("actions.skip")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Implement the next-action card**

```tsx
// apps/dashboard/modules/business-setup/components/setup-next-action.tsx
"use client"

import { useTranslations } from "next-intl"
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import type { SetupNextAction } from "../hooks/use-business-setup"

export function SetupNextActionCard({ nextAction }: { nextAction: SetupNextAction | null }) {
  const t = useTranslations("business.businessSetup")
  if (!nextAction) return null

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="text-base">{t("nextAction.title")}</CardTitle>
        <CardDescription>
          {nextAction.reason === "READY"
            ? t("nextAction.ready", { task: t(`tasks.${nextAction.type}`) })
            : t("nextAction.waitingOn", {
                task: t(`tasks.${nextAction.type}`),
                blockers: nextAction.blockedBy.map((type) => t(`tasks.${type}`)).join(", "),
              })}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
```

- [ ] **Step 3: Implement the readiness panel**

```tsx
// apps/dashboard/modules/business-setup/components/setup-readiness-panel.tsx
"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent } from "@/shared/components/ui/card"
import type { ReadinessModuleKey, SetupReadiness } from "@/shared/hooks/use-setup-readiness"

export function SetupReadinessPanel({ readiness }: { readiness: SetupReadiness }) {
  const t = useTranslations("business.businessSetup")
  const moduleKeys = Object.keys(readiness.modules) as ReadinessModuleKey[]

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t("readiness.title")}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {moduleKeys.map((moduleKey) => {
          const module = readiness.modules[moduleKey]
          return (
            <Card key={moduleKey}>
              <CardContent className="space-y-1 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{t(`readiness.modules.${moduleKey}`)}</span>
                  <Badge variant={module.ready ? "default" : "outline"}>
                    {module.ready ? t("readiness.ready") : t("readiness.notReady")}
                  </Badge>
                </div>
                {!module.ready && module.blockers.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {module.blockers.map((blocker) => t(`tasks.${blocker}`)).join(", ")}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Implement the reconciliation / remediation panel**

```tsx
// apps/dashboard/modules/business-setup/components/setup-reconciliation-panel.tsx
"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import type { SetupTask, SetupTaskType } from "../hooks/use-business-setup"
import { parseReconciliationChecks } from "../setup.config"

type Props = {
  task: SetupTask | null
  onRun: (type: SetupTaskType) => void
  isRunning: boolean
}

/**
 * Phase 10.4.3 + 10.5: names every failing reconciliation check in plain language.
 * These are the real legacy-data blockers (e.g. journal lines missing amounts or
 * rates) — the remediation surface the roadmap calls for.
 */
export function SetupReconciliationPanel({ task, onRun, isRunning }: Props) {
  const t = useTranslations("business.businessSetup")
  if (!task) return null

  const failedChecks = parseReconciliationChecks(task.progress).filter((check) => !check.passed)
  const isCompleted = task.status === "COMPLETED"

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t("reconciliation.title")}</h2>
      <Card>
        <CardContent className="space-y-3 p-4">
          {isCompleted ? (
            <p className="text-sm text-muted-foreground">{t("reconciliation.passed")}</p>
          ) : failedChecks.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">
                {t("reconciliation.failed", { count: failedChecks.length })}
              </p>
              <ul className="list-disc space-y-1 ps-5 text-sm">
                {failedChecks.map((check) => (
                  <li key={check.code}>
                    {t(`checks.${check.code}`)}{" "}
                    <span className="text-muted-foreground">
                      ({t("reconciliation.findings", { count: check.findingCount })})
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">{t("legacy.description")}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("reconciliation.neverRun")}</p>
          )}

          <Button
            size="sm"
            disabled={task.status !== "READY" || isRunning}
            onClick={() => onRun("RECONCILIATION")}
          >
            {isRunning ? t("reconciliation.running") : t("reconciliation.run")}
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
```

- [ ] **Step 5: Implement the hub**

```tsx
// apps/dashboard/modules/business-setup/components/setup-hub.tsx
"use client"

import { useTranslations } from "next-intl"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Progress } from "@/shared/components/ui/progress"
import { useBusinessSetup } from "../hooks/use-business-setup"
import { computeSetupProgress, SETUP_GROUPS } from "../setup.config"
import { SetupNextActionCard } from "./setup-next-action"
import { SetupReadinessPanel } from "./setup-readiness-panel"
import { SetupReconciliationPanel } from "./setup-reconciliation-panel"
import { SetupTaskCard } from "./setup-task-card"

export function SetupHub() {
  const t = useTranslations("business.businessSetup")
  const { allowed, isLoading, state, executeTask, skipTask } = useBusinessSetup()

  if (!allowed) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("noAccess")}</p>
      </div>
    )
  }

  if (isLoading || !state) {
    return <p className="p-6 text-sm text-muted-foreground">{t("loading")}</p>
  }

  const taskByType = new Map(state.tasks.map((task) => [task.type, task]))
  const progress = computeSetupProgress(state.tasks)
  const pendingType = executeTask.isPending
    ? executeTask.variables ?? null
    : skipTask.isPending
      ? skipTask.variables ?? null
      : null

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("hubDescription")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("progress.title")}</CardTitle>
          <CardDescription>
            {t("progress.description", { completed: progress.completed, total: progress.total })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={progress.percent} />
          <p className="text-sm text-muted-foreground">
            {state.businessSetupCompletedAt
              ? t("completedAt", { date: new Date(state.businessSetupCompletedAt).toLocaleDateString() })
              : t("progress.percent", { percent: progress.percent })}
          </p>
        </CardContent>
      </Card>

      <SetupNextActionCard nextAction={state.nextAction} />

      {state.readiness && <SetupReadinessPanel readiness={state.readiness} />}

      {SETUP_GROUPS.map((group) => (
        <section key={group.key} className="space-y-3">
          <h2 className="text-lg font-semibold">{t(`groups.${group.key}`)}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.tasks.map((type) => {
              const task = taskByType.get(type)
              if (!task) return null
              return (
                <SetupTaskCard
                  key={type}
                  task={task}
                  taskByType={taskByType}
                  onExecute={executeTask.mutate}
                  onSkip={skipTask.mutate}
                  pendingType={pendingType}
                />
              )
            })}
          </div>
        </section>
      ))}

      <SetupReconciliationPanel
        task={taskByType.get("RECONCILIATION") ?? null}
        onRun={executeTask.mutate}
        isRunning={executeTask.isPending}
      />
    </div>
  )
}
```

- [ ] **Step 6: Create the module barrel and repoint the page**

```typescript
// apps/dashboard/modules/business-setup/index.ts
export { SetupHub } from "./components/setup-hub"
```

```tsx
// apps/dashboard/app/[locale]/(authenticated)/setup/page.tsx
import { SetupHub } from "@/modules/business-setup"

export default function Page() {
  return <SetupHub />
}
```

(`SetupProgressBanner` is exported from this barrel in Task 15, after its file exists.)

- [ ] **Step 7: Delete the old summary and typecheck**

Run: `git rm apps/dashboard/modules/business-setup/business-setup-summary.tsx`
Then: `pnpm --filter @devloggers/dashboard typecheck`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add apps/dashboard/modules/business-setup apps/dashboard/app/[locale]/\(authenticated\)/setup/page.tsx
git commit -m "feat(dashboard): build the business setup hub with groups, next action and remediation (Phase 10.1)"
```

---

## Task 14: Nav readiness soft warnings

**Files:**
- Modify: `apps/dashboard/infrastructure/types/navigation.ts`
- Modify: `apps/dashboard/config/navGroups.tsx`
- Modify: `apps/dashboard/infrastructure/components/layout/dashboard/app-sidebar.tsx`

**Interfaces:**
- Consumes: `useSetupReadiness()` (Task 12), generated `OperationalReadinessModulesDto` schema key union (Task 10).
- Produces: `ReadinessModuleKey` on `NavItem`/`NavSubItem`; warning icon + tooltip in both expanded and collapsed sidebar states.

- [ ] **Step 1: Extend the nav types**

In `navigation.ts`, add the generated union and the optional field:

```typescript
import { ReactNode } from "react"
import type { ApiComponents, PermissionKey } from "@devloggers/api-contracts"

/** Module keys of the tenant's cached operational readiness (Phase 10.4.2). */
export type ReadinessModuleKey = keyof ApiComponents["schemas"]["OperationalReadinessModulesDto"]

export type NavItem = {
  titleKey: string
  href: string
  icon?: ReactNode
  isActive?: boolean
  badge?: string | number
  /** Cosmetic gate; the API enforces for real. Item is hidden when not granted. */
  permission?: PermissionKey
  /** Shows a soft warning icon while the module is not operationally ready. */
  readinessModule?: ReadinessModuleKey
  items?: NavSubItem[]
}

export type NavSubItem = {
  titleKey: string
  href: string
  icon?: ReactNode
  isActive?: boolean
  permission?: PermissionKey
  readinessModule?: ReadinessModuleKey
}
```

- [ ] **Step 2: Tag the operational nav items**

In `navGroups.tsx` add `readinessModule` to these entries:

| Entry | Value |
|---|---|
| sales (parent) + `salesInvoices` + `customers` | `"sales"` |
| purchases (parent) + `purchaseInvoices` + `suppliers` | `"purchasing"` |
| catalog (parent) + `itemsList` | `"inventory"` |
| warehouses (parent) + `stockBalances` + `stockMovements` + `stockCounts` + `openingBalances` | `"inventory"` |
| cashboxes (parent) + `cashboxesList` + `payments` | `"cashOps"` |
| `bankAccounts` | `"bankOps"` |
| accounting (parent) + `chartOfAccounts` + `openingBalancesGL` | `"accounting"` |

Example for the sales entry:

```tsx
      {
        titleKey: "business.navigation.items.sales",
        permission: "invoices.view",
        href: "/sales/invoices",
        icon: <ReceiptIcon />,
        readinessModule: "sales",
        items: [
          {
            titleKey: "business.navigation.items.salesInvoices",
            permission: "invoices.view",
            href: "/sales/invoices",
            icon: <ReceiptIcon />,
            readinessModule: "sales",
          },
          {
            titleKey: "business.navigation.items.customers",
            permission: "parties.view",
            href: "/parties/customers",
            icon: <UsersIcon />,
            readinessModule: "sales",
          },
        ],
      },
```

- [ ] **Step 3: Render warnings in the sidebar**

In `app-sidebar.tsx`:

1. Update imports:

```tsx
import { ChevronRight, Circle, TriangleAlertIcon } from "lucide-react"
import type { NavGroup, NavItem, ReadinessModuleKey } from "@/infrastructure/types/navigation"
import { IconTooltip } from "@/shared/components/icon-tooltip"
import { useSetupReadiness } from "@/shared/hooks/use-setup-readiness"
```

2. In `AppSidebar`, after `const isRtl = locale === "ar"`, add:

```tsx
    const { state: setupState } = useSetupReadiness()
    const isModuleReady = (moduleKey?: ReadinessModuleKey) =>
        !moduleKey || !setupState?.readiness || setupState.readiness.modules[moduleKey].ready
```

3. Pass `isModuleReady` to both item components in the render loop:

```tsx
                                    <CollapsibleNavItem
                                        key={item.href}
                                        item={item}
                                        isCollapsed={isCollapsed}
                                        t={t}
                                        normalizedPathname={normalizedPathname}
                                        localizedHref={localizedHref}
                                        isModuleReady={isModuleReady}
                                    />
                                ) : (
                                    <SimpleNavItem
                                        key={item.href}
                                        item={item}
                                        isCollapsed={isCollapsed}
                                        t={t}
                                        normalizedPathname={normalizedPathname}
                                        localizedHref={localizedHref}
                                        isModuleReady={isModuleReady}
                                    />
                                )
```

4. Add the shared warning element (place above the component definitions):

```tsx
function NavReadinessWarning({ label }: { label: string }) {
    return (
        <IconTooltip label={label}>
            <span className="ms-auto inline-flex shrink-0 items-center">
                <TriangleAlertIcon className="size-3.5 text-amber-500" />
            </span>
        </IconTooltip>
    )
}
```

5. Extend `SimpleNavItem` props and body:

```tsx
function SimpleNavItem({
    item,
    isCollapsed,
    t,
    normalizedPathname,
    localizedHref,
    isModuleReady,
}: {
    item: NavItem
    isCollapsed: boolean
    t: ReturnType<typeof useTranslations>
    normalizedPathname: string
    localizedHref: (href: string) => string
    isModuleReady: (moduleKey?: ReadinessModuleKey) => boolean
}) {
    const isActive = item.isActive ?? normalizedPathname === item.href
    const showWarning = !isModuleReady(item.readinessModule)

    return (
        <SidebarMenuItem>
            <SidebarMenuButton

                asChild
                isActive={isActive}
                tooltip={t(item.titleKey)}
                className="dashboard-nav-item"
                data-collapsed={isCollapsed}
            >
                <Link href={localizedHref(item.href)}>
                    {item.icon && <span className="dashboard-nav-icon shrink-0">{item.icon}</span>}
                    {
                        !isCollapsed &&
                        <span>{t(item.titleKey)}</span>
                    }
                    {showWarning && <NavReadinessWarning label={t("business.businessSetup.navWarning")} />}
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    )
}
```

6. Replace `CollapsibleNavItem` with the version below (adds the `isModuleReady` prop and renders the warning in the collapsed trigger, the expanded trigger, and every sub-item):

```tsx
function CollapsibleNavItem({
    item,
    isCollapsed,
    t,
    normalizedPathname,
    localizedHref,
    isModuleReady,
}: {
    item: NavItem
    isCollapsed: boolean
    t: ReturnType<typeof useTranslations>
    normalizedPathname: string
    localizedHref: (href: string) => string
    isModuleReady: (moduleKey?: ReadinessModuleKey) => boolean
}) {
    const isChildActive = item.items?.some((sub) => normalizedPathname === sub.href)
    const isActive = item.isActive ?? (normalizedPathname === item.href || isChildActive === true)
    const isRtl = useLocale() === "ar"
    const showWarning = !isModuleReady(item.readinessModule)

    // Collapsed sidebar → flyout dropdown with sub-items
    if (isCollapsed) {
        return (
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton

                            isActive={isActive}
                            tooltip={t(item.titleKey)}
                            className="dashboard-nav-item"
                            data-collapsed={isCollapsed}
                        >
                            {item.icon && (
                                <span className="dashboard-nav-icon shrink-0">
                                    {item.icon}
                                </span>
                            )}
                            {showWarning && <TriangleAlertIcon className="ms-auto size-3.5 text-amber-500" />}
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side={isRtl ? "left" : "right"}
                        align="start"
                        sideOffset={4}
                        className="min-w-45"
                    >
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                            {t(item.titleKey)}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {item.items?.map((sub) => {
                            const isSubActive = sub.isActive ?? normalizedPathname === sub.href
                            return (
                                <DropdownMenuItem key={sub.href} asChild>
                                    <Link
                                        href={localizedHref(sub.href)}
                                        data-active={isSubActive}
                                        className={cn(
                                            "dashboard-nav-dropdown-item flex items-center gap-2"
                                        )}
                                    >
                                        {sub.icon ? (
                                            <span className="dashboard-nav-sub-icon shrink-0 text-sidebar-foreground/55 [&>svg]:size-4">
                                                {sub.icon}
                                            </span>
                                        ) : (
                                            <span className="dashboard-nav-sub-icon shrink-0 text-sidebar-foreground/35">
                                                <Circle className="size-1.5 fill-current" />
                                            </span>
                                        )}
                                        {t(sub.titleKey)}
                                        {!isModuleReady(sub.readinessModule) && (
                                            <TriangleAlertIcon className="ms-auto size-3.5 text-amber-500" />
                                        )}
                                    </Link>
                                </DropdownMenuItem>
                            )
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        )
    }

    // Expanded sidebar → collapsible/accordion sub-menu
    return (
        <Collapsible asChild defaultOpen={isActive} className="group/collapsible">
            <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={t(item.titleKey)} isActive={isActive} className="dashboard-nav-item" data-collapsed={isCollapsed}>
                        {item.icon && (
                            <span className="dashboard-nav-icon shrink-0">
                                {item.icon}
                            </span>
                        )}


                        <span>{t(item.titleKey)}</span>

                        {showWarning && <NavReadinessWarning label={t("business.businessSetup.navWarning")} />}

                        <ChevronRight
                            className={cn(
                                "dashboard-nav-chevron ms-auto size-4 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.87,0,0.13,1)] rtl:rotate-180",
                                "group-data-[state=open]/collapsible:rotate-90"
                            )}
                        />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden py-2 data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                    <SidebarMenuSub>
                        {item.items?.map((sub) => {
                            const isSubActive = sub.isActive ?? normalizedPathname === sub.href
                            return (
                                <SidebarMenuSubItem key={sub.href}>
                                    <SidebarMenuSubButton asChild isActive={isSubActive} className="dashboard-nav-sub-item my-0.5">
                                        <Link href={localizedHref(sub.href)}>
                                            {sub.icon ? (
                                                <span className="dashboard-nav-sub-icon shrink-0 text-sidebar-foreground/55 [&>svg]:size-4">
                                                    {sub.icon}
                                                </span>
                                            ) : (
                                                <span className="dashboard-nav-sub-icon shrink-0 text-sidebar-foreground/35">
                                                    <Circle className="size-1.5 fill-current" />
                                                </span>
                                            )}
                                            <span>{t(sub.titleKey)}</span>
                                            {!isModuleReady(sub.readinessModule) && (
                                                <TriangleAlertIcon className="ms-auto size-3.5 text-amber-500" />
                                            )}
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            )
                        })}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuItem>
        </Collapsible>
    )
}
```

- [ ] **Step 4: Typecheck and build**

Run: `pnpm --filter @devloggers/dashboard typecheck`
Expected: exit 0.

Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/infrastructure/types/navigation.ts apps/dashboard/config/navGroups.tsx apps/dashboard/infrastructure/components/layout/dashboard/app-sidebar.tsx
git commit -m "feat(dashboard): show soft readiness warnings on navigation items (Phase 10.4.2)"
```

---

## Task 15: Soft "continue setup" banner

**Files:**
- Create: `apps/dashboard/modules/business-setup/components/setup-progress-banner.tsx`
- Modify: `apps/dashboard/modules/business-setup/index.ts`
- Modify: `apps/dashboard/app/[locale]/(authenticated)/layout.tsx`

**Interfaces:**
- Consumes: `useBusinessSetup()` + `computeSetupProgress` (Task 12).
- Produces: the Q10 soft warning — visible only to `businessSetup.manage` users, hidden on `/setup` and once complete.

- [ ] **Step 1: Implement the banner**

```tsx
// apps/dashboard/modules/business-setup/components/setup-progress-banner.tsx
"use client"

import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import { useBusinessSetup } from "../hooks/use-business-setup"
import { computeSetupProgress } from "../setup.config"

export function SetupProgressBanner() {
  const t = useTranslations("business.businessSetup")
  const pathname = usePathname()
  const { allowed, state } = useBusinessSetup()

  if (!allowed || !state || state.businessSetupCompletedAt || pathname === "/setup") return null

  const progress = computeSetupProgress(state.tasks)

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-amber-50 px-4 py-2 text-sm dark:bg-amber-950/30">
      <span>{t("banner.text", { percent: progress.percent })}</span>
      <Link className="font-medium underline underline-offset-2" href="/setup">
        {t("banner.cta")}
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Export the banner and render it in the authenticated layout**

In `apps/dashboard/modules/business-setup/index.ts`, add:

```typescript
export { SetupProgressBanner } from "./components/setup-progress-banner"
```

In `apps/dashboard/app/[locale]/(authenticated)/layout.tsx`:
1. Add `import { SetupProgressBanner } from "@/modules/business-setup"`
2. Pass the banner as the first child:

```tsx
    <DashboardLayout navGroups={visibleNavGroups} logo={<Logo />} user={userInfo} breadcrumbs={breadcrumbs}>
      <SetupProgressBanner />
      {children}
    </DashboardLayout>
```

- [ ] **Step 3: Typecheck + build**

Run: `pnpm --filter @devloggers/dashboard typecheck`
Expected: exit 0.

Run: `pnpm turbo run build --filter=@devloggers/dashboard`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/modules/business-setup/components/setup-progress-banner.tsx apps/dashboard/app/[locale]/\(authenticated\)/layout.tsx
git commit -m "feat(dashboard): add soft continue-setup banner (Phase 10.1.5, Q10)"
```

---

## Task 16: Documentation — Q10 decision, roadmap status, 10.5 deviation

**Files:**
- Modify: `docs/superpowers/specs/2026-08-20-erp-roadmap/README.md`
- Modify: `docs/superpowers/specs/2026-08-20-erp-roadmap/phase-10-business-setup-ui-import-readiness.md`

- [ ] **Step 1: Verify the 10.5 legacy columns are gone**

Run: `git grep -n "opening_balance\|openingBalance" -- "packages/db-prisma/src/schema/*.prisma"` — expect **no match** on `Party`.
Run: `git grep -n "linked_account_id\|linkedAccountId" -- "packages/db-prisma/src/schema/*.prisma"` — expect **no match** on `Cashbox`.
Run: `ls packages/db-prisma/src/schema/migrations | Select-String "drop_party_opening_balance"` — expect the migration folder.

Record the outcome in the phase-10 spec (Step 3).

- [ ] **Step 2: Record the Q10 decision in the roadmap README**

In `README.md`:
1. Open questions table, row Q10 → `| Q10 | Hard vs soft `/setup` redirect | ✅ Decided (Phase 10) — soft warnings only (nav icons + banner + hub); no hard redirect, legacy tenants must not be locked out |`
2. Phase table: mark Phase 6 `✅ Complete` (business-setup module landed; see git log `be9d7b4`..`b0105f7`), Phase 9 `✅ Complete` (authz commits `01fbea9`..`c8ea7f0`; plan-doc checkboxes were not maintained), Phase 10 `🚧 In progress — hub, readiness and remediation shipped; import pipeline (10.3) and opening-balance UI (10.2) pending`.

- [ ] **Step 3: Update the phase-10 spec**

In `phase-10-business-setup-ui-import-readiness.md`:
1. Under `### 10.1 — Setup UI`, note the implementation plan: `docs/superpowers/plans/2026-09-21-phase-10-setup-hub-readiness.md`.
2. 10.1.5 — replace "decide at implementation" with: `Soft warnings only (nav icons + dashboard banner + hub). Hard redirect rejected: accepted legacy reconciliation drift would permanently lock existing tenants out of the product.`
3. 10.5 — add a note under the heading:
   > **Implemented differently (2026-09-21):** `Party.openingBalance` was dropped in `20260821014711_drop_party_opening_balance` and `cashboxes.linkedAccountId` was backfilled then dropped in `20260821000000_subledger_foundation`, so neither can be surfaced as data. Remediation instead names the failing reconciliation checks (the real legacy blockers: unbalanced entries and missing FX amounts/rates) on the setup hub — see `SetupReconciliationPanel`.
4. Mark 10.1.x, 10.4.x and 10.5 checkboxes `[x]`; leave 10.2/10.3 unchecked.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-08-20-erp-roadmap/README.md docs/superpowers/specs/2026-08-20-erp-roadmap/phase-10-business-setup-ui-import-readiness.md
git commit -m "docs(roadmap): record Q10 soft-warning decision and 10.5 remediation deviation (Phase 10)"
```

---

## Task 17: Full verification + acceptance walkthrough

**Files:** none

- [ ] **Step 1: Run the API gates**

```bash
pnpm --filter @devloggers/api lint:architecture
pnpm --filter @devloggers/api test
pnpm turbo run build --filter=@devloggers/api
```
Expected: lint passes (manifest/probe cases unchanged — no new domains or edges), full Jest suite green, build exit 0.

- [ ] **Step 2: Run the contracts/client/i18n gates**

```bash
pnpm turbo run build --filter=@devloggers/api-contracts --filter=@devloggers/api-client --filter=@devloggers/i18n
```
Expected: exit 0.

- [ ] **Step 3: Run the dashboard gates**

```bash
pnpm --filter @devloggers/dashboard typecheck
pnpm --filter @devloggers/dashboard test:unit
pnpm turbo run build --filter=@devloggers/dashboard
```
Expected: typecheck 0 errors, Vitest green, `next build` exit 0.

- [ ] **Step 4: Confirm the generated contract exposes the new surface**

Run: `Select-String -Path 'packages/api-contracts/types/index.ts' -Pattern 'OperationalReadinessModulesDto|NextSetupActionDto|skippable'`
Expected: matches for the new schemas + `skippable` on the task DTO.

- [ ] **Step 5: Manual acceptance — empty business path**

With a fresh tenant that completed onboarding:
1. Open `/setup` — progress shows 0-ish %, groups render, next action is the first READY accounting task.
2. Opening balances are zero → click **Not applicable** on each `OPENING_*` task; readiness modules flip to ready as dependencies complete.
3. `CHART_OF_ACCOUNTS` is COMPLETED automatically from discovery (onboarding created the chart); if not, **Run now** completes it.
4. **Run reconciliation** → expect pass (no data) → progress hits 100% and `businessSetupCompletedAt` displays; the dashboard banner disappears.
5. Nav shows no warning icons for ready modules.

- [ ] **Step 6: Manual acceptance — existing business data**

On a tenant with legacy drift (`demo-shop` in the dev DB):
1. **Run reconciliation** → fails; the panel lists each failing check with a plain-language description and finding count.
2. `businessSetupCompletedAt` remains null; the soft banner persists.
3. Create the missing entities via the linked CRUD pages, reopen `/setup` → tasks complete automatically from discovery.
4. Skip-only tasks disappear from "blocked" and readiness updates without a manual "refresh".

- [ ] **Step 7: Commit (if any verification fixups were needed)**

```bash
git add -A
git commit -m "test(business-setup): verification fixups for setup hub readiness (Phase 10)"
```

---

## Self-review notes (for the implementer)

- **Task order matters:** Tasks 1-10 are backend; 11 is i18n; 12-15 are dashboard. Tasks 4 and 10 run `pnpm generate` — run them in order and commit the regenerated `openapi.yaml` + `types/index.ts` every time.
- **No migration:** if any step suggests a Prisma schema change, it is wrong — the two tenant columns already exist.
- **`Party.openingBalance` / `Cashbox.linkedAccountId` do not exist** in the schema. Task 16 Step 1 is the proof; do not resurrect them.
- **`businessSetupCompletedAt` never un-sets.** A later manual reconciliation that fails (via `POST /accounting/reconciliation/runs`) does not revoke completion — intentional.
- **`useSetupReadiness` is permission-gated.** Users without `businessSetup.manage` see no nav warnings and no banner; the hub shows `noAccess`. This keeps Phase 9's fail-closed posture without adding a new permission.
- **Dashboard read of `progress.checks` is defensive** (`parseReconciliationChecks`); the JSON column is untyped, so never assume its shape.

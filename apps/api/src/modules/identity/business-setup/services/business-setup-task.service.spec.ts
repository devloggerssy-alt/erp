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

    describe('getTaskOrFail', () => {
        it('throws NotFoundException when the task row does not exist', async () => {
            const { service } = build([]);
            await expect(service.getTaskOrFail('t1', 'CURRENCIES' as never)).rejects.toThrow('Setup task "CURRENCIES" not found');
        });
    });
});

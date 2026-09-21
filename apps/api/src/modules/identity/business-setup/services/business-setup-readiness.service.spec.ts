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

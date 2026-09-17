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

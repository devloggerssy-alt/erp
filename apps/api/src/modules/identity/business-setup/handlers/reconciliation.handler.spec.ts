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

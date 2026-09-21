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

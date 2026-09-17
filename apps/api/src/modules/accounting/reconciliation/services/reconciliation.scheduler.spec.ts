import { ReconciliationScheduler } from './reconciliation.scheduler';
import { RequestContext } from '../../../../common/request-context/request-context';

function build(enabled: string | undefined, tenantIds: string[]) {
    const contexts: Array<ReturnType<typeof RequestContext.get>> = [];
    const runs = { listTenantIds: jest.fn().mockResolvedValue(tenantIds) };
    const monitor = {
        runForTenant: jest.fn(async (tenantId: string) => {
            contexts.push(RequestContext.get());
            if (tenantId === 'bad') throw new Error('query timeout');
            return {};
        }),
    };
    const config = { get: jest.fn().mockReturnValue(enabled) };
    const scheduler = new ReconciliationScheduler(runs as never, monitor as never, config as never);
    return { scheduler, runs, monitor, contexts };
}

describe('ReconciliationScheduler.runDaily', () => {
    it('runs every tenant with its own scheduler context', async () => {
        const { scheduler, monitor, contexts } = build('true', ['t1', 't2']);
        await scheduler.runDaily();
        expect(monitor.runForTenant.mock.calls).toEqual([
            ['t1', 'SCHEDULED'],
            ['t2', 'SCHEDULED'],
        ]);
        expect(contexts[0]).toMatchObject({ source: 'SCHEDULER', tenantId: 't1', userId: 'system' });
        expect(contexts[1]).toMatchObject({ source: 'SCHEDULER', tenantId: 't2' });
        expect(contexts[0]?.correlationId).not.toBe(contexts[1]?.correlationId);
    });

    it('keeps going when one tenant fails', async () => {
        const { scheduler, monitor } = build(undefined, ['t1', 'bad', 't3']);
        await expect(scheduler.runDaily()).resolves.toBeUndefined();
        expect(monitor.runForTenant).toHaveBeenCalledTimes(3);
    });

    it('does nothing when disabled', async () => {
        const { scheduler, runs, monitor } = build('false', ['t1']);
        await scheduler.runDaily();
        expect(runs.listTenantIds).not.toHaveBeenCalled();
        expect(monitor.runForTenant).not.toHaveBeenCalled();
    });
});

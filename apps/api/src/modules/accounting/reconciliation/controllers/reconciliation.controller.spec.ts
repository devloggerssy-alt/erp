import { ReconciliationController } from './reconciliation.controller';

const user = { id: 'u1', tenantId: 't1', email: 'a@b.c' };

function build() {
    const reconciliation = { evaluate: jest.fn().mockResolvedValue({ passed: true, checks: [] }) };
    const monitor = { runForTenant: jest.fn().mockResolvedValue({ id: 'run-1' }) };
    const runs = {
        listRecent: jest.fn().mockResolvedValue([
            {
                id: 'run-0',
                tenantId: 't1',
                trigger: 'SCHEDULED',
                passed: true,
                findingCount: 0,
                findings: {},
                newFindings: [],
                report: {},
                correlationId: null,
                createdAt: new Date('2026-09-16T03:00:00.000Z'),
                updatedAt: new Date('2026-09-16T03:00:00.000Z'),
            },
        ]),
    };
    const controller = new ReconciliationController(reconciliation as never, monitor as never, runs as never);
    return { controller, reconciliation, monitor, runs };
}

describe('ReconciliationController', () => {
    it('evaluates the caller tenant only', async () => {
        const { controller, reconciliation } = build();
        const res = await controller.getChecks(user);
        expect(reconciliation.evaluate).toHaveBeenCalledWith('t1');
        expect(res).toMatchObject({ data: { passed: true } });
    });

    it('lists the last 30 runs for the caller tenant, presented', async () => {
        const { controller, runs } = build();
        const res = await controller.listRuns(user);
        expect(runs.listRecent).toHaveBeenCalledWith('t1', 30);
        expect(res).toMatchObject({ data: [{ id: 'run-0', trigger: 'SCHEDULED', createdAt: '2026-09-16T03:00:00.000Z' }] });
    });

    it('triggers a MANUAL run for the caller tenant', async () => {
        const { controller, monitor } = build();
        await controller.run(user);
        expect(monitor.runForTenant).toHaveBeenCalledWith('t1', 'MANUAL');
    });
});

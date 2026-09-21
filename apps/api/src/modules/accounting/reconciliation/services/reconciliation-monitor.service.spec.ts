import { BalanceDriftReportDto } from '../dto/balance-drift.dto';
import type { ReconciliationResultDto } from '../dto/reconciliation.dto';
import { buildChecks } from '../reconciliation-checks';
import { ReconciliationMonitorService } from './reconciliation-monitor.service';
import { ReconciliationDriftDetectedEvent } from '../events/reconciliation.events';
import { RequestContext } from '../../../../common/request-context/request-context';

function result(cashboxDifference: number | null): ReconciliationResultDto {
    const report: BalanceDriftReportDto = {
        ...new BalanceDriftReportDto(),
        generatedAt: '2026-09-17T03:00:00.000Z',
        cashboxes:
            cashboxDifference === null
                ? []
                : [{ cashboxId: 'cb1', code: 'C', cachedBalance: cashboxDifference, derivedBalance: 0, difference: cashboxDifference }],
    };
    const checks = buildChecks(report);
    return { generatedAt: report.generatedAt, passed: checks.every((c) => c.passed), checks, report };
}

function build(current: ReconciliationResultDto, previousFindings: Record<string, number> | null) {
    const reconciliation = { evaluate: jest.fn().mockResolvedValue(current) };
    const runs = {
        findLatest: jest.fn().mockResolvedValue(previousFindings === null ? null : { findings: previousFindings }),
        create: jest.fn(async (data: Record<string, unknown>) => ({
            ...data,
            id: 'run-1',
            createdAt: new Date('2026-09-17T03:00:01.000Z'),
            updatedAt: new Date('2026-09-17T03:00:01.000Z'),
        })),
    };
    const emitter = { emit: jest.fn() };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new ReconciliationMonitorService(reconciliation as never, runs as never, emitter as never, audit as never);
    return { service, runs, emitter, audit };
}

describe('ReconciliationMonitorService.runForTenant', () => {
    it('first run stores the baseline and raises no alert, even with drift', async () => {
        const { service, runs, emitter, audit } = build(result(5), null);
        const run = await RequestContext.run({ correlationId: 'corr-1', source: 'SCHEDULER' }, () =>
            service.runForTenant('t1', 'SCHEDULED'),
        );
        expect(runs.create).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: 't1',
                trigger: 'SCHEDULED',
                passed: false,
                findingCount: 1,
                findings: { 'CASHBOX:cb1': 5 },
                newFindings: [],
                correlationId: 'corr-1',
            }),
        );
        expect(emitter.emit).not.toHaveBeenCalled();
        expect(audit.record).not.toHaveBeenCalled();
        expect(run).toEqual({
            id: 'run-1',
            trigger: 'SCHEDULED',
            passed: false,
            findingCount: 1,
            newFindings: [],
            correlationId: 'corr-1',
            createdAt: '2026-09-17T03:00:01.000Z',
        });
    });

    it('does not alert when drift is unchanged since the last run', async () => {
        const { service, emitter } = build(result(5), { 'CASHBOX:cb1': 5 });
        await service.runForTenant('t1', 'SCHEDULED');
        expect(emitter.emit).not.toHaveBeenCalled();
    });

    it('alerts (event + audit) when drift grows', async () => {
        const { service, emitter, audit } = build(result(8), { 'CASHBOX:cb1': 5 });
        const run = await service.runForTenant('t1', 'MANUAL');
        expect(run.newFindings).toEqual(['CASHBOX:cb1']);
        expect(emitter.emit).toHaveBeenCalledWith(
            ReconciliationDriftDetectedEvent.NAME,
            new ReconciliationDriftDetectedEvent('t1', 'run-1', ['CASHBOX:cb1']),
        );
        expect(audit.record).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: 't1',
                userId: 'system',
                action: 'RECONCILIATION_DRIFT_DETECTED',
                entityType: 'reconciliation_run',
                entityId: 'run-1',
                newValues: { newFindings: ['CASHBOX:cb1'], trigger: 'MANUAL' },
            }),
        );
    });

    it('alerts when drift appears on a previously clean tenant', async () => {
        const { service, emitter } = build(result(1), {});
        const run = await service.runForTenant('t1', 'SCHEDULED');
        expect(run.newFindings).toEqual(['CASHBOX:cb1']);
        expect(emitter.emit).toHaveBeenCalledTimes(1);
    });

    it('attributes the audit row to the request actor when there is one', async () => {
        const { service, audit } = build(result(2), {});
        await RequestContext.run({ userId: 'u1' }, () => service.runForTenant('t1', 'MANUAL'));
        expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1' }));
    });
});

import { BalanceDriftReportDto } from '../dto/balance-drift.dto';
import { BusinessSetupReconciliationService } from './business-setup-reconciliation.service';

function build(patch: Partial<BalanceDriftReportDto>) {
    const report: BalanceDriftReportDto = { ...new BalanceDriftReportDto(), generatedAt: '2026-09-17T03:00:00.000Z', ...patch };
    const drift = { getReport: jest.fn().mockResolvedValue(report) };
    return { service: new BusinessSetupReconciliationService(drift as never), drift, report };
}

describe('BusinessSetupReconciliationService.evaluate', () => {
    it('passes a clean tenant with all 9 checks green', async () => {
        const { service, drift, report } = build({});
        const result = await service.evaluate('t1');
        expect(drift.getReport).toHaveBeenCalledWith('t1');
        expect(result.passed).toBe(true);
        expect(result.checks).toHaveLength(9);
        expect(result.generatedAt).toBe(report.generatedAt);
        expect(result.report).toBe(report);
    });

    it('fails when any single check fails', async () => {
        const { service } = build({
            unbalancedEntries: [{ journalEntryId: 'je1', number: 'JE-1', totalDebit: 1, totalCredit: 0, difference: 1 }],
        });
        const result = await service.evaluate('t1');
        expect(result.passed).toBe(false);
        expect(result.checks.find((c) => c.number === 7)).toMatchObject({ passed: false, findingCount: 1 });
    });
});

import type { FiscalPeriod } from '@devloggers/db-prisma';
import { FiscalPeriodsService } from './fiscal-periods.service';
import { RequestContext } from '../../../../common/request-context/request-context';

function build() {
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new FiscalPeriodsService({} as never, {} as never, { emit: jest.fn() } as never, audit as never);
    return { service, audit };
}

const period = (status: string) => ({ id: 'fp1', tenantId: 't1', status }) as unknown as FiscalPeriod;

describe('FiscalPeriodsService — status audit (7.2.1)', () => {
    it('audits a close with the request actor', async () => {
        const { service, audit } = build();
        await RequestContext.run({ userId: 'u1' }, () => service['onUpdated']('t1', period('CLOSED'), period('OPEN')));
        expect(audit.record).toHaveBeenCalledWith({
            tenantId: 't1',
            userId: 'u1',
            action: 'PERIOD_CLOSED',
            entityType: 'fiscal_period',
            entityId: 'fp1',
            source: 'GL',
            oldValues: { status: 'OPEN' },
            newValues: { status: 'CLOSED' },
        });
    });

    it('names a reopen explicitly and falls back to the system actor', async () => {
        const { service, audit } = build();
        await service['onUpdated']('t1', period('OPEN'), period('CLOSED'));
        expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'PERIOD_REOPENED', userId: 'system' }));
    });

    it('does nothing when status did not change', async () => {
        const { service, audit } = build();
        await service['onUpdated']('t1', period('OPEN'), period('OPEN'));
        expect(audit.record).not.toHaveBeenCalled();
    });
});

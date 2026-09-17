import { OpeningBalanceSessionsService } from './opening-balance-sessions.service';

function build(status: string) {
    const tx = { openingBalanceSession: { update: jest.fn().mockResolvedValue({}) } };
    const prisma = {
        openingBalanceSession: {
            findFirst: jest.fn().mockResolvedValue({
                id: 's1',
                tenantId: 't1',
                number: 'OBS-0001',
                status,
                fiscalPeriodId: 'fp1',
                lines: [],
            }),
        },
        fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ startDate: new Date('2026-01-01'), status: 'OPEN' }) },
        $transaction: jest.fn((cb: (client: typeof tx) => unknown) => cb(tx)),
    };
    const postingFacade = { record: jest.fn().mockResolvedValue({ journalEntryId: 'je-1' }) };
    const audit = { recordInTx: jest.fn().mockResolvedValue(undefined) };
    const service = new OpeningBalanceSessionsService(
        prisma as never,
        {} as never,
        {} as never,
        {} as never,
        postingFacade as never,
        { syncProjection: jest.fn() } as never,
        { syncProjection: jest.fn() } as never,
        audit as never,
    );
    jest.spyOn(service, 'findById').mockResolvedValue({} as never);
    return { service, tx, audit, postingFacade };
}

describe('OpeningBalanceSessionsService — audit (7.2.2)', () => {
    it('audits opening post in the same transaction as the journal entry', async () => {
        const { service, tx, audit, postingFacade } = build('REVIEWED');
        await service.post('t1', 's1', 'u1');
        expect(postingFacade.record).toHaveBeenCalledWith(tx, expect.objectContaining({ kind: 'OPENING_SESSION_POSTED' }));
        expect(audit.recordInTx).toHaveBeenCalledWith(tx, {
            tenantId: 't1',
            userId: 'u1',
            action: 'OPENING_SESSION_POST',
            entityType: 'opening_balance_session',
            entityId: 's1',
            source: 'GL',
            oldValues: { status: 'REVIEWED' },
            newValues: { status: 'POSTED', number: 'OBS-0001', lineCount: 0 },
        });
    });

    it('audits lock inside a transaction', async () => {
        const { service, tx, audit } = build('POSTED');
        await service.lock('t1', 's1', 'u1');
        expect(tx.openingBalanceSession.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 's1' }, data: expect.objectContaining({ status: 'LOCKED', lockedBy: 'u1' }) }),
        );
        expect(audit.recordInTx).toHaveBeenCalledWith(
            tx,
            expect.objectContaining({
                action: 'OPENING_SESSION_LOCK',
                entityId: 's1',
                oldValues: { status: 'POSTED' },
                newValues: { status: 'LOCKED' },
            }),
        );
    });

    it('writes no audit row when the transition is invalid', async () => {
        const { service, audit } = build('DRAFT');
        await expect(service.lock('t1', 's1', 'u1')).rejects.toThrow(/Expected POSTED/);
        expect(audit.recordInTx).not.toHaveBeenCalled();
    });
});

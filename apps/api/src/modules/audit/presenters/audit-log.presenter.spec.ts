import { AuditLogPresenter } from './audit-log.presenter';

const row = {
    id: 'a1',
    tenantId: 't1',
    userId: 'u1',
    action: 'UPDATE',
    entityType: 'INVOICE',
    entityId: 'e1',
    oldValues: { status: 'DRAFT' },
    newValues: { status: 'POSTED' },
    ipAddress: null,
    source: 'HTTP',
    correlationId: 'c1',
    metadata: null,
    createdAt: new Date('2026-04-14T12:00:00.000Z'),
};

describe('AuditLogPresenter', () => {
    const presenter = new AuditLogPresenter();

    it('maps an audit row to the documented response shape', () => {
        expect(presenter.toResponse(row)).toEqual({
            id: 'a1',
            tenantId: 't1',
            userId: 'u1',
            action: 'UPDATE',
            entityType: 'INVOICE',
            entityId: 'e1',
            oldValues: { status: 'DRAFT' },
            newValues: { status: 'POSTED' },
            ipAddress: null,
            source: 'HTTP',
            correlationId: 'c1',
            metadata: null,
            createdAt: '2026-04-14T12:00:00.000Z',
        });
    });

    it('keeps non-object JSON values as written, e.g. a bulk request body array', () => {
        const bulk = { ...row, newValues: [{ id: 'p1' }, { id: 'p2' }] };

        expect(presenter.toResponse(bulk).newValues).toEqual([{ id: 'p1' }, { id: 'p2' }]);
    });

    it('does not leak columns outside the documented contract', () => {
        const withInternal = { ...row, internalFlag: true };

        expect(presenter.toResponse(withInternal)).not.toHaveProperty('internalFlag');
    });
});

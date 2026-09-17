import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { AuditWriter } from './audit-writer.service';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { RequestContext } from '../../common/request-context/request-context';
import { REDACTED } from './redact';

function build(create: jest.Mock = jest.fn().mockResolvedValue({})) {
    const prisma = { auditLog: { create } };
    return { writer: new AuditWriter(prisma as never), create };
}

const entry = {
    tenantId: 't1',
    userId: 'u1',
    action: 'CREATE',
    entityType: 'payments',
    entityId: 'p1',
    newValues: { amount: 5, password: 'x' },
};

describe('AuditWriter.record', () => {
    it('writes context fields, merged metadata and redacted values', async () => {
        const { writer, create } = build();
        await RequestContext.run(
            { correlationId: 'corr-1', source: 'BUSINESS_SETUP', ipAddress: '10.0.0.1', metadata: { taskType: 'OPENING_CASH' } },
            () => writer.record({ ...entry, metadata: { handler: 'X.create' } }),
        );
        expect(create).toHaveBeenCalledWith({
            data: {
                tenantId: 't1',
                userId: 'u1',
                action: 'CREATE',
                entityType: 'payments',
                entityId: 'p1',
                oldValues: undefined,
                newValues: { amount: 5, password: REDACTED },
                ipAddress: '10.0.0.1',
                source: 'BUSINESS_SETUP',
                correlationId: 'corr-1',
                metadata: { taskType: 'OPENING_CASH', handler: 'X.create' },
            },
        });
    });

    it('defaults to SYSTEM with no correlation id outside a context', async () => {
        const { writer, create } = build();
        await writer.record(entry);
        expect(create.mock.calls[0]?.[0]).toMatchObject({
            data: { source: 'SYSTEM', correlationId: null, ipAddress: null, metadata: undefined },
        });
    });

    it('records the context source when the entry overrides it', async () => {
        const { writer, create } = build();
        await RequestContext.run({ source: 'BUSINESS_SETUP', metadata: { taskType: 'OPENING_CASH' } }, () =>
            writer.record({ ...entry, source: 'GL' }),
        );
        expect(create.mock.calls[0]?.[0]).toMatchObject({
            data: { source: 'GL', metadata: { taskType: 'OPENING_CASH', contextSource: 'BUSINESS_SETUP' } },
        });
    });

    it('never throws when the insert fails (7.1.3)', async () => {
        const { writer } = build(jest.fn().mockRejectedValue(new Error('db down')));
        await expect(writer.record(entry)).resolves.toBeUndefined();
    });
});

describe('AuditWriter.recordInTx', () => {
    it('writes through the transaction client, not the root client', async () => {
        const { writer, create } = build();
        const txCreate = jest.fn().mockResolvedValue({});
        await writer.recordInTx({ auditLog: { create: txCreate } }, entry);
        expect(txCreate).toHaveBeenCalledTimes(1);
        expect(create).not.toHaveBeenCalled();
    });

    it('propagates failure so the business transaction rolls back', async () => {
        const { writer } = build();
        const txCreate = jest.fn().mockRejectedValue(new Error('insert failed'));
        await expect(writer.recordInTx({ auditLog: { create: txCreate } }, entry)).rejects.toThrow('insert failed');
    });
});

describe('Audit trail is append-only (7.2.3)', () => {
    it('exposes no update/delete/purge method on the write or read services', () => {
        const methods = [
            ...Object.getOwnPropertyNames(AuditWriter.prototype),
            ...Object.getOwnPropertyNames(AuditService.prototype),
        ];
        expect(methods.filter((m) => /update|delete|remove|purge|upsert/i.test(m))).toEqual([]);
    });

    it('exposes only GET routes', () => {
        const handlers = Object.getOwnPropertyNames(AuditController.prototype).filter((m) => m !== 'constructor');
        expect(handlers.length).toBeGreaterThan(0);
        for (const name of handlers) {
            const handler: unknown = Reflect.get(AuditController.prototype, name);
            expect(Reflect.getMetadata(METHOD_METADATA, handler as object)).toBe(RequestMethod.GET);
        }
    });
});

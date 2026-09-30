import { gzipSync } from 'node:zlib';
import { BadRequestException } from '@nestjs/common';
import { DatabaseImportService } from '../database-import.service';
import { DATABASE_BACKUP_MODELS, delegateKey } from '../database-backup-models';
import { DATABASE_BACKUP_FORMAT_VERSION } from '../database-export.service';

function gzipPayload(payload: unknown): Buffer {
    return gzipSync(Buffer.from(JSON.stringify(payload), 'utf-8'));
}

function buildPrismaStub() {
    const deleteOrder: string[] = [];
    const createOrder: string[] = [];
    const createdData: Record<string, Record<string, unknown>[]> = {};
    const updateCalls: Array<{ model: string; where: unknown; data: unknown }> = [];
    const tenantUpdates: Array<Record<string, unknown>> = [];

    const known: Record<string, unknown> = {
        tenant: {
            update: jest.fn((args: { data: Record<string, unknown> }) => {
                tenantUpdates.push(args.data);
                return Promise.resolve({});
            }),
        },
    };

    function delegateFor(prop: string) {
        return {
            deleteMany: jest.fn(() => {
                deleteOrder.push(prop);
                return Promise.resolve({ count: 0 });
            }),
            createMany: jest.fn((args: { data: Record<string, unknown>[] }) => {
                createOrder.push(prop);
                createdData[prop] = args.data;
                return Promise.resolve({ count: args.data.length });
            }),
            update: jest.fn((args: { where: { id: string }; data: unknown }) => {
                updateCalls.push({ model: prop, where: args.where, data: args.data });
                return Promise.resolve({});
            }),
        };
    }

    const client: Record<string, unknown> = { ...known };
    for (const spec of DATABASE_BACKUP_MODELS) {
        client[delegateKey(spec.model)] = delegateFor(delegateKey(spec.model));
    }

    const prisma = {
        ...client,
        $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(client)),
    };

    return { prisma, deleteOrder, createOrder, createdData, updateCalls, tenantUpdates };
}

describe('DatabaseImportService.importTenant', () => {
    it('rejects a file with the wrong format version', async () => {
        const { prisma } = buildPrismaStub();
        const service = new DatabaseImportService(prisma as any);
        const bad = gzipPayload({ formatVersion: 999, tenantId: 't1', tenantFkSnapshot: {}, models: {} });

        await expect(service.importTenant('t1', bad)).rejects.toThrow(BadRequestException);
    });

    it('rejects a file that is not valid gzip', async () => {
        const { prisma } = buildPrismaStub();
        const service = new DatabaseImportService(prisma as any);

        await expect(service.importTenant('t1', Buffer.from('not gzip'))).rejects.toThrow(BadRequestException);
    });

    it('wipes in reverse order, loads in forward order, remapping tenantId and nulling self-refs', async () => {
        const { prisma, deleteOrder, createOrder, createdData, updateCalls, tenantUpdates } = buildPrismaStub();
        const service = new DatabaseImportService(prisma as any);

        const payload = {
            formatVersion: DATABASE_BACKUP_FORMAT_VERSION,
            tenantId: 'source-tenant',
            tenantFkSnapshot: { baseCurrencyId: 'cur-1', defaultSalesSequenceId: 'seq-1' },
            models: {
                [delegateKey('Currency')]: [{ id: 'cur-1', tenantId: 'source-tenant', code: 'USD' }],
                [delegateKey('ChartOfAccount')]: [
                    { id: 'acct-parent', tenantId: 'source-tenant', parentId: null },
                    { id: 'acct-child', tenantId: 'source-tenant', parentId: 'acct-parent' },
                ],
                [delegateKey('RolePermission')]: [{ id: 'rp-1', roleId: 'role-1', permissionId: 'perm-1' }],
            },
        };

        const result = await service.importTenant('current-tenant', gzipPayload(payload));

        expect(deleteOrder).toEqual([...DATABASE_BACKUP_MODELS].reverse().map((spec) => delegateKey(spec.model)));
        expect(createOrder).toEqual([
            delegateKey('Currency'),
            delegateKey('ChartOfAccount'),
            delegateKey('RolePermission'),
        ]);

        // tenantId is remapped to the *current* tenant for a direct-tenantId model.
        expect(createdData[delegateKey('Currency')]).toEqual([
            { id: 'cur-1', tenantId: 'current-tenant', code: 'USD' },
        ]);
        // RolePermission has no tenantId column — it must not gain one.
        expect(createdData[delegateKey('RolePermission')]).toEqual([
            { id: 'rp-1', roleId: 'role-1', permissionId: 'perm-1' },
        ]);
        // Self-referencing FK is nulled on first insert...
        expect(createdData[delegateKey('ChartOfAccount')]).toEqual([
            { id: 'acct-parent', tenantId: 'current-tenant', parentId: null },
            { id: 'acct-child', tenantId: 'current-tenant', parentId: null },
        ]);
        // ...then patched in the second pass.
        expect(updateCalls).toContainEqual({
            model: delegateKey('ChartOfAccount'),
            where: { id: 'acct-child' },
            data: { parentId: 'acct-parent' },
        });

        // Tenant's own cross-references: nulled before wipe, restored after load.
        expect(tenantUpdates[0]).toEqual({ baseCurrencyId: null, defaultSalesSequenceId: null });
        expect(tenantUpdates[1]).toEqual({ baseCurrencyId: 'cur-1', defaultSalesSequenceId: 'seq-1' });

        expect(result.modelsProcessed).toBe(DATABASE_BACKUP_MODELS.length);
        expect(result.countsByModel[delegateKey('Currency')]).toBe(1);
        expect(result.countsByModel[delegateKey('ChartOfAccount')]).toBe(2);
    });
});

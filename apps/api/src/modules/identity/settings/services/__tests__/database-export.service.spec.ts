import { gunzipSync } from 'node:zlib';
import { StreamableFile } from '@nestjs/common';
import { DatabaseExportService, DATABASE_BACKUP_FORMAT_VERSION } from '../database-export.service';
import { DATABASE_BACKUP_MODELS, delegateKey } from '../database-backup-models';

/** A Prisma-shaped stub: `tenant.findUniqueOrThrow` is real; every other
 * delegate is auto-created on first access and records its call. */
function buildPrismaStub() {
    const callOrder: string[] = [];
    const wheresByModel: Record<string, unknown> = {};

    const known: Record<string, unknown> = {
        tenant: {
            findUniqueOrThrow: jest.fn().mockResolvedValue({
                id: 't1',
                slug: 'acme',
                baseCurrencyId: 'cur-1',
                defaultSalesSequenceId: 'seq-1',
            }),
        },
    };

    const prisma = new Proxy(known, {
        get(target, prop: string) {
            if (prop in target) return (target as Record<string, unknown>)[prop];
            return {
                findMany: jest.fn((args: { where: unknown }) => {
                    callOrder.push(prop);
                    wheresByModel[prop] = args.where;
                    return Promise.resolve([{ id: `${prop}-row-1` }]);
                }),
            };
        },
    });

    return { prisma, callOrder, wheresByModel };
}

async function readGzippedJson(file: StreamableFile): Promise<Record<string, unknown>> {
    const chunks: Buffer[] = [];
    for await (const chunk of file.getStream()) chunks.push(chunk as Buffer);
    return JSON.parse(gunzipSync(Buffer.concat(chunks)).toString('utf-8'));
}

describe('DatabaseExportService.exportTenant', () => {
    it('reads every cataloged model in declared order, scoped to the tenant', async () => {
        const { prisma, callOrder, wheresByModel } = buildPrismaStub();
        const service = new DatabaseExportService(prisma as any);

        const file = await service.exportTenant('t1');

        expect(file).toBeInstanceOf(StreamableFile);
        expect(callOrder).toEqual(DATABASE_BACKUP_MODELS.map((spec) => delegateKey(spec.model)));
        expect(wheresByModel[delegateKey('Currency')]).toEqual({ tenantId: 't1' });
        expect(wheresByModel[delegateKey('UserRole')]).toEqual({ user: { tenantId: 't1' } });
        expect(wheresByModel[delegateKey('RolePermission')]).toEqual({ role: { tenantId: 't1' } });
    });

    it('embeds formatVersion, tenantId, and the tenant FK snapshot', async () => {
        const { prisma } = buildPrismaStub();
        const service = new DatabaseExportService(prisma as any);

        const file = await service.exportTenant('t1');
        const payload = await readGzippedJson(file);

        expect(payload.formatVersion).toBe(DATABASE_BACKUP_FORMAT_VERSION);
        expect(payload.tenantId).toBe('t1');
        expect(payload.tenantFkSnapshot).toEqual({ baseCurrencyId: 'cur-1', defaultSalesSequenceId: 'seq-1' });
        expect(Object.keys(payload.models as object)).toHaveLength(DATABASE_BACKUP_MODELS.length);
        expect((payload.models as Record<string, unknown[]>)[delegateKey('Currency')]).toEqual([
            { id: 'currency-row-1' },
        ]);
    });
});

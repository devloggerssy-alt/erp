import { Injectable, StreamableFile } from '@nestjs/common';
import { gzipSync } from 'node:zlib';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { DATABASE_BACKUP_MODELS, delegateKey } from './database-backup-models';

export const DATABASE_BACKUP_FORMAT_VERSION = 1;

/** Minimal shape this service needs from any Prisma delegate. */
type ReadableDelegate = {
    findMany: (args: { where: Record<string, unknown> }) => Promise<Record<string, unknown>[]>;
};

/**
 * Reads every model in {@link DATABASE_BACKUP_MODELS} for one tenant and
 * assembles a gzip-compressed JSON backup. See the design spec's "Export"
 * section for the payload shape and the tenant-FK-snapshot rationale.
 */
@Injectable()
export class DatabaseExportService {
    constructor(private readonly prisma: PrismaService) {}

    async exportTenant(tenantId: string): Promise<StreamableFile> {
        const models: Record<string, unknown[]> = {};

        // Iterating every cataloged Prisma delegate generically requires one
        // narrow escape hatch from static typing — this cast is scoped to this
        // single loop, not a workaround for a stale generated type.
        const client = this.prisma as unknown as Record<string, ReadableDelegate>;

        for (const spec of DATABASE_BACKUP_MODELS) {
            const key = delegateKey(spec.model);
            const delegate = client[key];
            if (!delegate) throw new Error(`No Prisma delegate for model "${spec.model}"`);
            const where = spec.scopeViaRelation ? { [spec.scopeViaRelation]: { tenantId } } : { tenantId };
            models[key] = await delegate.findMany({ where });
        }

        const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });

        const payload = {
            formatVersion: DATABASE_BACKUP_FORMAT_VERSION,
            exportedAt: new Date().toISOString(),
            tenantId,
            tenantFkSnapshot: {
                baseCurrencyId: tenant.baseCurrencyId,
                defaultSalesSequenceId: tenant.defaultSalesSequenceId,
            },
            models,
        };

        const gzipped = gzipSync(Buffer.from(JSON.stringify(payload), 'utf-8'));
        const filename = `backup-${tenant.slug}-${new Date().toISOString().replace(/[:.]/g, '-')}.json.gz`;

        return new StreamableFile(gzipped, {
            type: 'application/gzip',
            disposition: `attachment; filename="${filename}"`,
        });
    }
}

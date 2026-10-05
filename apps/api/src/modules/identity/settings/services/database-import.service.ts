import { BadRequestException, Injectable } from '@nestjs/common';
import { gunzipSync } from 'node:zlib';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { DATABASE_BACKUP_MODELS, delegateKey, type DatabaseBackupModelSpec } from './database-backup-models';
import { DATABASE_BACKUP_FORMAT_VERSION } from './database-export.service';
import type { DatabaseBackupResultDto } from '../dto/database-backup.dto';

type WritableDelegate = {
    deleteMany: (args: { where: Record<string, unknown> }) => Promise<{ count: number }>;
    createMany: (args: { data: Record<string, unknown>[] }) => Promise<{ count: number }>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
};

interface DatabaseBackupPayload {
    formatVersion: number;
    tenantId: string;
    tenantFkSnapshot: { baseCurrencyId: string | null; defaultSalesSequenceId: string | null };
    models: Record<string, Record<string, unknown>[]>;
}

/**
 * Restores a tenant from a backup produced by {@link DatabaseExportService}.
 * Always wipes the target tenant's data first, then loads the backup — see
 * the design spec's "Import" and "Special handling details" sections for
 * why each step exists (tenant FK snapshot, self-referencing two-pass,
 * tenantId remap, restore-does-not-re-post).
 */
@Injectable()
export class DatabaseImportService {
    constructor(private readonly prisma: PrismaService) {}

    async importTenant(tenantId: string, fileBuffer: Buffer): Promise<DatabaseBackupResultDto> {
        const payload = this.parsePayload(fileBuffer);
        const countsByModel: Record<string, number> = {};

        await this.prisma.$transaction(
            async (tx) => {
                // Same narrow, isolated escape hatch as DatabaseExportService —
                // generic dispatch across every cataloged Prisma delegate.
                const client = tx as unknown as Record<string, WritableDelegate> & {
                    tenant: { update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown> };
                };

                // 1. Null the Tenant row's own cross-references before wiping
                //    the Currency/DocumentSequence rows they point to.
                await client.tenant.update({
                    where: { id: tenantId },
                    data: { baseCurrencyId: null, defaultSalesSequenceId: null },
                });

                // 2. Wipe, reverse dependency order (children before parents).
                for (const spec of [...DATABASE_BACKUP_MODELS].reverse()) {
                    const delegate = this.requireDelegate(client, spec);
                    const where = this.scopeWhere(spec, tenantId);
                    await delegate.deleteMany({ where });
                }

                // 3. Load, forward dependency order. Remap tenantId (skipped for
                //    relation-scoped models, which have no tenantId column) and
                //    null self-referencing FKs for the second pass.
                for (const spec of DATABASE_BACKUP_MODELS) {
                    const key = delegateKey(spec.model);
                    const delegate = this.requireDelegate(client, spec);
                    const rows = payload.models[key] ?? [];

                    const remapped = rows.map((row) => {
                        const next: Record<string, unknown> = spec.scopeViaRelation
                            ? { ...row }
                            : { ...row, tenantId };
                        if (spec.selfReferenceField) next[spec.selfReferenceField] = null;
                        return next;
                    });

                    if (remapped.length > 0) {
                        await delegate.createMany({ data: remapped });
                    }
                    countsByModel[key] = remapped.length;
                }

                // 4. Second pass: patch self-referencing FKs now every row exists.
                for (const spec of DATABASE_BACKUP_MODELS) {
                    if (!spec.selfReferenceField) continue;
                    const key = delegateKey(spec.model);
                    const delegate = this.requireDelegate(client, spec);
                    const rows = payload.models[key] ?? [];
                    const selfReferenceField = spec.selfReferenceField;

                    for (const row of rows) {
                        const value = row[selfReferenceField];
                        if (value == null) continue;
                        await delegate.update({
                            where: { id: row.id as string },
                            data: { [selfReferenceField]: value },
                        });
                    }
                }

                // 5. Restore the Tenant row's own cross-references.
                await client.tenant.update({
                    where: { id: tenantId },
                    data: {
                        baseCurrencyId: payload.tenantFkSnapshot.baseCurrencyId,
                        defaultSalesSequenceId: payload.tenantFkSnapshot.defaultSalesSequenceId,
                    },
                });
            },
            { timeout: 120_000, maxWait: 10_000 },
        );

        return { modelsProcessed: DATABASE_BACKUP_MODELS.length, countsByModel };
    }

    private requireDelegate(
        client: Record<string, WritableDelegate>,
        spec: DatabaseBackupModelSpec,
    ): WritableDelegate {
        const delegate = client[delegateKey(spec.model)];
        if (!delegate) throw new Error(`No Prisma delegate for model "${spec.model}"`);
        return delegate;
    }

    private scopeWhere(spec: DatabaseBackupModelSpec, tenantId: string): Record<string, unknown> {
        return spec.scopeViaRelation ? { [spec.scopeViaRelation]: { tenantId } } : { tenantId };
    }

    private parsePayload(fileBuffer: Buffer): DatabaseBackupPayload {
        let json: string;
        try {
            json = gunzipSync(fileBuffer).toString('utf-8');
        } catch {
            throw new BadRequestException('File is not a valid gzip archive');
        }

        let payload: DatabaseBackupPayload;
        try {
            payload = JSON.parse(json) as DatabaseBackupPayload;
        } catch {
            throw new BadRequestException('File does not contain valid JSON');
        }

        if (payload.formatVersion !== DATABASE_BACKUP_FORMAT_VERSION) {
            throw new BadRequestException(
                `Unsupported backup format version ${payload.formatVersion}; expected ${DATABASE_BACKUP_FORMAT_VERSION}`,
            );
        }

        return payload;
    }
}

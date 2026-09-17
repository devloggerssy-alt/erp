import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { Prisma } from '@devloggers/db-prisma';
import { RequestContext, type AuditSource } from '../../common/request-context/request-context';
import { redact } from './redact';

export const SYSTEM_USER_ID = 'system';

export interface AuditEntry {
    tenantId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValues?: unknown;
    newValues?: unknown;
    /** Defaults to the request context's source. */
    source?: AuditSource;
    metadata?: Record<string, unknown>;
}

/** Structural: any Prisma transaction client satisfies this. */
export interface AuditTx {
    auditLog: { create(args: { data: Prisma.AuditLogUncheckedCreateInput }): Promise<unknown> };
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined || value === null) return undefined;
    return redact(value) as Prisma.InputJsonValue;
}

/**
 * The only writer of AuditLog. Two modes, by design (plan deviation 2):
 * - record():     best-effort, never throws — HTTP interceptor, period status (7.1.3)
 * - recordInTx(): atomic with the caller's transaction — GL events (7.2.1/7.2.2)
 */
@Injectable()
export class AuditWriter {
    private readonly logger = new Logger(AuditWriter.name);

    constructor(private readonly prisma: PrismaService) {}

    async record(entry: AuditEntry): Promise<void> {
        try {
            await this.prisma.auditLog.create({ data: this.toData(entry) });
        } catch (err) {
            this.logger.error({
                msg: 'audit write failed',
                action: entry.action,
                entityType: entry.entityType,
                entityId: entry.entityId,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    async recordInTx(tx: AuditTx, entry: AuditEntry): Promise<void> {
        await tx.auditLog.create({ data: this.toData(entry) });
    }

    private toData(entry: AuditEntry): Prisma.AuditLogUncheckedCreateInput {
        const ctx = RequestContext.get();
        const metadata: Record<string, unknown> = {
            ...ctx?.metadata,
            ...(ctx && entry.source && entry.source !== ctx.source ? { contextSource: ctx.source } : {}),
            ...entry.metadata,
        };
        return {
            tenantId: entry.tenantId,
            userId: entry.userId,
            action: entry.action,
            entityType: entry.entityType,
            entityId: entry.entityId,
            oldValues: toJson(entry.oldValues),
            newValues: toJson(entry.newValues),
            ipAddress: ctx?.ipAddress ?? null,
            source: entry.source ?? ctx?.source ?? 'SYSTEM',
            correlationId: ctx?.correlationId ?? null,
            metadata: Object.keys(metadata).length > 0 ? toJson(metadata) : undefined,
        };
    }
}

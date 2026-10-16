import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { AuditLog, Prisma } from '@devloggers/db-prisma';

/** Structural: any Prisma transaction client satisfies this. */
export interface AuditTx {
    auditLog: { create(args: { data: Prisma.AuditLogUncheckedCreateInput }): Promise<unknown> };
}

export interface AuditLogFilters {
    entityType?: string;
    entityId?: string;
}

@Injectable()
export class AuditLogRepository {
    constructor(private readonly prisma: PrismaService) {}

    /** Inserts on the caller's transaction when given, so the audit row commits or rolls back with it. */
    async create(data: Prisma.AuditLogUncheckedCreateInput, tx: AuditTx = this.prisma): Promise<void> {
        await tx.auditLog.create({ data });
    }

    async findPage(
        tenantId: string,
        filters: AuditLogFilters,
        page: number,
        limit: number,
    ): Promise<{ rows: AuditLog[]; total: number }> {
        const where = this.where(tenantId, filters);
        const [rows, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.auditLog.count({ where }),
        ]);
        return { rows, total };
    }

    private where(tenantId: string, filters: AuditLogFilters): Prisma.AuditLogWhereInput {
        return {
            tenantId,
            ...(filters.entityType ? { entityType: filters.entityType } : {}),
            ...(filters.entityId ? { entityId: filters.entityId } : {}),
        };
    }
}

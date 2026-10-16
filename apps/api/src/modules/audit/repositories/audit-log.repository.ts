import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { AuditLog, Prisma } from '@devloggers/db-prisma';

export interface AuditLogFilters {
    entityType?: string;
    entityId?: string;
}

@Injectable()
export class AuditLogRepository {
    constructor(private readonly prisma: PrismaService) {}

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

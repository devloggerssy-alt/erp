import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';

@Injectable()
export class AuditService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(tenantId: string, filters: { entityType?: string; entityId?: string; page?: number; limit?: number }) {
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const where: any = { tenantId };
        if (filters.entityType) where.entityType = filters.entityType;
        if (filters.entityId) where.entityId = filters.entityId;

        const [data, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.auditLog.count({ where }),
        ]);
        return { data, total, page, limit };
    }

    async log(tenantId: string, userId: string, action: string, entityType: string, entityId: string, oldValues?: any, newValues?: any) {
        return this.prisma.auditLog.create({
            data: { tenantId, userId, action, entityType, entityId, oldValues, newValues },
        });
    }
}

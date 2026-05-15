import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';

@Injectable()
export class InventoryRepository {
    constructor(private readonly prisma: PrismaService) {}

    async getBalances(tenantId: string, filters: { warehouseId?: string; itemId?: string }) {
        const where: any = { tenantId };
        if (filters.warehouseId) where.warehouseId = filters.warehouseId;
        if (filters.itemId) where.itemId = filters.itemId;

        return this.prisma.stockBalance.findMany({
            where,
            include: {
                warehouse: { select: { name: true, code: true } },
                item: { select: { name: true, code: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }
}

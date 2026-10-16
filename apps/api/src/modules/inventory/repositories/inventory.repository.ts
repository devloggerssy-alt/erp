import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { Prisma } from '@devloggers/db-prisma';

const BALANCE_INCLUDE = {
    warehouse: { select: { name: true, code: true } },
    item: { select: { name: true, code: true } },
} satisfies Prisma.StockBalanceInclude;

export type StockBalanceWithRelations = Prisma.StockBalanceGetPayload<{ include: typeof BALANCE_INCLUDE }>;

@Injectable()
export class InventoryRepository {
    constructor(private readonly prisma: PrismaService) {}

    async getBalances(tenantId: string, filters: { warehouseId?: string; itemId?: string }): Promise<StockBalanceWithRelations[]> {
        const where: any = { tenantId };
        if (filters.warehouseId) where.warehouseId = filters.warehouseId;
        if (filters.itemId) where.itemId = filters.itemId;

        return this.prisma.stockBalance.findMany({
            where,
            include: BALANCE_INCLUDE,
            orderBy: { updatedAt: 'desc' },
        });
    }
}

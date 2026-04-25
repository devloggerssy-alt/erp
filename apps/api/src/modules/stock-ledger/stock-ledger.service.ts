import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';

@Injectable()
export class StockLedgerService {
    constructor(private readonly prisma: PrismaService) {}

    async findMovements(tenantId: string, filters: { 
        warehouseId?: string; 
        itemId?: string;
        movementType?: string;
        page?: number;
        limit?: number;
    }) {
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const skip = (page - 1) * limit;

        const where: any = { tenantId };
        if (filters.warehouseId) where.warehouseId = filters.warehouseId;
        if (filters.itemId) where.itemId = filters.itemId;
        if (filters.movementType) where.movementType = filters.movementType;

        const [data, total] = await Promise.all([
            this.prisma.stockMovement.findMany({
                where,
                include: {
                    item: { select: { name: true, code: true } },
                    warehouse: { select: { name: true, code: true } },
                    fiscalPeriod: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.stockMovement.count({ where }),
        ]);

        return { data, total, page, limit };
    }
}

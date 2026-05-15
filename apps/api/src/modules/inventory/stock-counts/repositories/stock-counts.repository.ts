import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';

@Injectable()
export class StockCountsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(tenantId: string, page: number, limit: number) {
        const [data, total] = await Promise.all([
            this.prisma.stockCount.findMany({
                where: { tenantId },
                include: {
                    warehouse: { select: { name: true, code: true } },
                    _count: { select: { lines: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.stockCount.count({ where: { tenantId } }),
        ]);
        return { data, total, page, limit };
    }

    async findById(tenantId: string, id: string) {
        return this.prisma.stockCount.findFirst({
            where: { id, tenantId },
            include: {
                warehouse: true,
                lines: { include: { item: { select: { name: true, code: true } } } },
            },
        });
    }
}

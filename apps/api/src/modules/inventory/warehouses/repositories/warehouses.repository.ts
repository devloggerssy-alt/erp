import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { Prisma, Warehouse } from '@devloggers/db-prisma';

const WAREHOUSE_DETAIL_INCLUDE = {
    branches: {
        include: { branch: { select: { id: true, code: true, name: true } } },
        orderBy: { createdAt: 'asc' },
    },
} satisfies Prisma.WarehouseInclude;

export type WarehouseWithBranches = Prisma.WarehouseGetPayload<{
    include: typeof WAREHOUSE_DETAIL_INCLUDE;
}>;

@Injectable()
export class WarehousesRepository extends CrudRepository<Warehouse, Prisma.WarehouseDelegate> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.warehouse);
    }

    async isCodeTaken(tenantId: string, code: string, excludeId?: string): Promise<boolean> {
        const count = await this.prisma.warehouse.count({
            where: {
                tenantId,
                code,
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
        });
        return count > 0;
    }

    async findByIdWithBranches(tenantId: string, id: string): Promise<WarehouseWithBranches | null> {
        return this.prisma.warehouse.findFirst({
            where: { id, tenantId },
            include: WAREHOUSE_DETAIL_INCLUDE,
        });
    }
}

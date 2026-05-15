import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { Warehouse } from '@devloggers/db-prisma';

@Injectable()
export class WarehousesRepository extends CrudRepository<Warehouse> {
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
}

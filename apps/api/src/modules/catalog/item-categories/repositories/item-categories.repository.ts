import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { ItemCategory } from '@devloggers/db-prisma';

@Injectable()
export class ItemCategoriesRepository extends CrudRepository<ItemCategory> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.itemCategory);
    }

    async isNameTaken(tenantId: string, name: string, excludeId?: string): Promise<boolean> {
        const count = await this.prisma.itemCategory.count({
            where: {
                tenantId,
                name,
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
        });
        return count > 0;
    }
}

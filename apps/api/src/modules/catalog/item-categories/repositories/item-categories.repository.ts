import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository, FindManyOptions, FindManyResult } from '@devloggers/backend-core';
import type { ItemCategory } from '@devloggers/db-prisma';

export type ItemCategoryWithParent = ItemCategory & {
    parent: ItemCategory | null
}

@Injectable()
export class ItemCategoriesRepository extends CrudRepository<ItemCategoryWithParent> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.itemCategory);
    }

    /** List always includes parent category for display. */
    override async findMany(tenantId: string, options: FindManyOptions = {}): Promise<FindManyResult<ItemCategoryWithParent>> {
        return super.findMany(tenantId, {
            ...options,
            include: { parent: { select: { id: true, name: true } } },
        });
    }

    /** Detail view includes parent category. */
    override   findById(tenantId: string, id: string): Promise<ItemCategoryWithParent | null> {
        return this.prisma.itemCategory.findFirst({
            where: { id, tenantId },
            include: { parent: { select: { id: true, name: true } } },
        }) as any;
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

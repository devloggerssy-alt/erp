import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository, FindManyOptions, FindManyResult } from '@devloggers/backend-core';
import type { Prisma } from '@devloggers/db-prisma';

const ITEM_CATEGORY_INCLUDE = {
    parent: { select: { id: true, name: true } },
} satisfies Prisma.ItemCategoryInclude;

export type ItemCategoryWithParent = Prisma.ItemCategoryGetPayload<{ include: typeof ITEM_CATEGORY_INCLUDE }>;

@Injectable()
export class ItemCategoriesRepository extends CrudRepository<ItemCategoryWithParent, Prisma.ItemCategoryDelegate> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.itemCategory);
    }

    /** List always includes parent category for display. */
    override async findMany(tenantId: string, options: FindManyOptions<Prisma.ItemCategoryDelegate> = {}): Promise<FindManyResult<ItemCategoryWithParent>> {
        return super.findMany(tenantId, {
            ...options,
            include: ITEM_CATEGORY_INCLUDE,
        });
    }

    /** Detail view includes parent category. */
    override findById(tenantId: string, id: string): Promise<ItemCategoryWithParent | null> {
        return this.prisma.itemCategory.findFirst({
            where: { id, tenantId },
            include: ITEM_CATEGORY_INCLUDE,
        });
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

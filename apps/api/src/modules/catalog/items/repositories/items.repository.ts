import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { Item } from '@devloggers/db-prisma';

type CategorySummary = { id: string; name: string };
type BaseUnitSummary = { id: string; name: string; abbreviation: string };
type BrandSummary = { id: string; name: string; imageUrl: string | null };

export type ItemWithRelations = Item & {
    category: CategorySummary;
    baseUnit: BaseUnitSummary;
    brand: BrandSummary | null;
};

const ITEM_SHOW_INCLUDE = {
    category: { select: { id: true, name: true } },
    baseUnit: { select: { id: true, name: true, abbreviation: true } },
    brand: { select: { id: true, name: true, imageUrl: true } },
} as const;

@Injectable()
export class ItemsRepository extends CrudRepository<Item> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.item);
    }

    async findByIdWithRelations(tenantId: string, id: string): Promise<ItemWithRelations | null> {
        return this.prisma.item.findFirst({
            where: { id, tenantId },
            include: ITEM_SHOW_INCLUDE,
        }) as unknown as ItemWithRelations | null;
    }

    async isCodeTaken(tenantId: string, code: string, excludeId?: string): Promise<boolean> {
        const count = await this.prisma.item.count({
            where: {
                tenantId,
                code,
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
        });
        return count > 0;
    }
}

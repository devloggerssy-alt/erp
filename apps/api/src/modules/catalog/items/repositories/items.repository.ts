import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository, FindManyOptions } from '@devloggers/backend-core';
import type { Item } from '@devloggers/db-prisma';

type CategorySummary = { id: string; name: string };
type BaseUnitSummary = { id: string; name: string; abbreviation: string };
type BrandSummary = { id: string; name: string; imageUrl: string | null };

export type ItemWithRelations = Item & {
    category: CategorySummary;
    baseUnit: BaseUnitSummary;
    brand: BrandSummary | null;
};

export type ItemWithListRelations = Item & {
    category: CategorySummary;
    baseUnit: BaseUnitSummary;
};

const ITEM_SHOW_INCLUDE = {
    category: { select: { id: true, name: true } },
    baseUnit: { select: { id: true, name: true, abbreviation: true } },
    brand: { select: { id: true, name: true, imageUrl: true } },
} as const;

const ITEM_LIST_INCLUDE = {
    category: { select: { id: true, name: true } },
    baseUnit: { select: { id: true, name: true, abbreviation: true } },
} as const;

@Injectable()
export class ItemsRepository extends CrudRepository<Item> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.item);
    }

    async findManyWithRelations(
        tenantId: string,
        options: FindManyOptions = {},
    ): Promise<{ data: ItemWithListRelations[]; total: number }> {
        const { skip = 0, take = 10, where = {}, orderBy } = options;
        const scopedWhere = { ...where, tenantId };
        const [data, total] = await Promise.all([
            this.prisma.item.findMany({
                skip,
                take,
                where: scopedWhere,
                orderBy: orderBy ?? { createdAt: 'desc' },
                include: ITEM_LIST_INCLUDE,
            }),
            this.prisma.item.count({ where: scopedWhere }),
        ]);
        return { data: data as unknown as ItemWithListRelations[], total };
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

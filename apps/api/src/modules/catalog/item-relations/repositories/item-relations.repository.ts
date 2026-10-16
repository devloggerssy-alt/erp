import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository, type FindManyOptions, type FindManyResult } from '@devloggers/backend-core';
import type { Prisma } from '@devloggers/db-prisma';
import { RelationType } from '@devloggers/db-prisma';

const RELATED_ITEM_INCLUDE = {
  relatedItem: { select: { id: true, name: true, code: true } },
} satisfies Prisma.ItemRelationInclude;

export type ItemRelationWithRelatedItem = Prisma.ItemRelationGetPayload<{ include: typeof RELATED_ITEM_INCLUDE }>;

@Injectable()
export class ItemRelationsRepository extends CrudRepository<ItemRelationWithRelatedItem, Prisma.ItemRelationDelegate> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.itemRelation);
  }

  override async findMany(
    tenantId: string,
    options: FindManyOptions<Prisma.ItemRelationDelegate> = {},
  ): Promise<FindManyResult<ItemRelationWithRelatedItem>> {
    return super.findMany(tenantId, { ...options, include: RELATED_ITEM_INCLUDE });
  }

  override async findById(tenantId: string, id: string): Promise<ItemRelationWithRelatedItem | null> {
    return this.prisma.itemRelation.findFirst({
      where: { id, tenantId },
      include: RELATED_ITEM_INCLUDE,
    });
  }

  // The base create/update return the bare row; the presenter needs the related item.
  override async create(data: Record<string, any>): Promise<ItemRelationWithRelatedItem> {
    return this.prisma.itemRelation.create({ data: data as any, include: RELATED_ITEM_INCLUDE });
  }

  override async update(id: string, data: Record<string, any>): Promise<ItemRelationWithRelatedItem> {
    return this.prisma.itemRelation.update({
      where: { id },
      data: data as any,
      include: RELATED_ITEM_INCLUDE,
    });
  }

  async existsRelation(
    tenantId: string,
    itemId: string,
    relatedItemId: string,
    relationType: string,
    excludeId?: string,
  ): Promise<boolean> {
    const count = await this.prisma.itemRelation.count({
      where: {
        tenantId,
        itemId,
        relatedItemId,
        relationType: relationType as RelationType,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    return count > 0;
  }
}

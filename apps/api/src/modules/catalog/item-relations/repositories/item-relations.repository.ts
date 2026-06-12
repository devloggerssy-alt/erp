import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository, type FindManyOptions, type FindManyResult } from '@devloggers/backend-core';
import type { ItemRelation } from '@devloggers/db-prisma';
import { RelationType } from '@devloggers/db-prisma';

const RELATED_ITEM_INCLUDE = {
  relatedItem: { select: { id: true, name: true, code: true } },
} as const;

@Injectable()
export class ItemRelationsRepository extends CrudRepository<ItemRelation> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.itemRelation);
  }

  override async findMany(tenantId: string, options: FindManyOptions = {}): Promise<FindManyResult<ItemRelation>> {
    return super.findMany(tenantId, { ...options, include: RELATED_ITEM_INCLUDE });
  }

  override async findById(tenantId: string, id: string): Promise<ItemRelation | null> {
    return this.prisma.itemRelation.findFirst({
      where: { id, tenantId },
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

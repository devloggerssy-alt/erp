import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { ItemRelation } from '@devloggers/db-prisma';
import { RelationType } from '@devloggers/db-prisma';

@Injectable()
export class ItemRelationsRepository extends CrudRepository<ItemRelation> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.itemRelation);
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

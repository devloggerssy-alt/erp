import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import {
  CrudRepository,
  type FindManyOptions,
  type FindManyResult,
} from '@devloggers/backend-core';
import type { ItemCatalogEntity } from '@devloggers/db-prisma';

type CatalogEntitySummary = {
  id: string;
  name: string;
  kind: string;
  parentId: string | null;
};

export type ItemCatalogEntityWithRelations = ItemCatalogEntity & {
  catalogEntity: CatalogEntitySummary;
};

const CATALOG_ENTITY_INCLUDE = {
  catalogEntity: { select: { id: true, name: true, kind: true, parentId: true } },
} as const;

@Injectable()
export class ItemCatalogEntitiesRepository extends CrudRepository<ItemCatalogEntityWithRelations> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.itemCatalogEntity);
  }

  // Override findMany to include the catalog entity summary.
  override async findMany(
    tenantId: string,
    options: FindManyOptions = {},
  ): Promise<FindManyResult<ItemCatalogEntityWithRelations>> {
    return super.findMany(tenantId, { ...options, include: CATALOG_ENTITY_INCLUDE });
  }

  // Override findById to include the catalog entity summary.
  override async findById(
    tenantId: string,
    id: string,
  ): Promise<ItemCatalogEntityWithRelations | null> {
    return this.prisma.itemCatalogEntity.findFirst({
      where: { id, tenantId },
      include: CATALOG_ENTITY_INCLUDE,
    });
  }

  async existsLink(
    tenantId: string,
    itemId: string,
    catalogEntityId: string,
  ): Promise<boolean> {
    const count = await this.prisma.itemCatalogEntity.count({
      where: { tenantId, itemId, catalogEntityId },
    });
    return count > 0;
  }
}

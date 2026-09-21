import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import {
  CrudRepository,
  type FindManyOptions,
  type FindManyResult,
} from '@devloggers/backend-core';
import type { ItemCatalogEntity, Prisma } from '@devloggers/db-prisma';

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
export class ItemCatalogEntitiesRepository extends CrudRepository<ItemCatalogEntityWithRelations, Prisma.ItemCatalogEntityDelegate> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.itemCatalogEntity);
  }

  // Override findMany to include the catalog entity summary.
  override async findMany(
    tenantId: string,
    options: FindManyOptions<Prisma.ItemCatalogEntityDelegate> = {},
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

  // Override create so the returned record includes the catalog entity relation.
  override async create(data: Record<string, any>): Promise<ItemCatalogEntityWithRelations> {
    const created = await this.prisma.itemCatalogEntity.create({
      data: data as any,
      include: CATALOG_ENTITY_INCLUDE,
    });
    return created as unknown as ItemCatalogEntityWithRelations;
  }

  // Override update for the same reason (keeps toResponse safe on edit paths).
  override async update(id: string, data: Record<string, any>): Promise<ItemCatalogEntityWithRelations> {
    const updated = await this.prisma.itemCatalogEntity.update({
      where: { id },
      data: data as any,
      include: CATALOG_ENTITY_INCLUDE,
    });
    return updated as unknown as ItemCatalogEntityWithRelations;
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

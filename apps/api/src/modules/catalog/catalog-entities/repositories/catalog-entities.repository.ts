import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import {
  CrudRepository,
  type FindManyOptions,
  type FindManyResult,
} from '@devloggers/backend-core';
import type { CatalogEntity } from '@devloggers/db-prisma';

type CatalogEntityParentSummary = {
  id: string;
  name: string;
  kind: string;
};

export type CatalogEntityWithParent = CatalogEntity & {
  parent: CatalogEntityParentSummary | null;
};

const PARENT_INCLUDE = {
  parent: { select: { id: true, name: true, kind: true } },
} as const;

@Injectable()
export class CatalogEntitiesRepository extends CrudRepository<CatalogEntityWithParent> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.catalogEntity);
  }

  // Override findMany to include the parent summary.
  override async findMany(
    tenantId: string,
    options: FindManyOptions = {},
  ): Promise<FindManyResult<CatalogEntityWithParent>> {
    return super.findMany(tenantId, { ...options, include: PARENT_INCLUDE });
  }

  // Override findById to include the parent summary.
  override async findById(tenantId: string, id: string): Promise<CatalogEntityWithParent | null> {
    return this.prisma.catalogEntity.findFirst({
      where: { id, tenantId },
      include: PARENT_INCLUDE,
    });
  }

  async isNameTakenUnderParent(
    tenantId: string,
    name: string,
    kind: string,
    parentId: string | null | undefined,
    excludeId?: string,
  ): Promise<boolean> {
    const count = await this.prisma.catalogEntity.count({
      where: {
        tenantId,
        name,
        kind,
        parentId: parentId ?? null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    return count > 0;
  }

  async hasChildren(tenantId: string, id: string): Promise<boolean> {
    const count = await this.prisma.catalogEntity.count({
      where: { tenantId, parentId: id },
    });
    return count > 0;
  }

  async parentExists(tenantId: string, parentId: string): Promise<boolean> {
    const count = await this.prisma.catalogEntity.count({
      where: { tenantId, id: parentId },
    });
    return count > 0;
  }
}

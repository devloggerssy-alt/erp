import type { Prisma } from '@devloggers/db-prisma';
import { assertType, type Equal } from '@/common/types/type-assert';
import { ItemCatalogEntityPresenter } from './item-catalog-entity.presenter';

type Entity = Parameters<ItemCatalogEntityPresenter['toResponse']>[0];
type LoadedWithCatalogEntity = Prisma.ItemCatalogEntityGetPayload<{
  include: { catalogEntity: { select: { id: true; name: true; kind: true; parentId: true } } };
}>;

assertType<Equal<Entity, LoadedWithCatalogEntity>>();

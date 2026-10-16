import type { Prisma } from '@devloggers/db-prisma';
import { assertType, type Equal } from '@/common/types/type-assert';
import { CatalogEntityPresenter } from './catalog-entity.presenter';

type Entity = Parameters<CatalogEntityPresenter['toResponse']>[0];
type LoadedWithParent = Prisma.CatalogEntityGetPayload<{
  include: { parent: { select: { id: true; name: true; kind: true } } };
}>;

assertType<Equal<Entity, LoadedWithParent>>();

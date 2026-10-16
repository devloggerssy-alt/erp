import type { Prisma } from '@devloggers/db-prisma';
import { assertType, type Equal } from '@/common/types/type-assert';
import { ItemRelationPresenter } from './item-relation.presenter';

type Entity = Parameters<ItemRelationPresenter['toResponse']>[0];
type LoadedWithRelatedItem = Prisma.ItemRelationGetPayload<{
  include: { relatedItem: { select: { id: true; name: true; code: true } } };
}>;

assertType<Equal<Entity, LoadedWithRelatedItem>>();

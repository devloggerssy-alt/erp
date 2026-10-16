import type { Prisma } from '@devloggers/db-prisma';
import { assertType, type Equal } from '@/common/types/type-assert';
import { ItemCategoryPresenter } from './item-category.presenter';

type Entity = Parameters<ItemCategoryPresenter['toResponse']>[0];
type LoadedWithParent = Prisma.ItemCategoryGetPayload<{
  include: { parent: { select: { id: true; name: true } } };
}>;

assertType<Equal<Entity, LoadedWithParent>>();

import type { Prisma } from '@devloggers/db-prisma';
import { assertType, type Equal } from '@/common/types/type-assert';
import { InventoryPresenter } from './inventory.presenter';

type Entity = Parameters<InventoryPresenter['toResponse']>[0];
type LoadedBalance = Prisma.StockBalanceGetPayload<{
  include: {
    warehouse: { select: { name: true; code: true } };
    item: { select: { name: true; code: true } };
  };
}>;

assertType<Equal<Entity, LoadedBalance>>();

import type { Prisma } from '@devloggers/db-prisma';
import { assertType, type Equal } from '@/common/types/type-assert';
import { StockMovementPresenter } from './stock-movement.presenter';

type Entity = Parameters<StockMovementPresenter['toResponse']>[0];
type LoadedMovement = Prisma.StockMovementGetPayload<{
  include: {
    item: { select: { name: true; code: true } };
    warehouse: { select: { name: true; code: true } };
    fiscalPeriod: { select: { name: true } };
  };
}>;

assertType<Equal<Entity, LoadedMovement>>();

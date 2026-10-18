import type { Prisma } from '@devloggers/db-prisma';
import { assertType, type Equal } from '@/common/types/type-assert';
import { StockCountPresenter } from './stock-count.presenter';

// The three payloads the presenter is handed: the list load, the detail load,
// and the partial create/post load.
type StockCountListItem = Prisma.StockCountGetPayload<{
  include: {
    warehouse: { select: { name: true; code: true } };
    _count: { select: { lines: true } };
  };
}>;
type StockCountDetail = Prisma.StockCountGetPayload<{
  include: {
    warehouse: true;
    lines: { include: { item: { select: { name: true; code: true } } } };
    fiscalPeriod: { select: { status: true } };
  };
}>;
type StockCountWithLines = Prisma.StockCountGetPayload<{ include: { lines: true; warehouse: true } }>;

type Entity = StockCountListItem | StockCountDetail | StockCountWithLines;

assertType<Equal<Parameters<StockCountPresenter['toListResponse']>[0], Entity>>();
assertType<Equal<Parameters<StockCountPresenter['toDetailResponse']>[0], StockCountDetail | StockCountWithLines>>();
assertType<Equal<Parameters<StockCountPresenter['toListResponseList']>[0], Entity[]>>();

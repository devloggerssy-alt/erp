import type { OpeningBalanceSession, Prisma } from '@devloggers/db-prisma';
import { assertType, type Equal } from '@/common/types/type-assert';
import { OpeningBalanceSessionsPresenter } from './opening-balance-sessions.presenter';

type Entity = Parameters<OpeningBalanceSessionsPresenter['toResponse']>[0];
type LoadedWithLines = Prisma.OpeningBalanceSessionGetPayload<{
  include: { lines: { orderBy: { createdAt: 'asc' } } };
}>;

assertType<Equal<Entity, OpeningBalanceSession | LoadedWithLines>>();

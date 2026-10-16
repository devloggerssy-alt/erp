import type { ChartOfAccount, Prisma } from '@devloggers/db-prisma';
import { assertType, type Equal } from '@/common/types/type-assert';
import { AccountPresenter } from './account.presenter';

type Entity = Parameters<AccountPresenter['toResponse']>[0];
type LoadedForList = Prisma.ChartOfAccountGetPayload<{
  include: { parent: { select: { code: true; name: true } } };
}>;
type LoadedForDetail = Prisma.ChartOfAccountGetPayload<{
  include: {
    parent: { select: { id: true; code: true; name: true } };
    children: { select: { id: true; code: true; name: true; type: true; isActive: true } };
  };
}>;

assertType<Equal<Entity, ChartOfAccount | LoadedForList | LoadedForDetail>>();

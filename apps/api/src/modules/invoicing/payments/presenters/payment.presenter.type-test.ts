import type { Payment, Prisma } from '@devloggers/db-prisma';
import { assertType, type Equal } from '@/common/types/type-assert';
import { PaymentPresenter } from './payment.presenter';

type Entity = Parameters<PaymentPresenter['toResponse']>[0];

// Plain row from create (no relations), list rows, and detail rows.
type LoadedForList = Prisma.PaymentGetPayload<{
  include: {
    cashbox: { select: { name: true; code: true } };
    party: { select: { name: true } };
    branch: { select: { code: true; name: true } };
    currency: { select: { code: true; symbol: true } };
  };
}>;
type LoadedForDetail = Prisma.PaymentGetPayload<{
  include: {
    cashbox: true;
    party: { select: { name: true; receivableAccountId: true; payableAccountId: true } };
    branch: true;
    currency: true;
    fiscalPeriod: { select: { status: true } };
    allocations: { include: { invoice: { select: { number: true; total: true } } } };
  };
}>;

assertType<Equal<Entity, Payment | LoadedForList | LoadedForDetail>>();

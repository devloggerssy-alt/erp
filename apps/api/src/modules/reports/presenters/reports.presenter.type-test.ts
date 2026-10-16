import type { Party, Payment, Prisma } from '@devloggers/db-prisma';
import { assertType, type Equal } from '@/common/types/type-assert';
import { ReportsPresenter, type PartyStatementInput } from './reports.presenter';

type Param<M extends keyof ReportsPresenter> = Parameters<ReportsPresenter[M]>[0];

assertType<
  Equal<
    Param<'toStockBalance'>,
    Prisma.StockBalanceGetPayload<{
      include: {
        item: { select: { code: true; name: true } };
        warehouse: { select: { code: true; name: true } };
      };
    }>[]
  >
>();

assertType<
  Equal<
    Param<'toInvoiceSummary'>,
    Prisma.InvoiceGetPayload<{ include: { party: { select: { name: true; code: true } } } }>[]
  >
>();

assertType<
  Equal<
    Param<'toDashboardCashboxes'>,
    Prisma.CashboxGetPayload<{
      select: {
        id: true;
        code: true;
        name: true;
        balance: true;
        currency: { select: { code: true; symbol: true } };
      };
    }>[]
  >
>();

assertType<
  Equal<
    PartyStatementInput['invoices'],
    Prisma.InvoiceGetPayload<{
      include: {
        invoiceType: { select: { direction: true } };
        paymentAllocations: { select: { amount: true } };
      };
    }>[]
  >
>();
assertType<Equal<PartyStatementInput['party'], Party | null>>();
assertType<Equal<PartyStatementInput['payments'], Payment[]>>();

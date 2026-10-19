import type { Prisma } from '@devloggers/db-prisma';
import { assertType, type Equal } from '@/common/types/type-assert';
import { InvoicePresenter } from './invoice.presenter';

// The three payloads the presenter is handed: the list load, the detail load,
// and the partial create/update/posting load.
type InvoiceListItem = Prisma.InvoiceGetPayload<{
  include: {
    invoiceType: { select: { code: true; name: true; direction: true } };
    party: { select: { name: true; code: true } };
    warehouse: { select: { name: true; code: true } };
    branch: { select: { code: true; name: true } };
    currency: { select: { code: true; symbol: true } };
    paymentAllocations: { select: { amount: true } };
    _count: { select: { lines: true } };
  };
}>;
type InvoiceDetail = Prisma.InvoiceGetPayload<{
  include: {
    invoiceType: true;
    party: true;
    warehouse: true;
    branch: true;
    currency: true;
    fiscalPeriod: true;
    lines: {
      include: {
        item: { select: { name: true; code: true } };
        unit: { select: { name: true; abbreviation: true } };
      };
      orderBy: { sortOrder: 'asc' };
    };
    paymentAllocations: {
      include: { payment: { select: { number: true; date: true } } };
      orderBy: { createdAt: 'asc' };
    };
  };
}>;
type InvoiceWithLines = Prisma.InvoiceGetPayload<{ include: { invoiceType: true; lines: true } }>;

type Entity = InvoiceListItem | InvoiceDetail | InvoiceWithLines;

assertType<Equal<Parameters<InvoicePresenter['toListResponse']>[0], Entity>>();
assertType<Equal<Parameters<InvoicePresenter['toDetailResponse']>[0], InvoiceDetail | InvoiceWithLines>>();
assertType<Equal<Parameters<InvoicePresenter['toListResponseList']>[0], Entity[]>>();

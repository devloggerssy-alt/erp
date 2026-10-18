import type { Prisma } from '@devloggers/db-prisma';

/**
 * The include shapes the invoice queries load. The query and the payload type
 * share these constants, so a schema change can't drift silently from a query
 * and the presenter's entity argument derives from the same source.
 */

/** List load: enough to render a row, without loading the lines themselves. */
export const INVOICE_LIST_INCLUDE = {
    invoiceType: { select: { code: true, name: true, direction: true } },
    party: { select: { name: true, code: true } },
    warehouse: { select: { name: true, code: true } },
    currency: { select: { code: true, symbol: true } },
    paymentAllocations: { select: { amount: true } },
    _count: { select: { lines: true } },
} satisfies Prisma.InvoiceInclude;

/** Detail load: full relations, budgeted for a single invoice. */
export const INVOICE_DETAIL_INCLUDE = {
    invoiceType: true,
    party: true,
    warehouse: true,
    currency: true,
    fiscalPeriod: true,
    lines: {
        include: {
            item: { select: { name: true, code: true } },
            unit: { select: { name: true, abbreviation: true } },
        },
        orderBy: { sortOrder: 'asc' },
    },
    paymentAllocations: {
        include: { payment: { select: { number: true, date: true } } },
        orderBy: { createdAt: 'asc' },
    },
} satisfies Prisma.InvoiceInclude;

/**
 * Partial load returned by create / update / posting: the invoice plus its own
 * lines and type. Relations resolved elsewhere (party, currency, …) stay absent.
 */
export const INVOICE_LINES_INCLUDE = {
    invoiceType: true,
    lines: true,
} satisfies Prisma.InvoiceInclude;

export type InvoiceListItem = Prisma.InvoiceGetPayload<{ include: typeof INVOICE_LIST_INCLUDE }>;
export type InvoiceDetail = Prisma.InvoiceGetPayload<{ include: typeof INVOICE_DETAIL_INCLUDE }>;
export type InvoiceWithLines = Prisma.InvoiceGetPayload<{ include: typeof INVOICE_LINES_INCLUDE }>;

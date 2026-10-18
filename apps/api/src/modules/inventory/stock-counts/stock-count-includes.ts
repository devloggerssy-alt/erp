import type { Prisma } from '@devloggers/db-prisma';

/**
 * The include shapes the stock-count queries load. The query and the payload
 * type share these constants, so a schema change can't drift silently from a
 * query and the presenter's entity argument derives from the same source.
 */

/** List load: enough to render a row, without loading the lines themselves. */
export const STOCK_COUNT_LIST_INCLUDE = {
    warehouse: { select: { name: true, code: true } },
    _count: { select: { lines: true } },
} satisfies Prisma.StockCountInclude;

/** Detail load: full warehouse + lines with their item + fiscal period status. */
export const STOCK_COUNT_DETAIL_INCLUDE = {
    warehouse: true,
    lines: { include: { item: { select: { name: true, code: true } } } },
    fiscalPeriod: { select: { status: true } },
} satisfies Prisma.StockCountInclude;

/**
 * Partial load returned by create / post: the count plus its own lines and
 * warehouse. The fiscal period (loaded on the detail shape) stays absent.
 */
export const STOCK_COUNT_LINES_INCLUDE = {
    lines: true,
    warehouse: true,
} satisfies Prisma.StockCountInclude;

export type StockCountListItem = Prisma.StockCountGetPayload<{ include: typeof STOCK_COUNT_LIST_INCLUDE }>;
export type StockCountDetail = Prisma.StockCountGetPayload<{ include: typeof STOCK_COUNT_DETAIL_INCLUDE }>;
export type StockCountWithLines = Prisma.StockCountGetPayload<{ include: typeof STOCK_COUNT_LINES_INCLUDE }>;

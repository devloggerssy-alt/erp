import type { Prisma } from '@devloggers/db-prisma';

/**
 * The Prisma interactive-transaction client type. Replaces the `tx: any` that
 * let a typo'd intent field or a dropped account id compile silently (F2).
 */
export type PrismaTransactionClient = Prisma.TransactionClient;

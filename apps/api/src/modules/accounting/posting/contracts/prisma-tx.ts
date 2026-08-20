import type { Prisma } from '@devloggers/db-prisma';

/**
 * The Prisma interactive-transaction client type. Replaces the `tx: any` that
 * let a typo'd intent field or a dropped account id compile silently (F2) —
 * see docs/superpowers/specs/2026-08-20-erp-roadmap/phase-02-subledger-accounting-foundation.md
 */
export type PrismaTransactionClient = Prisma.TransactionClient;

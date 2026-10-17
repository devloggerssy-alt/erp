import type { AccountType } from '@devloggers/db-prisma';

// The account-type catalog is the Prisma enum (`.ai/rules/database.md`); the
// contracts package re-exports it instead of hand-writing the union.
export type { AccountType };

import type { SetupTaskType } from '@devloggers/db-prisma';

/**
 * Task types a user may explicitly declare not applicable ("skip"). Core
 * accounting configuration is never skippable — a tenant cannot post without
 * currencies, accounts, mappings or document numbers. RECONCILIATION is never
 * skippable: it is the completion gate (Phase 10.4.3).
 */
export const SKIPPABLE_TASK_TYPES: SetupTaskType[] = [
    'CASHBOXES',
    'BANK_ACCOUNTS',
    'WAREHOUSES',
    'PRODUCTS',
    'CUSTOMERS',
    'SUPPLIERS',
    'OPENING_CASH_BALANCES',
    'OPENING_BANK_BALANCES',
    'OPENING_RECEIVABLES',
    'OPENING_PAYABLES',
    'OPENING_INVENTORY',
];

export function isSkippableTask(type: SetupTaskType): boolean {
    return SKIPPABLE_TASK_TYPES.includes(type);
}

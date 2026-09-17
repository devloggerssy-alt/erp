import { SetupTaskType } from '@devloggers/db-prisma';

export const SETUP_TASK_TYPES: SetupTaskType[] = [
    'CURRENCIES', 'FISCAL_PERIOD', 'CHART_OF_ACCOUNTS', 'FINANCIAL_MAPPINGS', 'DOCUMENT_SEQUENCES',
    'CASHBOXES', 'BANK_ACCOUNTS', 'WAREHOUSES', 'PRODUCTS', 'CUSTOMERS', 'SUPPLIERS',
    'OPENING_CASH_BALANCES', 'OPENING_BANK_BALANCES', 'OPENING_RECEIVABLES', 'OPENING_PAYABLES',
    'OPENING_INVENTORY', 'RECONCILIATION',
];

/**
 * Static dependency graph: a task is READY only once every listed dependency
 * is COMPLETED or SKIPPED. No task-type-to-task-type cycles allowed — pinned
 * by setup-task-graph.spec.ts.
 */
export const SETUP_TASK_DEPENDENCIES: Record<SetupTaskType, SetupTaskType[]> = {
    CURRENCIES: [],
    FISCAL_PERIOD: [],
    CHART_OF_ACCOUNTS: [],
    DOCUMENT_SEQUENCES: [],
    WAREHOUSES: [],
    FINANCIAL_MAPPINGS: ['CHART_OF_ACCOUNTS'],
    CASHBOXES: ['CURRENCIES'],
    BANK_ACCOUNTS: ['CURRENCIES'],
    PRODUCTS: ['WAREHOUSES'],
    CUSTOMERS: ['FINANCIAL_MAPPINGS'],
    SUPPLIERS: ['FINANCIAL_MAPPINGS'],
    OPENING_CASH_BALANCES: ['CASHBOXES', 'FINANCIAL_MAPPINGS', 'FISCAL_PERIOD'],
    OPENING_BANK_BALANCES: ['BANK_ACCOUNTS', 'FINANCIAL_MAPPINGS', 'FISCAL_PERIOD'],
    OPENING_RECEIVABLES: ['CUSTOMERS', 'FISCAL_PERIOD'],
    OPENING_PAYABLES: ['SUPPLIERS', 'FISCAL_PERIOD'],
    OPENING_INVENTORY: ['PRODUCTS', 'WAREHOUSES', 'FISCAL_PERIOD'],
    RECONCILIATION: [
        'CHART_OF_ACCOUNTS', 'FINANCIAL_MAPPINGS',
        'OPENING_CASH_BALANCES', 'OPENING_BANK_BALANCES',
        'OPENING_RECEIVABLES', 'OPENING_PAYABLES', 'OPENING_INVENTORY',
    ],
};

export interface BusinessSetupProfileModules {
    inventory: boolean;
    sales: boolean;
    purchasing: boolean;
    accounting: boolean;
}

/** Task types whose "required" flag is gated behind a declared module — everything else is unconditionally required. */
export const PROFILE_GATED_TASKS: Partial<Record<keyof BusinessSetupProfileModules, SetupTaskType[]>> = {
    inventory: ['WAREHOUSES', 'PRODUCTS', 'OPENING_INVENTORY'],
    sales: ['CUSTOMERS', 'OPENING_RECEIVABLES'],
    purchasing: ['SUPPLIERS', 'OPENING_PAYABLES'],
};

export function isTaskRequiredForProfile(type: SetupTaskType, profile: BusinessSetupProfileModules): boolean {
    for (const [moduleKey, gatedTypes] of Object.entries(PROFILE_GATED_TASKS) as Array<[keyof BusinessSetupProfileModules, SetupTaskType[]]>) {
        if (gatedTypes.includes(type)) {
            return profile[moduleKey];
        }
    }
    return true;
}

/** Task types with no domain-service handler (Task 3.5 of the spec's 6.3 table) — completion is discovery-only. */
export const DISCOVERY_ONLY_TASK_TYPES: SetupTaskType[] = ['WAREHOUSES', 'PRODUCTS', 'CUSTOMERS', 'SUPPLIERS', 'OPENING_INVENTORY'];

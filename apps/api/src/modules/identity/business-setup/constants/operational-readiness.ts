import type { SetupTaskType } from '@devloggers/db-prisma';

export type OperationalReadinessModule = 'sales' | 'purchasing' | 'inventory' | 'cashOps' | 'bankOps' | 'accounting';

export const OPERATIONAL_READINESS_MODULES: OperationalReadinessModule[] = [
    'accounting',
    'cashOps',
    'bankOps',
    'inventory',
    'sales',
    'purchasing',
];

const ACCOUNTING_BASE: SetupTaskType[] = [
    'CURRENCIES',
    'FISCAL_PERIOD',
    'CHART_OF_ACCOUNTS',
    'FINANCIAL_MAPPINGS',
    'DOCUMENT_SEQUENCES',
];

/**
 * A module is operationally ready when every task it depends on is COMPLETED or
 * SKIPPED. Every operational module builds on the accounting baseline: without a
 * chart of accounts, mappings, sequences, currencies and a fiscal period nothing
 * can be posted. Reconciliation is deliberately NOT part of readiness — it is the
 * business-setup completion gate (`businessSetupCompletedAt`), not a precondition
 * for daily operations.
 */
export const READINESS_MODULE_TASKS: Record<OperationalReadinessModule, SetupTaskType[]> = {
    accounting: ACCOUNTING_BASE,
    cashOps: [...ACCOUNTING_BASE, 'CASHBOXES', 'OPENING_CASH_BALANCES'],
    bankOps: [...ACCOUNTING_BASE, 'BANK_ACCOUNTS', 'OPENING_BANK_BALANCES'],
    inventory: [...ACCOUNTING_BASE, 'WAREHOUSES', 'PRODUCTS', 'OPENING_INVENTORY'],
    sales: [...ACCOUNTING_BASE, 'CUSTOMERS', 'OPENING_RECEIVABLES'],
    purchasing: [...ACCOUNTING_BASE, 'SUPPLIERS', 'OPENING_PAYABLES'],
};

export interface ModuleReadiness {
    ready: boolean;
    blockers: SetupTaskType[];
}

export interface OperationalReadiness {
    computedAt: string;
    modules: Record<OperationalReadinessModule, ModuleReadiness>;
}

interface ReadinessTask {
    type: SetupTaskType;
    status: string;
    required: boolean;
}

export function computeOperationalReadiness(tasks: ReadinessTask[], computedAt: Date): OperationalReadiness {
    const byType = new Map(tasks.map((task) => [task.type, task]));
    const modules = {} as Record<OperationalReadinessModule, ModuleReadiness>;

    for (const moduleKey of OPERATIONAL_READINESS_MODULES) {
        const blockers = READINESS_MODULE_TASKS[moduleKey].filter((type) => {
            const task = byType.get(type);
            if (!task) return true; // missing row = not configured = blocker
            if (!task.required) return false;
            return task.status !== 'COMPLETED' && task.status !== 'SKIPPED';
        });
        modules[moduleKey] = { ready: blockers.length === 0, blockers };
    }

    return { computedAt: computedAt.toISOString(), modules };
}

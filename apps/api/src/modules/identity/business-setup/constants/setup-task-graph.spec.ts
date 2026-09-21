import {
    SETUP_TASK_DEPENDENCIES,
    SETUP_TASK_TYPES,
    isTaskRequiredForProfile,
} from './setup-task-graph';

describe('SETUP_TASK_DEPENDENCIES', () => {
    it('has exactly one entry per SetupTaskType with no unknown keys', () => {
        expect(Object.keys(SETUP_TASK_DEPENDENCIES).sort()).toEqual([...SETUP_TASK_TYPES].sort());
    });

    it('blocks OPENING_CASH_BALANCES without CASHBOXES', () => {
        expect(SETUP_TASK_DEPENDENCIES.OPENING_CASH_BALANCES).toContain('CASHBOXES');
    });

    it('blocks OPENING_BANK_BALANCES without BANK_ACCOUNTS', () => {
        expect(SETUP_TASK_DEPENDENCIES.OPENING_BANK_BALANCES).toContain('BANK_ACCOUNTS');
    });

    it('has no cycles — every dependency chain terminates at a root (empty deps) within 5 hops', () => {
        for (const type of SETUP_TASK_TYPES) {
            let frontier = SETUP_TASK_DEPENDENCIES[type];
            let hops = 0;
            while (frontier.length > 0) {
                hops += 1;
                expect(hops).toBeLessThan(5);
                frontier = frontier.flatMap((dep) => SETUP_TASK_DEPENDENCIES[dep]);
            }
        }
    });

    it('RECONCILIATION depends on every OPENING_* task', () => {
        const openingTasks = SETUP_TASK_TYPES.filter((t) => t.startsWith('OPENING_'));
        for (const opening of openingTasks) {
            expect(SETUP_TASK_DEPENDENCIES.RECONCILIATION).toContain(opening);
        }
    });
});

describe('isTaskRequiredForProfile', () => {
    const allEnabled = { inventory: true, sales: true, purchasing: true, accounting: true };

    it('gates WAREHOUSES/PRODUCTS/OPENING_INVENTORY behind the inventory module', () => {
        const noInventory = { ...allEnabled, inventory: false };
        expect(isTaskRequiredForProfile('WAREHOUSES', noInventory)).toBe(false);
        expect(isTaskRequiredForProfile('PRODUCTS', noInventory)).toBe(false);
        expect(isTaskRequiredForProfile('OPENING_INVENTORY', noInventory)).toBe(false);
        expect(isTaskRequiredForProfile('WAREHOUSES', allEnabled)).toBe(true);
    });

    it('gates CUSTOMERS/OPENING_RECEIVABLES behind the sales module', () => {
        const noSales = { ...allEnabled, sales: false };
        expect(isTaskRequiredForProfile('CUSTOMERS', noSales)).toBe(false);
        expect(isTaskRequiredForProfile('OPENING_RECEIVABLES', noSales)).toBe(false);
    });

    it('gates SUPPLIERS/OPENING_PAYABLES behind the purchasing module', () => {
        const noPurchasing = { ...allEnabled, purchasing: false };
        expect(isTaskRequiredForProfile('SUPPLIERS', noPurchasing)).toBe(false);
        expect(isTaskRequiredForProfile('OPENING_PAYABLES', noPurchasing)).toBe(false);
    });

    it('never gates core accounting/money tasks — always required regardless of profile', () => {
        const nothingEnabled = { inventory: false, sales: false, purchasing: false, accounting: false };
        for (const type of ['CURRENCIES', 'FISCAL_PERIOD', 'CHART_OF_ACCOUNTS', 'FINANCIAL_MAPPINGS', 'DOCUMENT_SEQUENCES', 'CASHBOXES', 'BANK_ACCOUNTS', 'OPENING_CASH_BALANCES', 'OPENING_BANK_BALANCES', 'RECONCILIATION'] as const) {
            expect(isTaskRequiredForProfile(type, nothingEnabled)).toBe(true);
        }
    });
});

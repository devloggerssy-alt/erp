import { BusinessSetupPlanService } from './business-setup-plan.service';
import { SETUP_TASK_TYPES, SETUP_TASK_DEPENDENCIES } from '../constants/setup-task-graph';
import type { BusinessSetupInspection } from './business-setup-discovery.service';

const EMPTY_INSPECTION: BusinessSetupInspection = {
    currencies: { count: 0, classification: 'EMPTY' },
    chartOfAccounts: { count: 0, classification: 'EMPTY' },
    financialMappings: { configuredSlots: 0, classification: 'EMPTY' },
    cashboxes: { count: 0, classification: 'EMPTY' },
    bankAccounts: { count: 0, classification: 'EMPTY' },
    fiscalPeriods: { count: 0, classification: 'EMPTY' },
    documentSequences: { count: 0, classification: 'EMPTY' },
    warehouses: { count: 0, classification: 'EMPTY' },
    products: { count: 0, classification: 'EMPTY' },
    customers: { count: 0, classification: 'EMPTY' },
    suppliers: { count: 0, classification: 'EMPTY' },
    openingCashBalances: { count: 0, classification: 'EMPTY' },
    openingBankBalances: { count: 0, classification: 'EMPTY' },
    openingReceivables: { count: 0, classification: 'EMPTY' },
    openingPayables: { count: 0, classification: 'EMPTY' },
    openingInventory: { count: 0, classification: 'EMPTY' },
};

describe('BusinessSetupPlanService.generate', () => {
    const service = new BusinessSetupPlanService();
    const allEnabled = { inventory: true, sales: true, purchasing: true, accounting: true };

    it('produces exactly one plan item per SetupTaskType, with the graph dependencies attached verbatim', () => {
        const items = service.generate(allEnabled, EMPTY_INSPECTION);
        expect(items).toHaveLength(SETUP_TASK_TYPES.length);
        const cashboxesItem = items.find((i) => i.type === 'CASHBOXES');
        expect(cashboxesItem?.dependencies).toEqual(SETUP_TASK_DEPENDENCIES.CASHBOXES);
    });

    it('marks inventory tasks not-required when the inventory module is disabled', () => {
        const items = service.generate({ ...allEnabled, inventory: false }, EMPTY_INSPECTION);
        expect(items.find((i) => i.type === 'WAREHOUSES')?.required).toBe(false);
        expect(items.find((i) => i.type === 'CURRENCIES')?.required).toBe(true);
    });

    it('attaches the matching discovery snapshot as metadata for tasks with an inspection counterpart', () => {
        const inspection = { ...EMPTY_INSPECTION, currencies: { count: 3, classification: 'EXISTING' as const } };
        const items = service.generate(allEnabled, inspection);
        expect(items.find((i) => i.type === 'CURRENCIES')?.metadata).toEqual({ discovery: { count: 3, classification: 'EXISTING' } });
    });

    it('leaves RECONCILIATION metadata undefined — it has no direct discovery counterpart', () => {
        const items = service.generate(allEnabled, EMPTY_INSPECTION);
        expect(items.find((i) => i.type === 'RECONCILIATION')?.metadata).toBeUndefined();
    });
});

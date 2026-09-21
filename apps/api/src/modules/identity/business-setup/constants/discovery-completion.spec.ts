import { DISCOVERY_COMPLETABLE_TASK_TYPES, isDiscoverablyComplete } from './discovery-completion';
import type { BusinessSetupInspection } from '../services/business-setup-discovery.service';
import { SETUP_TASK_TYPES } from './setup-task-graph';

function inspectionWith(overrides: Partial<BusinessSetupInspection> = {}): BusinessSetupInspection {
    const empty = { count: 0, classification: 'EMPTY' as const };
    const exist = { count: 1, classification: 'EXISTING' as const };
    return {
        currencies: exist, chartOfAccounts: empty, financialMappings: { configuredSlots: 0, classification: 'EMPTY' },
        cashboxes: empty, bankAccounts: empty, fiscalPeriods: empty, documentSequences: empty,
        warehouses: empty, products: empty, customers: empty, suppliers: empty,
        openingCashBalances: empty, openingBankBalances: empty, openingReceivables: empty,
        openingPayables: empty, openingInventory: empty,
        ...overrides,
    } as BusinessSetupInspection;
}

describe('isDiscoverablyComplete', () => {
    it('completes a task when its discovery area is EXISTING', () => {
        expect(isDiscoverablyComplete('CURRENCIES', inspectionWith())).toBe(true);
    });

    it('does not complete when the area is EMPTY or PARTIAL', () => {
        const empty = inspectionWith({ currencies: { count: 0, classification: 'EMPTY' } });
        expect(isDiscoverablyComplete('CURRENCIES', empty)).toBe(false);
        const partial = inspectionWith({ financialMappings: { configuredSlots: 5, classification: 'PARTIAL' } });
        expect(isDiscoverablyComplete('FINANCIAL_MAPPINGS', partial)).toBe(false);
    });

    it('completes FINANCIAL_MAPPINGS only when every slot is configured (EXISTING)', () => {
        const full = inspectionWith({ financialMappings: { configuredSlots: 11, classification: 'EXISTING' } });
        expect(isDiscoverablyComplete('FINANCIAL_MAPPINGS', full)).toBe(true);
    });

    it('never completes RECONCILIATION from discovery', () => {
        expect(isDiscoverablyComplete('RECONCILIATION', inspectionWith())).toBe(false);
    });

    it('covers every task type except RECONCILIATION', () => {
        expect([...DISCOVERY_COMPLETABLE_TASK_TYPES].sort()).toEqual(
            SETUP_TASK_TYPES.filter((type) => type !== 'RECONCILIATION').sort(),
        );
    });
});

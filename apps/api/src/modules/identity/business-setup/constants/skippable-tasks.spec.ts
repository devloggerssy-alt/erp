import { SKIPPABLE_TASK_TYPES, isSkippableTask } from './skippable-tasks';
import { SETUP_TASK_TYPES } from './setup-task-graph';

describe('skippable setup tasks', () => {
    it('allows skipping operational tasks', () => {
        for (const type of ['CASHBOXES', 'BANK_ACCOUNTS', 'OPENING_CASH_BALANCES', 'OPENING_RECEIVABLES', 'PRODUCTS', 'SUPPLIERS'] as const) {
            expect(isSkippableTask(type)).toBe(true);
        }
    });

    it('never allows skipping accounting core tasks', () => {
        for (const type of ['CURRENCIES', 'FISCAL_PERIOD', 'CHART_OF_ACCOUNTS', 'FINANCIAL_MAPPINGS', 'DOCUMENT_SEQUENCES'] as const) {
            expect(isSkippableTask(type)).toBe(false);
        }
    });

    it('never allows skipping RECONCILIATION — it is the completion gate', () => {
        expect(isSkippableTask('RECONCILIATION')).toBe(false);
    });

    it('only lists known task types', () => {
        for (const type of SKIPPABLE_TASK_TYPES) {
            expect(SETUP_TASK_TYPES).toContain(type);
        }
    });
});

import { ReferenceType } from '@devloggers/db-prisma';
import { ExpenseRecordedPolicy, ExpenseCancelledPolicy } from './expense-recorded.policy';
import type { ExpenseRecordedIntent } from '../contracts/posting-intent';

const baseIntent: ExpenseRecordedIntent = {
    kind: 'EXPENSE_RECORDED',
    tenantId: 't1',
    userId: 'u1',
    date: new Date('2026-03-03'),
    fiscalPeriodId: 'fp1',
    fiscalPeriodStatus: 'OPEN',
    exchangeRate: 1,
    referenceId: 'expense-1',
    description: 'Expense EXP-001',
    cashboxAccountId: 'cashbox',
    totalAmount: 300,
    items: [
        { accountId: 'exp-rent', amount: 200, description: 'Rent', sortOrder: 0 },
        { accountId: 'exp-utilities', amount: 100, description: 'Utilities', sortOrder: 1 },
    ],
};

describe('ExpenseRecordedPolicy.buildLines', () => {
    it('debits each item account and credits the cashbox for the total', () => {
        const lines = new ExpenseRecordedPolicy().buildLines(baseIntent);
        expect(lines).toEqual([
            { accountId: 'exp-rent', debit: 200, credit: 0, description: 'Rent', sortOrder: 0 },
            { accountId: 'exp-utilities', debit: 100, credit: 0, description: 'Utilities', sortOrder: 1 },
            { accountId: 'cashbox', debit: 0, credit: 300, description: null, sortOrder: 2 },
        ]);
    });

    it('stays balanced', () => {
        const lines = new ExpenseRecordedPolicy().buildLines(baseIntent);
        const debits = lines.reduce((s, l) => s + l.debit, 0);
        const credits = lines.reduce((s, l) => s + l.credit, 0);
        expect(debits).toBe(credits);
    });
});

describe('ExpenseCancelledPolicy', () => {
    it('names the EXPENSE_CANCELLATION reference type', () => {
        expect(new ExpenseCancelledPolicy().referenceType).toBe(ReferenceType.EXPENSE_CANCELLATION);
    });
});

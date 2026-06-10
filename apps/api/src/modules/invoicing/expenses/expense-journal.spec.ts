import { buildExpenseJournalLines, ExpenseJournalInput } from './expense-journal';

const input: ExpenseJournalInput = {
    totalAmount: 300,
    cashboxAccountId: 'cash-acct',
    items: [
        { accountId: 'rent-acct', amount: 200, description: 'Rent', sortOrder: 0 },
        { accountId: 'utils-acct', amount: 100, description: 'Utilities', sortOrder: 1 },
    ],
};

describe('buildExpenseJournalLines', () => {
    it('debits each item and credits the cashbox account, balanced', () => {
        const lines = buildExpenseJournalLines(input);
        expect(lines).toHaveLength(3);
        expect(lines[0]).toEqual({ accountId: 'rent-acct', debit: 200, credit: 0, description: 'Rent', sortOrder: 0 });
        expect(lines[1]).toEqual({ accountId: 'utils-acct', debit: 100, credit: 0, description: 'Utilities', sortOrder: 1 });
        expect(lines[2]).toEqual({ accountId: 'cash-acct', debit: 0, credit: 300, description: null, sortOrder: 2 });
        const debits = lines.reduce((s, l) => s + l.debit, 0);
        const credits = lines.reduce((s, l) => s + l.credit, 0);
        expect(debits).toBe(credits);
    });

    it('reverses debits and credits when reverse=true', () => {
        const lines = buildExpenseJournalLines(input, { reverse: true });
        expect(lines[0]).toEqual({ accountId: 'rent-acct', debit: 0, credit: 200, description: 'Rent', sortOrder: 0 });
        expect(lines[2]).toEqual({ accountId: 'cash-acct', debit: 300, credit: 0, description: null, sortOrder: 2 });
        const debits = lines.reduce((s, l) => s + l.debit, 0);
        const credits = lines.reduce((s, l) => s + l.credit, 0);
        expect(debits).toBe(credits);
    });
});

import { BankAccountsAiTools } from './bank-accounts.ai-tools';

describe('BankAccountsAiTools', () => {
    const tools = new BankAccountsAiTools({} as never).aiTools();

    it('exposes list/show/create/update (no delete) in invoicing', () => {
        expect(tools.map((t) => t.name)).toEqual(['bank-accounts.list', 'bank-accounts.show', 'bank-accounts.create', 'bank-accounts.update']);
        expect(new Set(tools.map((t) => t.domain))).toEqual(new Set(['invoicing']));
        expect(tools.map((t) => t.permission)).toEqual(['bankAccounts.view', 'bankAccounts.view', 'bankAccounts.create', 'bankAccounts.update']);
    });
});

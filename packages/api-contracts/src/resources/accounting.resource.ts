import { defineResource } from "./base/resource";

export const accountingResource = defineResource({
  key: 'accounting',
  routes: {
    chartOfAccounts: '/accounting/chart-of-accounts',
    createAccount: '/accounting/chart-of-accounts',
    accountDetails: '/accounting/chart-of-accounts/{id}',
    updateAccount: '/accounting/chart-of-accounts/{id}',
    journalEntries: '/accounting/journal-entries',
    journalEntryDetails: '/accounting/journal-entries/{id}',
  },
})




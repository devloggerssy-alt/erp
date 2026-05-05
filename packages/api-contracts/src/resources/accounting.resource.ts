import { defineResource } from './resource.types'

export const accountingResource = defineResource({
  key: 'accounting',

  routes: {
    chartOfAccounts: '/accounting/chart-of-accounts',
    createAccount: '/accounting/chart-of-accounts',
    accountDetails: '/accounting/chart-of-accounts/:id',
    updateAccount: '/accounting/chart-of-accounts/:id',
    journalEntries: '/accounting/journal-entries',
    journalEntryDetails: '/accounting/journal-entries/:id',
  },

  paths: {
    root: 'accounting',
    chartOfAccounts: 'chart-of-accounts',
    accountById: 'chart-of-accounts/:id',
    journalEntries: 'journal-entries',
    journalEntryById: 'journal-entries/:id',
  },
})

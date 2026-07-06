import { defineCrudResource } from './base/crud-resource'

export const accountResource = defineCrudResource({
  key: 'chart-of-accounts',
  routes: {
    list: '/accounting/chart-of-accounts',
    show: '/accounting/chart-of-accounts/{id}',
    create: '/accounting/chart-of-accounts',
    update: '/accounting/chart-of-accounts/{id}',
    delete: '/accounting/chart-of-accounts/{id}',
    tree: '/accounting/chart-of-accounts/tree',
    balances: '/accounting/account-balances',
    ledger: '/accounting/account-balances/{id}/ledger',
  },
})

import { defineCrudResource } from './base/crud-resource'

export const openingBalanceSessionResource = defineCrudResource({
  key: 'opening-balance-sessions',
  routes: {
    list: '/accounting/opening-balance-sessions',
    show: '/accounting/opening-balance-sessions/{id}',
    create: '/accounting/opening-balance-sessions',
    update: '/accounting/opening-balance-sessions/{id}',
    delete: '/accounting/opening-balance-sessions/{id}',
    validate: '/accounting/opening-balance-sessions/{id}/validate',
    review: '/accounting/opening-balance-sessions/{id}/review',
    post: '/accounting/opening-balance-sessions/{id}/post',
    lock: '/accounting/opening-balance-sessions/{id}/lock',
  },
})
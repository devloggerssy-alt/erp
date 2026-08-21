import { defineCrudResource } from './base/crud-resource'

export const bankAccountResource = defineCrudResource({
  key: 'bank-accounts',
  routes: {
    list: '/bank-accounts',
    show: '/bank-accounts/{id}',
    create: '/bank-accounts',
    update: '/bank-accounts/{id}',
    delete: '/bank-accounts/{id}',
  },
})

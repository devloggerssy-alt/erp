import { defineCrudResource } from './base/crud-resource'

export const branchResource = defineCrudResource({
  key: 'branches',

  routes: {
    list: '/branches',
    show: '/branches/{id}',
    create: '/branches',
    update: '/branches/{id}',
    delete: '/branches/{id}',
  },
})

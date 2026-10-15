import { defineCrudResource } from './base/crud-resource'

export const expenseResource = defineCrudResource({
  key: 'expenses',

  routes: {
    list: '/expenses',
    show: '/expenses/{id}',
    create: '/expenses',
    update: '/expenses/{id}',
    delete: '/expenses/{id}',
    post: '/expenses/{id}/post',
    cancel: '/expenses/{id}/cancel',
  },
})

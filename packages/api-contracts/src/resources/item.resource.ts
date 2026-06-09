import { defineCrudResource } from './base/crud-resource'

export const itemResource = defineCrudResource({
  key: 'items',

  routes: {
    list: '/items',
    show: '/items/{id}',
    create: '/items',
    update: '/items/{id}',
    delete: '/items/{id}',
  },
})




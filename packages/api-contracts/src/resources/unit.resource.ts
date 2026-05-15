import { defineCrudResource } from './base/crud-resource'
import { defineResource } from './base/resource'

export const unitResource = defineCrudResource({
  key: 'units',

  routes: {
    list: '/units',
    show: '/units/{id}',
    create: '/units',
    update: '/units/{id}',
    delete: '/units/{id}',
  },
})

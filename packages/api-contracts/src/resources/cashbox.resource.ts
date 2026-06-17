import { CrudResource, defineCrudResource } from './base/crud-resource'
import { defineResource } from './resource.types'

export const cashboxResource = defineCrudResource({
  key: 'cashboxes',
  routes: {
    list: '/cashboxes',
    create: '/cashboxes',
    show: '/cashboxes/{id}',
    update: '/cashboxes/{id}',
    delete: '/cashboxes/{id}'
  },
})




import { defineCrudResource } from './base/crud-resource'

export const roleResource = defineCrudResource({
  key: 'roles',

  routes: {
    list: '/roles',
    show: '/roles/{id}',
    create: '/roles',
    update: '/roles/{id}',
    delete: '/roles/{id}',
  },
})

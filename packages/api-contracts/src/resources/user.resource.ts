import { defineCrudResource } from './base/crud-resource'

export const userResource = defineCrudResource({
  key: 'users',

  routes: {
    list: '/users',
    show: '/users/{id}',
    create: '/users',
    update: '/users/{id}',
    delete: '/users/{id}',
  },
})

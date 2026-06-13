import { defineCrudResource } from './base/crud-resource'

export const brandResource = defineCrudResource({
  key: 'brands',
  routes: {
    list: '/brands',
    show: '/brands/{id}',
    create: '/brands',
    update: '/brands/{id}',
    delete: '/brands/{id}',
  },
})

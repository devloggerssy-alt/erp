import { defineCrudResource } from './base/crud-resource'

export const warehouseResource = defineCrudResource({
  key: 'warehouses',

  routes: {
    list: '/warehouses',
    show: '/warehouses/{id}',
    create: '/warehouses',
    update: '/warehouses/{id}',
    delete: '/warehouses/{id}',
  },
})

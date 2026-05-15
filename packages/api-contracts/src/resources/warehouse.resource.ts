import { defineResource } from './resource.types'

export const warehouseResource = defineResource({
  key: 'warehouses',

  routes: {
    list: '/warehouses',
    create: '/warehouses',
    details: '/warehouses/{id}',
    update: '/warehouses/{id}',
  },
})




import { defineResource } from './resource.types'

export const invoiceTypeResource = defineResource({
  key: 'invoice-types',

  routes: {
    list: '/invoice-types',
    create: '/invoice-types',
    details: '/invoice-types/{id}',
    update: '/invoice-types/{id}',
  },
})




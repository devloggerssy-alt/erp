import { defineCrudResource } from './base/crud-resource'

export const invoiceTypeResource = defineCrudResource({
  key: 'invoice-types',

  routes: {
    list: '/invoice-types',
    show: '/invoice-types/{id}',
    create: '/invoice-types',
    update: '/invoice-types/{id}',
    delete: '/invoice-types/{id}',
  },
})




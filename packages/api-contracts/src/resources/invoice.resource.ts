import { defineResource } from './resource.types'

export const invoiceResource = defineResource({
  key: 'invoices',

  routes: {
    list: '/invoices',
    show: '/invoices/{id}',
    create: '/invoices',
    update: '/invoices/{id}',
    post: '/invoices/{id}/post',
    cancel: '/invoices/{id}/cancel',
  },
})




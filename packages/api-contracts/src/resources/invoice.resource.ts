import { defineResource } from './resource.types'

export const invoiceResource = defineResource({
  key: 'invoices',

  routes: {
    list: '/invoices',
    create: '/invoices',
    details: '/invoices/:id',
    update: '/invoices/:id',
    post: '/invoices/:id/post',
    cancel: '/invoices/:id/cancel',
  },

  paths: {
    root: 'invoices',
    byId: ':id',
    post: ':id/post',
    cancel: ':id/cancel',
  },
})

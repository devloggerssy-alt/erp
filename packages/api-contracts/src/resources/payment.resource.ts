import { defineCrudResource } from './base/crud-resource'

export const paymentResource = defineCrudResource({
  key: 'payments',

  routes: {
    list: '/payments',
    show: '/payments/{id}',
    create: '/payments',
    update: '/payments/{id}',
    delete: '/payments/{id}',
    post: '/payments/{id}/post',
    cancel: '/payments/{id}/cancel',
    allocate: '/payments/{id}/allocate',
    removeAllocation: '/payments/{id}/allocations/{allocationId}/remove',
  },
})

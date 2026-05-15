import { defineResource } from './resource.types'

export const paymentResource = defineResource({
  key: 'payments',

  routes: {
    list: '/payments',
    create: '/payments',
    details: '/payments/{id}',
    update: '/payments/{id}',
    post: '/payments/{id}/post',
    cancel: '/payments/{id}/cancel',
    allocate: '/payments/{id}/allocate',
    removeAllocation: '/payments/{id}/allocations/{allocationId}',
  },
})




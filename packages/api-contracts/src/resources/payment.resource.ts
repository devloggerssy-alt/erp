export const paymentResource = {
  key: 'payments',

  routes: {
    list: '/payments',
    create: '/payments',
    details: '/payments/:id',
    update: '/payments/:id',
    post: '/payments/:id/post',
    cancel: '/payments/:id/cancel',
    allocate: '/payments/:id/allocate',
    removeAllocation: '/payments/:id/allocations/:allocationId',
  },

  paths: {
    root: 'payments',
    byId: ':id',
    post: ':id/post',
    cancel: ':id/cancel',
    allocate: ':id/allocate',
    removeAllocation: ':id/allocations/:allocationId',
  },
} as const

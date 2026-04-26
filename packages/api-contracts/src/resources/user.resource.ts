export const userResource = {
  key: 'users',

  routes: {
    list: '/users',
    create: '/users',
    update: '/users/:id',
    status: '/users/:id/status',
  },

  paths: {
    root: 'users',
    byId: ':id',
    status: ':id/status',
  },
} as const

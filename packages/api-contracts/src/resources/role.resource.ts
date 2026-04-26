export const roleResource = {
  key: 'roles',

  routes: {
    list: '/roles',
    create: '/roles',
    update: '/roles/:id',
  },

  paths: {
    root: 'roles',
    byId: ':id',
  },
} as const

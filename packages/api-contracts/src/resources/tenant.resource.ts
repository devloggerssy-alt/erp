export const tenantResource = {
  key: 'tenants',

  routes: {
    create: '/tenants',
    current: '/tenants/current',
    updateCurrent: '/tenants/current',
  },

  paths: {
    root: 'tenants',
    current: 'current',
  },
} as const

import { defineResource } from './resource.types'

export const tenantResource = defineResource({
  key: 'tenants',

  routes: {
    create: '/tenants',
    current: '/tenants/current',
    updateCurrent: '/tenants/current',
    settings: '/settings',
    updateSettings: '/settings',
    defaults: '/settings/defaults',
    resetFinance: '/settings/danger/reset-finance',
    resetInventory: '/settings/danger/reset-inventory',
  } as const,
}) 

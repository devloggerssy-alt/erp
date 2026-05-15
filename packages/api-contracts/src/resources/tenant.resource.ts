import { defineResource } from './resource.types'

export const tenantResource = defineResource({
  key: 'tenants',

  routes: {
    create: '/tenants',
    current: '/tenants/current',
    updateCurrent: '/tenants/current',
  },

 
})

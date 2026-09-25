import { defineResource } from './base/resource'

export const posResource = defineResource({
  key: 'pos',
  routes: {
    checkout: '/pos/checkout',
    settings: '/pos/settings',
    provision: '/pos/settings/provision',
  },
})

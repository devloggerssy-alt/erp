import type { ApiPath } from '../api'
import { defineResource } from './base/resource'

export const businessSetupResource = defineResource({
  key: 'business-setup',

  routes: {
    state: '/business-setup/state',
    plan: '/business-setup/plan',
    profile: '/business-setup/profile',
    updateTask: '/business-setup/tasks/{type}',
    skipTask: '/business-setup/tasks/{type}/skip' as ApiPath,
  },
})

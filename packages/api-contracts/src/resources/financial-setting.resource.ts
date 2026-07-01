import type { ApiPath } from '../api'
import { defineResource } from './base/resource'

export const financialSettingResource = defineResource({
  key: 'financial-settings',
  routes: {
    get: '/settings/financial',
    upsert: '/settings/financial',
  },
})



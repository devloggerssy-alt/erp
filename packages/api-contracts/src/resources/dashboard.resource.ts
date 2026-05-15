import { defineResource } from './resource.types'

export const dashboardResource = defineResource({
  key: 'dashboard',

  routes: {
    summary: '/dashboard/summary',
  },
})



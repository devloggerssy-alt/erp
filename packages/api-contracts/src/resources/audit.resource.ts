import { defineResource } from './resource.types'

export const auditResource = defineResource({
  key: 'audit-logs',

  routes: {
    list: '/audit-logs',
  },

  paths: {
    root: 'audit-logs',
  },
})

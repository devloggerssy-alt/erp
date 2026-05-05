import { defineResource } from './resource.types'

export const itemResource = defineResource({
  key: 'items',

  routes: {
    list: '/items',
    create: '/items',
    details: '/items/:id',
    update: '/items/:id',
    status: '/items/:id/status',
  },

  paths: {
    root: 'items',
    byId: ':id',
    status: ':id/status',
  },
})

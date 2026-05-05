import { defineResource } from './resource.types'

export const cashboxResource = defineResource({
  key: 'cashboxes',

  routes: {
    list: '/cashboxes',
    create: '/cashboxes',
    details: '/cashboxes/:id',
    update: '/cashboxes/:id',
  },

  paths: {
    root: 'cashboxes',
    byId: ':id',
  },
})

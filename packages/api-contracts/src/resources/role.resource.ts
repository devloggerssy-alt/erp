import { defineResource } from './resource.types'

export const roleResource = defineResource({
  key: 'roles',

  routes: {
    list: '/roles',
    create: '/roles',
    update: '/roles/:id',
  },

  paths: {
    root: 'roles',
    byId: ':id',
  },
})

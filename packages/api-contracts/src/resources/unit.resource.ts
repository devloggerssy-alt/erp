import { defineResource } from './resource.types'

export const unitResource = defineResource({
  key: 'units',

  routes: {
    index: '/units',
    byId: '/units/:id',
  },

  paths: {
    root: 'units',
    byId: ':id',
  },
})


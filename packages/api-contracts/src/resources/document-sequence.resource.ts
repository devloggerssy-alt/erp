import { defineResource } from './resource.types'

export const documentSequenceResource = defineResource({
  key: 'document-sequences',

  routes: {
    list: '/document-sequences',
    create: '/document-sequences',
    update: '/document-sequences/:id',
  },

  paths: {
    root: 'document-sequences',
    byId: ':id',
  },
})

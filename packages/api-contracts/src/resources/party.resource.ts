import { defineResource } from './resource.types'

export const partyResource = defineResource({
  key: 'parties',

  routes: {
    list: '/parties',
    create: '/parties',
    details: '/parties/{id}',
    update: '/parties/{id}',
    status: '/parties/{id}/status',
  },
})




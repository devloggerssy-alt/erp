import { defineCrudResource } from './base/crud-resource'

export const partyResource = defineCrudResource({
  key: 'parties',

  routes: {
    list: '/parties',
    show: '/parties/{id}',
    create: '/parties',
    update: '/parties/{id}',
    delete: '/parties/{id}',
  },
})

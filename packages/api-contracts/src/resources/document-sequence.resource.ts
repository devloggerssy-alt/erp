import { defineCrudResource } from './base/crud-resource'

export const documentSequenceResource = defineCrudResource({
  key: 'document-sequences',

  routes: {
    list: '/document-sequences',
    show: '/document-sequences/{id}',
    create: '/document-sequences',
    update: '/document-sequences/{id}',
    delete: '/document-sequences/{id}',
  },
})




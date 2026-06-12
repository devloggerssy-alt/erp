import { defineCrudResource } from './base/crud-resource'

export const catalogEntityResource = defineCrudResource({
  key: 'catalog-entities',
  routes: {
    list:   '/catalog-entities',
    show:   '/catalog-entities/{id}',
    create: '/catalog-entities',
    update: '/catalog-entities/{id}',
    delete: '/catalog-entities/{id}',
  },
})

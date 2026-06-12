import { defineCrudResource } from './base/crud-resource'

export const itemCatalogEntityResource = defineCrudResource({
  key: 'item-catalog-entities',
  routes: {
    list:   '/item-catalog-entities',
    show:   '/item-catalog-entities/{id}',
    create: '/item-catalog-entities',
    update: '/item-catalog-entities/{id}',
    delete: '/item-catalog-entities/{id}',
  },
})

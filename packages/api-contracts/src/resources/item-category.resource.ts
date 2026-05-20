import { defineCrudResource } from './base/crud-resource'

export const itemCategoryResource = defineCrudResource({
  key: 'item-categories',
  routes: {
    list: '/item-categories',
    show: '/item-categories/{id}',
    create: '/item-categories',
    update: '/item-categories/{id}',
    delete: '/item-categories/{id}',
  },
})




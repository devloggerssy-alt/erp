import { defineCrudResource } from './base/crud-resource'
import { defineResource } from './resource.types'

export const itemCategoryResource = defineCrudResource({
  key: 'item-categories',
  routes: {
    list: '/item-categories',
    create: '/item-categories',
    details: '/item-categories/{id}',
    update: '/item-categories/{id}',
    delete: '/item-categories/{id}',
    show: '/item-categories/{id}',
  },
})




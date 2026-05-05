import { defineResource } from './resource.types'

export const itemCategoryResource = defineResource({
  key: 'item-categories',

  routes: {
    list: '/item-categories',
    create: '/item-categories',
    details: '/item-categories/:id',
    update: '/item-categories/:id',
  },

  paths: {
    root: 'item-categories',
    byId: ':id',
  },
})

import { defineResource } from './resource.types'

export const currencyResource = defineResource({
  key: 'currencies',

  routes: {
    list: '/currencies',
    create: '/currencies',
    update: '/currencies/:id',
  },

  paths: {
    root: 'currencies',
    byId: ':id',
  },
})

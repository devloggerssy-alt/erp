import { defineCrudResource } from './base/crud-resource'

export const currencyResource = defineCrudResource({
  key: 'currencies',

  routes: {
    list: '/currencies',
    show: '/currencies/{id}',
    create: '/currencies',
    update: '/currencies/{id}',
    delete: '/currencies/{id}',
  },
})




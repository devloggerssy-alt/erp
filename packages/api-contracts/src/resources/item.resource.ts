import { defineCrudResource } from './base/crud-resource'
import type { ApiPath } from '../api'

export const itemResource = defineCrudResource({
  key: 'items',

  routes: {
    list: '/items',
    show: '/items/{id}',
    create: '/items',
    update: '/items/{id}',
    delete: '/items/{id}',
    export: '/items/export' as ApiPath,
    importTemplate: '/items/import/template' as ApiPath,
    import: '/items/import' as ApiPath,
  },
})




import { defineCrudResource } from './base/crud-resource'
import { defineResource } from './base/resource'
import type { ApiPath } from '../api'

export const unitResource = defineCrudResource({
  key: 'units',

  routes: {
    list: '/units',
    show: '/units/{id}',
    create: '/units',
    update: '/units/{id}',
    delete: '/units/{id}',
    export: '/units/export' as ApiPath,
    importTemplate: '/units/import/template' as ApiPath,
    import: '/units/import' as ApiPath,
  },
})

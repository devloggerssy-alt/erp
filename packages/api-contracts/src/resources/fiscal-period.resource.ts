import { defineCrudResource } from './base/crud-resource'

export const fiscalPeriodResource = defineCrudResource({
  key: 'fiscal-periods',

  routes: {
    list: '/fiscal-periods',
    show: '/fiscal-periods/{id}',
    create: '/fiscal-periods',
    update: '/fiscal-periods/{id}',
    delete: '/fiscal-periods/{id}',
  },
})




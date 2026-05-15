import { defineResource } from './resource.types'

export const fiscalPeriodResource = defineResource({
  key: 'fiscal-periods',

  routes: {
    list: '/fiscal-periods',
    create: '/fiscal-periods',
    update: '/fiscal-periods/{id}',
  },
})




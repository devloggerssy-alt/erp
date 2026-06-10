import { defineResource } from './resource.types'

export const expenseResource = defineResource({
  key: 'expenses',

  routes: {
    list: '/expenses',
    show: '/expenses/{id}',
    create: '/expenses',
    update: '/expenses/{id}',
    delete: '/expenses/{id}',
    post: '/expenses/{id}/post',
    cancel: '/expenses/{id}/cancel',
  },
})

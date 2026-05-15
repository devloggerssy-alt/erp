import { defineResource } from './resource.types'

export const stockCountResource = defineResource({
  key: 'stock-counts',

  routes: {
    list: '/stock-counts',
    create: '/stock-counts',
    details: '/stock-counts/{id}',
    post: '/stock-counts/{id}/post',
  },
})




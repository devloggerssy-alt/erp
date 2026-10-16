import { defineResource } from './base/resource'

export const tagAssignmentResource = defineResource({
  key: 'tag-assignments',

  routes: {
    list: '/tag-assignments',
    create: '/tag-assignments',
    delete: '/tag-assignments/{id}',
  },
})

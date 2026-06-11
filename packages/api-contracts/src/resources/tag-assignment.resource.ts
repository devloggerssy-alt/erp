import { defineResource } from './base/resource'
import type { ApiPath } from '../api'

// Routes cast to bypass the OpenAPI path type check — paths will exist once the API is
// deployed and the types are regenerated via `pnpm --filter @devloggers/api-contracts generate`.
const routes = {
  list: '/tag-assignments',
  create: '/tag-assignments',
  delete: '/tag-assignments/{id}',
} as unknown as Record<string, ApiPath>

export const tagAssignmentResource = defineResource({
  key: 'tag-assignments',
  routes,
})

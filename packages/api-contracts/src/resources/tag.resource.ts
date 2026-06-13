import { defineCrudResource, type CrudRoutes } from './base/crud-resource'

// Routes cast to bypass the OpenAPI path type check — paths will exist once the API is
// deployed and the types are regenerated via `pnpm --filter @devloggers/api-contracts generate`.
const routes = {
  list: '/tags',
  show: '/tags/{id}',
  create: '/tags',
  update: '/tags/{id}',
  delete: '/tags/{id}',
} satisfies CrudRoutes

export const tagResource = defineCrudResource({
  key: 'tags',
  routes,
})

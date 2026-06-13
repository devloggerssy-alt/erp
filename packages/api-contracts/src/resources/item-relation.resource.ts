import { defineCrudResource, type CrudRoutes } from './base/crud-resource'

// Routes cast to bypass the OpenAPI path type check — paths will exist once the API is
// deployed and the types are regenerated via `pnpm --filter @devloggers/api-contracts generate`.
const routes = {
  list: '/item-relations',
  show: '/item-relations/{id}',
  create: '/item-relations',
  update: '/item-relations/{id}',
  delete: '/item-relations/{id}',
} satisfies CrudRoutes

export const itemRelationResource = defineCrudResource({
  key: 'item-relations',
  routes,
})

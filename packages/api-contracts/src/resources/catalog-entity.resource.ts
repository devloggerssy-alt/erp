import { defineCrudResource, type CrudRoutes } from './base/crud-resource'

// Routes cast to bypass the OpenAPI path type check — paths will exist once the API is
// deployed and the types are regenerated via `pnpm --filter @devloggers/api-contracts generate`.
const routes = {
  list:   '/catalog-entities',
  show:   '/catalog-entities/{id}',
  create: '/catalog-entities',
  update: '/catalog-entities/{id}',
  delete: '/catalog-entities/{id}',
} satisfies CrudRoutes

export const catalogEntityResource = defineCrudResource({
  key: 'catalog-entities',
  routes,
})

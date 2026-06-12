import { defineCrudResource, type CrudRoutes } from './base/crud-resource'

// Routes cast to bypass the OpenAPI path type check — paths will exist once the API is
// deployed and the types are regenerated via `pnpm --filter @devloggers/api-contracts generate`.
const routes = {
  list:   '/item-catalog-entities',
  show:   '/item-catalog-entities/{id}',
  create: '/item-catalog-entities',
  update: '/item-catalog-entities/{id}',
  delete: '/item-catalog-entities/{id}',
} satisfies CrudRoutes

export const itemCatalogEntityResource = defineCrudResource({
  key: 'item-catalog-entities',
  routes,
})

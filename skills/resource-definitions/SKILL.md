---
name: resource-definitions
description: Enforces explicit domain resource definitions used across contracts, api-client, queries, and mutations.
---

# Resource Definitions

## Goal

All domain resources must be explicitly defined in the **contracts package**.

Resources act as the **single source of truth** for:

- query keys
- mutation invalidation
- API routes
- dynamic CRUD logic
- shared domain references

---

# Resource Location

All resources must be defined inside:

```text
packages/contracts/src/resources/
Example:

packages/contracts/src/resources/
  product.resource.ts
  order.resource.ts
  category.resource.ts
  resources.ts

Applications and api-client must import resources from contracts.

Resource Shape

A resource definition should include at least:

export const productResource = {
  key: 'products',

  routes: {
    merchantList: '/merchant/products',
    adminList: '/admin/products',
    storefrontList: '/products',
    details: '/merchant/products/:id',
  },
} as const

The resource key represents the domain resource.

Resource Registry

All resources should be exported through a central registry.

Example:

export const resources = {
  products: productResource,
  orders: orderResource,
} as const
Usage in Query Keys

Query keys must use resource definitions.

Bad:

['products', '/merchant/products', params]

Good:

[
  productResource.key,
  productResource.routes.merchantList,
  params
]

Best practice is to use query key factories.

Usage in Mutations

CRUD/resource mutations must invalidate queries using the resource key.

Example:

queryClient.invalidateQueries({
  queryKey: [productResource.key],
})

Do not hardcode resource strings.

Import Rule

Apps and api-client must import resources from contracts.

Example:

import { productResource } from '@repo/contracts'

Resources must never be defined inside:

apps
api-client
components
hooks
Naming Rules

Resource keys must be:

lowercase
plural
domain oriented

Good:

'products'
'orders'
'categories'

Bad:

'product'
'Product'
'merchantProducts'
Do Not

Do not:

define resources in apps
duplicate route strings
use raw resource strings in query keys
use raw resource strings in invalidation
scatter resource identifiers across files

All resource references must originate from contracts.

Definition of Done

When introducing a new domain resource:

Create a resource definition in packages/contracts/src/resources.
Export it through the resources registry.
Use it in query keys and mutation invalidation.
Import it from contracts in api-client and apps
```

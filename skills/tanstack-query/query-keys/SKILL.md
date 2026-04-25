---
name: tanstack-query-keys
description: Use this skill when implementing TanStack Query. It enforces the project's query key convention and prevents inconsistent cache keys.
---

# TanStack Query Query Keys

## Goal

Use a **consistent query key structure** across the project to ensure predictable caching and invalidation.

---

# Query Key Shape

All query keys follow this structure:

```ts
[RESOURCE_KEY, ROUTE_PATH, params]
```

**Examples:**
- `["products", "/merchant/products", { page: 1 }]`
- `["products", "/admin/products", { search: "test" }]`
- `["orders", "/merchant/orders", { id: "123" }]`

---

# Important Rule

Do **not** write query keys directly in components. Instead, always use **query key factories**.

**Bad:**
```ts
useQuery({
  queryKey: ["products", "/merchant/products", params],
  queryFn: () => ...
});
```

**Good:**
```ts
useQuery({
  queryKey: productQueryKeys.merchantList(params),
  queryFn: () => ...
});
```

---

# Resource Keys

Define resource names in constants to avoid typos.

```ts
// packages/contracts/src/resources/index.ts
export const RESOURCE_KEYS = {
  PRODUCTS: "products",
  ORDERS: "orders",
  CATEGORIES: "categories",
} as const;
```

---

# Route Constants

Routes should also be defined once in `@repo/contracts`.

```ts
// packages/contracts/src/routes/product.routes.ts
export const PRODUCT_ROUTES = {
  MERCHANT_LIST: "/merchant/products",
  ADMIN_LIST: "/admin/products",
  STOREFRONT_LIST: "/products",
  DETAILS: "/merchant/products/:id",
} as const;
```

---

# Query Key Factory

Create small helper objects to generate query keys.

```ts
export const productQueryKeys = {
  all: [RESOURCE_KEYS.PRODUCTS] as const,
  
  merchantList: (params = {}) =>
    [RESOURCE_KEYS.PRODUCTS, PRODUCT_ROUTES.MERCHANT_LIST, params] as const,

  adminList: (params = {}) =>
    [RESOURCE_KEYS.PRODUCTS, PRODUCT_ROUTES.ADMIN_LIST, params] as const,

  details: (id: string) =>
    [RESOURCE_KEYS.PRODUCTS, PRODUCT_ROUTES.DETAILS, { id }] as const,
};
```

---

# Usage Example

```ts
export function useMerchantProducts(params) {
  return useQuery({
    queryKey: productQueryKeys.merchantList(params),
    queryFn: () => productApi.getMerchantProducts(params),
  });
}
```

---

# Invalidation Example

Invalidate **all** product queries:
```ts
queryClient.invalidateQueries({
  queryKey: productQueryKeys.all,
});
```

Invalidate merchant product lists:
```ts
queryClient.invalidateQueries({
  queryKey: [RESOURCE_KEYS.PRODUCTS, PRODUCT_ROUTES.MERCHANT_LIST],
});
```

---

# Params Rules

Params should be:
- **Serializable** (plain objects, strings, numbers)
- **Stable** (avoid inline objects if they trigger re-fetches unnecessarily)

**Avoid:**
- Functions
- Class instances
- Non-serializable values (Dates should be strings or timestamps)

---

# Summary

1. Query Key = `[RESOURCE_KEY, ROUTE_PATH, params]`
2. Always use **query key factories**.
3. Invalidate using the most specific key possible, or the root resource key for full reset.

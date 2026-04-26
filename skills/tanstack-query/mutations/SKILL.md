---
name: tanstack-query-mutations
description: Use this skill when implementing or modifying TanStack Query mutations. Enforces project conventions for mutation hooks, options passthrough, and invalidation.
---

# TanStack Query Mutations

## Goal

Keep mutations consistent, reusable, and cache-safe across the project.

---

# Core Rules

## 1. Do not define domain mutations inside components

**Bad:**

```ts
const mutation = useMutation({
  mutationFn: (dto) => productApi.create(dto),
})
```

**Good:**

```ts
const createProduct = useCreateProduct()
```

Components should consume mutation hooks, not define domain mutation logic.

## 2. Every domain mutation must have a custom hook

Examples:
- `useCreateProduct()`
- `useUpdateProduct()`
- `useDeleteProduct()`
- `useChangeOrderStatus()`
- `useAssignCategoryToProduct()`

The hook should live near the related feature/resource.

Recommended path: `features/[resource]/mutations/use-[action]-[resource].ts`

## 3. Mutation hooks must accept original mutation options

Custom hooks must allow passing TanStack Query mutation options.

**Example:**

```ts
export function useCreateProduct(
  options?: UseMutationOptions<Product, ApiError, CreateProductDto>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto) => productApi.create(dto),
    ...options,
    onSuccess: async (data, variables, context) => {
      // Internal Invalidation
      await queryClient.invalidateQueries({
        queryKey: [RESOURCE_KEYS.PRODUCTS],
      })

      // Call original callback if provided
      await options?.onSuccess?.(data, variables, context)
    },
  })
}
```

The project hook may add default behavior (like invalidation), but must not block native mutation options.

# API Layer Rule

Mutation functions must come from the API/client layer.

**Bad:**
```ts
mutationFn: async (dto) => fetch('/merchant/products', ...)
```

**Good:**
```ts
mutationFn: productApi.create
```

# Invalidation Rules

### 1. CRUD/resource mutations must invalidate related resource queries

For resource CRUD mutations, invalidate queries related to the same resource.

**Example:**
```ts
await queryClient.invalidateQueries({
  queryKey: [RESOURCE_KEYS.PRODUCTS],
})
```

This covers:
- `productQueryKeys.merchantList(...)`
- `productQueryKeys.adminList(...)`
- `productQueryKeys.details(...)`

### 2. Prefer resource-level invalidation by default

**Default:**
```ts
queryClient.invalidateQueries({
  queryKey: [RESOURCE_KEYS.PRODUCTS],
})
```

Use narrower invalidation only when it is clearly safe.

**Example:**
```ts
queryClient.invalidateQueries({
  queryKey: productQueryKeys.details(id),
})
```

# Mutation Options Order

Internal behavior and external callbacks must both run.

**Preferred pattern:**
```ts
return useMutation({
  mutationFn,
  ...options,
  onSuccess: async (data, variables, context) => {
    await internalInvalidation(data, variables, context)
    await options?.onSuccess?.(data, variables, context)
  },
})
```

Do not allow `options.onSuccess` to accidentally remove required invalidation.

# UI Side Effects

Avoid putting UI-only side effects inside domain mutation hooks. Keep these in the component:

```tsx
const createProduct = useCreateProduct({
  onSuccess: () => {
    toast.success('Product created')
    router.push('/products')
  },
})
```

Domain hooks should focus on:
- `mutationFn`
- Invalidation
- Shared domain behavior

# Optimistic Updates

Do not use optimistic updates by default. Use them only when:
- The UX benefit is clear
- Rollback behavior is simple
- Affected cache shape is well understood

# Naming Convention

Use action-based hook names:
- `useCreateProduct()`
- `useUpdateProduct()`
- `useDeleteProduct()`
- `usePublishProduct()`
- `useCancelOrder()`

# Checklist
- [ ] A custom hook exists for the mutation.
- [ ] The component uses the custom hook.
- [ ] The mutation function comes from the API/client layer.
- [ ] The hook accepts original TanStack Query mutation options.
- [ ] Related resource queries are invalidated after success.
- [ ] UI side effects are passed from the component through mutation options.

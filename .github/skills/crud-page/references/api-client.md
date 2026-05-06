# API Client Reference

## File Location

`packages/api/src/clients/<kebab-resource>.ts`

## Standard CrudClient Pattern (Preferred)

Use this when the resource has standard CRUD endpoints that exist in the OpenAPI schema.

```ts
import { CrudClient } from "../infra/crud-client"
import type { ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"

export const <RESOURCE>_ROUTES = {
    INDEX: "/api/<plural-resource>",
    BY_ID: "/api/<plural-resource>/{id}",
    // Add extra routes as needed:
    // EXPORT: "/api/<plural-resource>/export",
    // IMPORT: "/api/<plural-resource>/import",
    // RELATED: "/api/<related-resource>",
} as const satisfies Record<string, ApiPath>

export class <Resource>Client extends CrudClient<
    typeof <RESOURCE>_ROUTES.INDEX,
    typeof <RESOURCE>_ROUTES.BY_ID
> {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions, <RESOURCE>_ROUTES.INDEX, <RESOURCE>_ROUTES.BY_ID)
    }

    // Add domain-specific methods:
    // async listCategories() {
    //     return this.get(<RESOURCE>_ROUTES.RELATED)
    // }
    //
    // async export() {
    //     return this.get(<RESOURCE>_ROUTES.EXPORT)
    // }
}
```

### CrudClient Gives You For Free

| Method | HTTP | Description |
|---|---|---|
| `list(query?)` | `GET /api/<resource>` | Paginated list with query params |
| `show(id)` | `GET /api/<resource>/{id}` | Single item fetch |
| `create(payload)` | `POST /api/<resource>` | Create new item |
| `update(id, payload)` | `PUT /api/<resource>/{id}` | Update existing item |
| `destroy(id)` | `DELETE /api/<resource>/{id}` | Delete item |

## Minimal CrudClient (No Custom Methods)

For simple resources with only standard CRUD:

```ts
import { CrudClient } from "../infra/crud-client"
import type { ApiClientOptions } from "../infra/client"
import type { ApiPath } from "../infra/types"

export const <RESOURCE>_ROUTES = {
    INDEX: "/api/<plural-resource>",
    BY_ID: "/api/<plural-resource>/{id}",
} as const satisfies Record<string, ApiPath>

export class <Resource>Client extends CrudClient<
    typeof <RESOURCE>_ROUTES.INDEX,
    typeof <RESOURCE>_ROUTES.BY_ID
> {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions, <RESOURCE>_ROUTES.INDEX, <RESOURCE>_ROUTES.BY_ID)
    }
}
```

## Registration

After creating the client, register it in two files:

### 1. `packages/api/src/clients/index.ts`

```ts
export { <Resource>Client, <RESOURCE>_ROUTES } from "./<kebab-resource>"
```

### 2. `packages/api/src/api.ts`

Add the import at the top:
```ts
import { <Resource>Client } from "./clients/<kebab-resource>"
```

Add to the `createApi()` return object:
```ts
export function createApi(options?: ApiClientOptions) {
    return {
        // ...existing clients...
        <camelResource>: new <Resource>Client(undefined, options),
    }
}
```

## Real Example: CustomersClient

```ts
import { CrudClient } from "../infra/crud-client"
import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"

export const CUSTOMER_ROUTES = {
    INDEX: "/api/customers",
    BY_ID: "/api/customers/{id}",
    EXPORT: "/api/customers/export",
    IMPORT: "/api/customers/import",
    CUSTOMER_TYPES: "/api/customer-types",
} as const satisfies Record<string, ApiPath>

export class CustomersClient extends CrudClient<
    typeof CUSTOMER_ROUTES.INDEX,
    typeof CUSTOMER_ROUTES.BY_ID
> {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions, CUSTOMER_ROUTES.INDEX, CUSTOMER_ROUTES.BY_ID)
    }

    async listCustomerTypes() {
        return this.get(CUSTOMER_ROUTES.CUSTOMER_TYPES)
    }

    async export() {
        return this.get(CUSTOMER_ROUTES.EXPORT)
    }

    async import(payload: ApiRequestBody<typeof CUSTOMER_ROUTES.IMPORT, "post">) {
        return this.post(CUSTOMER_ROUTES.IMPORT, payload)
    }
}
```

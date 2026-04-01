import { CrudClient } from "../infra/crud-client"
import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath, ApiRequestBody } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const CUSTOMER_ROUTES = {
    INDEX: "/api/customers",
    BY_ID: "/api/customers/{id}",
    EXPORT: "/api/customers/export",
    IMPORT: "/api/customers/import",
    CUSTOMER_TYPES: "/api/customer-types",
} as const satisfies Record<string, ApiPath>

export class CustomersClient extends CrudClient<typeof CUSTOMER_ROUTES.INDEX, typeof CUSTOMER_ROUTES.BY_ID> {

    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions, CUSTOMER_ROUTES.INDEX, CUSTOMER_ROUTES.BY_ID)
   
    }

    async listCustomerTypes(query?: ApiListQueryParams) {
        return this.get(CUSTOMER_ROUTES.CUSTOMER_TYPES, query ? { query } as never : undefined)
    }
    
    async export() {
        return this.get(CUSTOMER_ROUTES.EXPORT)
    }

    async import(payload: ApiRequestBody<typeof CUSTOMER_ROUTES.IMPORT, "post">) {
        return this.post(CUSTOMER_ROUTES.IMPORT, payload)
    }
}

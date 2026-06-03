import { AuthClient } from "./clients/auth.client"
import { UnitsClient } from "./clients/units.client"
import { ApiClient, type ApiClientOptions } from "./infra/client"
import { CategoriesClient } from "./clients/categories.client"
import { WarehousesClient } from "./clients/warehouses.client"

export function createApi(options?: ApiClientOptions, baseUrl = 'http://localhost:4040') {
    const client = new ApiClient(baseUrl, options)
    return {
        client,
        auth: new AuthClient(client),
        units: new UnitsClient(client),
        categories: new CategoriesClient(client),
        warehouses: new WarehousesClient(client),
    }
}


export type Api = ReturnType<typeof createApi>

export const api = createApi(undefined, process.env.NEXT_PUBLIC_API_BASE_URL)

                
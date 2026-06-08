import { AuthClient } from "./clients/auth.client"
import { UnitsClient } from "./clients/units.client"
import { ApiClient, type ApiClientOptions } from "./infra/client"
import { CategoriesClient } from "./clients/categories.client"
import { WarehousesClient } from "./clients/warehouses.client"
import { PartiesClient } from "./clients/parties.client"
import { AccountsClient } from "./clients/account.client"
import { authResource, itemCategoryResource, unitResource, warehouseResource, partyResource, accountResource } from "@devloggers/api-contracts"

export function createApi(options?: ApiClientOptions, baseUrl = 'http://localhost:4040') {
    const client = new ApiClient(baseUrl, options)
    return {
        client,
        [authResource.key]: new AuthClient(client),
        [unitResource.key]: new UnitsClient(client),
        [itemCategoryResource.key]: new CategoriesClient(client),
        [warehouseResource.key]: new WarehousesClient(client),
        [partyResource.key]: new PartiesClient(client),
        [accountResource.key]: new AccountsClient(client),
    } as const
}


export type Api = ReturnType<typeof createApi>

export const api = createApi(undefined, process.env.NEXT_PUBLIC_API_BASE_URL)


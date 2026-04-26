import { AuthClient } from "./clients/auth.client"
import { ApiClient, type ApiClientOptions } from "./infra/client"


export function createApi(options?: ApiClientOptions, baseUrl = 'http://localhost:4040') {
    const client = new ApiClient(baseUrl, options)
    return {
        client,
        auth: new AuthClient(client),
    }
}


export type Api = ReturnType<typeof createApi>

export const api = createApi(undefined, process.env.NEXT_PUBLIC_API_BASE_URL)


import type { ApiClientOptions } from "./infra/client"


export function createApi(options?: ApiClientOptions) {
    return {

    }
}

/** Unauthenticated singleton — use for public calls (login, register) */
export const api = createApi()

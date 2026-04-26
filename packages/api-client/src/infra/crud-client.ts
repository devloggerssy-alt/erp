import { ApiClient } from "./client"
import { ApiListQueryParams } from '@devloggers/api-contracts'



import type { ApiPathByMethod, ApiQueryParams, ApiRequestBody, ApiResponse } from "./types"


type CrudIndexRoute = ApiPathByMethod<"get"> & ApiPathByMethod<"post">
type CrudByIdRoute = ApiPathByMethod<"put"> & ApiPathByMethod<"delete">

export abstract class CrudClient<
    IndexRoute extends CrudIndexRoute,
    ByIdRoute extends CrudByIdRoute,
> {


    constructor(
        protected apiClient: ApiClient,
        public indexRoute?: IndexRoute,
        public byIdRoute?: ByIdRoute
    ) {

    }

    async list(query?: ApiListQueryParams) {
        return this.apiClient.get(this.indexRoute as IndexRoute, query ? { query } as never : undefined)
    }

    async show(id: string) {
        return this.apiClient.get(this.byIdRoute as ByIdRoute & ApiPathByMethod<"get">, { params: { id } } as never)
    }

    async create(payload: ApiRequestBody<IndexRoute, "post">) {
        return this.apiClient.post<IndexRoute>(this.indexRoute as IndexRoute, payload as never)
    }

    async update(id: string, payload: ApiRequestBody<ByIdRoute, "put">) {
        return this.apiClient.put<ByIdRoute>(this.byIdRoute as ByIdRoute, payload as never, { params: { id } } as never)
    }

    async destroy(id: string) {
        return this.apiClient.delete<ByIdRoute>(this.byIdRoute as ByIdRoute, { params: { id } } as never)
    }
}

export type BaseCrudItem = { id: number }

/** Extract the list (GET index) response type from a CrudClient subclass. */
export type CrudListResponse<C> = C extends CrudClient<infer IR, infer _BR> ? ApiResponse<IR, "get"> : never

/** Extract the show (GET by-id) response type from a CrudClient subclass. */
export type CrudShowResponse<C> = C extends CrudClient<infer _IR, infer BR> ? ApiResponse<BR, "get"> : never

/** Extract a single item type from the `data` array of a CrudClient list response. */
export type CrudListItem<C> = CrudListResponse<C> extends { data?: (infer Item)[] } ? Item : never

/** Extract the query-parameter type accepted by a CrudClient's `list()` method. */
export type CrudListParams<C> = C extends CrudClient<infer IR, infer _BR> ? ApiQueryParams<IR, "get"> : never

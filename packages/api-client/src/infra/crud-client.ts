import { ApiClient, type ApiClientOptions } from "./client"
import type { ApiPathByMethod, ApiQueryParams, ApiRequestBody, ApiResponse } from "./types"
import type { ApiListQueryParams } from "../contracts/types"

export const DEFAULT_PER_PAGE = 10

type CrudIndexRoute = ApiPathByMethod<"get"> & ApiPathByMethod<"post">
type CrudByIdRoute = ApiPathByMethod<"put"> & ApiPathByMethod<"delete">

export abstract class CrudClient<
    IndexRoute extends CrudIndexRoute,
    ByIdRoute extends CrudByIdRoute,
> extends ApiClient {


    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions,

        public indexRoute?: IndexRoute,
        public byIdRoute?: ByIdRoute) {

        super(baseUrl, defaultOptions)

    }

    async list(query?: ApiListQueryParams): Promise<ApiResponse<IndexRoute, "get">> {
        return this.get(this.indexRoute as IndexRoute, query ? { query } as never : undefined)
    }

    async show(id: string) {
        return this.get(this.byIdRoute as ByIdRoute & ApiPathByMethod<"get">, { params: { id } } as never)
    }

    async create(payload: ApiRequestBody<IndexRoute, "post">) {
        return this.post<IndexRoute>(this.indexRoute as IndexRoute, payload as never)
    }

    async update(id: string, payload: ApiRequestBody<ByIdRoute, "put">) {
        return this.put<ByIdRoute>(this.byIdRoute as ByIdRoute, payload as never, { params: { id } } as never)
    }

    async destroy(id: string) {
        return this.delete<ByIdRoute>(this.byIdRoute as ByIdRoute, { params: { id } } as never)
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

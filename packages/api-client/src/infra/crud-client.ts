import { ApiClient } from "./client"
import type { ApiPathByMethod, ApiQueryParams, ApiRequestBody, ApiResponse } from "./types"


type ResourceRouteToApiPath<Route extends string> =
    Route extends `${infer Start}:${infer Param}/${infer Rest}`
    ? `${Start}{${Param}}/${ResourceRouteToApiPath<Rest>}`
    : Route extends `${infer Start}:${infer Param}`
    ? `${Start}{${Param}}`
    : Route

type EnsureSupportedRoute<Route extends string, ApiRoute> = [ApiRoute] extends [never] ? never : Route

type CrudIndexApiPath<Route extends string> = ResourceRouteToApiPath<Route> & ApiPathByMethod<"get"> & ApiPathByMethod<"post">
type CrudShowApiPath<Route extends string> = ResourceRouteToApiPath<Route> & ApiPathByMethod<"get">

export type CrudUpdateMethod = "put" | "patch"
type CrudUpdateApiPath<Route extends string, Method extends CrudUpdateMethod> = ResourceRouteToApiPath<Route> & ApiPathByMethod<Method>
type CrudDeleteApiPath<Route extends string> = ResourceRouteToApiPath<Route> & ApiPathByMethod<"delete">

export abstract class CrudClient<
    IndexRoute extends string,
    ByIdRoute extends string,
    UpdateMethod extends CrudUpdateMethod = "patch",
> {
    private readonly updateMethod: UpdateMethod
    private readonly deleteEnabled: boolean

    constructor(
        protected apiClient: ApiClient,
        public indexRoute: EnsureSupportedRoute<IndexRoute, CrudIndexApiPath<IndexRoute>>,
        public byIdRoute: EnsureSupportedRoute<ByIdRoute, CrudShowApiPath<ByIdRoute> & CrudUpdateApiPath<ByIdRoute, UpdateMethod>>,
        options: {
            updateMethod?: UpdateMethod
            enableDelete?: boolean
        } = {},
    ) {
        this.updateMethod = options.updateMethod ?? ("patch" as UpdateMethod)
        this.deleteEnabled = options.enableDelete ?? false
    }

    async list(query?: ApiQueryParams<CrudIndexApiPath<IndexRoute>, "get">) {
        return this.apiClient.get(this.indexApiPath, query ? { query } as never : undefined)
    }

    async show(id: string) {
        return this.apiClient.get(this.showApiPath, { params: { id } } as never)
    }

    async create(payload: ApiRequestBody<CrudIndexApiPath<IndexRoute>, "post">) {
        return this.apiClient.post(this.indexApiPath, payload as never)
    }

    async update(id: string, payload: ApiRequestBody<CrudUpdateApiPath<ByIdRoute, UpdateMethod>, UpdateMethod>) {
        return this.apiClient.request(this.updateApiPath, this.updateMethod, {
            params: { id },
            body: payload,
        } as never)
    }

    async destroy(id: string) {
      

        return this.apiClient.delete(this.deleteApiPath, { params: { id } } as never)
    }

    private get indexApiPath(): CrudIndexApiPath<IndexRoute> {
        return this.indexRoute.replace(/:([^/]+)/g, '{$1}') as CrudIndexApiPath<IndexRoute>
    }

    private get showApiPath(): CrudShowApiPath<ByIdRoute> {
        return this.byIdRoute.replace(/:([^/]+)/g, '{$1}') as CrudShowApiPath<ByIdRoute>
    }

    private get updateApiPath(): CrudUpdateApiPath<ByIdRoute, UpdateMethod> {
        return this.byIdRoute.replace(/:([^/]+)/g, '{$1}') as CrudUpdateApiPath<ByIdRoute, UpdateMethod>
    }

    private get deleteApiPath(): CrudDeleteApiPath<ByIdRoute> {
        return this.byIdRoute.replace(/:([^/]+)/g, '{$1}') as CrudDeleteApiPath<ByIdRoute>
    }
}

export type BaseCrudItem = { id: number }

/** Extract the list (GET index) response type from a CrudClient subclass. */
export type CrudListResponse<C> = C extends CrudClient<infer IR, infer _BR, infer _UM>
    ? ApiResponse<CrudIndexApiPath<IR>, "get">
    : never

/** Extract the show (GET by-id) response type from a CrudClient subclass. */
export type CrudShowResponse<C> = C extends CrudClient<infer _IR, infer BR, infer _UM>
    ? ApiResponse<CrudShowApiPath<BR>, "get">
    : never

/** Extract a single item type from the `data` array of a CrudClient list response. */
export type CrudListItem<C> = CrudListResponse<C> extends { data?: (infer Item)[] } ? Item : never

/** Extract the query-parameter type accepted by a CrudClient's `list()` method. */
export type CrudListParams<C> = C extends CrudClient<infer IR, infer _BR, infer _UM>
    ? ApiQueryParams<CrudIndexApiPath<IR>, "get">
    : never

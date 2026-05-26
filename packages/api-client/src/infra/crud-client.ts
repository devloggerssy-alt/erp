import type {
  CrudResource,
  ApiRequestBody,
  ApiQueryParams,
  ApiPathByMethod,
  ApiResponse,
} from "@devloggers/api-contracts"
import { ApiClient } from "./client"

/**
 * Generic CRUD client — resource-driven, strongly typed.
 *
 * All request/response types are inferred from the resource's route paths
 * via the generated OpenAPI types. No manual type definitions needed.
 *
 * @example
 * ```ts
 * class UnitsClient extends CrudClient<typeof unitResource> {
 *   constructor(api: ApiClient) { super(api, unitResource) }
 * }
 * // list() return type, create() body type, etc. — all inferred automatically
 * ```
 */
export class CrudClient<R extends CrudResource> {
  constructor(
    protected apiClient: ApiClient,
    protected resource: R,
  ) {
    this.key = resource.key
  }

  key: string;

  list(query?: ApiQueryParams<R["routes"]["list"], "get">): Promise<ApiResponse<R["routes"]["list"], "get">> {
    const route = this.resource.routes.list as ApiPathByMethod<"get">
    return this.apiClient.get(route, query ? { query } as never : undefined) as any
  }

  show(id: string): Promise<ApiResponse<R["routes"]["show"], "get">> {
    const route = this.resource.routes.show as ApiPathByMethod<"get">
    return this.apiClient.get(route, { params: { id } } as never) as any
  }

  create(body: ApiRequestBody<R["routes"]["create"], "post">): Promise<ApiResponse<R["routes"]["create"], "post">> {
    const route = this.resource.routes.create as ApiPathByMethod<"post">
    return this.apiClient.post(route, body as never) as any
  }

  update(id: string, body: ApiRequestBody<R["routes"]["update"], "patch">): Promise<ApiResponse<R["routes"]["update"], "patch">> {
    const route = this.resource.routes.update as ApiPathByMethod<"patch">
    return this.apiClient.patch(route, body as never, { params: { id } } as never) as any
  }

  destroy(id: string): Promise<ApiResponse<R["routes"]["delete"], "delete">> {
    const route = this.resource.routes.delete as ApiPathByMethod<"delete">
    return this.apiClient.delete(route, { params: { id } } as never) as any
  }
}

// ── Structural contracts — what resource components actually need ──

/** A client that can list resources (used by table/query hooks). */
export type CrudListClient<R extends CrudResource = CrudResource> = Pick<CrudClient<R>, "list" | "show" | 'key'>

/** A client that can list and delete resources (used by resource page components). */
export type CrudCollectionClient<R extends CrudResource = CrudResource> = Pick<CrudClient<R>, "list" | "destroy"|'key'>

// ── Response inference — derived from the client type, no manual definitions ──

export type BaseCrudItem = { id: string }

/** The resolved response type of a client's list() method. */
export type CrudListResponse<T extends CrudListClient> = Awaited<ReturnType<T["list"]>>

export type CrudShowResponse<T extends CrudListClient> = Awaited<ReturnType<T["show"]>>

/** A single item from the list response's data array. */
export type CrudListItem<T extends CrudListClient> =
  CrudListResponse<T> extends { data?: ReadonlyArray<infer I> } ? I : never


/** A list item guaranteed to have an id (as required by the resource layer). */
export type CrudListDataItem<T extends CrudListClient> = CrudListItem<T> & BaseCrudItem

/** The list response narrowed to the standard CRUD envelope used by the dashboard. */
export type CrudListDataResponse<T extends CrudListClient> = CrudListResponse<T> & {
  data?: ReadonlyArray<CrudListDataItem<T>>
  meta?: unknown
}

/** Call client.list() with a plain query object, returning the narrowed response type. */
export function listCrudData<T extends CrudListClient>(
  client: T,
  query: Record<string, unknown> = {},
): Promise<CrudListDataResponse<T>> {
  return client.list(query as unknown as Parameters<T["list"]>[0]) as Promise<CrudListDataResponse<T>>
}

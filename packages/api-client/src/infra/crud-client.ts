import type {
  CrudResource,
  ApiPathByMethod,
  ApiResponse,
} from "@devloggers/api-contracts"
import { ApiClient } from "./client"

export interface ICrudClient {
  key: string
  list(query?: Record<string, unknown>): Promise<{ data?: ReadonlyArray<BaseCrudItem>; meta?: unknown }>
  show(id: string): Promise<{ data?: BaseCrudItem }>
  create(body: unknown): Promise<unknown>
  update(id: string, body: unknown): Promise<unknown>
  destroy(id: string): Promise<unknown>
}

export class CrudClient<R extends CrudResource> implements ICrudClient {
  constructor(
    protected apiClient: ApiClient,
    protected resource: R,
  ) {
    this.key = resource.key
  }

  key: string;

  list(query?: Record<string, unknown>): Promise<ApiResponse<R["routes"]["list"], "get">> {
    const route = this.resource.routes.list as ApiPathByMethod<"get">
    return this.apiClient.get(route, query ? { query } as never : undefined) as any
  }

  show(id: string): Promise<ApiResponse<R["routes"]["show"], "get">> {
    const route = this.resource.routes.show as ApiPathByMethod<"get">
    return this.apiClient.get(route, { params: { id } } as never) as any
  }

  create(body: unknown): Promise<ApiResponse<R["routes"]["create"], "post">> {
    const route = this.resource.routes.create as ApiPathByMethod<"post">
    return this.apiClient.post(route, body as never) as any
  }

  update(id: string, body: unknown): Promise<ApiResponse<R["routes"]["update"], "patch">> {
    const route = this.resource.routes.update as ApiPathByMethod<"patch">
    return this.apiClient.patch(route, body as never, { params: { id } } as never) as any
  }

  destroy(id: string): Promise<ApiResponse<R["routes"]["delete"], "delete">> {
    const route = this.resource.routes.delete as ApiPathByMethod<"delete">
    return this.apiClient.delete(route, { params: { id } } as never) as any
  }
}

export type BaseCrudItem = { id: string }

export type CrudListResponse<T extends ICrudClient> = Awaited<ReturnType<T["list"]>>

export type CrudShowResponse<T extends ICrudClient> = Awaited<ReturnType<T["show"]>>

export type CrudListItem<T extends ICrudClient> =
  CrudListResponse<T> extends { data?: ReadonlyArray<infer I> } ? I : never

export type CrudListDataItem<T extends ICrudClient> = CrudListItem<T> & BaseCrudItem

export type CrudListDataResponse<T extends ICrudClient> = CrudListResponse<T> & {
  data?: ReadonlyArray<CrudListDataItem<T>>
  meta?: unknown
}

export function listCrudData<T extends ICrudClient>(
  client: T,
  query: Record<string, unknown> = {},
): Promise<CrudListDataResponse<T>> {
  return client.list(query) as Promise<CrudListDataResponse<T>>
}

export { CrudResource }

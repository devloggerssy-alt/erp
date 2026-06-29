import type {
  CrudResource,
  ApiPathByMethod,
  ApiResponse,
  ApiPath,
  ImportResultDto,
  BulkResult,
  BulkUpdateItem,
} from "@devloggers/api-contracts"
import { ApiClient } from "./client"
import { unwrapApiData } from "../utils/unwrap-api-data"

function triggerBrowserDownload(blob: Blob, filename: string): void {
  if (typeof document === "undefined") return
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export interface ICrudClient {
  key: string
  list(query?: Record<string, unknown>): Promise<unknown>
  show(id: string): Promise<unknown>
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

  create(body: unknown): Promise<ApiResponse<NonNullable<R["routes"]["create"]>, "post">> {
    const route = this.resource.routes.create as ApiPathByMethod<"post">
    return this.apiClient.post(route, body as never) as any
  }

  update(id: string, body: unknown): Promise<ApiResponse<NonNullable<R["routes"]["update"]>, "patch">> {
    const route = this.resource.routes.update as ApiPathByMethod<"patch">
    return this.apiClient.patch(route, body as never, { params: { id } } as never) as any
  }

  destroy(id: string): Promise<ApiResponse<NonNullable<R["routes"]["delete"]>, "delete">> {
    const route = this.resource.routes.delete as ApiPathByMethod<"delete">
    return this.apiClient.delete(route, { params: { id } } as never) as any
  }

  /**
   * Bulk delete by ids. Hits `DELETE /resource` with `{ ids: string[] }`.
   * Returns `{ total, succeeded, failed, errors }`.
   */
  async bulkDelete(ids: string[]): Promise<BulkResult> {
    const route = this.resource.routes.list as unknown as ApiPathByMethod<"delete">
    const response = await this.apiClient.delete(route, { body: { ids } } as never)
    return unwrapApiData<BulkResult>(response as unknown)
  }

  /**
   * Bulk partial update. Hits `PATCH /resource` with `{ items: BulkUpdateItem[] }`.
   * Each item is `{ id } & Partial<update DTO>` — every field except `id` is optional.
   * Returns `{ total, succeeded, failed, errors }`.
   */
  async bulkUpdate<TUpdateDto>(items: BulkUpdateItem<TUpdateDto>[]): Promise<BulkResult> {
    const route = this.resource.routes.list as unknown as ApiPathByMethod<"patch">
    const response = await this.apiClient.patch(route, { items } as never)
    return unwrapApiData<BulkResult>(response as unknown)
  }

  /** Downloads the Excel export (browser only). No-op server side. */
  async exportExcel(query: Record<string, unknown> = {}): Promise<void> {
    const route = this.getResourceRoute("export")
    if (!route) return
    const { blob, filename } = await this.apiClient.getBlob(route, query)
    triggerBrowserDownload(blob, filename)
  }

  /** Downloads the Excel import template (browser only). No-op server side. */
  async downloadImportTemplate(): Promise<void> {
    const route = this.getResourceRoute("importTemplate")
    if (!route) return
    const { blob, filename } = await this.apiClient.getBlob(route)
    triggerBrowserDownload(blob, filename)
  }

  /** Uploads an Excel file and returns the import result. Requires an `import` route. */
  async importExcel(file: File, dryRun = true): Promise<ImportResultDto> {
    const route = this.getResourceRoute("import")
    if (!route) {
      throw new Error(`Resource "${this.key}" does not support import`)
    }
    const formData = new FormData()
    formData.append("file", file)
    const query = dryRun ? "?dryRun=true" : "?dryRun=false"
    const response = await this.apiClient.postFormData(`${route}${query}`, formData)
    return unwrapApiData<ImportResultDto>(response)
  }

  private getResourceRoute(name: "export" | "importTemplate" | "import"): ApiPath | undefined {
    const routes = this.resource.routes as Record<string, ApiPath>
    const route = routes[name]
    return route
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
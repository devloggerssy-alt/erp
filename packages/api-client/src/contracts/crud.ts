import { ApiBaseResponse, ApiListQueryParams } from "./types"

export interface CrudOperations {
    list: <T>(params: ApiListQueryParams) => Promise<ApiBaseResponse<T>>
    create: <T>(payload: unknown) => Promise<ApiBaseResponse<T>>
    update: <T>(id: string, payload: unknown) => Promise<ApiBaseResponse<T>>
    destroy: <T>(id: string) => Promise<ApiBaseResponse<T>>
}
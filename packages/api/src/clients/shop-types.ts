import { ApiClient, type ApiClientOptions } from "../infra/client"
import type { ApiPath } from "../infra/types"
import type { ApiListQueryParams } from "../contracts/types"

export const SHOP_TYPE_ROUTES = {
    INDEX: "/api/shop-types",
    BY_ID: "/api/shop-types/{id}",
} as const satisfies Record<string, ApiPath>

export type ShopTypeCreatePayload = {
    title: string
    shop_type?: string
    note?: string
    is_default?: boolean
    inspection?: File | null
    image?: File | null
}

export type ShopTypeUpdatePayload = Partial<Omit<ShopTypeCreatePayload, "title">> & {
    title?: string
}

function buildShopTypeFormData(payload: ShopTypeCreatePayload | ShopTypeUpdatePayload): FormData {
    const fd = new FormData()
    if (payload.title) fd.append("title", payload.title)
    if (payload.shop_type) fd.append("shop_type", payload.shop_type)
    if (payload.note) fd.append("note", payload.note)
    if (payload.is_default != null) fd.append("is_default", String(Number(payload.is_default)))
    if (payload.inspection instanceof File) fd.append("inspection", payload.inspection)
    if (payload.image instanceof File) fd.append("image", payload.image)
    return fd
}

export class ShopTypesClient extends ApiClient {
    constructor(baseUrl?: string, defaultOptions?: ApiClientOptions) {
        super(baseUrl, defaultOptions)
    }

    async list(query?: ApiListQueryParams) {
        return this.get(SHOP_TYPE_ROUTES.INDEX, query ? { query } as never : undefined)
    }

    async create(payload: ShopTypeCreatePayload) {
        const fd = buildShopTypeFormData(payload)
        return this.postFormData(SHOP_TYPE_ROUTES.INDEX, fd)
    }

    async update(id: string, payload: ShopTypeUpdatePayload) {
        const fd = buildShopTypeFormData(payload)
        fd.append("_method", "PUT")
        const url = SHOP_TYPE_ROUTES.BY_ID.replace("{id}", id)
        return this.postFormData(url, fd)
    }

    async destroy(id: string) {
        return this.delete(SHOP_TYPE_ROUTES.BY_ID, { params: { id } })
    }
}



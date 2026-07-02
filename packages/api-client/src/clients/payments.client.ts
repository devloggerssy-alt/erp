import { paymentResource } from "@devloggers/api-contracts"
import type { ApiPathByMethod, CreatePaymentDto, UpdatePaymentDto, AllocatePaymentDto } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import type { ICrudClient, BaseCrudItem } from "../infra/crud-client"

export class PaymentsClient implements ICrudClient {
    readonly key = paymentResource.key

    constructor(private readonly apiClient: ApiClient) {}

    list(query?: Record<string, unknown>): Promise<{ data?: ReadonlyArray<BaseCrudItem>; meta?: unknown }> {
        const route = paymentResource.routes.list as ApiPathByMethod<"get">
        return this.apiClient.get(route, query ? ({ query } as never) : undefined) as Promise<{
            data?: ReadonlyArray<BaseCrudItem>
            meta?: unknown
        }>
    }

    show(id: string): Promise<{ data?: BaseCrudItem }> {
        const route = paymentResource.routes.details as ApiPathByMethod<"get">
        return this.apiClient.get(route, { params: { id } } as never) as Promise<{ data?: BaseCrudItem }>
    }

    create(body: unknown): Promise<unknown> {
        const route = paymentResource.routes.create as ApiPathByMethod<"post">
        return this.apiClient.post(route, body as CreatePaymentDto)
    }

    update(id: string, body: unknown): Promise<unknown> {
        const route = paymentResource.routes.update as ApiPathByMethod<"patch">
        return this.apiClient.patch(route, body as UpdatePaymentDto, { params: { id } } as never)
    }

    destroy(_id: string): Promise<unknown> {
        return Promise.reject(new Error("Payments cannot be deleted. Cancel the payment instead."))
    }

    post = (id: string): Promise<unknown> => {
        const route = paymentResource.routes.post as ApiPathByMethod<"post">
        return this.apiClient.post(route, undefined as never, { params: { id } } as never)
    }

    cancel = (id: string): Promise<unknown> => {
        const route = paymentResource.routes.cancel as ApiPathByMethod<"post">
        return this.apiClient.post(route, undefined as never, { params: { id } } as never)
    }

    allocate = (id: string, body: AllocatePaymentDto): Promise<unknown> => {
        const route = paymentResource.routes.allocate as ApiPathByMethod<"post">
        return this.apiClient.post(route, body as never, { params: { id } } as never)
    }

    removeAllocation = (id: string, allocationId: string): Promise<unknown> => {
        const route = paymentResource.routes.removeAllocation as ApiPathByMethod<"delete">
        return this.apiClient.delete(route, { params: { id, allocationId } } as never)
    }
}

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
        return this.apiClient.post(route, body as never)
    }

    update(id: string, body: unknown): Promise<unknown> {
        const route = paymentResource.routes.update as ApiPathByMethod<"patch">
        return this.apiClient.patch(route, body as never, { params: { id } } as never)
    }

    destroy(_id: string): Promise<unknown> {
        return Promise.reject(new Error("Payments cannot be deleted. Cancel the payment instead."))
    }

    post = (id: string) => {
        return this.apiClient.post(paymentResource.routes.post, undefined, { params: { id } })
    }

    cancel = (id: string) => {
        return this.apiClient.post(paymentResource.routes.cancel, undefined, { params: { id } })
    }

    allocate = (id: string, body: AllocatePaymentDto) => {
        return this.apiClient.post(paymentResource.routes.allocate, body, { params: { id } })
    }

    removeAllocation = (id: string, allocationId: string) => {
        return this.apiClient.post(paymentResource.routes.removeAllocation, undefined, {
            params: { id, allocationId },
        })
    }
}

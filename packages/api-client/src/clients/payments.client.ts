import { paymentResource } from "@devloggers/api-contracts"
import type { AllocatePaymentDto } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class PaymentsClient extends CrudClient<typeof paymentResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, paymentResource)
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

  destroy = (_id: string): Promise<never> =>
    Promise.reject(new Error("Payments cannot be deleted. Cancel the payment instead."))
}

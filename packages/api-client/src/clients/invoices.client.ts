import { invoiceResource } from "@devloggers/api-contracts"
import type { ApiPathByMethod, AddInvoicePaymentDto } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import { type ICrudClient, type BaseCrudItem, CrudClient } from "../infra/crud-client"

export class InvoicesClient extends CrudClient<typeof invoiceResource> {

  post = (id: string) => {
    const route = invoiceResource.routes.post as ApiPathByMethod<"post">
    return this.apiClient.post(route, undefined, { params: { id } })
  }

  cancel = (id: string) => {
    const route = invoiceResource.routes.cancel as ApiPathByMethod<"post">
    return this.apiClient.post(route, undefined, { params: { id } })
  }

  addPayment = (id: string, body: AddInvoicePaymentDto) => {
    const route = invoiceResource.routes.addPayment as ApiPathByMethod<"post">
    return this.apiClient.post(route, body as never, { params: { id } })
  }
}

import { invoiceResource } from "@devloggers/api-contracts"
import type { AddInvoicePaymentDto } from "@devloggers/api-contracts"
import { CrudClient } from "../infra/crud-client"

export class InvoicesClient extends CrudClient<typeof invoiceResource> {

  post = (id: string) => {
    return this.apiClient.post(invoiceResource.routes.post, undefined, { params: { id } })
  }

  cancel = (id: string) => {
    return this.apiClient.post(invoiceResource.routes.cancel, undefined, { params: { id } })
  }

  addPayment = (id: string, body: AddInvoicePaymentDto) => {
    return this.apiClient.post(invoiceResource.routes.addPayment, body, { params: { id } })
  }
}

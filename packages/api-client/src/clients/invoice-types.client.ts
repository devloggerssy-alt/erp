import { invoiceTypeResource } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class InvoiceTypesClient extends CrudClient<typeof invoiceTypeResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, invoiceTypeResource)
  }
}

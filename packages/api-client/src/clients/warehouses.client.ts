import { warehouseResource } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class WarehousesClient extends CrudClient<typeof warehouseResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, warehouseResource)
  }
}

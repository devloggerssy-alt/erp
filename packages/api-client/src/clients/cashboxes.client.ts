import { cashboxResource } from "@devloggers/api-contracts"
import type { ApiPathByMethod } from "@devloggers/api-contracts"
import { ApiClient } from "../infra/client"
import { type ICrudClient, type BaseCrudItem, CrudClient } from "../infra/crud-client"

export class CashboxesClient extends CrudClient<typeof cashboxResource> {
 
 
}

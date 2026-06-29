import { itemResource } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class ItemsClient extends CrudClient<typeof itemResource> {
    constructor(apiClient: ApiClient) {
        super(apiClient, itemResource)
    }
}
import { unitResource } from "@devloggers/api-contracts";
import { ApiClient, CrudClient } from "../infra";

export class UnitsClient extends CrudClient<typeof unitResource.routes.index, typeof unitResource.routes.byId> {
    constructor(apiClient: ApiClient) {
        super(apiClient, unitResource.routes.index, unitResource.routes.byId);
    }
}
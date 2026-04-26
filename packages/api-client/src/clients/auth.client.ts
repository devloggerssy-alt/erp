import { authResource } from "@devloggers/api-contracts";
import { ApiClient } from "../infra/client";
import { ApiRequestBody } from "../infra/types";


export class AuthClient {
    constructor(
        private readonly apiClient: ApiClient
    ) { }

    login = async (payload: ApiRequestBody<typeof authResource.routes.login, 'post'>) => {
        return this.apiClient.post(authResource.routes.login, payload)
    }

    me = async () => {
        return this.apiClient.get(authResource.routes.me)
    }

}
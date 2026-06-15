import { authResource, type ApiRequestBody } from "@devloggers/api-contracts";
import { ApiClient } from "../infra/client";


export class AuthClient {
    constructor(
        private readonly apiClient: ApiClient
    ) { }

    login = async (payload: ApiRequestBody<typeof authResource.routes.login, 'post'>) => {
        return this.apiClient.post(authResource.routes.login, payload)
    }

    register = async (payload: ApiRequestBody<typeof authResource.routes.register, 'post'>) => {
        return this.apiClient.post(authResource.routes.register, payload)
    }

    me = async () => {
        return this.apiClient.get(authResource.routes.me)
    }

}
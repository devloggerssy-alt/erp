import { userResource, type ApiRequestBody } from "@devloggers/api-contracts"
import { CrudClient } from "../infra"


export class UsersClient extends CrudClient<typeof userResource> {

    /** Self-service profile update for the authenticated user (PATCH /users/me). */
    updateMe = async (payload: ApiRequestBody<typeof userResource.routes.me, "patch">) => {
        return this.apiClient.patch(userResource.routes.me, payload)
    }

}

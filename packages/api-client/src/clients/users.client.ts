import { userResource } from "@devloggers/api-contracts"
import { CrudClient } from "../infra"


export class UsersClient extends CrudClient<typeof userResource> {


}

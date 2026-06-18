import { userResource } from "@devloggers/api-contracts"
import { CrudClient, type BaseCrudItem } from "../infra"


export class UsersClient extends CrudClient<typeof userResource> {


}

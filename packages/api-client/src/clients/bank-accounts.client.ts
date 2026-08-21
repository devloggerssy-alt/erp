import { bankAccountResource } from "@devloggers/api-contracts"
import { CrudClient } from "../infra/crud-client"

export class BankAccountsClient extends CrudClient<typeof bankAccountResource> {}

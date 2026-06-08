import { generateResource } from "@/shared/data-view/resource"
import { type AccountsClient } from "@devloggers/api-client"
import { accountResource } from "@devloggers/api-contracts"

export const AccountsResource = generateResource<AccountsClient>({
    getClient: (api) => api[accountResource.key],
    paramKey: "account",
    list: {
        searchIn: ["code", "name"],
        defaultSort: { field: "code", order: "asc" },
        pageSize: 500, // chart of accounts is small; load all for client-side tree
    },
})

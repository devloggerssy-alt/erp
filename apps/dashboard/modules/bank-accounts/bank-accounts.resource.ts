"use client"
import { generateResource } from "@/shared/data-view/resource"
import type { BankAccountsClient } from "@devloggers/api-client"

export const BankAccountsResource = generateResource<BankAccountsClient>({
    getClient: (api) => api["bank-accounts"],
    paramKey: "bank-accounts",
    list: {
        searchIn: ["code", "name"],
        defaultSort: { field: "code", order: "asc" },
    },
})

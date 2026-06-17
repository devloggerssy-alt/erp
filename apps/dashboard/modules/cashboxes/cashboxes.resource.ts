"use client"
import { generateResource } from "@/shared/data-view/resource"
import type { CashboxesClient } from "@devloggers/api-client"

export const CashboxesResource = generateResource<CashboxesClient>({
    getClient: (api) => api.cashboxes,
    paramKey: "cashboxes",
    list: {
        searchIn: ["code", "name"],
        defaultSort: { field: "code", order: "asc" },
    },
})

"use client"
import { generateResource } from "@/shared/data-view/resource"
import type { InvoicesClient } from "@devloggers/api-client"

export const InvoicesResource = generateResource<InvoicesClient>({
    getClient: (api) => api.invoices,
    paramKey: "invoices",
    list: {
        searchIn: ["number", "partyName"],
        defaultSort: { field: "createdAt", order: "desc" },
    },
})

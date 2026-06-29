"use client"
import { generateResource } from "@/shared/data-view/resource"
import type { PaymentsClient } from "@devloggers/api-client"

export const PaymentsResource = generateResource<PaymentsClient>({
    getClient: (api) => api.payments,
    paramKey: "payments",
    list: {
        searchIn: ["number"],
        defaultSort: { field: "createdAt", order: "desc" },
    },
})

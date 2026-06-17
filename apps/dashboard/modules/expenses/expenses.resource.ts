"use client"
import { generateResource } from "@/shared/data-view/resource"
import type { ExpensesClient } from "@devloggers/api-client"

export const ExpensesResource = generateResource<ExpensesClient>({
    getClient: (api) => api.expenses,
    paramKey: "expenses",
    list: {
        searchIn: ["number"],
        defaultSort: { field: "createdAt", order: "desc" },
    },
})

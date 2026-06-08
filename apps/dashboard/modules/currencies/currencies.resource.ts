import { generateResource } from "@/shared/data-view/resource"
import { type CurrenciesClient } from "@devloggers/api-client"

export const CurrenciesResource = generateResource<CurrenciesClient>({
    getClient: (api) => api.currencies,
    paramKey: "currencies",
    list: {
        searchIn: ["code", "name"],
        defaultSort: { field: "code", order: "asc" },
    },
})

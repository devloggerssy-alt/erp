import { generateResource } from "@/shared/data-view/resource"
import { type UnitsClient } from "@devloggers/api-client"

export const UnitsResource = generateResource<UnitsClient>({
    getClient: (api) => api.units,
    paramKey: "units",
    list: {
        searchIn: ["name", "abbreviation"],
        defaultSort: { field: "name", order: "asc" },
    },
})

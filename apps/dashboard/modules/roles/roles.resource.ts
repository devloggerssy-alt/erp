import { generateResource } from "@/shared/data-view/resource"
import { type RolesClient } from "@devloggers/api-client"

export const RolesResource = generateResource<RolesClient>({
    getClient: (api) => api.roles,
    paramKey: "roles",
    list: {
        searchIn: ["name"],
        defaultSort: { field: "name", order: "asc" },
    },
})

import { generateResource } from "@/shared/data-view/resource"
import { type BranchesClient } from "@devloggers/api-client"

export const BranchesResource = generateResource<BranchesClient>({
    getClient: (api) => api.branches,
    paramKey: "branches",
    list: {
        searchIn: ["code", "name", "address", "phone", "email"],
        defaultSort: { field: "name", order: "asc" },
    },
})

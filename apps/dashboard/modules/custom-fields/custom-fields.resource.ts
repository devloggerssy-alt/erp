import { generateResource } from "@/shared/data-view/resource"
import { type CustomFieldsClient } from "@devloggers/api-client"
import { customFieldModules } from "@devloggers/api-contracts"

export const CustomFieldsResource = generateResource<CustomFieldsClient>({
    getClient: (api) => api["custom-fields"],
    paramKey: "custom-fields",
    extraParams: { module: customFieldModules.items },
    list: {
        searchIn: ["module"],
        defaultSort: { field: "createdAt", order: "asc" },
    },
})

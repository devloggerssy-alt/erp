import { generateResource } from "@/shared/data-view/resource"
import { type TagsClient } from "@devloggers/api-client"

export const TagsResource = generateResource<TagsClient>({
    getClient: (api) => api.tags,
    paramKey: "tags",
    list: {
        searchIn: ["name"],
        defaultSort: { field: "name", order: "asc" },
    },
})

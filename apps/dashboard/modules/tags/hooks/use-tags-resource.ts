import type { TagsClient } from "@devloggers/api-client"
import type { ResourceContext } from "@/shared/data-view/resource"
import { useResourceContext } from "@/shared/data-view/resource"

export type TagsResourceContext = ResourceContext<TagsClient>

export function useTagsResource(): TagsResourceContext {
    return useResourceContext<TagsClient>()
}

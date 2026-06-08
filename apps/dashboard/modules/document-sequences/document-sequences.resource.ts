import { generateResource } from "@/shared/data-view/resource"
import { type DocumentSequencesClient } from "@devloggers/api-client"
import { documentSequenceResource } from "@devloggers/api-contracts"

export const DocumentSequencesResource = generateResource<DocumentSequencesClient>({
    getClient: (api) => api[documentSequenceResource.key],
    paramKey: "documentSequences",
    list: {
        searchIn: ["documentType", "prefix"],
        defaultSort: { field: "documentType", order: "asc" },
    },
})

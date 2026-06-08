import type { DocumentSequencesClient } from "@devloggers/api-client"
import type { ResourceContext } from "@/shared/data-view/resource"
import { useResourceContext } from "@/shared/data-view/resource"

export type DocumentSequencesResourceContext = ResourceContext<DocumentSequencesClient>

export function useDocumentSequencesResource(): DocumentSequencesResourceContext {
    return useResourceContext<DocumentSequencesClient>()
}

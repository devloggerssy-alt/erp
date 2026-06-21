import {
    itemResource,
    type ImportResultDto,
} from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"
import { unwrapApiData } from "../utils/unwrap-api-data"

function triggerBrowserDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
}

export class ItemsClient extends CrudClient<typeof itemResource> {
    constructor(apiClient: ApiClient) {
        super(apiClient, itemResource)
    }

    async exportExcel(query: Record<string, unknown> = {}): Promise<void> {
        const { blob, filename } = await this.apiClient.getBlob(
            itemResource.routes.export,
            query,
        )
        triggerBrowserDownload(blob, filename)
    }

    async downloadImportTemplate(): Promise<void> {
        const { blob, filename } = await this.apiClient.getBlob(
            itemResource.routes.importTemplate,
        )
        triggerBrowserDownload(blob, filename)
    }

    async importExcel(file: File, dryRun = true): Promise<ImportResultDto> {
        const formData = new FormData()
        formData.append("file", file)

        const query = dryRun ? "?dryRun=true" : "?dryRun=false"
        const response = await this.apiClient.postFormData(
            `${itemResource.routes.import}${query}`,
            formData,
        )
        return unwrapApiData<ImportResultDto>(response)
    }
}

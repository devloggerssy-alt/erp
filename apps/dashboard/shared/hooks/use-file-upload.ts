"use client"

import { useCallback } from "react"
import { useApi } from "@/shared/useApi"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

type UploadResponse = { url?: string }

function extractUploadUrl(data: unknown): string | null {
    const resolved = unwrapApiData<UploadResponse>(data)
    if (resolved.url) return resolved.url
    if (data && typeof data === "object" && "url" in data) {
        return (data as UploadResponse).url ?? null
    }
    return null
}

export function useFileUpload(folder = "items") {
    const api = useApi()

    return useCallback(
        async (file: File) => {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("folder", folder)

            const response = await api.client.postFormData("/files/upload", formData)
            const url = extractUploadUrl(response)
            if (!url) {
                throw new Error("Upload failed: no URL returned")
            }
            return url
        },
        [api, folder],
    )
}

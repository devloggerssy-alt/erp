"use client"

import { useCallback } from "react"
import { useApi } from "@/shared/useApi"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

type UploadResponse = { url?: string }

/** Uploads an avatar through the self-service route (JWT-only, no files.manage). */
export function useAvatarUpload() {
  const api = useApi()

  return useCallback(
    async (file: File) => {
      const formData = new FormData()
      formData.append("file", file)

      const response = await api.client.postFormData("/files/avatar", formData)
      const data = unwrapApiData<UploadResponse>(response)
      if (!data.url) {
        throw new Error("Upload failed: no URL returned")
      }
      return data.url
    },
    [api],
  )
}

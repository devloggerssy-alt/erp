"use client";

import { useContext } from "react"
import { ApiClientContext } from "./context"

export const useApiClient = () => {
    const { apiClient } = useContext(ApiClientContext)
    if (!apiClient) {
        throw new Error("ApiClient not provided, plz use ApiClientProvider")
    }
    return apiClient
}
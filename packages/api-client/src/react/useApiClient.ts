"use client";

import { useContext } from "react"
import { ApiClientContext } from "./context"

export const useApiClient = () => {
    const { api } = useContext(ApiClientContext)
    if (!api) {
        throw new Error("Api not provided, please use ApiClientProvider")
    }
    return api
}
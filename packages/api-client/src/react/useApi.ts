"use client";

import { useContext } from "react"
import { ApiContext } from "./context"

export const useApi = () => {
    const { api } = useContext(ApiContext)
    if (!api) {
        throw new Error("Api not provided, please use ApiProvider")
    }
    return api
}

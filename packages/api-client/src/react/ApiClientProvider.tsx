"use client"
import { ApiClient, ApiConfig } from "../core/apiClient"
import { createContext } from 'react'
import { FetchHttpClient, HttpClientOptions } from "../core/fetchHttpClient"
import { ApiClientContext } from "./context"





export const ApiClientProvider = ({ children, apiConfig, httpClientConfig }: { children: React.ReactNode, httpClientConfig?: HttpClientOptions, apiConfig: ApiConfig }) => {

    const httpClient = new FetchHttpClient(httpClientConfig)
    const apiClient = new ApiClient(httpClient, apiConfig)


    return <ApiClientContext.Provider value={{ apiClient }}> {children} </ApiClientContext.Provider>
}
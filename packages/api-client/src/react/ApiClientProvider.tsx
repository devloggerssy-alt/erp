"use client"
import React, { useMemo } from 'react'
import { ApiClientContext } from "./context"
import { createApi } from "../api"
import { ApiClientOptions } from '../infra/client'

export const ApiClientProvider = ({ 
    children, 
    options, 
    baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL 
}: { 
    children: React.ReactNode, 
    options?: ApiClientOptions, 
    baseUrl?: string 
}) => {
    const api = useMemo(() => createApi(options, baseUrl), [options, baseUrl])

    return <ApiClientContext.Provider value={{ api }}> {children} </ApiClientContext.Provider>
}
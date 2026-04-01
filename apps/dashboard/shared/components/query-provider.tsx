"use client"

import * as React from "react"
import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (isServer) {
    return createQueryClient()
  }

  browserQueryClient ??= createQueryClient()

  return browserQueryClient
}

function QueryProvider({ children }: React.PropsWithChildren) {
  const queryClient = getQueryClient()

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

export { QueryProvider }
"use client"

import * as React from "react"
import {
  isServer,
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { businessSetupStateKey } from "@/shared/hooks/use-setup-readiness"

export function createQueryClient() {
  const queryClient: QueryClient = new QueryClient({
    mutationCache: new MutationCache({
      // Setup tasks complete by discovery — GET /business-setup/state re-derives them from existing
      // data — so any successful write (a currency, a cashbox, an AI-agent tool call…) can move a task.
      // Marking the state stale here keeps the hub and progress banner current without every feature
      // knowing about setup. Not returned: mutation-cache callbacks are awaited, and saves must not
      // wait on this refetch.
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: businessSetupStateKey })
      },
    }),
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
  return queryClient
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
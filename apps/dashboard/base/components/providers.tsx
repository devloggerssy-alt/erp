"use client"

import * as React from "react"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { ApiClientProvider } from '@devloggers/api-client/react'

import { QueryProvider } from "@/shared/components/query-provider"
import { ThemeProvider } from "@/shared/components/theme-provider"
import { Toaster } from "@/shared/components/ui/sonner"
import { ConfirmDialog } from "@/shared/components/confirm-dialog"
import { CONSTANTS } from "@/config/constants"
import { useAuth } from "@/shared/hooks/use-auth"

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const { token } = useAuth()

  return (
    <NuqsAdapter>
      <ThemeProvider>
        <QueryProvider>
          <ApiClientProvider 
            baseUrl={CONSTANTS.apiUrl} 
            options={{
              headers: {
                'Authorization': token ? `Bearer ${token}` : ""
              }
            }}
          >
            {children}
          </ApiClientProvider>
        </QueryProvider>
        <Toaster />
        <ConfirmDialog />
      </ThemeProvider>
    </NuqsAdapter>
  )
}

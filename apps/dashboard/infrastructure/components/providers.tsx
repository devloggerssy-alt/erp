"use client"

import * as React from "react"
import { useLocale } from "next-intl"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { ApiProvider } from '@devloggers/api-client/react'

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
  const locale = useLocale()

  const options = React.useMemo(() => ({
    headers: {
      'Authorization': token ? `Bearer ${token}` : ""
    },
    locale,
  }), [token, locale])

  return (
    <NuqsAdapter>
      <ThemeProvider>
        <QueryProvider>
          <ApiProvider 
            baseUrl={CONSTANTS.apiUrl} 
            options={options}
          >
            {children}
          </ApiProvider>
        </QueryProvider>
        <Toaster />
        <ConfirmDialog />
      </ThemeProvider>
    </NuqsAdapter>
  )
}

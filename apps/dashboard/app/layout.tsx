import { Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { QueryProvider } from "@/shared/components/query-provider"
import { ThemeProvider } from "@/shared/components/theme-provider"
import { Toaster } from "@/shared/components/ui/sonner"
import { ConfirmDialog } from "@/shared/components/confirm-dialog"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { cn } from "@/shared/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body>
        <NuqsAdapter>
          <ThemeProvider>
            <QueryProvider>{children}</QueryProvider>
            <Toaster />
            <ConfirmDialog />
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  )
}

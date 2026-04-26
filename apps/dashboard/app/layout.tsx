import { Geist_Mono, Tajawal } from "next/font/google"

import "./globals.css"
import { cn } from "@/shared/lib/utils"
import { Providers } from "@/base/components/providers"

const tajawal = Tajawal({ subsets: ["arabic", 'latin'], variable: "--font-tajwal", weight: ['200', '300', '400', '700', '800', '900'] })


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      dir="rtl"
      lang="ar"
      suppressHydrationWarning
      className={cn("antialiased", "font-tajwal", tajawal.variable)}
    >
      <body dir="rtl">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}

import { Geist_Mono, Tajawal } from "next/font/google"
import { getLocale } from "next-intl/server"

import "./globals.css"
import { cn } from "@/shared/lib/utils"

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  variable: "--font-tajwal",
  weight: ["200", "300", "400", "700", "800", "900"],
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const isRtl = locale === "ar"

  return (
    <html
      dir={isRtl ? "rtl" : "ltr"}
      lang={locale}
      suppressHydrationWarning
      className={cn(
        "antialiased",
        "font-tajwal",
        tajawal.variable,
        geistMono.variable,
      )}
    >
      <body dir={isRtl ? "rtl" : "ltr"}>{children}{/* impeccable-live-start */}
<script src="http://localhost:8400/live.js"></script>
{/* impeccable-live-end */}
</body>
    </html>
  )
}

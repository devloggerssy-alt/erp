"use client"

import Link from "next/link"
import { AlertTriangleIcon } from "lucide-react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useTranslations } from "next-intl"
import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"
import type { StockBalanceReportItem } from "@devloggers/api-client"

export function DashboardLowStock() {
    const t = useTranslations("business.dashboard.lowStock")
    const api = useApi()

    const { data: stockData, isLoading } = useQuery({
        queryKey: ["dashboard", "low-stock"],
        queryFn: () => api.reports.stockBalance(),
    })

    const lowItems = (Array.isArray(stockData) ? stockData : [])
        .filter((item: StockBalanceReportItem) => Number(item.quantity) <= 0)
        .slice(0, 5)

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-500">
                    <AlertTriangleIcon className="h-4 w-4" />
                    {t("title")}
                </CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                    {isLoading
                        ? Array.from({ length: 4 }).map((_, i) => (
                              <Skeleton key={i} className="h-10 w-full" />
                          ))
                        : lowItems.map((item: StockBalanceReportItem) => (
                              <div
                                  key={`${item.itemId}-${item.warehouseId}`}
                                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                              >
                                  <div className="space-y-0.5 min-w-0">
                                      <p className="text-sm font-medium truncate">
                                          {item.itemName ?? item.itemCode}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                          {item.warehouseName}
                                      </p>
                                  </div>
                                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm shrink-0 ms-2">
                                      {item.quantity}
                                  </div>
                              </div>
                          ))}
                </div>
                <Button variant="outline" className="w-full mt-4" asChild>
                    <Link href="/inventory/stock-balances">{t("viewAll")}</Link>
                </Button>
            </CardContent>
        </Card>
    )
}

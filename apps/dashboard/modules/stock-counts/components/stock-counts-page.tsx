"use client"

import { useTranslations } from "next-intl"
import { StockCountsResource } from "../stock-counts.resource"
import { StockCountsForm } from "./stock-counts-form"
import { createStockCountsColumns } from "./stock-counts-columns"
import { useStockCountActions } from "../hooks/use-stock-count-actions"

export function StockCountsPage() {
    const t = useTranslations("business.resources.stockCounts")
    const { postStockCount } = useStockCountActions()
    return (
        <StockCountsResource>
            <StockCountsResource.Page
                title={t("title")}
                actions={
                    <StockCountsResource.FormDialog
                        title={(it) => (it?.id ? it.number : t("addAction"))}
                        form={StockCountsForm}
                    />
                }
            >
                <StockCountsResource.Table
                    columns={(helpers) => createStockCountsColumns(helpers, t, { postStockCount })}
                />
            </StockCountsResource.Page>
        </StockCountsResource>
    )
}

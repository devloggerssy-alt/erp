"use client"

import { useTranslations } from "next-intl"
import { StockBalancesResource } from "../stock-balances.resource"
import { createStockBalancesColumns } from "./stock-balances-columns"

export function StockBalancesPage() {
    const t = useTranslations("business.resources.stockBalances")
    return (
        <StockBalancesResource>
            <StockBalancesResource.Page title={t("title")}>
                <StockBalancesResource.Table
                    columns={(helpers) => createStockBalancesColumns(helpers, t)}
                />
            </StockBalancesResource.Page>
        </StockBalancesResource>
    )
}

"use client"

import { useTranslations } from "next-intl"
import { StockMovementsResource } from "../stock-movements.resource"
import { createStockMovementsColumns } from "./stock-movements-columns"

export function StockMovementsPage() {
    const t = useTranslations("business.resources.stockMovements")
    return (
        <StockMovementsResource>
            <StockMovementsResource.Page title={t("title")}>
                <StockMovementsResource.Table
                    columns={(helpers) => createStockMovementsColumns(helpers, t)}
                />
            </StockMovementsResource.Page>
        </StockMovementsResource>
    )
}

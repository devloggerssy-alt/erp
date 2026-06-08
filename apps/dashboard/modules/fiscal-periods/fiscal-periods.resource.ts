import { generateResource } from "@/shared/data-view/resource"
import { type FiscalPeriodsClient } from "@devloggers/api-client"
import { fiscalPeriodResource } from "@devloggers/api-contracts"

export const FiscalPeriodsResource = generateResource<FiscalPeriodsClient>({
    getClient: (api) => api[fiscalPeriodResource.key],
    paramKey: "fiscalPeriods",
    list: {
        searchIn: ["name"],
        defaultSort: { field: "startDate", order: "desc" },
    },
})

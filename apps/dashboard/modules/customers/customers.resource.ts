"use client"
import { generateResource } from "@/shared/data-view/resource"
import { type PartiesClient } from "@devloggers/api-client"
import { partyModeListExtraParams } from "@/modules/parties"

export const CustomersResource = generateResource<PartiesClient>({
    getClient: (api) => api.parties,
    paramKey: "customers",
    extraParams: partyModeListExtraParams("CUSTOMER"),
    list: {
        searchIn: ["name", "code", "phone", "email"],
        defaultSort: { field: "name", order: "asc" },
    },
})

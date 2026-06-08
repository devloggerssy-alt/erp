"use client"
import { generateResource } from "@/shared/data-view/resource"
import { type PartiesClient } from "@devloggers/api-client"
import { partyModeListExtraParams } from "@/modules/parties"

export const SuppliersResource = generateResource<PartiesClient>({
    getClient: (api) => api.parties,
    paramKey: "suppliers",
    extraParams: partyModeListExtraParams("SUPPLIER"),
    list: {
        searchIn: ["name", "code", "phone", "email"],
        defaultSort: { field: "name", order: "asc" },
    },
})

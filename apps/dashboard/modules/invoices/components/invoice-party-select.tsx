"use client"

import { useTranslations } from "next-intl"
import type { PartiesClient } from "@devloggers/api-client"
import { RhfResourceSelect } from "@/shared/components/form"
import type { InvoiceFormValues, InvoiceRelationalField } from "../invoices.config"
import { PartyType } from "@devloggers/api-contracts"

export type PartyTypeFilter = PartyType

export function InvoicePartySelect({
    partyTypes,
    disabled,
}: {
    partyTypes: PartyTypeFilter[]
    disabled: boolean
}) {
    const t = useTranslations("business.resources.invoices")

    return (
        <RhfResourceSelect<InvoiceFormValues, "party", PartiesClient, InvoiceRelationalField>
            name="party"
            label={t("party")}
            client={(api) => api.parties}
            getLabel={(it) => it.name}
            getValue={(it) => it}
            required
            disabled={disabled}
            queryKey={["parties", "select", ...partyTypes]}
            extraQuery={{ filters: { type: { $in: partyTypes } } }}
        />
    )
}

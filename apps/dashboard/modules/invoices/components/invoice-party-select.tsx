"use client"

import { useTranslations } from "next-intl"
import type { PartiesClient } from "@devloggers/api-client"
import { RhfResourceSelect } from "@/shared/components/form"
import type { InvoiceFormValues, InvoiceRelationalField } from "../invoices.config"
import { PartyType } from "@devloggers/api-contracts"
import { InlinePartyCreateForm } from "@/modules/parties/components/inline-party-create-form"
import { PARTY_MODE_NAMESPACE, type PartyMode } from "@/modules/parties/parties.config"

export type PartyTypeFilter = PartyType

const PARTY_MODE_CONFIG_HREF: Record<PartyMode, string> = {
    CUSTOMER: "/parties/customers",
    SUPPLIER: "/parties/suppliers",
}

export function InvoicePartySelect({
    partyTypes,
    disabled,
    label
}: {
    partyTypes: PartyTypeFilter[]
    disabled: boolean
    label?: string
}) {
    const t = useTranslations("business.resources.invoices")
    const primaryType: PartyMode = partyTypes.includes("SUPPLIER") ? "SUPPLIER" : "CUSTOMER"
    const tp = useTranslations(PARTY_MODE_NAMESPACE[primaryType])

    return (
        <RhfResourceSelect<InvoiceFormValues, "party", PartiesClient, InvoiceRelationalField>
            name="party"
            label={label || t("party")}
            client={(api) => api.parties}
            getLabel={(it) => it.name}
            getValue={(it) => it}
            required
            disabled={disabled}
            queryKey={["parties", "select", ...partyTypes]}
            extraQuery={{ filters: { type: { $in: partyTypes } } }}
            createForm={(props) => <InlinePartyCreateForm {...props} partyType={primaryType} />}
            createLabel={tp("entity")}
            configPageHref={PARTY_MODE_CONFIG_HREF[primaryType]}
        />
    )
}

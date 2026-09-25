"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { Input } from "@/shared/components/ui/input"
import { useApi } from "@/shared/useApi"
import type { PartiesClient, CrudListDataItem } from "@devloggers/api-client"

type PosParty = CrudListDataItem<PartiesClient>

type PosCustomerPickerProps = {
    defaultPartyName: string
    selectedPartyId: string | null
    onSelect: (partyId: string | null) => void
}

export function PosCustomerPicker({ defaultPartyName, selectedPartyId, onSelect }: PosCustomerPickerProps) {
    const t = useTranslations("business.pos")
    const api = useApi()
    const [query, setQuery] = useState("")

    const partiesQuery = useQuery({
        queryKey: ["pos", "parties", query],
        queryFn: () => api.parties.list({ name: query, limit: 6 }),
        enabled: query.length > 0,
    })

    if (selectedPartyId) {
        return (
            <div className="flex items-center justify-between text-sm">
                <span>{t("customer")}: <strong>{query || t("namedCustomer")}</strong></span>
                <button type="button" className="text-primary underline" onClick={() => { onSelect(null); setQuery("") }}>
                    {t("useWalkIn")}
                </button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">{t("customer")}: {defaultPartyName}</span>
            <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("customerSearchPlaceholder")}
                className="h-9"
            />
            {partiesQuery.data?.data && partiesQuery.data.data.length > 0 && (
                <div className="flex flex-col gap-1 rounded-md border p-1">
                    {partiesQuery.data.data.map((party: PosParty) => (
                        <button
                            key={party.id}
                            type="button"
                            className="rounded px-2 py-1 text-start text-sm hover:bg-muted"
                            onClick={() => onSelect(party.id)}
                        >
                            {party.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

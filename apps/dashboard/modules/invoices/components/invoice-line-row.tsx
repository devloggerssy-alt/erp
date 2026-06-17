"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"
import { useWatch } from "react-hook-form"
import type { Control, UseFormSetValue, UseFormGetValues } from "react-hook-form"
import { Trash2Icon } from "lucide-react"
import type { CrudListDataItem, ItemsClient, UnitsClient } from "@devloggers/api-client"
import { Button } from "@/shared/components/ui/button"
import { RhfTextField, RhfResourceSelect } from "@/shared/components/form"
import { computeLineTotals } from "../invoices.config"
import type {
    InvoiceFormValues,
    InvoiceLineFormValues,
    InvoiceItemOption,
    InvoiceUnitOption,
    InvoiceDirection,
} from "../invoices.config"

// ── Types ──────────────────────────────────────────────────────────────────────

export type InvoiceLineRowProps = {
    index: number
    control: Control<InvoiceFormValues>
    setValue: UseFormSetValue<InvoiceFormValues>
    getValues: UseFormGetValues<InvoiceFormValues>
    direction: InvoiceDirection
    onRemove: () => void
    disabled: boolean
}

// ── Component ──────────────────────────────────────────────────────────────────

export function InvoiceLineRow({
    index,
    control,
    setValue,
    getValues,
    direction,
    onRemove,
    disabled,
}: InvoiceLineRowProps) {
    const t = useTranslations("business.resources.invoices")

    // Watch the full item object to auto-fill unit + price on selection
    const itemOption = useWatch({
        control,
        name: `lines.${index}._item` as `lines.${number}._item`,
    }) as InvoiceItemOption | null

    useEffect(() => {
        if (!itemOption?.id) return

        setValue(`lines.${index}.itemId` as `lines.${number}.itemId`, itemOption.id)

        const currentUnit = getValues(`lines.${index}._unit` as `lines.${number}._unit`) as { id: string } | null
        if (!currentUnit?.id && itemOption.baseUnitId) {
            setValue(`lines.${index}._unit` as `lines.${number}._unit`, { id: itemOption.baseUnitId })
        }

        const currentPrice = getValues(`lines.${index}.unitPrice` as `lines.${number}.unitPrice`)
        if (!currentPrice || currentPrice === 0) {
            const price = direction === "PURCHASE"
                ? (itemOption.latestPurchasePrice ?? 0)
                : (itemOption.defaultSellingPrice ?? 0)
            setValue(`lines.${index}.unitPrice` as `lines.${number}.unitPrice`, Number(price))
        }
    }, [itemOption?.id]) // eslint-disable-line react-hooks/exhaustive-deps

    // Watch the full line for live total display
    const watchedLine = useWatch({
        control,
        name: `lines.${index}` as `lines.${number}`,
    }) as InvoiceLineFormValues

    const { lineTotal } = computeLineTotals(watchedLine)

    return (
        <tr className="border-b last:border-0 group">
            <td className="p-1 min-w-[180px]">
                <RhfResourceSelect<
                    InvoiceFormValues,
                    `lines.${number}._item`,
                    ItemsClient,
                    InvoiceItemOption
                >
                    name={`lines.${index}._item` as `lines.${number}._item`}
                    client={(api) => api.items}
                    getLabel={(it) => `${it.code ?? ""} ${it.name ?? ""}`.trim()}
                    getValue={(it) => it}
                    getId={(it) => it.id}
                    searchIn={["code", "name"]}
                    placeholder={t("lines.item")}
                    disabled={disabled}
                    pageSize={30}
                />
            </td>
            <td className="p-1 min-w-[120px]">
                <RhfResourceSelect<
                    InvoiceFormValues,
                    `lines.${number}._unit`,
                    UnitsClient,
                    CrudListDataItem<UnitsClient>
                >
                    name={`lines.${index}._unit` as `lines.${number}._unit`}
                    client={(api) => api.units}
                    getLabel={(it) => it.name}
                    getValue={(it) => it}
                    getId={(it) => it.id}
                    placeholder={t("lines.unit")}
                    disabled={disabled}
                    pageSize={30}
                />
            </td>
            <td className="p-1 w-20">
                <RhfTextField<InvoiceFormValues, `lines.${number}.quantity`>
                    name={`lines.${index}.quantity` as `lines.${number}.quantity`}
                    type="number"
                    placeholder="1"
                    disabled={disabled}
                />
            </td>
            <td className="p-1 w-28">
                <RhfTextField<InvoiceFormValues, `lines.${number}.unitPrice`>
                    name={`lines.${index}.unitPrice` as `lines.${number}.unitPrice`}
                    type="number"
                    placeholder="0"
                    disabled={disabled}
                />
            </td>
            <td className="p-1 w-16">
                <RhfTextField<InvoiceFormValues, `lines.${number}.discountPercent`>
                    name={`lines.${index}.discountPercent` as `lines.${number}.discountPercent`}
                    type="number"
                    placeholder="0"
                    disabled={disabled}
                />
            </td>
            <td className="p-1 w-16">
                <RhfTextField<InvoiceFormValues, `lines.${number}.taxPercent`>
                    name={`lines.${index}.taxPercent` as `lines.${number}.taxPercent`}
                    type="number"
                    placeholder="0"
                    disabled={disabled}
                />
            </td>
            <td className="p-1 w-28 text-end tabular-nums text-sm font-medium">
                {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td className="p-1 w-8">
                {!disabled && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                        onClick={onRemove}
                    >
                        <Trash2Icon className="h-3.5 w-3.5" />
                    </Button>
                )}
            </td>
        </tr>
    )
}

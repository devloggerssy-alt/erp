"use client"

import { useEffect } from "react"
import { useWatch } from "react-hook-form"
import type { Control, UseFormSetValue } from "react-hook-form"
import { Trash2Icon } from "lucide-react"
import type { AccountsClient } from "@devloggers/api-client"
import { Button } from "@/shared/components/ui/button"
import { RhfTextField, RhfResourceSelect } from "@/shared/components/form"
import type { ExpenseFormValues, ExpenseRelationalField } from "../expenses.config"

export type ExpenseLineRowProps = {
    index: number
    control: Control<ExpenseFormValues>
    setValue: UseFormSetValue<ExpenseFormValues>
    onRemove: () => void
    disabled: boolean
}

export function ExpenseLineRow({
    index,
    control,
    setValue,
    onRemove,
    disabled,
}: ExpenseLineRowProps) {
    const accountOption = useWatch({
        control,
        name: `items.${index}._account` as `items.${number}._account`,
    }) as { id: string } | null

    // Keep hidden accountId in sync when account changes — used by toCreateExpenseDto
    useEffect(() => {
        // no-op: _account.id is extracted directly in the DTO builder
    }, [accountOption?.id]) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <tr className="border-b last:border-0 group">
            <td className="p-1 min-w-[220px]">
                <RhfResourceSelect<
                    ExpenseFormValues,
                    `items.${number}._account`,
                    AccountsClient,
                    ExpenseRelationalField
                >
                    name={`items.${index}._account` as `items.${number}._account`}
                    client={(api) => api['chart-of-accounts']}
                    getLabel={(it) => `${(it as any).code ?? ""} — ${(it as any).name ?? ""}`.trim()}
                    getValue={(it) => it}
                    getId={(it) => it.id}
                    searchIn={["code", "name"]}
                    placeholder="Select account"
                    disabled={disabled}
                    pageSize={30}
                />
            </td>
            <td className="p-1 min-w-[200px]">
                <RhfTextField<ExpenseFormValues, `items.${number}.description`>
                    name={`items.${index}.description` as `items.${number}.description`}
                    placeholder="Description"
                    disabled={disabled}
                />
            </td>
            <td className="p-1 w-32">
                <RhfTextField<ExpenseFormValues, `items.${number}.amount`>
                    name={`items.${index}.amount` as `items.${number}.amount`}
                    type="number"
                    placeholder="0.00"
                    disabled={disabled}
                />
            </td>
            <td className="p-1 min-w-[160px]">
                <RhfTextField<ExpenseFormValues, `items.${number}.notes`>
                    name={`items.${index}.notes` as `items.${number}.notes`}
                    placeholder="Notes (optional)"
                    disabled={disabled}
                />
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

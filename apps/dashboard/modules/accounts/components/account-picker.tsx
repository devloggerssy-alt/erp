"use client"

import { useMemo, useState } from "react"
import { useController, useFormContext, type FieldValues, type FieldPath } from "react-hook-form"
import { useQuery } from "@tanstack/react-query"
import { ChevronsUpDown, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useApi } from "@/shared/useApi"
import { accountResource } from "@devloggers/api-contracts"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { FieldShell } from "@/shared/components/form/field-shell"
import { AccountsTree } from "./accounts-tree"
import type { AccountListItem, AccountTreeNode } from "../accounts.types"

export type AccountPickerValue = { id: string; code: string; name: string }

export type AccountPickerProps = {
    value: AccountPickerValue | null
    onChange: (value: AccountPickerValue | null) => void
    disabled?: boolean
    invalid?: boolean
    placeholder?: string
    /** Ids to exclude (e.g. the edited node + descendants for a parent picker). */
    excludeIds?: Set<string>
    /** Override which nodes are selectable (default: active leaf accounts). */
    selectable?: (node: AccountTreeNode) => boolean
}

export function AccountPicker({
    value,
    onChange,
    disabled,
    invalid,
    placeholder,
    excludeIds,
    selectable,
}: AccountPickerProps) {
    const api = useApi()
    const t = useTranslations("business.resources.accounts")
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")

    const { data, isLoading } = useQuery({
        queryKey: [accountResource.key, "list", "picker"],
        queryFn: () => api[accountResource.key].list({ page: 1, limit: 500 }),
        staleTime: 60_000,
    })

    const items = useMemo(() => {
        const raw = ((data?.data ?? []) as unknown) as AccountListItem[]
        return excludeIds ? raw.filter((i) => !excludeIds.has(i.id)) : raw
    }, [data, excludeIds])

    const isSelectable = (node: AccountTreeNode) => {
        const base = selectable ?? ((n: AccountTreeNode) => n.isLeaf && n.account.isActive)
        return base(node)
    }

    const handleSelect = (node: AccountTreeNode) => {
        onChange({ id: node.id, code: node.account.code, name: node.label })
        setOpen(false)
        setQuery("")
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    aria-invalid={invalid || undefined}
                    className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", invalid && "border-destructive")}
                >
                    <span className="flex min-w-0 items-center gap-2">
                        {value ? (
                            <>
                                <code className="font-mono text-xs text-muted-foreground">{value.code}</code>
                                <span className="truncate">{value.name}</span>
                            </>
                        ) : (
                            placeholder ?? t("selectAccount")
                        )}
                    </span>
                    <span className="flex shrink-0 items-center">
                        {value && !disabled && (
                            <span
                                role="button"
                                tabIndex={-1}
                                aria-label={t("clear")}
                                className="me-1 rounded p-0.5 hover:bg-muted"
                                onClick={(e) => { e.stopPropagation(); onChange(null) }}
                            >
                                <X className="size-3.5" />
                            </span>
                        )}
                        <ChevronsUpDown className="size-4 opacity-50" />
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0" role="dialog">
                <div className="border-b p-2">
                    <Input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t("searchPlaceholder")}
                        className="h-8"
                    />
                </div>
                <ScrollArea className="h-72">
                    <div className="p-2">
                        {isLoading ? (
                            <p className="px-2 py-8 text-center text-sm text-muted-foreground">{t("loading")}</p>
                        ) : (
                            <AccountsTree
                                items={items}
                                query={query}
                                mode="select"
                                selectedId={value?.id ?? null}
                                onSelect={handleSelect}
                                selectable={isSelectable}
                                hideInactive
                            />
                        )}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}

// ── RHF wrapper ────────────────────────────────────────────────────────────────

export type RhfAccountFieldProps<TValues extends FieldValues, TName extends FieldPath<TValues>> = {
    name: TName
    label?: string
    description?: string
    required?: boolean
    disabled?: boolean
    placeholder?: string
    excludeIds?: Set<string>
    selectable?: (node: AccountTreeNode) => boolean
}

export function RhfAccountField<TValues extends FieldValues, TName extends FieldPath<TValues>>({
    name,
    label,
    description,
    required,
    disabled,
    placeholder,
    excludeIds,
    selectable,
}: RhfAccountFieldProps<TValues, TName>) {
    const { control } = useFormContext<TValues>()
    const { field, fieldState: { error } } = useController({ name, control, disabled })

    return (
        <FieldShell label={label} error={error?.message} description={description} required={required}>
            <AccountPicker
                value={(field.value as AccountPickerValue | null) ?? null}
                onChange={field.onChange}
                disabled={field.disabled}
                invalid={!!error}
                placeholder={placeholder}
                excludeIds={excludeIds}
                selectable={selectable}
            />
        </FieldShell>
    )
}

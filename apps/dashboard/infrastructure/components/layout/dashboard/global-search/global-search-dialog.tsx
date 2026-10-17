"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import {
    FileTextIcon,
    HandCoinsIcon,
    PackageIcon,
    ReceiptIcon,
    UsersIcon,
} from "lucide-react"
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandLoading,
} from "@/shared/components/ui/command"
import { useAuthStore } from "@/shared/stores/auth-store"
import type { CrudListDataItem, PaymentsClient } from "@devloggers/api-client"
import { useGlobalSearch } from "./use-global-search"
import { getSearchablePages } from "./static-pages"

export type GlobalSearchDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
}

// The row type derives from the client: `PaymentsClient.list()` resolves the generated
// `PaymentResponseDto`, so no local mirror or cast is needed.
type PaymentRow = CrudListDataItem<PaymentsClient>

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
    const t = useTranslations()
    const locale = useLocale()
    const router = useRouter()

    const [query, setQuery] = useState("")
    const permissions = useAuthStore((state) => state.user?.permissions)
    const { granted, remoteEnabled, items, invoices, parties, payments: paymentResults, isFetching } = useGlobalSearch(query)
    const payments: PaymentRow[] = paymentResults

    const normalizedQuery = query.trim().toLowerCase()

    const pages = useMemo(() => getSearchablePages(permissions ?? []), [permissions])
    const filteredPages = useMemo(() => {
        if (!normalizedQuery) return pages
        return pages.filter((page) => {
            const label = t(page.labelKey).toLowerCase()
            return label.includes(normalizedQuery) || page.href.toLowerCase().includes(normalizedQuery)
        })
    }, [pages, normalizedQuery, t])

    const localizedHref = (href: string) => (href === "/" ? `/${locale}` : `/${locale}${href}`)

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) setQuery("")
        onOpenChange(nextOpen)
    }

    const go = (href: string) => {
        handleOpenChange(false)
        router.push(localizedHref(href))
    }

    const goToInvoice = (number: string, direction?: string) => {
        const section = direction === "PURCHASE" ? "/purchases/invoices" : "/sales/invoices"
        go(`${section}?search=${encodeURIComponent(number)}`)
    }

    const goToParty = (name: string, type: string) => {
        const section = type === "SUPPLIER" ? "/parties/suppliers" : "/parties/customers"
        go(`${section}?search=${encodeURIComponent(name)}`)
    }

    const hasRemoteResults =
        items.length > 0 || invoices.length > 0 || parties.length > 0 || payments.length > 0
    const showLoading = remoteEnabled && isFetching && !hasRemoteResults
    const showEmpty = !showLoading && filteredPages.length === 0 && !hasRemoteResults

    return (
        <CommandDialog open={open} onOpenChange={handleOpenChange} className="sm:max-w-xl">
            <Command shouldFilter={false}>
                <CommandInput
                    placeholder={t("system.header.searchPlaceholder")}
                    value={query}
                    onValueChange={setQuery}
                />
                <CommandList>
                    {showLoading && <CommandLoading>{t("system.header.searching")}</CommandLoading>}
                    {showEmpty && <CommandEmpty>{t("system.header.searchEmpty")}</CommandEmpty>}

                    {filteredPages.length > 0 && (
                        <CommandGroup heading={t("system.header.searchGroups.pages")}>
                            {filteredPages.map((page) => (
                                <CommandItem
                                    key={page.href}
                                    value={`page-${page.href}`}
                                    onSelect={() => go(page.href)}
                                >
                                    <FileTextIcon className="size-4 text-muted-foreground" />
                                    <span className="truncate">{t(page.labelKey)}</span>
                                    {page.groupLabelKey && (
                                        <span className="ms-auto truncate text-xs text-muted-foreground">
                                            {t(page.groupLabelKey)}
                                        </span>
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    {remoteEnabled && granted.has("items.view") && items.length > 0 && (
                        <CommandGroup heading={t("system.header.searchGroups.items")}>
                            {items.map((item) => (
                                <CommandItem
                                    key={item.id}
                                    value={`item-${item.id}`}
                                    onSelect={() => go(`/catalog/items/${item.id}/edit`)}
                                >
                                    <PackageIcon className="size-4 text-muted-foreground" />
                                    <span className="truncate">{item.name}</span>
                                    <span className="ms-auto truncate text-xs text-muted-foreground">
                                        {item.code}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    {remoteEnabled && granted.has("invoices.view") && invoices.length > 0 && (
                        <CommandGroup heading={t("system.header.searchGroups.invoices")}>
                            {invoices.map((invoice) => (
                                <CommandItem
                                    key={invoice.id}
                                    value={`invoice-${invoice.id}`}
                                    onSelect={() =>
                                        goToInvoice(invoice.number, invoice.invoiceTypeDirection)
                                    }
                                >
                                    <ReceiptIcon className="size-4 text-muted-foreground" />
                                    <span className="truncate">{invoice.number}</span>
                                    <span className="ms-auto truncate text-xs text-muted-foreground">
                                        {invoice.partyName}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    {remoteEnabled && granted.has("parties.view") && parties.length > 0 && (
                        <CommandGroup heading={t("system.header.searchGroups.parties")}>
                            {parties.map((party) => (
                                <CommandItem
                                    key={party.id}
                                    value={`party-${party.id}`}
                                    onSelect={() => goToParty(party.name, party.type)}
                                >
                                    <UsersIcon className="size-4 text-muted-foreground" />
                                    <span className="truncate">{party.name}</span>
                                    <span className="ms-auto truncate text-xs text-muted-foreground">
                                        {party.code ?? party.phone}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    {remoteEnabled && granted.has("payments.view") && payments.length > 0 && (
                        <CommandGroup heading={t("system.header.searchGroups.payments")}>
                            {payments.map((payment) => (
                                <CommandItem
                                    key={payment.id}
                                    value={`payment-${payment.id}`}
                                    onSelect={() =>
                                        go(`/finance/payments?search=${encodeURIComponent(payment.number)}`)
                                    }
                                >
                                    <HandCoinsIcon className="size-4 text-muted-foreground" />
                                    <span className="truncate">{payment.number}</span>
                                    <span className="ms-auto truncate text-xs text-muted-foreground">
                                        {payment.partyName}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                </CommandList>
            </Command>
        </CommandDialog>
    )
}

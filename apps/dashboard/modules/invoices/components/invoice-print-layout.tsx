"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"
import { cn } from "@/shared/lib/utils"
import type { InvoiceDirection } from "../invoices.config"
import type { DocumentPrintSettings, InvoicePrintData, TenantPrintProfile } from "../hooks/use-invoice-print-data"
import { formatPrintAmount, formatPrintDate, resolveTenantLogoUrl } from "../invoices-print.utils"

type InvoicePrintLayoutProps = {
    direction: InvoiceDirection
    invoice: InvoicePrintData
    tenant: TenantPrintProfile
    documents: DocumentPrintSettings
}

function StatusWatermark({ status, label }: { status: string; label: string }) {
    if (status !== "DRAFT" && status !== "CANCELLED") return null

    return (
        <div
            className={cn(
                "pointer-events-none absolute inset-0 flex items-center justify-center",
                "text-[5rem] font-bold uppercase tracking-[0.3em] opacity-[0.08] rotate-[-24deg]",
                status === "CANCELLED" ? "text-destructive" : "text-foreground",
            )}
            aria-hidden
        >
            {label}
        </div>
    )
}

function CompanyBlock({
    tenant,
    showLogo,
    logoUrl,
}: {
    tenant: TenantPrintProfile
    showLogo: boolean
    logoUrl: string | null
}) {
    const lines = [
        tenant.legalName || tenant.name,
        tenant.taxNumber ? `Tax: ${tenant.taxNumber}` : null,
        tenant.address,
        [tenant.phone, tenant.email].filter(Boolean).join(" · ") || null,
        tenant.website,
    ].filter(Boolean)

    return (
        <div className="flex gap-4">
            {showLogo && logoUrl && (
                <div className="relative h-14 w-28 shrink-0">
                    <Image
                        src={logoUrl}
                        alt={tenant.name}
                        fill
                        className="object-contain object-start"
                        unoptimized
                    />
                </div>
            )}
            <div className="space-y-0.5 text-sm">
                {lines.map((line) => (
                    <p key={line} className="text-muted-foreground">{line}</p>
                ))}
            </div>
        </div>
    )
}

export function InvoicePrintLayout({ direction, invoice, tenant, documents }: InvoicePrintLayoutProps) {
    const t = useTranslations("business.resources.invoices.print")
    const tc = useTranslations("business.resources.invoices")

    const logoUrl = resolveTenantLogoUrl(tenant.logo)
    const title = direction === "SALE" ? t("salesTitle") : t("purchaseTitle")
    const partyLabel = direction === "SALE" ? t("billTo") : t("supplier")
    const currencyCode = invoice.currencyCode
    const currencySymbol = invoice.currencySymbol
    const fmt = (n: number) => formatPrintAmount(n, currencyCode, currencySymbol)
    const fmtDate = (iso: string | null | undefined) => formatPrintDate(iso, documents.dateFormat)

    const statusLabel =
        invoice.status === "DRAFT"
            ? tc("status.draft")
            : invoice.status === "CANCELLED"
                ? tc("status.cancelled")
                : tc("status.posted")

    return (
        <article className="relative mx-auto max-w-[210mm] bg-white px-8 py-10 text-foreground shadow-sm print:max-w-none print:shadow-none print:px-0 print:py-0">
            <StatusWatermark
                status={invoice.status}
                label={invoice.status === "DRAFT" ? tc("status.draft") : tc("status.cancelled")}
            />

            <header className="mb-8 flex items-start justify-between gap-6 border-b pb-6">
                <CompanyBlock
                    tenant={tenant}
                    showLogo={documents.showLogoOnDocuments}
                    logoUrl={logoUrl}
                />
                <div className="text-end">
                    <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                    {invoice.invoiceTypeName && (
                        <p className="mt-1 text-sm text-muted-foreground">{invoice.invoiceTypeName}</p>
                    )}
                    <p className="mt-2 font-mono text-lg font-semibold">{invoice.number}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{statusLabel}</p>
                </div>
            </header>

            <section className="mb-8 grid gap-6 sm:grid-cols-2">
                <div>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {partyLabel}
                    </h2>
                    <p className="font-medium">{invoice.partyName ?? "—"}</p>
                    {invoice.partyAddress && <p className="text-sm text-muted-foreground">{invoice.partyAddress}</p>}
                    {(invoice.partyPhone || invoice.partyEmail) && (
                        <p className="text-sm text-muted-foreground">
                            {[invoice.partyPhone, invoice.partyEmail].filter(Boolean).join(" · ")}
                        </p>
                    )}
                </div>
                <div className="sm:text-end">
                    <dl className="space-y-1 text-sm">
                        <div className="flex justify-between gap-4 sm:justify-end">
                            <dt className="text-muted-foreground">{tc("date")}</dt>
                            <dd className="font-medium">{fmtDate(invoice.date)}</dd>
                        </div>
                        {invoice.dueDate && (
                            <div className="flex justify-between gap-4 sm:justify-end">
                                <dt className="text-muted-foreground">{tc("dueDate")}</dt>
                                <dd className="font-medium">{fmtDate(invoice.dueDate)}</dd>
                            </div>
                        )}
                        {invoice.warehouseName && (
                            <div className="flex justify-between gap-4 sm:justify-end">
                                <dt className="text-muted-foreground">{tc("warehouse")}</dt>
                                <dd className="font-medium">{invoice.warehouseName}</dd>
                            </div>
                        )}
                        {invoice.currencyCode && (
                            <div className="flex justify-between gap-4 sm:justify-end">
                                <dt className="text-muted-foreground">{tc("currency")}</dt>
                                <dd className="font-medium">{invoice.currencyCode}</dd>
                            </div>
                        )}
                        {invoice.exchangeRate !== 1 && (
                            <div className="flex justify-between gap-4 sm:justify-end">
                                <dt className="text-muted-foreground">{tc("exchangeRate")}</dt>
                                <dd className="font-medium tabular-nums">{invoice.exchangeRate}</dd>
                            </div>
                        )}
                    </dl>
                </div>
            </section>

            <section className="mb-8 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b text-start text-xs uppercase tracking-wide text-muted-foreground">
                            <th className="pb-2 pe-2 font-semibold">#</th>
                            <th className="pb-2 pe-2 font-semibold">{tc("lines.item")}</th>
                            <th className="pb-2 pe-2 font-semibold">{tc("lines.unit")}</th>
                            <th className="pb-2 pe-2 text-end font-semibold">{tc("lines.quantity")}</th>
                            <th className="pb-2 pe-2 text-end font-semibold">{tc("lines.unitPrice")}</th>
                            <th className="pb-2 pe-2 text-end font-semibold">{tc("lines.discountPercent")}</th>
                            <th className="pb-2 pe-2 text-end font-semibold">{tc("lines.taxPercent")}</th>
                            <th className="pb-2 text-end font-semibold">{tc("lines.total")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.lines.map((line, index) => (
                            <tr key={line.id} className="border-b border-border/60">
                                <td className="py-2 pe-2 tabular-nums text-muted-foreground">{index + 1}</td>
                                <td className="py-2 pe-2">
                                    <div className="font-medium">{line.itemName ?? "—"}</div>
                                    {line.itemCode && (
                                        <div className="font-mono text-xs text-muted-foreground">{line.itemCode}</div>
                                    )}
                                    {line.notes && (
                                        <div className="text-xs text-muted-foreground">{line.notes}</div>
                                    )}
                                </td>
                                <td className="py-2 pe-2 text-muted-foreground">
                                    {line.unitAbbreviation || line.unitName || "—"}
                                </td>
                                <td className="py-2 pe-2 text-end tabular-nums">{line.quantity.toLocaleString()}</td>
                                <td className="py-2 pe-2 text-end tabular-nums">{fmt(line.unitPrice)}</td>
                                <td className="py-2 pe-2 text-end tabular-nums">
                                    {line.discountPercent > 0 ? `${line.discountPercent}%` : "—"}
                                </td>
                                <td className="py-2 pe-2 text-end tabular-nums">
                                    {line.taxPercent > 0 ? `${line.taxPercent}%` : "—"}
                                </td>
                                <td className="py-2 text-end tabular-nums font-medium">{fmt(line.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <section className="mb-8 flex justify-end">
                <dl className="w-full max-w-xs space-y-1 text-sm">
                    <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">{tc("totals.subtotal")}</dt>
                        <dd className="tabular-nums">{fmt(invoice.subtotal)}</dd>
                    </div>
                    {invoice.discountAmount > 0 && (
                        <div className="flex justify-between gap-4">
                            <dt className="text-muted-foreground">{tc("totals.discount")}</dt>
                            <dd className="tabular-nums">-{fmt(invoice.discountAmount)}</dd>
                        </div>
                    )}
                    {invoice.taxAmount > 0 && (
                        <div className="flex justify-between gap-4">
                            <dt className="text-muted-foreground">{tc("totals.tax")}</dt>
                            <dd className="tabular-nums">{fmt(invoice.taxAmount)}</dd>
                        </div>
                    )}
                    <div className="flex justify-between gap-4 border-t pt-2 text-base font-semibold">
                        <dt>{tc("totals.total")}</dt>
                        <dd className="tabular-nums">{fmt(invoice.total)}</dd>
                    </div>
                    {invoice.status === "POSTED" && invoice.amountPaid > 0 && (
                        <>
                            <div className="flex justify-between gap-4">
                                <dt className="text-muted-foreground">{t("amountPaid")}</dt>
                                <dd className="tabular-nums">{fmt(invoice.amountPaid)}</dd>
                            </div>
                            <div className="flex justify-between gap-4 font-medium">
                                <dt className="text-muted-foreground">{t("balanceDue")}</dt>
                                <dd className="tabular-nums">{fmt(invoice.balanceDue)}</dd>
                            </div>
                        </>
                    )}
                </dl>
            </section>

            {invoice.payments.length > 0 && (
                <section className="mb-8">
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {tc("payments.title")}
                    </h2>
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b text-start text-xs text-muted-foreground">
                                <th className="pb-2 font-semibold">{t("paymentNumber")}</th>
                                <th className="pb-2 font-semibold">{tc("date")}</th>
                                <th className="pb-2 text-end font-semibold">{t("amount")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.payments.map((payment) => (
                                <tr key={payment.id} className="border-b border-border/60">
                                    <td className="py-1.5 font-mono">{payment.paymentNumber}</td>
                                    <td className="py-1.5">{fmtDate(payment.date)}</td>
                                    <td className="py-1.5 text-end tabular-nums">{fmt(payment.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            )}

            {(invoice.notes || documents.invoiceDefaultTerms) && (
                <section className="mb-6 space-y-3 text-sm">
                    {invoice.notes && (
                        <div>
                            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {tc("notes")}
                            </h2>
                            <p className="whitespace-pre-wrap text-muted-foreground">{invoice.notes}</p>
                        </div>
                    )}
                    {documents.invoiceDefaultTerms && (
                        <div>
                            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {t("terms")}
                            </h2>
                            <p className="whitespace-pre-wrap text-muted-foreground">{documents.invoiceDefaultTerms}</p>
                        </div>
                    )}
                </section>
            )}

            {documents.documentFooter && (
                <footer className="border-t pt-4 text-center text-xs text-muted-foreground">
                    {documents.documentFooter}
                </footer>
            )}
        </article>
    )
}

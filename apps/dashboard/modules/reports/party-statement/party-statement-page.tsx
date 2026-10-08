"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/shared/useApi"
import { Receipt, Wallet, Scale } from "lucide-react"
import { Label } from "@/shared/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Badge } from "@/shared/components/ui/badge"
import { ReportLayout } from "../shared/report-layout"
import { StatCard } from "../shared/stat-card"
import { ReportTable } from "../shared/report-table"

type PartyType = "customer" | "supplier"
type Party = { id: string; name: string; code: string }
type InvoiceRow = { id: string; date: string; number?: string | null; total: number | string; invoiceType?: { direction?: string } }
type PaymentRow = { id: string; date: string; amount: number | string }

export function PartyStatementPage() {
    const t = useTranslations("business.reports.partyStatement")
    const api = useApi()
    const [partyType, setPartyType] = useState<PartyType>("customer")
    const [partyId, setPartyId] = useState<string | undefined>()

    const { data: parties = [] } = useQuery<Party[]>({
        queryKey: ["parties", "list-for-filter", partyType],
        queryFn: async () => {
            const res = await api.parties.list({
                limit: 500,
                type: partyType === "customer" ? "CUSTOMER" : "SUPPLIER",
            })
            return (res.data ?? []) as Party[]
        },
    })

    const { data: statement, isLoading } = useQuery({
        queryKey: ["reports", "party-statement", partyType, partyId],
        queryFn: () =>
            partyType === "customer"
                ? api.reports.customerStatement(partyId!)
                : api.reports.supplierStatement(partyId!),
        enabled: !!partyId,
    })

    const invoices: InvoiceRow[] = (statement?.invoices ?? []) as InvoiceRow[]
    const payments: PaymentRow[] = (statement?.payments ?? []) as PaymentRow[]
    const totalInvoiced = statement?.totalInvoiced ?? 0
    const totalPaid = statement?.totalPaid ?? 0
    const balance = statement?.balance ?? 0

    const invoiceColumns = [
        {
            key: "number",
            header: t("columns.number"),
            render: (r: InvoiceRow) => r.number ?? "—",
        },
        {
            key: "date",
            header: t("columns.date"),
            render: (r: InvoiceRow) => new Date(r.date).toLocaleDateString(),
        },
        {
            key: "total",
            header: t("columns.amount"),
            align: "right" as const,
            render: (r: InvoiceRow) => Number(r.total).toLocaleString(),
        },
        {
            key: "type",
            header: t("columns.type"),
            render: (_r: InvoiceRow) => (
                <Badge variant="outline">{t("typeInvoice")}</Badge>
            ),
        },
    ]

    const paymentColumns = [
        {
            key: "date",
            header: t("columns.date"),
            render: (r: PaymentRow) => new Date(r.date).toLocaleDateString(),
        },
        {
            key: "amount",
            header: t("columns.amount"),
            align: "right" as const,
            render: (r: PaymentRow) => Number(r.amount).toLocaleString(),
        },
        {
            key: "type",
            header: t("columns.type"),
            render: (_r: PaymentRow) => (
                <Badge variant="secondary">{t("typePayment")}</Badge>
            ),
        },
    ]

    return (
        <ReportLayout
            title={t("title")}
            description={t("description")}
            filters={
                <>
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs">{t("columns.type")}</Label>
                        <Tabs
                            value={partyType}
                            onValueChange={(v) => {
                                setPartyType(v as PartyType)
                                setPartyId(undefined)
                            }}
                        >
                            <TabsList>
                                <TabsTrigger value="customer">{t("tabs.customers")}</TabsTrigger>
                                <TabsTrigger value="supplier">{t("tabs.suppliers")}</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs">
                            {partyType === "customer" ? t("customer") : t("supplier")}
                        </Label>
                        <Select
                            value={partyId ?? ""}
                            onValueChange={(v) => setPartyId(v || undefined)}
                        >
                            <SelectTrigger className="w-64">
                                <SelectValue
                                    placeholder={t("selectPrompt", {
                                        partyType: partyType === "customer" ? t("customer") : t("supplier"),
                                    })}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {parties.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.code} — {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </>
            }
        >
            {!partyId ? (
                <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                    {t("selectPrompt", {
                        partyType: partyType === "customer" ? t("customer") : t("supplier"),
                    })}
                </div>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <StatCard
                            title={t("stats.totalInvoiced")}
                            value={totalInvoiced.toLocaleString()}
                            icon={Receipt}
                            variant="default"
                        />
                        <StatCard
                            title={t("stats.totalPaid")}
                            value={totalPaid.toLocaleString()}
                            icon={Wallet}
                            variant="success"
                        />
                        <StatCard
                            title={t("stats.balance")}
                            value={balance.toLocaleString()}
                            icon={Scale}
                            variant={balance > 0 ? "warning" : "success"}
                        />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Receipt className="h-4 w-4" />
                                {t("sections.invoices")} ({invoices.length})
                            </h3>
                            <ReportTable
                                columns={invoiceColumns}
                                rows={invoices}
                                isLoading={isLoading}
                                getRowKey={(r) => r.id}
                            />
                        </div>
                        <div>
                            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Wallet className="h-4 w-4" />
                                {t("sections.payments")} ({payments.length})
                            </h3>
                            <ReportTable
                                columns={paymentColumns}
                                rows={payments}
                                isLoading={isLoading}
                                getRowKey={(r) => r.id}
                            />
                        </div>
                    </div>
                </>
            )}
        </ReportLayout>
    )
}

"use client"

import { useState } from "react"
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
            header: "Invoice #",
            render: (r: InvoiceRow) => r.number ?? "—",
        },
        {
            key: "date",
            header: "Date",
            render: (r: InvoiceRow) => new Date(r.date).toLocaleDateString(),
        },
        {
            key: "total",
            header: "Amount",
            align: "right" as const,
            render: (r: InvoiceRow) => Number(r.total).toLocaleString(),
        },
        {
            key: "type",
            header: "Type",
            render: (_r: InvoiceRow) => (
                <Badge variant="outline">Invoice</Badge>
            ),
        },
    ]

    const paymentColumns = [
        {
            key: "date",
            header: "Date",
            render: (r: PaymentRow) => new Date(r.date).toLocaleDateString(),
        },
        {
            key: "amount",
            header: "Amount",
            align: "right" as const,
            render: (r: PaymentRow) => Number(r.amount).toLocaleString(),
        },
        {
            key: "type",
            header: "Type",
            render: (_r: PaymentRow) => (
                <Badge variant="secondary">Payment</Badge>
            ),
        },
    ]

    return (
        <ReportLayout
            title="Account Statements"
            description="Customer and supplier transaction history with running balance."
            filters={
                <>
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs">Type</Label>
                        <Tabs
                            value={partyType}
                            onValueChange={(v) => {
                                setPartyType(v as PartyType)
                                setPartyId(undefined)
                            }}
                        >
                            <TabsList>
                                <TabsTrigger value="customer">Customers</TabsTrigger>
                                <TabsTrigger value="supplier">Suppliers</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                    <div className="flex flex-col gap-1">
                        <Label className="text-xs">
                            {partyType === "customer" ? "Customer" : "Supplier"}
                        </Label>
                        <Select
                            value={partyId ?? ""}
                            onValueChange={(v) => setPartyId(v || undefined)}
                        >
                            <SelectTrigger className="w-64">
                                <SelectValue
                                    placeholder={`Select ${partyType === "customer" ? "customer" : "supplier"}…`}
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
                    Select a {partyType === "customer" ? "customer" : "supplier"} to view their statement.
                </div>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <StatCard
                            title="Total Invoiced"
                            value={totalInvoiced.toLocaleString()}
                            icon={Receipt}
                            variant="default"
                        />
                        <StatCard
                            title="Total Paid"
                            value={totalPaid.toLocaleString()}
                            icon={Wallet}
                            variant="success"
                        />
                        <StatCard
                            title="Outstanding Balance"
                            value={balance.toLocaleString()}
                            icon={Scale}
                            variant={balance > 0 ? "warning" : "success"}
                        />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Receipt className="h-4 w-4" />
                                Invoices ({invoices.length})
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
                                Payments ({payments.length})
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

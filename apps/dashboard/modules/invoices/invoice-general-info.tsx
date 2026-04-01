import {
    FileText,
    Calendar,
    Hash,
    Users,
    Car,
    Building2,
    CircleDollarSign,
    Clock,
} from "lucide-react"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Separator } from "@/shared/components/ui/separator"

type InvoiceData = {
    id?: number
    subject?: string
    invoice_number?: string
    invoice_date?: string
    due_date?: string
    status?: string
    notes?: string
    customer_name?: string
    customer_id?: number
    vehicle_name?: string
    vehicle_id?: number
    department_name?: string
    department_id?: number
    created_at?: string
    updated_at?: string
}

type InvoiceGeneralInfoProps = {
    invoice: InvoiceData
}

function InfoItem({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value?: string | null
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-4" />
            </div>
            <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-sm font-medium">
                    {value || <span className="text-muted-foreground">—</span>}
                </span>
            </div>
        </div>
    )
}

const statusColorMap: Record<string, string> = {
    draft: "secondary",
    open: "default",
    paid: "default",
    overdue: "destructive",
    void: "outline",
}

export function InvoiceGeneralInfo({ invoice }: InvoiceGeneralInfoProps) {
    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Invoice Details */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="size-4" />
                        Invoice Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        {invoice.subject && (
                            <Badge variant="secondary">{invoice.subject}</Badge>
                        )}
                        {invoice.status && (
                            <Badge variant={statusColorMap[invoice.status] as any ?? "outline"}>
                                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </Badge>
                        )}
                    </div>
                    <Separator />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <InfoItem
                            icon={Hash}
                            label="Invoice Number"
                            value={invoice.invoice_number}
                        />
                        <InfoItem
                            icon={Calendar}
                            label="Invoice Date"
                            value={invoice.invoice_date}
                        />
                        <InfoItem
                            icon={Calendar}
                            label="Due Date"
                            value={invoice.due_date}
                        />
                        <InfoItem
                            icon={Clock}
                            label="Created"
                            value={invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : null}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Relations */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CircleDollarSign className="size-4" />
                        Related Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <InfoItem
                            icon={Users}
                            label="Customer"
                            value={invoice.customer_name}
                        />
                        <InfoItem
                            icon={Car}
                            label="Vehicle"
                            value={invoice.vehicle_name}
                        />
                        <InfoItem
                            icon={Building2}
                            label="Department"
                            value={invoice.department_name}
                        />
                    </div>
                    {invoice.notes && (
                        <>
                            <Separator />
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground">Notes</span>
                                <p className="text-sm">{invoice.notes}</p>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

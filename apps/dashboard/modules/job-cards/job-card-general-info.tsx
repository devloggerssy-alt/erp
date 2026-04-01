import {
    ClipboardList,
    Calendar,
    Hash,
    Users,
    Car,
    Building2,
    Gauge,
    Clock,
    UserCheck,
    Briefcase,
    Receipt,
    DollarSign,
} from "lucide-react"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Separator } from "@/shared/components/ui/separator"

type JobCardData = {
    id?: number
    title?: string
    status?: string
    check_in_date?: string
    km_in?: number
    tax_inclusive?: string
    discount_type?: string
    discount_at?: string
    customer_id?: number
    customer_name?: string
    vehicle_id?: number
    vehicle_name?: string
    department_id?: number
    department_name?: string
    sales_person_id?: number
    sales_person_name?: string
    service_writer_id?: number
    service_writer_name?: string
    purchase_orders_count?: number
    bills_count?: number
    expenses_count?: number
    tasks_count?: number
    appointments_count?: number
    created_at?: string
    updated_at?: string
}

type JobCardGeneralInfoProps = {
    jobCard: JobCardData
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
    check_in: "default",
    in_progress: "default",
    completed: "default",
    invoiced: "outline",
    cancelled: "destructive",
}

export function JobCardGeneralInfo({ jobCard }: JobCardGeneralInfoProps) {
    const formatStatus = (status?: string) => {
        if (!status) return null
        return status
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Job Card Details */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="size-4" />
                        Job Card Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        {jobCard.title && (
                            <Badge variant="secondary">{jobCard.title}</Badge>
                        )}
                        {jobCard.status && (
                            <Badge variant={statusColorMap[jobCard.status] as any ?? "outline"}>
                                {formatStatus(jobCard.status)}
                            </Badge>
                        )}
                    </div>
                    <Separator />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <InfoItem
                            icon={Calendar}
                            label="Check-in Date"
                            value={jobCard.check_in_date}
                        />
                        <InfoItem
                            icon={Gauge}
                            label="KM In"
                            value={jobCard.km_in ? Number(jobCard.km_in).toLocaleString() : null}
                        />
                        <InfoItem
                            icon={Clock}
                            label="Created"
                            value={jobCard.created_at ? new Date(jobCard.created_at).toLocaleDateString() : null}
                        />
                        <InfoItem
                            icon={Clock}
                            label="Updated"
                            value={jobCard.updated_at ? new Date(jobCard.updated_at).toLocaleDateString() : null}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Related Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="size-4" />
                        Related Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <InfoItem
                            icon={Users}
                            label="Customer"
                            value={jobCard.customer_name}
                        />
                        <InfoItem
                            icon={Car}
                            label="Vehicle"
                            value={jobCard.vehicle_name}
                        />
                        <InfoItem
                            icon={Building2}
                            label="Department"
                            value={jobCard.department_name}
                        />
                        <InfoItem
                            icon={Briefcase}
                            label="Sales Person"
                            value={jobCard.sales_person_name}
                        />
                        <InfoItem
                            icon={UserCheck}
                            label="Service Writer"
                            value={jobCard.service_writer_name}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Tax & Discount Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="size-4" />
                        Tax & Discount Settings
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <InfoItem
                        icon={Receipt}
                        label="Tax Inclusive"
                        value={jobCard.tax_inclusive}
                    />
                    <InfoItem
                        icon={DollarSign}
                        label="Discount Type"
                        value={formatStatus(jobCard.discount_type)}
                    />
                    <InfoItem
                        icon={DollarSign}
                        label="Discount At"
                        value={formatStatus(jobCard.discount_at)}
                    />
                </CardContent>
            </Card>

            {/* Counts */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Hash className="size-4" />
                        Related Counts
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <InfoItem
                        icon={Receipt}
                        label="Purchase Orders"
                        value={String(jobCard.purchase_orders_count ?? 0)}
                    />
                    <InfoItem
                        icon={Receipt}
                        label="Bills"
                        value={String(jobCard.bills_count ?? 0)}
                    />
                    <InfoItem
                        icon={DollarSign}
                        label="Expenses"
                        value={String(jobCard.expenses_count ?? 0)}
                    />
                    <InfoItem
                        icon={ClipboardList}
                        label="Tasks"
                        value={String(jobCard.tasks_count ?? 0)}
                    />
                    <InfoItem
                        icon={Calendar}
                        label="Appointments"
                        value={String(jobCard.appointments_count ?? 0)}
                    />
                </CardContent>
            </Card>
        </div>
    )
}

"use client"

import { ResourcePage } from '@/shared/data-view/resource-page'
import { ColumnHeader } from '@/shared/data-view/table-view'
import FormDialog from '@/shared/components/form-dialog'
import { JobCardForm } from '@/modules/job-cards/job-card-form'
import { JOB_CARD_ROUTES } from '@devloggers/api'
import type { JobCardsClient } from '@devloggers/api'
import { ClipboardListIcon } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { useRouter } from 'next/navigation'

type JobCardItem = {
    id: number
    title?: string
    status?: string
    check_in_date?: string
    km_in?: number
    created_at?: string
}

const statusColorMap: Record<string, string> = {
    draft: "secondary",
    check_in: "default",
    in_progress: "default",
    completed: "default",
    invoiced: "outline",
    cancelled: "destructive",
}

const formatStatus = (status?: string) => {
    if (!status) return "—"
    return status
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
}

export default function JobCardsPage() {
    const router = useRouter()

    return (
        <ResourcePage<JobCardsClient>
            pageTitle="Job Cards"
            routeKey={JOB_CARD_ROUTES.INDEX}
            getClient={(api) => api.jobCards}
            onRowClick={(row) => router.push(`/sales/job-cards/${row.id}`)}
            headerProps={({ selectedItem, invalidateQuery }) => ({
                actions: (
                    <FormDialog title="Job Card">
                        {(resourceId) => (
                            <JobCardForm
                                resourceId={resourceId}
                                initialData={selectedItem}
                                onSuccess={invalidateQuery}
                            />
                        )}
                    </FormDialog>
                ),
            })}
            columns={({ actionsColumn }) => [
                {
                    accessorKey: "title",
                    header: ({ column }) => <ColumnHeader column={column} title="Title" />,
                    cell: ({ row }) => {
                        const item = row.original as unknown as JobCardItem
                        return (
                            <div className="flex items-center gap-2">
                                <ClipboardListIcon className="text-muted-foreground h-4 w-4" />
                                <span>{item.title}</span>
                            </div>
                        )
                    },
                },
                {
                    accessorKey: "status",
                    header: ({ column }) => <ColumnHeader column={column} title="Status" />,
                    cell: ({ row }) => {
                        const item = row.original as unknown as JobCardItem
                        return (
                            <Badge variant={statusColorMap[item.status ?? ""] as any ?? "outline"}>
                                {formatStatus(item.status)}
                            </Badge>
                        )
                    },
                },
                {
                    accessorKey: "check_in_date",
                    header: ({ column }) => <ColumnHeader column={column} title="Check-in Date" />,
                },
                {
                    accessorKey: "km_in",
                    header: ({ column }) => <ColumnHeader column={column} title="KM In" />,
                    cell: ({ row }) => {
                        const item = row.original as unknown as JobCardItem
                        return item.km_in ? Number(item.km_in).toLocaleString() : "—"
                    },
                },
                {
                    accessorKey: "created_at",
                    header: ({ column }) => <ColumnHeader column={column} title="Created" />,
                    cell: ({ row }) => {
                        const item = row.original as unknown as JobCardItem
                        return item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"
                    },
                },
                actionsColumn(),
            ]}
        />
    )
}

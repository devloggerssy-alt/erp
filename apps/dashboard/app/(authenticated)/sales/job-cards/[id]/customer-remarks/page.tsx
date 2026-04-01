"use client"

import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { useAuthApi } from "@/shared/useApi"
import { DataTable, ColumnHeader } from "@/shared/data-view/table-view"
import { confirm } from "@/shared/components/confirm-dialog"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/shared/components/ui/dialog"
import { JobCardRemarkForm } from "@/modules/job-cards/job-card-remark-form"

type CustomerRemark = {
    id: number
    job_card_id?: number
    remark?: string
    created_at: string
    updated_at: string
}

export default function CustomerRemarksPage() {
    const { id: jobCardId } = useParams<{ id: string }>()
    const api = useAuthApi()
    const queryClient = useQueryClient()
    const [dialogOpen, setDialogOpen] = useState(false)

    const queryKey = ["job-card-remarks", jobCardId]

    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: async () => {
            const result = await api.jobCards.show(jobCardId)
            const d = (result as any)?.data ?? result
            return d?.customer_remarks ?? []
        },
    })

    const deleteMutation = useMutation({
        mutationFn: () => api.jobCards.deleteCustomerRemark(jobCardId),
        onSuccess: () => {
            toast.success("Customer remark deleted successfully.")
            queryClient.invalidateQueries({ queryKey })
        },
        onError: () => {
            toast.error("Failed to delete customer remark.")
        },
    })

    const handleDelete = async (remark: CustomerRemark) => {
        const confirmed = await confirm({
            title: "Delete Customer Remark",
            description: "Are you sure you want to delete this remark?",
            confirmLabel: "Delete",
            variant: "destructive",
        })
        if (confirmed) {
            deleteMutation.mutate()
        }
    }

    const columns: ColumnDef<CustomerRemark>[] = [
        {
            accessorKey: "remark",
            header: ({ column }) => <ColumnHeader column={column} title="Remark" />,
            cell: ({ getValue }) => {
                const val = getValue<string>()
                return val || "—"
            },
        },
        {
            accessorKey: "created_at",
            header: ({ column }) => <ColumnHeader column={column} title="Created" />,
            cell: ({ getValue }) => {
                const val = getValue<string>()
                return val ? new Date(val).toLocaleDateString() : "—"
            },
        },
        {
            id: "actions",
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => (
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(row.original)}
                    title="Delete remark"
                >
                    <Trash2 className="size-4 text-destructive" />
                </Button>
            ),
            enableSorting: false,
        },
    ]

    const remarks = Array.isArray(data) ? data : []

    const pagination = {
        page: 1,
        pageSize: 100,
        pageCount: 1,
        total: remarks.length,
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-end">
                <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="size-4" />
                    Add Customer Remark
                </Button>
            </div>

            <Card>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={remarks}
                        pagination={pagination}
                        sorting={[]}
                        onChange={() => {}}
                        isLoading={isLoading}
                    />
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Customer Remark</DialogTitle>
                    </DialogHeader>
                    <JobCardRemarkForm
                        jobCardId={jobCardId}
                        onSuccess={() => {
                            setDialogOpen(false)
                            queryClient.invalidateQueries({ queryKey })
                        }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    )
}

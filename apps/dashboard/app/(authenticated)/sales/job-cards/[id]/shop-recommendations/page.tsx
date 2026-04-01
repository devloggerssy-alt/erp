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
import { JobCardRecommendationForm } from "@/modules/job-cards/job-card-recommendation-form"

type ShopRecommendation = {
    id: number
    job_card_id?: number
    recommendation?: string
    created_at: string
    updated_at: string
}

export default function ShopRecommendationsPage() {
    const { id: jobCardId } = useParams<{ id: string }>()
    const api = useAuthApi()
    const queryClient = useQueryClient()
    const [dialogOpen, setDialogOpen] = useState(false)

    const queryKey = ["job-card-recommendations", jobCardId]

    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: async () => {
            const result = await api.jobCards.show(jobCardId)
            const d = (result as any)?.data ?? result
            return d?.shop_recommendations ?? []
        },
    })

    const deleteMutation = useMutation({
        mutationFn: () => api.jobCards.deleteShopRecommendation(jobCardId),
        onSuccess: () => {
            toast.success("Shop recommendation deleted successfully.")
            queryClient.invalidateQueries({ queryKey })
        },
        onError: () => {
            toast.error("Failed to delete shop recommendation.")
        },
    })

    const handleDelete = async (rec: ShopRecommendation) => {
        const confirmed = await confirm({
            title: "Delete Shop Recommendation",
            description: "Are you sure you want to delete this recommendation?",
            confirmLabel: "Delete",
            variant: "destructive",
        })
        if (confirmed) {
            deleteMutation.mutate()
        }
    }

    const columns: ColumnDef<ShopRecommendation>[] = [
        {
            accessorKey: "recommendation",
            header: ({ column }) => <ColumnHeader column={column} title="Recommendation" />,
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
                    title="Delete recommendation"
                >
                    <Trash2 className="size-4 text-destructive" />
                </Button>
            ),
            enableSorting: false,
        },
    ]

    const recommendations = Array.isArray(data) ? data : []

    const pagination = {
        page: 1,
        pageSize: 100,
        pageCount: 1,
        total: recommendations.length,
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-end">
                <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="size-4" />
                    Add Shop Recommendation
                </Button>
            </div>

            <Card>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={recommendations}
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
                        <DialogTitle>Add Shop Recommendation</DialogTitle>
                    </DialogHeader>
                    <JobCardRecommendationForm
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

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
import { VehicleDocumentForm } from "@/modules/vehicles/vehicle-document-form"

type VehicleDocument = {
    id: number
    name: string
    created_at: string
    updated_at: string
}

export default function VehicleDocumentsPage() {
    const { id: vehicleId } = useParams<{ id: string }>()
    const api = useAuthApi()
    const queryClient = useQueryClient()
    const [dialogOpen, setDialogOpen] = useState(false)

    const queryKey = ["vehicle-documents", vehicleId]

    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: () => api.vehicleDocuments.listDocuments({ vehicle_id: vehicleId }),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.vehicleDocuments.destroyDocument(String(id)),
        onSuccess: () => {
            toast.success("Document deleted successfully.")
            queryClient.invalidateQueries({ queryKey })
        },
        onError: () => {
            toast.error("Failed to delete document.")
        },
    })

    const handleDelete = async (doc: VehicleDocument) => {
        const confirmed = await confirm({
            title: "Delete Document",
            description: `Are you sure you want to delete "${doc.name}"?`,
            confirmLabel: "Delete",
            variant: "destructive",
        })
        if (confirmed) {
            deleteMutation.mutate(doc.id)
        }
    }

    const columns: ColumnDef<VehicleDocument>[] = [
        {
            accessorKey: "name",
            header: ({ column }) => <ColumnHeader column={column} title="Name" />,
        },
        {
            accessorKey: "created_at",
            header: ({ column }) => <ColumnHeader column={column} title="Uploaded At" />,
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
                    title="Delete document"
                >
                    <Trash2 className="size-4 text-destructive" />
                </Button>
            ),
            enableSorting: false,
        },
    ]

    const documents = (data as any)?.data ?? []
    const meta = (data as any)?.meta

    const pagination = {
        page: meta?.current_page ?? 1,
        pageSize: meta?.per_page ?? 15,
        pageCount: meta?.last_page ?? 1,
        total: meta?.total ?? 0,
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-end">
                <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="size-4" />
                    Upload Document
                </Button>
            </div>

            <Card>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={documents}
                        pagination={pagination}
                        sorting={[]}
                        onChange={() => {}}
                        isLoading={isLoading}
                    />
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="min-w-xl">
                    <DialogHeader>
                        <DialogTitle>Upload Document</DialogTitle>
                    </DialogHeader>
                    <VehicleDocumentForm
                        vehicleId={vehicleId}
                        onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey })
                            setDialogOpen(false)
                        }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    )
}

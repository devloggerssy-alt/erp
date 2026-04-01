"use client"

import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { useState } from "react"
import { Plus, Pencil, Trash2, MoreHorizontal } from "lucide-react"
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { MileageForm } from "@/modules/vehicles/mileage-form"
import DashboardPage from "@/base/components/layout/dashboard/dashboard-page"

type MileageRecord = {
    id: number
    name: string
    created_at: string
    updated_at: string
}

export default function VehicleMileagePage() {
    const { id: vehicleId } = useParams<{ id: string }>()
    const api = useAuthApi()
    const queryClient = useQueryClient()
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editItem, setEditItem] = useState<MileageRecord | null>(null)

    const queryKey = ["vehicle-mileage", vehicleId]

    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: () => api.vehicleDocuments.listMileage({ vehicle_id: vehicleId }),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: number) => {
            const promise = api.vehicleDocuments.destroyMileage(String(id))
            toast.promise(promise, {
                loading: "Deleting...",
                success: "Mileage record deleted successfully.",
                error: "Failed to delete mileage record.",
            })
            return promise
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey })
        },
    })

    const handleDelete = async (record: MileageRecord) => {
        const confirmed = await confirm({
            title: "Delete Mileage Record",
            description: `Are you sure you want to delete this mileage record?`,
            confirmLabel: "Delete",
            variant: "destructive",
        })
        if (confirmed) {
            deleteMutation.mutate(record.id)
        }
    }

    const handleEdit = (record: MileageRecord) => {
        setEditItem(record)
        setDialogOpen(true)
    }

    const handleCreate = () => {
        setEditItem(null)
        setDialogOpen(true)
    }

    const columns: ColumnDef<MileageRecord>[] = [
        {
            accessorKey: "name",
            header: ({ column }) => <ColumnHeader column={column} title="Mileage" />,
        },
        {
            accessorKey: "created_at",
            header: ({ column }) => <ColumnHeader column={column} title="Recorded At" />,
            cell: ({ getValue }) => {
                const val = getValue<string>()
                return val ? new Date(val).toLocaleDateString() : "—"
            },
        },
        {
            id: "actions",
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Open menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(row.original)}>
                            <Pencil className="size-3.5 text-muted-foreground" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(row.original)}
                        >
                            <Trash2 className="size-3.5" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            enableSorting: false,
        },
    ]

    const records = (data as any)?.data ?? []
    const meta = (data as any)?.meta

    const pagination = {
        page: meta?.current_page ?? 1,
        pageSize: meta?.per_page ?? 15,
        pageCount: meta?.last_page ?? 1,
        total: meta?.total ?? 0,
    }

    return (
        <div className="flex flex-col gap-4">
           
    
        <DashboardPage
        header={null}    
        toolbar={
              <Button onClick={handleCreate}>
                    <Plus className="size-4" />
                    Add Mileage
                </Button>
        }
        title='Milage'
        >

            <Card>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={records}
                        pagination={pagination}
                        sorting={[]}
                        onChange={() => {}}
                        isLoading={isLoading}
                    />
                </CardContent>
            </Card>
        </DashboardPage>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="min-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editItem ? "Edit Mileage" : "Add Mileage"}
                        </DialogTitle>
                    </DialogHeader>
                    <MileageForm
                        vehicleId={vehicleId}
                        resourceId={editItem ? String(editItem.id) : null}
                        initialData={editItem}
                        onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey })
                            setDialogOpen(false)
                            setEditItem(null)
                        }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    )
}

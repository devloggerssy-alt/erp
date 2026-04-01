"use client"

import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { useState } from "react"
import { Unlink, Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { useAuthApi } from "@/shared/useApi"
import { DataTable } from "@/shared/data-view/table-view"
import { ColumnHeader } from "@/shared/data-view/table-view"
import { confirm } from "@/shared/components/confirm-dialog"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/shared/components/ui/dialog"
import { RhfAsyncSelectField } from "@/shared/components/form"
import { Rhform } from "@/shared/components/form"
import { useForm } from "react-hook-form"
import { TableCell, TableRow } from "@/shared/components/ui/table"
import { ApiResponse, CustomersClient } from "@garage/api"
import { paths } from "@garage/api/types"
import DashboardPage from "@/base/components/layout/dashboard/dashboard-page"

type Owner = {
    id: number
    name: string
    created_at: string
    updated_at: string
}

const mapCustomerOption = (item: any) => ({
    value: String(item.id),
    label: `${item.first_name ?? ""} ${item.last_name ?? ""}`.trim() || item.name || `Customer #${item.id}`,
})

const STORE_OBJECT = {
    getOptionValue: (o: any) => o,
    getOptionLabel: (o: any) => o.label,
}

export default function VehicleOwnersPage() {
    const { id: vehicleId } = useParams<{ id: string }>()
    const api = useAuthApi()
    const queryClient = useQueryClient()
    const [linkDialogOpen, setLinkDialogOpen] = useState(false)

    const queryKey = ["vehicle-owners", vehicleId]

    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: () => api.vehicles.getOwners(vehicleId),
    })

    const unlinkMutation = useMutation({
        mutationFn: (customerId: number) =>
            api.vehicles.unlinkCustomer({ customer_id: customerId, vehicle_id: Number(vehicleId) }),
        onSuccess: () => {
            toast.success("Owner unlinked successfully.")
            queryClient.invalidateQueries({ queryKey })
        },
        onError: () => {
            toast.error("Failed to unlink owner.")
        },
    })

    const handleUnlink = async (owner: Owner) => {
        const confirmed = await confirm({
            title: "Unlink Owner",
            description: `Are you sure you want to unlink "${owner.name}" from this vehicle?`,
            confirmLabel: "Unlink",
            variant: "destructive",
        })
        if (confirmed) {
            unlinkMutation.mutate(owner.id)
        }
    }

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "first_name",
            header: ({ column }) => <ColumnHeader column={column} title="Name" />,
        },
        {
            accessorKey: "phone",
            header: ({ column }) => <ColumnHeader column={column} title="Phone" />,
        },
        {
            accessorKey: "created_at",
            header: ({ column }) => <ColumnHeader column={column} title="Linked At" />,
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
                    onClick={() => handleUnlink(row.original)}
                    title="Unlink owner"
                >
                    <Unlink className="size-4 text-destructive" />
                </Button>
            ),
            enableSorting: false,
        },
    ]

    const owners = (data as any)?.data ?? []


    // [BackendIssue] [FrontendWorkaround] : pagination should be replaced with "meta" property 
    const meta = (data as any)?.pagination

    const pagination = {
        page: meta?.current_page ?? 1,
        pageSize: meta?.per_page ?? 15,
        pageCount: meta?.last_page ?? 1,
        total: meta?.total ?? 0,
    }

    return (
        <DashboardPage title="Owners" header={null} toolbar={
            <Button className="w-full" size={'lg'} onClick={() => setLinkDialogOpen(true)}>
                <Plus />
                Add Owner
            </Button>
        }>

            <Card>
                <CardContent>

                    <DataTable
                        columns={columns}
                        data={owners}
                        pagination={pagination}
                        sorting={[]}

                        onChange={() => { }}
                        isLoading={isLoading}
                    />

                    <LinkOwnerDialog
                        vehicleId={vehicleId}
                        open={linkDialogOpen}
                        onOpenChange={setLinkDialogOpen}
                        onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey })
                            setLinkDialogOpen(false)
                        }}
                    />
                </CardContent>
            </Card>
        </DashboardPage >
    )
}

function LinkOwnerDialog({
    vehicleId,
    open,
    onOpenChange,
    onSuccess,
}: {
    vehicleId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}) {
    const api = useAuthApi()

    const form = useForm<{ customer: { value: string; label: string } | null }>({
        defaultValues: { customer: null },
    })

    const linkMutation = useMutation({
        mutationFn: (customerId: number) =>
            api.vehicles.linkCustomer({ customer_id: customerId, vehicle_id: Number(vehicleId) }),
        onSuccess: () => {
            toast.success("Owner linked successfully.")
            form.reset()
            onSuccess()
        },
        onError: () => {
            toast.error("Failed to link owner.")
        },
    })

    const handleSubmit = (values: { customer: { value: string; label: string } | null }) => {
        if (!values.customer) return
        linkMutation.mutate(Number(values.customer.value))
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="min-w-md">
                <DialogHeader>
                    <DialogTitle>Add Owner</DialogTitle>
                </DialogHeader>
                <Rhform form={form} onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-4">
                        <RhfAsyncSelectField
                            name="customer"
                            label="Customer"
                            placeholder="Search customers..."
                            queryKey={["customers-lookup"]}
                            listFn={() => api.customers.list()}
                            mapOption={mapCustomerOption}
                            {...STORE_OBJECT}
                        />
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={linkMutation.isPending || !form.watch("customer")}
                            >
                                {linkMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                                Link Owner
                            </Button>
                        </div>
                    </div>
                </Rhform>
            </DialogContent>
        </Dialog>
    )
}

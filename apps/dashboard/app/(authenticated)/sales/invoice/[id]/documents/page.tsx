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
import { InvoiceDocumentForm } from "@/modules/invoices/invoice-document-form"

type InvoiceDocument = {
    id: number
    document_number?: string
    show_in_invoice?: boolean
    show_in_estimate?: boolean
    show_in_statement?: boolean
    created_at: string
    updated_at: string
}

export default function InvoiceDocumentsPage() {
    const { id: invoiceId } = useParams<{ id: string }>()
    const api = useAuthApi()
    const queryClient = useQueryClient()
    const [dialogOpen, setDialogOpen] = useState(false)

    const queryKey = ["invoice-documents", invoiceId]

    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: () => api.invoices.listDocuments({ invoice_id: invoiceId }),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.invoices.destroyDocument(String(id)),
        onSuccess: () => {
            toast.success("Document deleted successfully.")
            queryClient.invalidateQueries({ queryKey })
        },
        onError: () => {
            toast.error("Failed to delete document.")
        },
    })

    const handleDelete = async (doc: InvoiceDocument) => {
        const confirmed = await confirm({
            title: "Delete Document",
            description: `Are you sure you want to delete "${doc.document_number || "this document"}"?`,
            confirmLabel: "Delete",
            variant: "destructive",
        })
        if (confirmed) {
            deleteMutation.mutate(doc.id)
        }
    }

    const columns: ColumnDef<InvoiceDocument>[] = [
        {
            accessorKey: "document_number",
            header: ({ column }) => <ColumnHeader column={column} title="Document Number" />,
        },
        {
            accessorKey: "show_in_invoice",
            header: ({ column }) => <ColumnHeader column={column} title="Show in Invoice" />,
            cell: ({ getValue }) => (getValue<boolean>() ? "Yes" : "No"),
        },
        {
            accessorKey: "show_in_estimate",
            header: ({ column }) => <ColumnHeader column={column} title="Show in Estimate" />,
            cell: ({ getValue }) => (getValue<boolean>() ? "Yes" : "No"),
        },
        {
            accessorKey: "show_in_statement",
            header: ({ column }) => <ColumnHeader column={column} title="Show in Statement" />,
            cell: ({ getValue }) => (getValue<boolean>() ? "Yes" : "No"),
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
                    Add Document
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Document</DialogTitle>
                    </DialogHeader>
                    <InvoiceDocumentForm
                        invoiceId={invoiceId}
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

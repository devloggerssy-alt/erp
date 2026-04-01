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
import { InvoiceNoteForm } from "@/modules/invoices/invoice-note-form"
 
type InvoiceNote = {
    id: number
    note?: string
    created_at: string
    updated_at: string
}

export default function InvoiceNotesPage() {
    const { id: invoiceId } = useParams<{ id: string }>()
    const api = useAuthApi()
    const queryClient = useQueryClient()
    const [dialogOpen, setDialogOpen] = useState(false)

    const queryKey = ["invoice-notes", invoiceId]

    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: () => api.invoices.listNotes({ invoice_id: invoiceId }),
    })

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.invoices.destroyNote(String(id)),
        onSuccess: () => {
            toast.success("Note deleted successfully.")
            queryClient.invalidateQueries({ queryKey })
        },
        onError: () => {
            toast.error("Failed to delete note.")
        },
    })

    const handleDelete = async (note: InvoiceNote) => {
        const confirmed = await confirm({
            title: "Delete Note",
            description: "Are you sure you want to delete this note?",
            confirmLabel: "Delete",
            variant: "destructive",
        })
        if (confirmed) {
            deleteMutation.mutate(note.id)
        }
    }

    const columns: ColumnDef<InvoiceNote>[] = [
        {
            accessorKey: "note",
            header: ({ column }) => <ColumnHeader column={column} title="Note" />,
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
                    title="Delete note"
                >
                    <Trash2 className="size-4 text-destructive" />
                </Button>
            ),
            enableSorting: false,
        },
    ]

    const notes = (data as any)?.data ?? []
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
                    Add Note
                </Button>
            </div>

            <Card>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={notes}
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
                        <DialogTitle>Add Note</DialogTitle>
                    </DialogHeader>
                    <InvoiceNoteForm
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

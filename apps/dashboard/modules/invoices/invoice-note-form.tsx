"use client"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { FieldGroup } from "@/shared/components/ui/field"
import { Rhform, RhfTextareaField } from "@/shared/components/form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"

const schema = z.object({
    note: z.string().min(1, "Note is required"),
})

type FormValues = z.infer<typeof schema>

type InvoiceNoteFormProps = {
    invoiceId: string
    onSuccess?: () => void
}

export function InvoiceNoteForm({ invoiceId, onSuccess }: InvoiceNoteFormProps) {
    const api = useAuthApi()

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { note: "" },
    })

    const handleSubmit = async (values: FormValues) => {
        try {
            await api.invoices.createNote({
                invoice_id: Number(invoiceId),
                note: values.note,
            })
            toast.success("Note created")
            form.reset()
            onSuccess?.()
        } catch {
            toast.error("Failed to create note")
        }
    }

    return (
        <Rhform form={form} onSubmit={handleSubmit}>
            <FieldGroup>
                <RhfTextareaField
                    name="note"
                    label="Note"
                    placeholder="Enter a note..."
                    rows={4}
                    required
                />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    <Plus />
                    {form.formState.isSubmitting ? "Creating..." : "Add Note"}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}

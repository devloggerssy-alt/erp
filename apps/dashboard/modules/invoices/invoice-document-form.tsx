"use client"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { FieldGroup } from "@/shared/components/ui/field"
import { Rhform, RhfTextField, RhfCheckboxField } from "@/shared/components/form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"

const schema = z.object({
    document_number: z.string().min(1, "Document number is required"),
    show_in_invoice: z.boolean(),
    show_in_estimate: z.boolean(),
    show_in_statement: z.boolean(),
})

type FormValues = z.infer<typeof schema>

type InvoiceDocumentFormProps = {
    invoiceId: string
    onSuccess?: () => void
}

export function InvoiceDocumentForm({ invoiceId, onSuccess }: InvoiceDocumentFormProps) {
    const api = useAuthApi()

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            document_number: "",
            show_in_invoice: true,
            show_in_estimate: false,
            show_in_statement: false,
        },
    })

    const handleSubmit = async (values: FormValues) => {
        try {
            await api.invoices.createDocument({
                invoice_id: Number(invoiceId),
                document_number: values.document_number,
                show_in_invoice: values.show_in_invoice,
                show_in_estimate: values.show_in_estimate,
                show_in_statement: values.show_in_statement,
            })
            toast.success("Document created")
            form.reset()
            onSuccess?.()
        } catch {
            toast.error("Failed to create document")
        }
    }

    return (
        <Rhform form={form} onSubmit={handleSubmit}>
            <FieldGroup>
                <RhfTextField
                    name="document_number"
                    label="Document Number"
                    placeholder="e.g. DOC-001"
                    required
                />
                <RhfCheckboxField name="show_in_invoice" label="Show in Invoice" />
                <RhfCheckboxField name="show_in_estimate" label="Show in Estimate" />
                <RhfCheckboxField name="show_in_statement" label="Show in Statement" />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    <Plus />
                    {form.formState.isSubmitting ? "Creating..." : "Create Document"}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}

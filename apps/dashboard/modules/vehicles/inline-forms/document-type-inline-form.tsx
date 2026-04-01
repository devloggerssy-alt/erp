"use client"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { FieldGroup } from "@/shared/components/ui/field"
import { Rhform, RhfTextField, type InlineCreateFormProps } from "@/shared/components/form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"

const schema = z.object({
    title: z.string().min(1, "Title is required"),
})

type FormValues = z.infer<typeof schema>

export function DocumentTypeInlineForm({ onSuccess }: InlineCreateFormProps) {
    const api = useAuthApi()

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { title: "" },
    })

    const handleSubmit = async (values: FormValues) => {
        try {
            const result = await api.vehicleDocuments.createDocumentType({ title: values.title })
            toast.success("Document type created")
            form.reset()
            const item = (result as any)?.data ?? result
            onSuccess({ value: String(item.id), label: item.title ?? item.name ?? String(item.id) })
        } catch {
            toast.error("Failed to create document type")
        }
    }

    return (
        <Rhform form={form} onSubmit={handleSubmit}>
            <FieldGroup>
                <RhfTextField
                    name="title"
                    label="Title"
                    placeholder="e.g. Registration Certificate"
                    required
                />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    <Plus />
                    {form.formState.isSubmitting ? "Creating..." : "Create Document Type"}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}

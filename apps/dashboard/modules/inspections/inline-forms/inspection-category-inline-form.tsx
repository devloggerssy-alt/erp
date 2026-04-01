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
    inspection_name: z.string().min(1, "Name is required"),
})

type FormValues = z.infer<typeof schema>

export function InspectionCategoryInlineForm({ onSuccess }: InlineCreateFormProps) {
    const api = useAuthApi()

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { inspection_name: "" },
    })

    const handleSubmit = async (values: FormValues) => {
        try {
            const result = await api.inspections.createCategory({
                inspection_name: values.inspection_name,
            })
            toast.success("Inspection category created")
            form.reset()
            const item = (result as any)?.data ?? result
            onSuccess({ value: String(item.id), label: item.name ?? values.inspection_name })
        } catch {
            toast.error("Failed to create inspection category")
        }
    }

    return (
        <Rhform form={form} onSubmit={handleSubmit}>
            <FieldGroup>
                <RhfTextField
                    name="inspection_name"
                    label="Name"
                    placeholder="e.g. Brake Check"
                    required
                />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    <Plus />
                    {form.formState.isSubmitting ? "Creating..." : "Create Category"}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}

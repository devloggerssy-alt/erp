"use client"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { FieldGroup } from "@/shared/components/ui/field"
import { Rhform, RhfTextField, RhfSelectField, type InlineCreateFormProps } from "@/shared/components/form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"
import { DEPARTMENT_ASSIGNMENT_TYPE_OPTIONS } from "../department-assignment-types"

const schema = z.object({
    name: z.string().min(1, "Name is required"),
    assignment_type: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function DepartmentInlineForm({ onSuccess }: InlineCreateFormProps) {
    const api = useAuthApi()

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { name: "", assignment_type: "none" },
    })

    const handleSubmit = async (values: FormValues) => {
        try {
            const result = await api.departments.create({
                name: values.name,
                assignment_type: values.assignment_type || undefined,
            })
            toast.success("Department created")
            form.reset()
            const item = (result as any)?.data ?? result
            onSuccess({ value: String(item.id), label: item.name ?? String(item.id) })
        } catch {
            toast.error("Failed to create department")
        }
    }

    return (
        <Rhform form={form} onSubmit={handleSubmit}>
            <FieldGroup>
                <RhfTextField
                    name="name"
                    label="Name"
                    placeholder="e.g. Mechanical"
                    required
                />
                <RhfSelectField
                    name="assignment_type"
                    label="Assignment Type"
                    placeholder="Select assignment type"
                    options={[...DEPARTMENT_ASSIGNMENT_TYPE_OPTIONS]}
                />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    <Plus />
                    {form.formState.isSubmitting ? "Creating..." : "Create Department"}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}

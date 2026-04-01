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
    remark: z.string().min(1, "Remark is required"),
})

type FormValues = z.infer<typeof schema>

type JobCardRemarkFormProps = {
    jobCardId: string
    onSuccess?: () => void
}

export function JobCardRemarkForm({ jobCardId, onSuccess }: JobCardRemarkFormProps) {
    const api = useAuthApi()

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { remark: "" },
    })

    const handleSubmit = async (values: FormValues) => {
        try {
            await api.jobCards.addCustomerRemark(jobCardId, {
                remark: values.remark,
            })
            toast.success("Customer remark added")
            form.reset()
            onSuccess?.()
        } catch {
            toast.error("Failed to add customer remark")
        }
    }

    return (
        <Rhform form={form} onSubmit={handleSubmit}>
            <FieldGroup>
                <RhfTextareaField
                    name="remark"
                    label="Customer Remark"
                    placeholder="Enter customer remark..."
                    rows={4}
                    required
                />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    <Plus />
                    {form.formState.isSubmitting ? "Adding..." : "Add Remark"}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}

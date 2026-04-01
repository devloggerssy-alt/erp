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
    recommendation: z.string().min(1, "Recommendation is required"),
})

type FormValues = z.infer<typeof schema>

type JobCardRecommendationFormProps = {
    jobCardId: string
    onSuccess?: () => void
}

export function JobCardRecommendationForm({ jobCardId, onSuccess }: JobCardRecommendationFormProps) {
    const api = useAuthApi()

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { recommendation: "" },
    })

    const handleSubmit = async (values: FormValues) => {
        try {
            await api.jobCards.addShopRecommendation(jobCardId, {
                recommendation: values.recommendation,
            })
            toast.success("Shop recommendation added")
            form.reset()
            onSuccess?.()
        } catch {
            toast.error("Failed to add shop recommendation")
        }
    }

    return (
        <Rhform form={form} onSubmit={handleSubmit}>
            <FieldGroup>
                <RhfTextareaField
                    name="recommendation"
                    label="Shop Recommendation"
                    placeholder="Enter shop recommendation..."
                    rows={4}
                    required
                />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    <Plus />
                    {form.formState.isSubmitting ? "Adding..." : "Add Recommendation"}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}

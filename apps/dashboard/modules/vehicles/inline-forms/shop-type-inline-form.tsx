"use client"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { FieldGroup } from "@/shared/components/ui/field"
import {
    Rhform,
    RhfTextField,
    RhfTextareaField,
    RhfCheckboxField,
    RhfFileField,
    type InlineCreateFormProps,
} from "@/shared/components/form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"

const schema = z.object({
    title: z.string().min(1, "Title is required"),
    shop_type: z.string().optional(),
    note: z.string().optional(),
    is_default: z.boolean().optional(),
    inspection: z.any().optional(),
    image: z.any().optional(),
})

type FormValues = {
    title: string
    shop_type?: string
    note?: string
    is_default?: boolean
    inspection?: File | null
    image?: File | null
}

export function ShopTypeInlineForm({ onSuccess }: InlineCreateFormProps) {
    const api = useAuthApi()

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            title: "",
            shop_type: "",
            note: "",
            is_default: false,
            inspection: null,
            image: null,
        },
    })

    const handleSubmit = async (values: FormValues) => {
        try {
            const result = await api.shopTypes.create({
                title: values.title,
                shop_type: values.shop_type || undefined,
                note: values.note || undefined,
                is_default: values.is_default,
                inspection: values.inspection ?? undefined,
                image: values.image ?? undefined,
            })
            toast.success("Shop type created")
            form.reset()
            const item = (result as any)?.data ?? result
            onSuccess({ value: String(item.id), label: item.title ?? String(item.id) })
        } catch {
            toast.error("Failed to create shop type")
        }
    }

    return (
        <Rhform form={form} onSubmit={handleSubmit}>
            <FieldGroup>
                <RhfTextField
                    name="title"
                    label="Title"
                    placeholder="e.g. Main Workshop"
                    required
                />
                <RhfTextField
                    name="shop_type"
                    label="Type"
                    placeholder="e.g. Car, Truck"
                />
                <RhfTextareaField
                    name="note"
                    label="Note"
                    placeholder="Optional description"
                    rows={3}
                />
                <RhfCheckboxField
                    name="is_default"
                    label="Set as default"
                />
                <RhfFileField
                    name="inspection"
                    label="Inspection Template"
                    accept=".pdf,.doc,.docx"
                />
                <RhfFileField
                    name="image"
                    label="Image"
                    accept="image/*"
                />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    <Plus />
                    {form.formState.isSubmitting ? "Creating..." : "Create Shop Type"}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}


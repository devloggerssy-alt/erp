"use client"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { FieldGroup } from "@/shared/components/ui/field"
import { Rhform, RhfTextField, RhfAsyncSelectField, type InlineCreateFormProps } from "@/shared/components/form"
import { ShopTypeInlineForm } from "@/modules/vehicles/inline-forms/shop-type-inline-form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"

const schema = z.object({
    title: z.string().min(1, "Title is required"),
    shop_type: z.object({ value: z.string(), label: z.string() }).nullable(),
})

type FormValues = z.infer<typeof schema>

const mapLookupOption = (item: any) => ({
    value: String(item.id),
    label: item.name ?? item.title ?? String(item.id),
})

const STORE_OBJECT = { getOptionValue: (o: any) => o, getOptionLabel: (o: any) => o.label }

export function InventoryCategoryInlineForm({ onSuccess }: InlineCreateFormProps) {
    const api = useAuthApi()

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { title: "", shop_type: null },
    })

    const handleSubmit = async (values: FormValues) => {
        try {
            const result = await api.inventory.createCategory({
                title: values.title,
                shop_type_id: values.shop_type ? Number(values.shop_type.value) : undefined,
            })
            toast.success("Category created")
            form.reset()
            const item = (result as any)?.data ?? result
            onSuccess({ value: String(item.id), label: item.title ?? item.name ?? String(item.id) })
        } catch {
            toast.error("Failed to create category")
        }
    }

    return (
        <Rhform form={form} onSubmit={handleSubmit}>
            <FieldGroup>
                <RhfTextField
                    name="title"
                    label="Title"
                    placeholder="e.g. Parts"
                    required
                />
                <RhfAsyncSelectField
                    name="shop_type"
                    label="Shop Type"
                    placeholder="Select shop type"
                    queryKey={["shop-types"]}
                    listFn={() => api.shopTypes.list()}
                    mapOption={mapLookupOption}
                    createForm={(props) => <ShopTypeInlineForm {...props} />}
                    createLabel="Shop Type"
                    {...STORE_OBJECT}
                />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    <Plus />
                    {form.formState.isSubmitting ? "Creating..." : "Create Category"}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}

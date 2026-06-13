import { z } from "zod"
import type { CreateBrandDto, UpdateBrandDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

export const brandFormSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    imageUrl: z.string().trim().url("Must be a valid URL").nullable().optional(),
    isActive: z.boolean().optional(),
})

export type BrandFormValues = z.infer<typeof brandFormSchema>

export const DEFAULT_BRAND_FORM_VALUES: BrandFormValues = {
    name: "",
    imageUrl: null,
    isActive: true,
}

export function mapBrandToFormValues(data: unknown): BrandFormValues {
    const resolved = unwrapApiData<BrandFormValues>(data)
    return {
        name: resolved.name ?? "",
        imageUrl: resolved.imageUrl ?? null,
        isActive: resolved.isActive ?? true,
    }
}

export const brandsFormConfig: ResourceFormConfig<BrandFormValues, CreateBrandDto, UpdateBrandDto> = {
    schema: brandFormSchema,
    defaultValues: DEFAULT_BRAND_FORM_VALUES,
    mapToFormValues: mapBrandToFormValues,
    toCreate: (values) => ({
        name: values.name.trim(),
        imageUrl: values.imageUrl || null,
    }),
    toUpdate: (values) => ({
        name: values.name.trim(),
        imageUrl: values.imageUrl || null,
        isActive: values.isActive ?? true,
    }),
}

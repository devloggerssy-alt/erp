"use client"

import { AlertTriangle, Plus, Save } from "lucide-react"
import { toast } from "sonner"
import type { CreateItemCategoryDto, UpdateItemCategoryDto } from "@devloggers/api-contracts"
import { itemCategoryResource } from "@devloggers/api-contracts"
import { Rhform, RhfCheckboxField, RhfTextField, RhfResourceSelect } from "@/shared/components/form"
import { useFormDialog } from "@/shared/components/form-dialog"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { FieldGroup } from "@/shared/components/ui/field"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useApi } from "@/shared/useApi"
import {
    categoryFormSchema,
    DEFAULT_CATEGORY_FORM_VALUES,
    mapCategoryToFormValues,
    type CategoryFormValues,
} from "../categories.config"

export type CategoriesFormProps = {
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
    paramKey?: string
}

function mapCreatePayload(values: CategoryFormValues): CreateItemCategoryDto {
    return {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        parentId: values.parent?.id || undefined,
    }
}

function mapUpdatePayload(values: CategoryFormValues): UpdateItemCategoryDto {
    return {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        parentId: values.parent?.id || undefined,
        isActive: values.isActive ?? true,
    }
}

export function CategoriesForm({ resourceId, initialData, onSuccess, paramKey }: CategoriesFormProps) {
    const api = useApi()
    const { close } = useFormDialog(paramKey)

    const { form, isEditing, isInitializing } = useResourceForm<CategoryFormValues, unknown>({
        schema: categoryFormSchema,
        defaultValues: DEFAULT_CATEGORY_FORM_VALUES,
        resourceId,
        initialize: (id) => api[itemCategoryResource.key].show(id),
        initialData,
        queryKey: [itemCategoryResource.routes.show, resourceId],
        mapToFormValues: mapCategoryToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: CategoryFormValues) => {
            const promise = isEditing && resourceId
                ? api[itemCategoryResource.key].update(resourceId, mapUpdatePayload(values))
                : api[itemCategoryResource.key].create(mapCreatePayload(values))

            toast.promise(promise, {
                loading: isEditing ? "Updating category..." : "Creating category...",
                success: isEditing ? "Category updated successfully" : "Category created successfully",
                error: isEditing ? "Failed to update category" : "Failed to create category",
            })

            return promise
        },
        onSuccess: () => {
            form.reset(DEFAULT_CATEGORY_FORM_VALUES)
            close()
            onSuccess?.()
        },
    })

    const isBusy = isPending || isInitializing

    return (
        <Rhform form={form} onSubmit={(values) => mutate(values)}>
            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="me-2 h-4 w-4" />
                    <AlertTitle>
                        {isEditing ? "Failed to update category" : "Failed to create category"}
                    </AlertTitle>
                    {error.message}
                </Alert>
            )}
            <FieldGroup>
                <RhfTextField
                    name="name"
                    label="الأسم"
                    placeholder="e.g. Electronics"
                    required
                    disabled={isBusy}
                />
                <RhfTextField
                    name="description"
                    label="الوصف"
                    placeholder="Category description"
                    disabled={isBusy}
                />
                <RhfResourceSelect
                    name="parent"
                    label="Parent Category"
                    placeholder="Select parent category..."
                    client={(api) => api[itemCategoryResource.key]}
                    getLabel={(item) => item.name}
                    getValue={(item) => item}
                    pageSize={20}
                    disabled={isBusy}
                />
                {isEditing && (
                    <RhfCheckboxField
                        name="isActive"
                        label="Active"
                        description="Inactive categories remain available historically but are hidden from active choices."
                        disabled={isBusy}
                    />
                )}
                <Button type="submit" variant="default" disabled={isBusy}>
                    {isEditing ? <Save /> : <Plus />}
                    {isBusy
                        ? (isEditing ? "Updating..." : "Creating...")
                        : (isEditing ? "Update Category" : "Create Category")}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}

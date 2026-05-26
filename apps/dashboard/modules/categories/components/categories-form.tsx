"use client"

import { AlertTriangle, Plus, Save } from "lucide-react"
import { toast } from "sonner"
import { itemCategoryResource } from "@devloggers/api-contracts"
import { Rhform, RhfCheckboxField, RhfTextField, RhfResourceSelect } from "@/shared/components/form"
import { useFormDialog } from "@/shared/components/form-dialog"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { FieldGroup } from "@/shared/components/ui/field"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useAuthApi } from "@/shared/useApi"
import {
    categoryFormSchema,
    DEFAULT_CATEGORY_FORM_VALUES,
    mapCategoryToFormValues,
    type CategoryFormValues,
} from "../categories.config"
import { CategoriesClient } from "@devloggers/api-client"
import type { ResourceItem } from "@/shared/data-view/resource/types"

export type CategoriesFormProps = {
    resourceId?: string | null
    initialData?: ResourceItem<CategoriesClient> | null
    onSuccess?: () => void
    paramKey?: string
}

function mapCreatePayload(values: CategoryFormValues) {
    return {
        name: values.name.trim(),
        description: values.description?.trim() ?? "",
        parentId: values.parentId ?? null,
        isActive: values.isActive ?? true,
    }
}

function mapUpdatePayload(values: CategoryFormValues) {
    const payload: Record<string, unknown> = {
        name: values.name.trim(),
    }
    if (values.description?.trim()) {
        payload.description = values.description.trim()
    }
    if (values.parentId) {
        payload.parentId = values.parentId
    }
    if (values.isActive !== undefined) {
        payload.isActive = values.isActive
    }
    return payload
}

export function CategoriesForm({ resourceId, initialData, onSuccess, paramKey }: CategoriesFormProps) {
    const api = useAuthApi()
    const { close } = useFormDialog(paramKey)

    const { form, isEditing, isInitializing } = useResourceForm<CategoryFormValues, unknown>({
        schema: categoryFormSchema,
        defaultValues: DEFAULT_CATEGORY_FORM_VALUES,
        resourceId,
        initialize: (id) => api.categories.show(id),
        initialData,
        queryKey: [itemCategoryResource.routes.show, resourceId],
        mapToFormValues: mapCategoryToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: CategoryFormValues) => {
            const promise = isEditing && resourceId
                ? api.categories.update(resourceId, mapUpdatePayload(values))
                : api.categories.create(mapCreatePayload(values))

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
                    client={(api) => api.categories}
                    getLabel={(item) => item.name}
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

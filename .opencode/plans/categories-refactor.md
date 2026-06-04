# Categories Feature Refactor Plan

Refactor categories from the legacy `ResourcePage` monolith to the new compound component pattern (same as units module).

---

## 1. Fix `packages/api-contracts/src/resources/item-category.resource.ts`

Remove the extra `details` route — `CrudClient` expects exactly 5 routes (`list`, `show`, `create`, `update`, `delete`).

```ts
export const itemCategoryResource = defineCrudResource({
  key: 'item-categories',
  routes: {
    list: '/item-categories',
    show: '/item-categories/{id}',
    create: '/item-categories',
    update: '/item-categories/{id}',
    delete: '/item-categories/{id}',
  },
})
```

---

## 2. Fix `packages/api-client/src/clients/categories.client.ts`

Add proper constructor to match UnitsClient pattern:

```ts
import { itemCategoryResource } from "@devloggers/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class CategoriesClient extends CrudClient<typeof itemCategoryResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, itemCategoryResource)
  }
}
```

---

## 3. Fix `packages/api-client/src/api.ts`

Remove explicit `itemCategoryResource` from the factory (client now handles it internally):

```ts
categories: new CategoriesClient(client),
// was: new CategoriesClient(client, itemCategoryResource)
```

Also remove the `import { itemCategoryResource } from "@devloggers/api-contracts"` since it's no longer needed in api.ts.

---

## 4. Create `apps/dashboard/modules/categories/categories.config.ts`

Pure TS (no JSX). Contains Zod schema, form values type, defaults, and mapper.

```ts
import { z } from "zod"

export const categoryFormSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    description: z.string().optional(),
    parentId: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>

export const DEFAULT_CATEGORY_FORM_VALUES: CategoryFormValues = {
    name: "",
    description: "",
    parentId: null,
    isActive: true,
}

export function mapCategoryToFormValues(data: unknown): CategoryFormValues {
    const resolved = (data && typeof data === "object" && "data" in data
        ? (data as { data?: Partial<CategoryFormValues> }).data
        : data) as Partial<CategoryFormValues> | null | undefined

    return {
        name: resolved?.name ?? "",
        description: resolved?.description ?? "",
        parentId: resolved?.parentId ?? null,
        isActive: resolved?.isActive ?? true,
    }
}
```

---

## 5. Create `apps/dashboard/modules/categories/components/categories-columns.tsx`

```tsx
import type { ColumnDef } from "@tanstack/react-table"
import type { CategoriesClient } from "@devloggers/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { ColumnHeader } from "@/shared/data-view/table-view"

export function createCategoriesColumns(
    helpers: ResourceTableHelpers<CategoriesClient>,
): ColumnDef<ResourceItem<CategoriesClient>>[] {
    return [
        {
            accessorKey: "name",
            header: ({ column }) => <ColumnHeader column={column} title="Name" />,
        },
        {
            accessorKey: "description",
            header: ({ column }) => <ColumnHeader column={column} title="Description" />,
        },
        {
            accessorKey: "isActive",
            header: ({ column }) => <ColumnHeader column={column} title="Active" />,
        },
        helpers.actionsColumn(),
    ]
}
```

---

## 6. Create `apps/dashboard/modules/categories/components/categories-page.tsx`

Compound component composition root:

```tsx
"use client"

import { type CategoriesClient } from "@devloggers/api-client"
import {
    ResourceProvider,
    ResourceLayout,
    ResourceTable,
    useResourceContext,
} from "@/shared/data-view/resource"
import FormDialog from "@/shared/components/form-dialog"
import { CategoriesForm } from "./categories-form"
import { createCategoriesColumns } from "./categories-columns"

function CategoriesHeaderActions() {
    const resource = useResourceContext<CategoriesClient>()

    return (
        <FormDialog
            title={resource.selectedItem ? `تعديل ${resource.selectedItem?.name}` : "إضافة فئة"}
            onClose={() => resource.setSelectedItem(null)}
        >
            {(resourceId) => (
                <CategoriesForm
                    resourceId={resourceId}
                    initialData={resourceId ? resource.selectedItem : null}
                    onSuccess={resource.invalidateQuery}
                />
            )}
        </FormDialog>
    )
}

export function CategoriesPage() {
    return (
        <ResourceProvider<CategoriesClient>
            getClient={(api) => api.categories}
            routeKey="item-categories"
        >
            <ResourceLayout
                title="Categories"
                headerProps={{ actions: <CategoriesHeaderActions /> }}
            >
                <ResourceTable<CategoriesClient> columns={createCategoriesColumns} />
            </ResourceLayout>
        </ResourceProvider>
    )
}
```

---

## 7. Create `apps/dashboard/modules/categories/components/categories-form.tsx`

Uses `RhfResourceSelect` for the `parentId` field with the categories client:

```tsx
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
        parentId: values.parentId || undefined,
    }
}

function mapUpdatePayload(values: CategoryFormValues): UpdateItemCategoryDto {
    return {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        parentId: values.parentId || undefined,
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
                    name="parentId"
                    label="Parent Category"
                    placeholder="Select parent category..."
                    client={(api) => api.categories}
                    getLabel={(item) => item.name}
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
```

---

## 8. Create `apps/dashboard/modules/categories/hooks/use-categories-resource.ts`

```ts
import type { CategoriesClient } from "@devloggers/api-client"
import type { ResourceContext } from "@/shared/data-view/resource"
import { useResourceContext } from "@/shared/data-view/resource"

export type CategoriesResourceContext = ResourceContext<CategoriesClient>

export function useCategoriesResource(): CategoriesResourceContext {
    return useResourceContext<CategoriesClient>()
}
```

---

## 9. Create `apps/dashboard/modules/categories/hooks/index.ts`

```ts
export { useCategoriesResource } from "./use-categories-resource"
export type { CategoriesResourceContext } from "./use-categories-resource"
```

---

## 10. Create `apps/dashboard/modules/categories/index.ts`

```ts
export { CategoriesPage } from "./components/categories-page"
export { CategoriesForm } from "./components/categories-form"
export { createCategoriesColumns } from "./components/categories-columns"
export { useCategoriesResource } from "./hooks"
export type { CategoriesResourceContext } from "./hooks"
export { categoryFormSchema, DEFAULT_CATEGORY_FORM_VALUES, mapCategoryToFormValues } from "./categories.config"
export type { CategoryFormValues } from "./categories.config"
```

---

## 11. Update `apps/dashboard/app/(authenticated)/catalog/categories/page.tsx`

Replace the legacy ResourcePage with the new module component:

```tsx
import { CategoriesPage } from "@/modules/categories"

export default function Page() {
    return <CategoriesPage />
}
```

---

## Summary of changes

| Layer | File | Action |
|-------|------|--------|
| api-contracts | `resources/item-category.resource.ts` | Remove `details` route |
| api-client | `clients/categories.client.ts` | Add constructor with `super(apiClient, itemCategoryResource)` |
| api-client | `src/api.ts` | Remove explicit resource param from CategoriesClient |
| dashboard | `modules/categories/categories.config.ts` | **New** — schema, defaults, mapper |
| dashboard | `modules/categories/components/categories-columns.tsx` | **New** |
| dashboard | `modules/categories/components/categories-page.tsx` | **New** |
| dashboard | `modules/categories/components/categories-form.tsx` | **New** — includes `RhfResourceSelect` for parentId |
| dashboard | `modules/categories/hooks/use-categories-resource.ts` | **New** |
| dashboard | `modules/categories/hooks/index.ts` | **New** |
| dashboard | `modules/categories/index.ts` | **New** — barrel |
| dashboard | `app/.../categories/page.tsx` | Replace with thin wrapper |
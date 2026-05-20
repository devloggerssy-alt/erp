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
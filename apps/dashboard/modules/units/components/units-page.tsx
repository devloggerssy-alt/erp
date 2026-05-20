"use client"

import { type UnitsClient } from "@devloggers/api-client"
import {
    ResourceProvider,
    ResourceLayout,
    ResourceTable,
    useResourceContext,
} from "@/shared/data-view/resource"
import FormDialog from "@/shared/components/form-dialog"
import { UnitsForm } from "./units-form"
import { createUnitsColumns } from "./units-columns"

function UnitsHeaderActions() {
    const resource = useResourceContext<UnitsClient>()

    return (
        <FormDialog
            title={resource.selectedItem ? `تعديل ${resource.selectedItem?.name}` : "إضافة وحدة"}
            onClose={() => resource.setSelectedItem(null)}
        >
            {(resourceId) => (
                <UnitsForm
                    resourceId={resourceId}
                    initialData={resourceId ? resource.selectedItem : null}
                    onSuccess={resource.invalidateQuery}
                />
            )}
        </FormDialog>
    )
}

export function UnitsPage() {
    return (
        <ResourceProvider<UnitsClient>
            getClient={(api) => api.units}
            routeKey="units"
        >
            <ResourceLayout
                title="Units"
                headerProps={{ actions: <UnitsHeaderActions /> }}
            >
                <ResourceTable<UnitsClient> columns={createUnitsColumns} />
            </ResourceLayout>
        </ResourceProvider>
    )
}
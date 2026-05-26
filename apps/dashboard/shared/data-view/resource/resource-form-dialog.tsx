"use client"

import type { ComponentType } from "react"
import type { CrudCollectionClient } from "@devloggers/api-client"
import FormDialog from "@/shared/components/form-dialog"
import { useResourceContext } from "./resource-context"
import type { ResourceFormProps, ResourceItem } from "./types"

export type ResourceFormDialogProps<TClient extends CrudCollectionClient> = {
    form: ComponentType<ResourceFormProps<TClient>>
    title?: string | ((item: ResourceItem<TClient> | null) => string)
}

export function ResourceFormDialog<TClient extends CrudCollectionClient>({
    form: FormComponent,
    title,
}: ResourceFormDialogProps<TClient>) {
    const resource = useResourceContext<TClient>()

    const resolvedTitle = typeof title === "function"
        ? title(resource.selectedItem)
        : title ?? ""

    return (
        <FormDialog
            title={resolvedTitle}
            onClose={() => resource.setSelectedItem(null)}
        >
            {(resourceId) => (
                <FormComponent
                    resourceId={resourceId}
                    initialData={resourceId ? resource.selectedItem : null}
                    onSuccess={resource.invalidateQuery}
                />
            )}
        </FormDialog>
    )
}

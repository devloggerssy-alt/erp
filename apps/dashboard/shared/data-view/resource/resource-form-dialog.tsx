"use client"

import type { ComponentType } from "react"
import type { ICrudClient } from "@devloggers/api-client"
import FormDialog from "@/shared/components/form-dialog"
import { useResourceContext } from "./resource-context"
import type { ResourceFormProps, ResourceItem } from "./types"

export type ResourceFormDialogProps<TClient extends ICrudClient> = {
    form: ComponentType<ResourceFormProps<TClient>>
    title?: string | ((item: ResourceItem<TClient> | null) => string)
}

export function ResourceFormDialog<TClient extends ICrudClient>({
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
            paramKey={resource.paramKey}
            onClose={() => resource.setSelectedItem(null)}
        >
            {(resourceId) => (
                <FormComponent
                    resourceId={resourceId}
                    initialData={resourceId ? resource.selectedItem : null}
                    onSuccess={resource.invalidateQuery}
                    paramKey={resource.paramKey}
                />
            )}
        </FormDialog>
    )
}

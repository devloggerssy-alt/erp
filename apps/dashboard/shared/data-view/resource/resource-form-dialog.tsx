"use client"

import type { ComponentType, ReactNode } from "react"
import type { ICrudClient } from "@devloggers/api-client"
import FormDialog from "@/shared/components/form-dialog"
import { useResourceContext } from "./resource-context"
import type { ResourceFormProps, ResourceItem } from "./types"

/**
 * Generic create/edit dialog for a resource. Everything here is
 * domain-agnostic: the caller may tweak the shell (layout, header, close
 * button, scrolling), and any module-specific inputs are forwarded to the form
 * through the generic `TExtra` payload (`formProps`) — the dialog itself never
 * knows about them.
 */
export type ResourceFormDialogProps<
    TClient extends ICrudClient,
    TExtra extends object = object,
> = {
    form: ComponentType<ResourceFormProps<TClient> & TExtra>
    title?: string | ((item: ResourceItem<TClient> | null) => string)
    /** Extra, domain-agnostic props forwarded verbatim to the form component. */
    formProps?: TExtra
    /** Custom trigger element. When omitted, the built-in create button is used. */
    trigger?: ReactNode
    /** Override the dialog content classes (e.g. full-screen document layouts). */
    contentClassName?: string
    /** Replace the default header, or pass `false` to hide it. */
    header?: ReactNode | false
    /** Render the built-in close button. Defaults to true. */
    showCloseButton?: boolean
    /** Wrap children in a scroll area. Defaults to true; disable for self-scrolling forms. */
    scrollable?: boolean
    /** Override the scroll area classes. */
    scrollClassName?: string
}

export function ResourceFormDialog<
    TClient extends ICrudClient,
    TExtra extends object = object,
>({
    form: FormComponent,
    title,
    formProps,
    trigger,
    contentClassName,
    header,
    showCloseButton,
    scrollable,
    scrollClassName,
}: ResourceFormDialogProps<TClient, TExtra>) {
    const resource = useResourceContext<TClient>()

    const resolvedTitle = typeof title === "function"
        ? title(resource.selectedItem)
        : title ?? ""

    return (
        <FormDialog
            open={resource.isDialogOpen}
            onOpenChange={(open) => {
                if (open) {
                    resource.openCreate()
                } else {
                    resource.closeDialog()
                    resource.setSelectedItem(null)
                }
            }}
            title={resolvedTitle}
            resourceId={resource.dialogResourceId}
            trigger={trigger}
            showTrigger={resource.canCreate}
            contentClassName={contentClassName}
            header={header}
            showCloseButton={showCloseButton}
            scrollable={scrollable}
            scrollClassName={scrollClassName}
        >
            {(resourceId) => (
                <FormComponent
                    resourceId={resourceId}
                    initialData={resourceId ? resource.selectedItem : null}
                    onSuccess={resource.invalidateQuery}
                    paramKey={resource.paramKey}
                    {...(formProps as TExtra)}
                />
            )}
        </FormDialog>
    )
}

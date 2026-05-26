"use client"

import type { CrudCollectionClient } from "@devloggers/api-client"
import { ResourceProvider } from "./resource-context"
import { ResourcePage } from "./resource-page-v2"
import { ResourceTable } from "./resource-table"
import { ResourceFormDialog } from "./resource-form-dialog"
import { ResourceCreateButton } from "./resource-create-button"
import { ResourceGrid } from "./resource-grid"
import { ResourcePagination } from "./resource-pagination"
import { useResource } from "./use-resource"
import type { ResourceRender, UseResourceOptions } from "./types"
import type { ResourceProviderProps } from "./resource-context"
import type { ResourcePageProps } from "./resource-page-v2"
import type { ResourceTableProps } from "./resource-table"
import type { ResourceFormDialogProps } from "./resource-form-dialog"
import type { ResourceCreateButtonProps } from "./resource-create-button"
import type { ResourceGridProps } from "./resource-grid"

// ── Legacy render-prop component (backwards compatible) ──
export type LegacyResourceProps<TClient extends CrudCollectionClient> = UseResourceOptions<TClient> & {
    children?: ResourceRender<TClient>
    render?: ResourceRender<TClient>
}

export function LegacyResource<TClient extends CrudCollectionClient>({
    children,
    render,
    ...options
}: LegacyResourceProps<TClient>) {
    const resource = useResource(options)
    const renderResource = render ?? children

    if (!renderResource) {
        throw new Error("Resource requires a render prop or children function.")
    }

    return <>{renderResource(resource)}</>
}

// ── Compound namespace ──
type ResourceComponent = typeof ResourceProvider & {
    Provider: typeof ResourceProvider
    Page: typeof ResourcePage
    Table: typeof ResourceTable
    FormDialog: typeof ResourceFormDialog
    CreateButton: typeof ResourceCreateButton
    Grid: typeof ResourceGrid
    Pagination: typeof ResourcePagination
}

const Resource = ResourceProvider as ResourceComponent

Resource.Provider = ResourceProvider
Resource.Page = ResourcePage
Resource.Table = ResourceTable
Resource.FormDialog = ResourceFormDialog
Resource.CreateButton = ResourceCreateButton
Resource.Grid = ResourceGrid
Resource.Pagination = ResourcePagination

export { Resource }

export type {
    ResourceProviderProps as ResourceProps,
    ResourcePageProps,
    ResourceTableProps,
    ResourceFormDialogProps,
    ResourceCreateButtonProps,
    ResourceGridProps,
}

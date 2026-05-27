"use client"

import type { ReactNode } from "react"
import type { ICrudClient } from "@devloggers/api-client"
import { ResourceProvider, useResourceContext } from "./resource-context"
 import { ResourceTable } from "./resource-table"
import { ResourceFormDialog } from "./resource-form-dialog"
import { ResourceCreateButton } from "./resource-create-button"
import { ResourceGrid } from "./resource-grid"
import { ResourcePagination } from "./resource-pagination"
import type { UseResourceOptions, ResourceContext, ResourceItem } from "./types"
import type { ResourceProviderProps } from "./resource-context"
 import type { ResourceTableProps } from "./resource-table"
import type { ResourceFormDialogProps } from "./resource-form-dialog"
import type { ResourceCreateButtonProps } from "./resource-create-button"
import type { ResourceGridProps } from "./resource-grid"
import { ResourcePage, ResourcePageProps } from "./resource-page"

export type ResourceNamespace<TClient extends ICrudClient> = {
    (props: { children: ReactNode } & Partial<ResourceProviderProps<TClient>>): React.JSX.Element
    Provider: typeof ResourceProvider
    Page: (props: ResourcePageProps<TClient>) => React.JSX.Element
    Table: (props: ResourceTableProps<TClient>) => React.JSX.Element
    FormDialog: (props: ResourceFormDialogProps<TClient>) => React.JSX.Element
    CreateButton: (props: ResourceCreateButtonProps) => React.JSX.Element
    Grid: (props: ResourceGridProps<ResourceItem<TClient>>) => React.JSX.Element
    Pagination: () => React.JSX.Element
    useContext: () => ResourceContext<TClient>
}

export function generateResource<TClient extends ICrudClient>(
    config: UseResourceOptions<TClient>,
): ResourceNamespace<TClient> {
    function Resource({ children, ...rest }: { children: ReactNode } & Partial<ResourceProviderProps<TClient>>) {
        return (
            <ResourceProvider<TClient> {...config} {...rest}>
                {children}
            </ResourceProvider>
        )
    }

    Resource.Provider = ResourceProvider as typeof ResourceProvider
    Resource.Page = ResourcePage as (props: ResourcePageProps<TClient>) => React.JSX.Element
    Resource.Table = ResourceTable as (props: ResourceTableProps<TClient>) => React.JSX.Element
    Resource.FormDialog = ResourceFormDialog as (props: ResourceFormDialogProps<TClient>) => React.JSX.Element
    Resource.CreateButton = ResourceCreateButton as (props: ResourceCreateButtonProps) => React.JSX.Element
    Resource.Grid = ResourceGrid as (props: ResourceGridProps<ResourceItem<TClient>>) => React.JSX.Element
    Resource.Pagination = ResourcePagination as () => React.JSX.Element
    Resource.useContext = useResourceContext as unknown as () => ResourceContext<TClient>

    return Resource as ResourceNamespace<TClient>
}

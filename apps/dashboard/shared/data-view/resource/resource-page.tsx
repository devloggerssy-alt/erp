"use client"

import React from "react"
import type { ICrudClient } from "@devloggers/api-client"
import DashboardPage from "@/infrastructure/components/layout/dashboard/dashboard-page"
import type { DashboardHeaderProps } from "@/infrastructure/components/layout/dashboard"
import { LegacyResource } from "./resource"
import { ResourceTableView } from "./resource-table-view"
import type {
    ResourceColumns,
    ResourceContext,
    ResourceDataViewComponent,
    ResourceItem,
    ResourceRender,
    UseResourceOptions,
} from "./types"

type ReactNodeOrRender<TClient extends ICrudClient> = React.ReactNode | ResourceRender<TClient>

type ResourcePageBaseProps<TClient extends ICrudClient> = UseResourceOptions<TClient> & {
    headerProps?: DashboardHeaderProps | ((resource: ResourceContext<TClient>) => DashboardHeaderProps)
    header?: ReactNodeOrRender<TClient> | null
    pageTitle?: string
    toolbar?: ReactNodeOrRender<TClient>
}

type ResourcePageTableProps<TClient extends ICrudClient> = ResourcePageBaseProps<TClient> & {
    columns: ResourceColumns<TClient>
    dataView?: ResourceDataViewComponent<ResourceItem<TClient>>
    onRowClick?: (row: ResourceItem<TClient>) => void
    renderView?: never
}

type ResourcePageCustomViewProps<TClient extends ICrudClient> = ResourcePageBaseProps<TClient> & {
    renderView: ResourceRender<TClient>
    columns?: never
    dataView?: never
    onRowClick?: never
}

export type ResourcePageProps<TClient extends ICrudClient> =
    | ResourcePageTableProps<TClient>
    | ResourcePageCustomViewProps<TClient>

function resolveNodeOrRender<TClient extends ICrudClient>(
    value: ReactNodeOrRender<TClient> | null | undefined,
    resource: ResourceContext<TClient>,
) {
    return typeof value === "function" ? value(resource) : value
}

export function ResourcePage<TClient extends ICrudClient>({
    headerProps: headerPropsProp,
    header,
    pageTitle,
    toolbar,
    ...props
}: ResourcePageProps<TClient>) {
    return (
        <LegacyResource<TClient>
            routeKey={props.routeKey}
            getClient={props.getClient}
            queryOptions={props.queryOptions}
            paramKey={props.paramKey}
            extraParams={props.extraParams}
        >
            {(resource) => {
                const resolvedHeaderProps = typeof headerPropsProp === "function"
                    ? headerPropsProp(resource)
                    : headerPropsProp

                const resolvedHeader = resolveNodeOrRender(header, resource)
                const resolvedToolbar = resolveNodeOrRender(toolbar, resource)

                const content = "renderView" in props
                    ? props.renderView?.(resource)
                    : (
                        <ResourceTableView
                            resource={resource}
                            columns={props.columns}
                            view={props.dataView}
                            onRowClick={props.onRowClick}
                        />
                    )

                return (
                    <DashboardPage
                        header={resolvedHeader}
                        headerProps={resolvedHeaderProps}
                        title={pageTitle}
                        toolbar={resolvedToolbar}
                    >
                        {content}
                    </DashboardPage>
                )
            }}
        </LegacyResource>
    )
}
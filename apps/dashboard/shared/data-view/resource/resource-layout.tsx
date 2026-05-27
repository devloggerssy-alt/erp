"use client"

import type { ReactNode } from "react"
import type { ICrudClient } from "@devloggers/api-client"
import DashboardPage from "@/infrastructure/components/layout/dashboard/dashboard-page"
import type { DashboardHeaderProps } from "@/infrastructure/components/layout/dashboard"
import type { ResourceContext, ResourceRender } from "./types"
import { useResourceContext } from "./resource-context"

type ReactNodeOrRender<TClient extends ICrudClient> = ReactNode | ResourceRender<TClient>

export type ResourceLayoutProps<TClient extends ICrudClient> = {
    title?: string
    headerProps?: DashboardHeaderProps | ((resource: ResourceContext<TClient>) => DashboardHeaderProps)
    header?: ReactNodeOrRender<TClient> | null
    toolbar?: ReactNodeOrRender<TClient>
    fullscreen?: boolean
    children: ReactNode
}

function resolveNodeOrRender<TClient extends ICrudClient>(
    value: ReactNodeOrRender<TClient> | null | undefined,
    resource: ResourceContext<TClient>,
): ReactNode {
    return typeof value === "function" ? value(resource) : value
}

export function ResourceLayout<TClient extends ICrudClient>({
    headerProps: headerPropsProp,
    children,
}: ResourceLayoutProps<TClient>) {
    // const resource = useResourceContext<TClient>()

    // const resolvedHeaderProps = typeof headerPropsProp === "function"
    //     ? headerPropsProp(resource)
    //     : headerPropsProp

    // const resolvedHeader = resolveNodeOrRender(header, resource)
    // const resolvedToolbar = resolveNodeOrRender(toolbar, resource)

    return (
        // <DashboardPage
        //     header={resolvedHeader}
        //     headerProps={resolvedHeaderProps}
        //     title={title}
        //     toolbar={resolvedToolbar}
        //     fullscreen={fullscreen}
        // >
        <>
            {children}
            {/* </DashboardPage> */}
        </>
    )
}
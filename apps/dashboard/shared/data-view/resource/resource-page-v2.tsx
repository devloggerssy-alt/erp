"use client"

import type { ReactNode } from "react"
import type { CrudCollectionClient } from "@devloggers/api-client"
import { ResourceLayout } from "./resource-layout"
import type { ResourceContext } from "./types"

export type ResourcePageProps<TClient extends CrudCollectionClient> = {
    title: string
    actions?: ReactNode | ((resource: ResourceContext<TClient>) => ReactNode)
    children: ReactNode
}

export function ResourcePage<TClient extends CrudCollectionClient>({
    title,
    actions,
    children,
}: ResourcePageProps<TClient>) {
    return (
        <ResourceLayout<TClient>
            title={title}
            headerProps={(resource) => ({
                actions: typeof actions === "function" ? actions(resource) : actions,
            })}
        >
            {children}
        </ResourceLayout>
    )
}

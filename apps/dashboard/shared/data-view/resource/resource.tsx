"use client"

import React from "react"
import type { CrudCollectionClient } from "@devloggers/api-client"
import { useResource } from "./use-resource"
import type { ResourceRender, UseResourceOptions } from "./types"

export type ResourceProps<TClient extends CrudCollectionClient> = UseResourceOptions<TClient> & {
    children?: ResourceRender<TClient>
    render?: ResourceRender<TClient>
}

export function Resource<TClient extends CrudCollectionClient>({
    children,
    render,
    ...options
}: ResourceProps<TClient>) {
    const resource = useResource(options)
    const renderResource = render ?? children

    if (!renderResource) {
        throw new Error("Resource requires a render prop or children function.")
    }

    return <>{renderResource(resource)}</>
}
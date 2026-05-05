"use client"

import React from "react"
import { useResource } from "./use-resource"
import type { ResourceClient, ResourceRender, UseResourceOptions } from "./types"

export type ResourceProps<TClient extends ResourceClient> = UseResourceOptions<TClient> & {
    children?: ResourceRender<TClient>
    render?: ResourceRender<TClient>
}

export function Resource<TClient extends ResourceClient>({
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
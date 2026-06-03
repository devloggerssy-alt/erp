"use client"

import { useResourceContext } from "./resource-context"
import { ResourceFilterPanel } from "@/shared/data-view/filter"

export type ResourceFilterProps = {
    className?: string
}

export function ResourceFilter({ className }: ResourceFilterProps) {
    const { filterOptions, params, handleChange } = useResourceContext()

    return (
        <ResourceFilterPanel
            filterOptions={filterOptions}
            value={params.filters}
            onChange={(filters) => handleChange({ type: "filters", filters })}
            className={className}
        />
    )
}

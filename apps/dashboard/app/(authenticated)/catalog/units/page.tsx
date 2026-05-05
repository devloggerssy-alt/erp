"use client"

import { ResourcePage } from "@/shared/data-view/resource"
import { unitResource } from "@devloggers/api-contracts"

export default function page() {
    return (
        <ResourcePage
            getClient={c => c.units}
            columns={({ actionsColumn }) => ([{ accessorKey: 'name' }, { ...actionsColumn() }])}
            routeKey={unitResource.key} />
    )
}
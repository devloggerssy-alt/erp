"use client"

import type { UnitsClient } from "@devloggers/api-client"
import { UnitsForm } from "@/modules/units/units.form"
import FormDialog from "@/shared/components/form-dialog"
import { ResourcePage } from "@/shared/data-view/resource"
import { unitResource } from "@devloggers/api-contracts"

export default function UnitsPage() {
    return (
        <ResourcePage<UnitsClient>
            headerProps={({ selectedItem, invalidateQuery }) => ({
                actions: (
                    <FormDialog title="Unit">
                        {(resourceId) => (
                            <UnitsForm
                                resourceId={resourceId}
                                initialData={resourceId ? selectedItem : null}
                                onSuccess={invalidateQuery}
                            />
                        )}
                    </FormDialog>
                ),
            })}
            getClient={c => c.units}
            columns={({ actionsColumn }) => ([{ accessorKey: 'name' }, { ...actionsColumn() }])}

            routeKey={unitResource.key} />
    )
}
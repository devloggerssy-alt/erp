


"use client"
import type { UnitsClient } from "@devloggers/api-client"
import { UnitsForm } from "@/modules/units/units.form"
import FormDialog from "@/shared/components/form-dialog"
import { ResourcePage } from "@/shared/data-view/resource"

export default function UnitsPage() {
    return (
        <ResourcePage<UnitsClient>
            headerProps={({ selectedItem, invalidateQuery, setSelectedItem }) => ({
                actions: (
                    <FormDialog title={selectedItem ? `تعديل ${selectedItem?.name}` : "إضافة واحدة"} onClose={() => setSelectedItem(null)}>
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
            columns={({ actionsColumn }) => ([{ accessorKey: 'name' }, { accessorKey: 'abbreviation' }, { ...actionsColumn() }])}
        />
    )
}
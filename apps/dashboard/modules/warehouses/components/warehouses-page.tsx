"use client"

import { WarehousesResource } from "../warehouses.resource"
import { WarehousesForm } from "./warehouses-form"
import { createWarehousesColumns } from "./warehouses-columns"

export function WarehousesPage() {
    return (
        <WarehousesResource>
            <WarehousesResource.Page
                title="Warehouses"
                actions={
                    <WarehousesResource.FormDialog
                        title={(it) => (it?.id ? it.name : "Add warehouse")}
                        form={WarehousesForm}
                    />
                }
            >
                <WarehousesResource.Table columns={createWarehousesColumns} />
            </WarehousesResource.Page>
        </WarehousesResource>
    )
}

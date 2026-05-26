"use client"

import { UnitsResource } from "../units.resource"
import { UnitsForm } from "./units-form"
import { createUnitsColumns } from "./units-columns"

export function UnitsPage() {
    return (
        <UnitsResource>
            <UnitsResource.Page
                title="Units"
                actions={<UnitsResource.CreateButton />}
            >
                <UnitsResource.FormDialog form={UnitsForm} />
                <UnitsResource.Table columns={createUnitsColumns} />
            </UnitsResource.Page>
        </UnitsResource>
    )
}

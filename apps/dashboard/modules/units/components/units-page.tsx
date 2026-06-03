"use client"

import { UnitsResource } from "../units.resource"
import { UnitsForm } from "./units-form"
import { createUnitsColumns } from "./units-columns"

export function UnitsPage() {
    return (
        <UnitsResource>
            <UnitsResource.Page
                title="Units"
                toolbar={
                    <UnitsResource.Toolbar>
                        <UnitsResource.Filter />
                        <div className="ms-auto w-full max-w-sm sm:w-auto">
                            <UnitsResource.Search />
                        </div>
                    </UnitsResource.Toolbar>
                }
                actions={
                    <UnitsResource.FormDialog
                        title={(it) => (it?.id ? it.name : "إضافة وحدة")}
                        form={UnitsForm}
                    />
                }
            >
                <UnitsResource.Table columns={createUnitsColumns} />
            </UnitsResource.Page>
        </UnitsResource>
    )
}

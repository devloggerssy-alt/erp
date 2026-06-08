"use client"

import { type PartiesClient } from "@devloggers/api-client"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { PartiesForm } from "@/modules/parties"

/** Suppliers view of the shared party form, scoped to the `SUPPLIER` mode. */
export function SuppliersForm(props: ResourceFormProps<PartiesClient>) {
    return <PartiesForm {...props} mode="SUPPLIER" />
}

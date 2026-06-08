"use client"

import { type PartiesClient } from "@devloggers/api-client"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { PartiesForm } from "@/modules/parties"

/** Customers view of the shared party form, scoped to the `CUSTOMER` mode. */
export function CustomersForm(props: ResourceFormProps<PartiesClient>) {
    return <PartiesForm {...props} mode="CUSTOMER" />
}

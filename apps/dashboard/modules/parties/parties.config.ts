import { z } from "zod"
import type { CreatePartyDto, UpdatePartyDto } from "@devloggers/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

export type PartyAccountField = { id: string }
const optionalAccount = z.object({ id: z.string() }).passthrough().nullable().optional()

export const PARTY_TYPES = ["CUSTOMER", "SUPPLIER", "CUSTOMER_SUPPLIER"] as const
export type PartyTypeValue = (typeof PARTY_TYPES)[number]

/**
 * Customers and suppliers are scoped views over the same `Party` entity
 * (a party can be a customer, a supplier, or both via `CUSTOMER_SUPPLIER`).
 * `PartyMode` drives which `type` values a view lists and which `type` a
 * record created from that view defaults to.
 */
export const PARTY_MODES = ["CUSTOMER", "SUPPLIER"] as const
export type PartyMode = (typeof PARTY_MODES)[number]

export const PARTY_MODE_TYPES: Record<PartyMode, readonly PartyTypeValue[]> = {
    CUSTOMER: ["CUSTOMER", "CUSTOMER_SUPPLIER"],
    SUPPLIER: ["SUPPLIER", "CUSTOMER_SUPPLIER"],
}

export function partyModeListExtraParams(mode: PartyMode): Record<string, unknown> {
    return { "filters[type][$in][]": PARTY_MODE_TYPES[mode] }
}

/** i18n namespace each mode's customer-/supplier-facing strings live under. */
export const PARTY_MODE_NAMESPACE: Record<PartyMode, "business.resources.customers" | "business.resources.suppliers"> = {
    CUSTOMER: "business.resources.customers",
    SUPPLIER: "business.resources.suppliers",
}

export const partyFormSchema = z.object({
    code: z.string().optional(),
    name: z.string().trim().min(1, "Name is required"),
    type: z.enum(["CUSTOMER", "SUPPLIER", "CUSTOMER_SUPPLIER"]),
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    openingBalance: z.number().optional(),
    isActive: z.boolean().optional(),
    receivableAccount: optionalAccount,
    payableAccount: optionalAccount,
})

export type PartyFormValues = z.infer<typeof partyFormSchema>

export const DEFAULT_PARTY_FORM_VALUES: PartyFormValues = {
    code: "",
    name: "",
    type: "CUSTOMER",
    phone: "",
    email: "",
    address: "",
    openingBalance: 0,
    isActive: true,
    receivableAccount: null,
    payableAccount: null,
}

export function mapPartyToFormValues(data: unknown): PartyFormValues {
    const resolved = unwrapApiData<PartyFormValues & { receivableAccountId?: string; payableAccountId?: string }>(data)
    return {
        code: resolved.code ?? "",
        name: resolved.name ?? "",
        type: resolved.type ?? "CUSTOMER",
        phone: resolved.phone ?? "",
        email: resolved.email ?? "",
        address: resolved.address ?? "",
        openingBalance: resolved.openingBalance ?? 0,
        isActive: resolved.isActive ?? true,
        receivableAccount: resolved.receivableAccountId ? { id: resolved.receivableAccountId } : null,
        payableAccount: resolved.payableAccountId ? { id: resolved.payableAccountId } : null,
    }
}

export const partiesFormConfig: ResourceFormConfig<PartyFormValues, CreatePartyDto, UpdatePartyDto> = {
    schema: partyFormSchema,
    defaultValues: DEFAULT_PARTY_FORM_VALUES,
    mapToFormValues: mapPartyToFormValues,
    toCreate: (values) => ({
        code: values.code?.trim() || undefined,
        name: values.name.trim(),
        type: values.type,
        phone: values.phone?.trim() || undefined,
        email: values.email?.trim() || undefined,
        address: values.address?.trim() || undefined,
        openingBalance: values.openingBalance ?? 0,
        receivableAccountId: values.receivableAccount?.id || undefined,
        payableAccountId: values.payableAccount?.id || undefined,
    }),
    toUpdate: (values) => ({
        code: values.code?.trim() || undefined,
        name: values.name.trim(),
        type: values.type,
        phone: values.phone?.trim() || undefined,
        email: values.email?.trim() || undefined,
        address: values.address?.trim() || undefined,
        openingBalance: values.openingBalance ?? 0,
        isActive: values.isActive ?? true,
        receivableAccountId: values.receivableAccount?.id ?? null,
        payableAccountId: values.payableAccount?.id ?? null,
    }),
}

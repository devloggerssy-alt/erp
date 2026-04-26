"use client"

import { AlertTriangle, Plus, Save } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { FieldGroup } from "@/shared/components/ui/field"
import {
    Rhform,
    RhfTextField,
    RhfTextareaField,
    RhfAsyncSelectField,
    RhfImageField,
} from "@/shared/components/form"
import { ShopTypeInlineForm } from "./inline-forms/shop-type-inline-form"
import { BodyTypeInlineForm } from "./inline-forms/body-type-inline-form"
import { FuelTypeInlineForm } from "./inline-forms/fuel-type-inline-form"
import { TransmissionInlineForm } from "./inline-forms/transmission-inline-form"
import { ColorInlineForm } from "./inline-forms/color-inline-form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { toRelation, toId } from "@/shared/lib/utils"

import { vehicleFormSchema, type VehicleFormValues } from "./vehicle.schema"
import { VEHICLE_ROUTES } from "@garage/api"

// ── Props ──

export type VehicleFormProps = {
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
}

// ── Default values ──

const DEFAULT_VALUES: VehicleFormValues = {
    shop_type: null,
    vehicle_body_type: null,
    vehicle_fuel_type: null,
    vehicle_transmission: null,
    vehicle_color: null,
    make: "",
    model: "",
    year: "",
    sub_model: "",
    license_plate: "",
    vin_number: "",
    engine_size: "",
    drivetrain: "",
    mileage: "",
    owners_number: "",
    note: "",
    image: null,
}

// ── Mapping helpers ──

const mapLookupOption = (item: any) => ({
    value: String(item.id),
    label: item.name ?? item.title ?? String(item.id),
})

const STORE_OBJECT = { getOptionValue: (o: any) => o, getOptionLabel: (o: any) => o.label }

function mapToFormValues(data: unknown): VehicleFormValues {
    const d = (data as any)?.data ?? data ?? {}

    return {
        shop_type: toRelation(d.shop_type_id, d.shop_type?.title),
        vehicle_body_type: toRelation(d.vehicle_body_type_id, d.vehicle_body_type?.title),
        vehicle_fuel_type: toRelation(d.vehicle_fuel_type_id, d.vehicle_fuel_type?.title),
        vehicle_transmission: toRelation(d.vehicle_transmission_id, d.vehicle_transmission?.title),
        vehicle_color: toRelation(d.vehicle_color_id, d.vehicle_color?.title),
        make: d.make || "",
        model: d.model || "",
        year: d.year || "",
        sub_model: d.sub_model || "",
        license_plate: d.license_plate || "",
        vin_number: d.vin_number || "",
        engine_size: d.engine_size || "",
        drivetrain: d.drivetrain || "",
        mileage: d.mileage || "",
        owners_number: d.owners_number || "",
        note: d.note || "",
        image: null,
    }
}

function mapToPayload(values: VehicleFormValues) {
    return {
        shop_type_id: toId(values.shop_type),
        vehicle_body_type_id: toId(values.vehicle_body_type),
        vehicle_fuel_type_id: toId(values.vehicle_fuel_type),
        vehicle_transmission_id: toId(values.vehicle_transmission),
        vehicle_color_id: toId(values.vehicle_color),
        make: values.make,
        model: values.model,
        year: values.year,
        sub_model: values.sub_model || undefined,
        license_plate: values.license_plate || undefined,
        vin_number: values.vin_number || undefined,
        engine_size: values.engine_size || undefined,
        drivetrain: values.drivetrain || undefined,
        mileage: values.mileage || undefined,
        owners_number: values.owners_number || undefined,
        note: values.note || undefined,
        image: values.image instanceof File ? values.image : undefined,
    }
}

// ── Component ──

export function VehicleForm({ resourceId, initialData, onSuccess }: VehicleFormProps) {
    const api = useAuthApi()

    const { form, isEditing } = useResourceForm<VehicleFormValues, any>({
        schema: vehicleFormSchema,
        defaultValues: DEFAULT_VALUES,
        resourceId,
        initialData,
        mapToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: VehicleFormValues) => {
            const payload = mapToPayload(values)
            const promise = isEditing && resourceId
                ? api.vehicles.update(resourceId, payload)
                : api.vehicles.create(payload)
            toast.promise(promise, {
                loading: isEditing ? "Updating vehicle..." : "Creating vehicle...",
                success: isEditing ? "Vehicle updated successfully" : "Vehicle created successfully",
                error: isEditing ? "Failed to update vehicle" : "Failed to create vehicle",
            })
            return promise
        },
        onSuccess: () => {
            form.reset()
            onSuccess?.()
        },
    })

    return (
        <Rhform form={form} onSubmit={(values) => mutate(values)}>
            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="me-2 h-4 w-4" />
                    <AlertTitle>
                        {isEditing ? "Failed to update vehicle" : "Failed to create vehicle"}
                    </AlertTitle>
                    {error.message}
                </Alert>
            )}

            <FieldGroup>
                {/* Vehicle identity */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <RhfTextField name="make" label="Make" placeholder="e.g. Toyota" required />
                    <RhfTextField name="model" label="Model" placeholder="e.g. Camry" required />
                    <RhfTextField name="year" label="Year" placeholder="e.g. 2024" required />
                </div>

                <RhfTextField name="sub_model" label="Sub Model" placeholder="e.g. LE" />

                {/* Associations */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfAsyncSelectField
                        name="shop_type"
                        label="Shop Type"
                        placeholder="Select shop type"
                        queryKey={["shop-types"]}
                        listFn={() => api.shopTypes.list()}
                        mapOption={mapLookupOption}
                        createForm={(props) => <ShopTypeInlineForm {...props} />}
                        createLabel="Shop Type"
                        {...STORE_OBJECT}
                    />
                    <RhfAsyncSelectField
                        name="vehicle_body_type"
                        label="Body Type"
                        placeholder="Select body type"
                        queryKey={["vehicle-body-types"]}
                        listFn={() => api.vehicleAttributes.listBodyTypes()}
                        mapOption={mapLookupOption}
                        createForm={(props) => <BodyTypeInlineForm {...props} />}
                        createLabel="Body Type"
                        {...STORE_OBJECT}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfAsyncSelectField
                        name="vehicle_fuel_type"
                        label="Fuel Type"
                        placeholder="Select fuel type"
                        queryKey={["vehicle-fuel-types"]}
                        listFn={() => api.vehicleAttributes.listFuelTypes()}
                        mapOption={mapLookupOption}
                        createForm={(props) => <FuelTypeInlineForm {...props} />}
                        createLabel="Fuel Type"
                        {...STORE_OBJECT}
                    />
                    <RhfAsyncSelectField
                        name="vehicle_transmission"
                        label="Transmission"
                        placeholder="Select transmission"
                        queryKey={["vehicle-transmissions"]}
                        listFn={() => api.vehicleAttributes.listTransmissions()}
                        mapOption={mapLookupOption}
                        createForm={(props) => <TransmissionInlineForm {...props} />}
                        createLabel="Transmission"
                        {...STORE_OBJECT}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfAsyncSelectField
                        name="vehicle_color"
                        label="Color"
                        placeholder="Select color"
                        queryKey={["vehicle-colors"]}
                        listFn={() => api.vehicleAttributes.listColors()}
                        mapOption={mapLookupOption}
                        createForm={(props) => <ColorInlineForm {...props} />}
                        createLabel="Color"
                        {...STORE_OBJECT}
                    />
                    <RhfTextField name="vin_number" label="VIN Number" placeholder="e.g. 1HGBH41JXMN109186" />
                </div>

                {/* Technical specs */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField name="engine_size" label="Engine Size" placeholder="e.g. 2.5L" />
                    <RhfTextField name="drivetrain" label="Drivetrain" placeholder="e.g. FWD" />
                </div>

                <RhfTextField name="owners_number" label="Number of Owners" placeholder="e.g. 1" />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RhfTextField name="license_plate" label="License Plate" placeholder="e.g. ABC-123" />
                    <RhfTextField name="mileage" label="Mileage" placeholder="e.g. 10000" />
                </div>

                <RhfImageField name="image" label="Image" />

                <RhfTextareaField name="note" label="Notes" rows={3} />

                <Button type="submit" variant="default" disabled={isPending}>
                    {isEditing ? <Save /> : <Plus />}
                    {isPending
                        ? (isEditing ? "Updating..." : "Creating...")
                        : (isEditing ? "Update Vehicle" : "Create Vehicle")}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}

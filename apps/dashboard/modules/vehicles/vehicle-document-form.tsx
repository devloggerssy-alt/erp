"use client"

import { AlertTriangle, Plus, Save } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { FieldGroup } from "@/shared/components/ui/field"
import {
    Rhform,
    RhfTextareaField,
    RhfAsyncSelectField,
    RhfDocumentField,
} from "@/shared/components/form"
import { DocumentTypeInlineForm } from "./inline-forms/document-type-inline-form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { toRelation, toId } from "@/shared/lib/utils"

import { vehicleDocumentFormSchema, type VehicleDocumentFormValues } from "./vehicle-document.schema"

// ── Props ──

export type VehicleDocumentFormProps = {
    vehicleId: string
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
}

// ── Default values ──

const DEFAULT_VALUES: VehicleDocumentFormValues = {
    document_type: null,
    file: null,
    note: "",
}

// ── Mapping helpers ──

const mapLookupOption = (item: any) => ({
    value: String(item.id),
    label: item.name ?? item.title ?? String(item.id),
})

const STORE_OBJECT = { getOptionValue: (o: any) => o, getOptionLabel: (o: any) => o.label }

function mapToFormValues(data: unknown): VehicleDocumentFormValues {
    const d = (data as any)?.data ?? data ?? {}

    return {
        document_type: toRelation(d.document_type_id, d.document_type?.name ?? d.document_type?.title),
        file: null,
        note: d.note || "",
    }
}

function mapToPayload(values: VehicleDocumentFormValues, vehicleId: string) {
    return {
        vehicle_id: Number(vehicleId),
        document_type_id: toId(values.document_type),
        file: values.file instanceof File ? values.file : undefined,
        note: values.note || undefined,
    }
}

// ── Component ──

export function VehicleDocumentForm({ vehicleId, resourceId, initialData, onSuccess }: VehicleDocumentFormProps) {
    const api = useAuthApi()

    const { form, isEditing } = useResourceForm<VehicleDocumentFormValues, any>({
        schema: vehicleDocumentFormSchema,
        defaultValues: DEFAULT_VALUES,
        resourceId,
        initialData,
        mapToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: VehicleDocumentFormValues) => {
            const payload = mapToPayload(values, vehicleId)
            const promise = isEditing && resourceId
                ? api.vehicleDocuments.updateDocument(resourceId, payload)
                : api.vehicleDocuments.createDocument(payload)
            toast.promise(promise, {
                loading: isEditing ? "Updating document..." : "Uploading document...",
                success: isEditing ? "Document updated successfully" : "Document uploaded successfully",
                error: isEditing ? "Failed to update document" : "Failed to upload document",
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
                        {isEditing ? "Failed to update document" : "Failed to upload document"}
                    </AlertTitle>
                    {error.message}
                </Alert>
            )}

            <FieldGroup>
                <RhfAsyncSelectField
                    name="document_type"
                    label="Document Type"
                    placeholder="Select document type"
                    queryKey={["document-types"]}
                    listFn={() => api.vehicleDocuments.listDocumentTypes()}
                    mapOption={mapLookupOption}
                    createForm={(props) => <DocumentTypeInlineForm {...props} />}
                    createLabel="Document Type"
                    {...STORE_OBJECT}
                />

                <RhfDocumentField
                    name="file"
                    label="Document File"
                    required
                />

                <RhfTextareaField
                    name="note"
                    label="Note"
                    placeholder="Optional notes about this document"
                />

                <Button type="submit" disabled={isPending} className="w-full">
                    {isPending ? null : isEditing ? <Save /> : <Plus />}
                    {isPending ? "Saving..." : isEditing ? "Update Document" : "Upload Document"}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}

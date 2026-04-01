"use client"

import { AlertTriangle, Plus } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Alert, AlertTitle } from "@/shared/components/ui/alert"
import { FieldGroup } from "@/shared/components/ui/field"
import {
    Rhform,
    RhfTextField,
    RhfCheckboxField,
} from "@/shared/components/form"
import { toast } from "sonner"
import { useAuthApi } from "@/shared/useApi"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"

import {
    shopCalendarFormSchema,
    type ShopCalendarFormValues,
} from "./shop-calendar.schema"
import { SHOP_CALENDAR_ROUTES } from "@garage/api"

// ── Props ──

export type ShopCalendarFormProps = {
    resourceId?: string | null
    initialData?: unknown
    onSuccess?: () => void
}

// ── Default values ──

const DEFAULT_VALUES: ShopCalendarFormValues = {
    title: "",
    is_default: false,
}

// ── Component ──

export function ShopCalendarForm({ resourceId, onSuccess }: ShopCalendarFormProps) {
    const api = useAuthApi()

    const { form } = useResourceForm<ShopCalendarFormValues, any>({
        schema: shopCalendarFormSchema,
        defaultValues: DEFAULT_VALUES,
        resourceId: null,
        queryKey: [SHOP_CALENDAR_ROUTES.INDEX],
        mapToFormValues: (data: unknown) => {
            const d = (data as any)?.data ?? data ?? {}
            return {
                title: d.title ?? "",
                is_default: d.is_default ?? false,
            }
        },
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: ShopCalendarFormValues) => {
            const payload = {
                title: values.title,
                is_default: values.is_default,
            }
            const promise = api.shopCalendars.create(payload)
            toast.promise(promise, {
                loading: "Creating shop calendar...",
                success: "Shop calendar created successfully",
                error: "Failed to create shop calendar",
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
                    <AlertTitle>Failed to create shop calendar</AlertTitle>
                    {error.message}
                </Alert>
            )}

            <FieldGroup>
                <RhfTextField name="title" label="Title" placeholder="Enter calendar title" required />
                <RhfCheckboxField name="is_default" label="Set as default" />

                <Button type="submit" variant="default" disabled={isPending}>
                    <Plus />
                    {isPending ? "Creating..." : "Create Shop Calendar"}
                </Button>
            </FieldGroup>
        </Rhform>
    )
}
